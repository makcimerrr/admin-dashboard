# Suivi en entreprise (alternants & stagiaires)

Module ajouté sur `/alternants` (onglet **Suivi en entreprise**). Il remplace le
Notion tenu à la main et sort la logique de relance de la mémoire d'une seule
personne : les échéances sont **calculées**, les relances **tracées**, les
comptes rendus **historisés**.

C'est aussi un point de contrôle Qualiopi classique (accompagnement des
bénéficiaires) : tout ce qui est envoyé et tout ce qui est fait laisse une trace
datée et attribuée.

---

## 1. Ce que fait le module

| Fonction | Où |
|---|---|
| Calcul automatique des échéances (3M / 6M / 1A / 18M / 2A) dès qu'un contrat existe | `reconcileMilestones()` |
| Jalons **configurables** (durées éditables, ajout/désactivation) | UI → ⚙️ Configuration → Jalons |
| Vue liste filtrable + Kanban par statut | onglet Suivi en entreprise |
| Relance mail au tuteur avec lien de réservation | bouton « Relancer » + cron |
| Alerte interne (Teams) X jours avant | cron `follow-up-reminders` |
| Détection automatique du RDV réservé | cron `follow-up-calendar` |
| Saisie du compte rendu, qui clôt l'échéance | dialogue « Saisir le compte rendu » |
| Historique par apprenant / par entreprise | fiche apprenant → onglet Suivi |

### Statuts d'une échéance

`a_venir` → `relance_envoyee` → `rdv_planifie` → `realise`
(`annule` pour ce qui sort du périmètre : contrat rompu, jalon au-delà de la fin
de contrat, jalon désactivé).

---

## 2. Modèle de données

| Table | Rôle |
|---|---|
| `follow_up_milestone_types` | jalons configurables (code, libellé, offset en mois, actif) |
| `follow_up_settings` | singleton : délais, lien de réservation, agenda, modèle de mail, kill-switch |
| `follow_up_milestones` | une échéance = un contrat × un jalon (unique) |
| `follow_up_reminders` | trace de chaque envoi (canal, destinataire, auteur, échec) |
| `follow_up_reports` | comptes rendus de suivi |

