# Suivi en entreprise (alternants & stagiaires)

Module ajouté sur `/alternants` (onglet **Suivi en entreprise**). Il remplace le
Notion tenu à la main et sort la logique de relance de la mémoire d'une seule
personne : les échéances sont **calculées**, les relances **tracées**, les
comptes rendus **historisés**.

C'est aussi un point de contrôle Qualiopi classique (accompagnement des
bénéficiaires) : tout ce qui est envoyé et tout ce qui est fait laisse une trace
datée et attribuée.

## ⚠️ Règle non négociable : aucun envoi automatique

**Aucun mail ne part vers une entreprise partenaire sans qu'un humain l'ait relu
et confirmé.** Ce n'est pas un réglage, c'est une propriété du code :

- `sendMilestoneReminder()` exige `confirmedBy` (l'email de l'utilisateur hub
  qui valide) et lève une erreur sans lui — impossible d'envoyer « au nom de
  personne » ;
- `REMINDER_KINDS` ne contient **pas** de valeur `auto` ;
- les crons ne référencent même pas la fonction d'envoi : ils calculent, et
  signalent en interne ce qu'il y a à traiter ;
- le seul chemin d'envoi est `POST /api/follow-ups/[id]/remind`, appelé depuis
  l'écran de confirmation où le message est affiché **et modifiable**.

Ne pas réintroduire de chemin d'envoi automatique.

---

## 1. Ce que fait le module

| Fonction | Où |
|---|---|
| Calcul automatique des échéances (3M / 6M / 1A / 18M / 2A) dès qu'un contrat existe | `reconcileMilestones()` |
| Jalons **configurables** (durées éditables, ajout/désactivation) | UI → ⚙️ Configuration → Jalons |
| Vue liste filtrable + Kanban par statut | onglet Suivi en entreprise |
| Relance mail au tuteur, **après relecture et confirmation humaine** | bouton « Relancer… » → écran de confirmation |
| Alerte interne (Teams) : retards, échéances proches, relances à confirmer | cron `follow-up-digest` |
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
  Ces délais déterminent uniquement **quand une relance vous est proposée** —
  jamais un envoi.
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
# Réconciliation + digest interne (n'envoie AUCUN mail tuteur) — tous les jours à 8h
0 8 * * *  curl -sS -H "Authorization: Bearer $CRON_SECRET" https://hub.zone01normandie.org/api/cron/follow-up-digest

# Détection des RDV réservés dans l'agenda — 2×/jour
0 7,13 * * *  curl -sS -H "Authorization: Bearer $CRON_SECRET" https://hub.zone01normandie.org/api/cron/follow-up-calendar
```

Les deux acceptent `?dry=true` : ils calculent et renvoient l'état sans rien
poster (même la carte Teams). À utiliser pour la première mise en service.

---

## 5. Migration depuis Notion (100 % API)

Source : la page Notion **« Suivi entretiens Tuteurs »**
(`641862b579db47c199b6ec7e9e522d22`). Aucun export CSV : le script lit l'API,
donc il est **rejouable** tant que le Notion vit en parallèle.

### Prérequis — partager la page avec l'intégration

`NOTION_TOKEN` est déjà en place (intégration « Zone01 Rouen Data »), mais la
page n'est pas partagée avec elle : l'API répond 404. Dans Notion :

> ouvrir la page → **⋯** (en haut à droite) → **Connexions** → ajouter
> l'intégration « Zone01 Rouen Data ».

Le partage se propage aux sous-pages et aux bases inline.

### Déroulé

```bash
# 1. Voir le schéma réel et 3 lignes — lecture seule
pnpm tsx scripts/import-notion-followups.ts --inspect

# 2. Simuler l'import complet (rapport de rapprochement, aucune écriture)
pnpm tsx scripts/import-notion-followups.ts

# 3. Appliquer
pnpm tsx scripts/import-notion-followups.ts --apply
```

Le script :

- **découvre seul** les bases sous la page (y compris les bases *inline*) et
  devine leur nature : « fiches apprenant » (dates de contrat) ou « comptes
  rendus » (contenu / date d'entretien) ;
- rapproche chaque ligne d'un apprenant du hub (login, sinon nom complet
  normalisé, accents et ordre nom/prénom tolérés) et **liste explicitement les
  non-rapprochés** — jamais d'écriture hasardeuse ;
- **ne duplique pas** un contrat déjà synchronisé depuis émargement : il
  l'**enrichit** (email du tuteur — qu'émargement ne porte pas —, entreprise,
  adresse, SIRET) et écrit `students.company_name` pour que l'entreprise
  survive à la prochaine synchro ;
- lit le compte rendu dans la propriété dédiée **ou**, à défaut, dans le corps
  de la page Notion ;
- **dédoublonne** : relancer le script ne recrée rien (contrats mis à jour en
  place, comptes rendus déjà présents ignorés).

Les noms de colonnes sont reconnus à la tolérance près (accents, casse,
ponctuation, correspondance partielle). Si `--inspect` révèle une colonne non
reconnue, ajouter son nom aux alias dans le script.

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