Les entités **Entreprise** et **Tuteur** ne sont volontairement pas des tables
séparées : elles vivent déjà sur `alternant_contracts` (`company_name`,
`tutor_name/email/phone`), alimentées par la synchro émargement. Les normaliser
imposerait de réécrire la synchro et toute l'UI existante ; ce sera un chantier
à part si le besoin (annuaire d'entreprises, plusieurs tuteurs) se confirme.

`follow_up_reports.student_id` est **NOT NULL** et indépendant du contrat :
l'historique pédagogique survit à la disparition d'un contrat.

### ⚠️ Contrainte forte sur la synchro émargement

Les échéances pointent sur `alternant_contracts.id` (`ON DELETE CASCADE`).
`syncEmargementStatuses()` faisait auparavant un `DELETE` + `INSERT` de tous les
contrats `source='emargement'` à chaque exécution — ce qui aurait détruit les
échéances, les relances et le rattachement des comptes rendus à chaque synchro.

Elle fait désormais un **upsert sur `student_id`** (émargement ne porte qu'un
contrat par utilisateur). **Ne jamais revenir à un DELETE + INSERT.**

---

## 3. Configuration

### Variables d'environnement

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<boîte émettrice>
SMTP_PASSWORD=<mot de passe d'application>
SMTP_FROM=                      # optionnel
```

Sans ces variables le module reste pleinement utilisable : il calcule, affiche
et alerte en interne, mais aucun mail ne part (l'UI l'indique explicitement).

La détection des RDV réutilise le service account Google déjà en place
(`GOOGLE_SERVICE_ACCOUNT_*`). L'agenda surveillé se règle dans l'UI.

### Réglages dans l'UI (⚙️ sur l'onglet Suivi)

- **Jalons** : durées éditables, ajout, désactivation. Toute modification
  recalcule immédiatement les échéances de tous les contrats.
- **Relances** : délai d'alerte interne, délai d'envoi au tuteur, délai de 2e
  relance, lien de réservation, agenda surveillé.
- **Envoi automatique** : *kill-switch, OFF par défaut*. Tant qu'il est
  désactivé, le cron calcule et alerte en interne mais n'envoie **aucun** mail
  aux tuteurs. Les relances manuelles restent possibles (acte explicite).
- **Modèle de mail** : objet et corps, avec variables `{{tuteur}}`,
  `{{apprenant}}`, `{{entreprise}}`, `{{jalon}}`, `{{date_echeance}}`,
  `{{lien_rdv}}`… Vide = modèle par défaut.

---

## 4. Déploiement

### Migration

```bash
psql "$POSTGRES_URL" -f drizzle/migrations/0029_follow_up_visits.sql
```

Idempotente (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) et seedée
avec les 5 jalons 3M / 6M / 1A / 18M / 2A.

Après la migration, lancer une fois le recalcul (bouton ⟳ sur l'onglet Suivi, ou
`POST /api/follow-ups/reconcile`) pour poser les échéances des contrats déjà en
base.

### Crons

À ajouter au planificateur (même mécanique que les crons existants, header
`Authorization: Bearer $CRON_SECRET`) :

```cron
# Relances tuteurs + digest interne — tous les jours à 8h
0 8 * * *  curl -sS -H "Authorization: Bearer $CRON_SECRET" https://hub.zone01normandie.org/api/cron/follow-up-reminders

# Détection des RDV réservés dans l'agenda — 2×/jour
0 7,13 * * *  curl -sS -H "Authorization: Bearer $CRON_SECRET" https://hub.zone01normandie.org/api/cron/follow-up-calendar
```

Les deux acceptent `?dry=true` : ils calculent et renvoient ce qui *serait*
envoyé, sans rien envoyer. À utiliser pour la première mise en service.

---

## 5. Migration depuis Notion

Export CSV depuis Notion, puis :

```bash
# 1. Vérifier le rapprochement (n'écrit RIEN)
pnpm tsx scripts/import-followups-csv.ts --people people.csv --reports cr.csv

# 2. Appliquer
pnpm tsx scripts/import-followups-csv.ts --people people.csv --reports cr.csv --apply
```

Le script :

- rapproche chaque ligne d'un apprenant du hub (login, sinon nom complet
  normalisé) et **liste explicitement les non-rapprochés** — jamais d'écriture
  hasardeuse ;
- **ne duplique pas** un contrat déjà synchronisé depuis émargement : il
  l'**enrichit** (email du tuteur — qu'émargement ne porte pas —, adresse,
  SIRET) et écrit `students.company_name` pour que l'entreprise survive à la
  prochaine synchro ;
- importe les comptes rendus antérieurs sans les rattacher à une échéance
  calculée (ils alimentent l'historique).

Les colonnes acceptées (et leurs alias) sont documentées en tête du script.

**Bascule via l'API Notion** : possible dans un second temps avec un token
d'intégration — le script est déjà structuré pour ça (le lecteur CSV est isolé
dans `readCsv()`), il suffit de remplacer la source des lignes.

---

## 6. API

Toutes les routes sont **admin-only** (elles exposent les coordonnées des
tuteurs entreprise).

| Route | Rôle |
|---|---|
| `GET /api/follow-ups` | liste des échéances (`status`, `studentId`, `company`, `includeClosed`) |
| `GET /api/follow-ups?stats=true` | bandeau de pilotage |
| `GET/PATCH /api/follow-ups/[id]` | détail + relances / changement de statut |
| `GET /api/follow-ups/[id]/remind` | **aperçu** du mail (aucun envoi) |
| `POST /api/follow-ups/[id]/remind` | relance manuelle |
| `GET/POST /api/follow-ups/reports` | historique / saisie d'un compte rendu |
| `PATCH/DELETE /api/follow-ups/reports/[id]` | correction / suppression |
| `GET/PUT /api/follow-ups/settings` | réglages (+ `?verify=true` pour tester le SMTP) |
| `GET/POST /api/follow-ups/milestone-types` | jalons configurables |
| `DELETE /api/follow-ups/milestone-types/[code]` | désactive un jalon |
| `POST /api/follow-ups/reconcile` | recalcule toutes les échéances |

---

## 7. Mise en service recommandée

1. Appliquer la migration.
2. Importer le Notion en dry-run, corriger les non-rapprochés, appliquer.
3. Recalculer les échéances.
4. Vérifier la vue Kanban : le passif (échéances déjà en retard) apparaît —
   c'est normal, c'est précisément ce que le Notion ne montrait plus.
5. Régler les jalons et délais, renseigner le lien de réservation.
6. Lancer les crons en `?dry=true` pendant quelques jours, envoi automatique
   **désactivé**, et relancer à la main.
7. Quand les mails générés sont satisfaisants : activer l'envoi automatique.
