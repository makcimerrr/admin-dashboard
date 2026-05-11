# Analyse `@01normandie/launcher` v2.0.0

## Ce qu'il fournit

Composant unique `<LauncherSidebar>` :

```tsx
<LauncherSidebar
  activeAppId="01deck"             // '01deck' | 'emargement' | 'apprentissage'
  user={{ name: 'Alice', initials: 'AL' }}
  loginHref="/login"
  onLogout={() => signOut()}
>
  {children}   // contenu de l'app
</LauncherSidebar>
```

**Comportement** :
- Sidebar fixe à gauche, **66 px collapsed** / **210 px expanded**
- 3 apps hardcodées dans le package :
  - `01deck` → https://deck.zone01normandie.org
  - `emargement` → https://emargement.zone01normandie.org *(badge "Nouveau")*
  - `apprentissage` (Intra) → http://zone01normandie.org
- Logo Zone01 cliquable = toggle expand/collapse
- État persisté dans `localStorage` (`launcher_expanded`)
- `Escape` referme la barre
- Avatar utilisateur (initiales) + bouton logout en bas
- Si `user = null` → bouton « Se connecter »
- CSS injecté automatiquement (pas d'import à faire)
- Thème dark hardcodé (`--launcher-bg: #060b14`, accent bleu `#0063f9`)

## Comparaison avec notre système actuel

| Aspect | Notre `AppSidebar` | `LauncherSidebar` |
|--------|--------------------|--------------------|
| Largeur | 56 px (fixe) | 66 px collapsed / 210 px expanded |
| Apps | Tableau de bord, Pédagogie, Planning, Outils, Config, Paramètres + 01 Deck/Intra/Émargement | 01 Deck, Émargement, Intra (3 fixes) |
| URLs | `zone01rouennormandie.org` | `zone01normandie.org` ⚠️ |
| Thème | Variables CSS (6 thèmes) | Dark hardcodé |
| Mobile | Cachée (`md:hidden`) + bottom-nav | Sidebar fixe sur toute taille (pas de gestion mobile) |
| User object | `{ id, email, name, image, role, planningPermission }` | `{ name, initials }` |
| Sub-nav | `AppTabs` horizontal + filtrage par rôle | Aucun |

## Problèmes d'intégration

1. **Pas de valeur `admin` dans `AppId`** — on est nous-mêmes une 4ème app du parc Zone01 mais le package ne la connaît pas. Conséquence : `activeAppId` doit pointer vers une des 3 existantes (mauvais highlight) ou il faut demander à ton collègue de publier une v2.1 avec `'admin'`.

2. **URLs différentes** — le launcher pointe vers `zone01normandie.org` alors que nos liens internes utilisent `zone01rouennormandie.org`. Source de confusion pour les utilisateurs habitués à un domaine.

3. **Doublon avec notre sidebar** — nos apps externes (01 Deck/Intra/Émargement) font déjà partie de notre `NAV_APPS`. Si on monte le launcher, il faut les retirer pour éviter le double affichage.

4. **Thème fixe** — palette dark hardcodée. Si l'admin est en thème Aurora/Solar/etc., le launcher reste bleu nuit. Visuel cohérent dans le parc Zone01, mais cassure visuelle dans l'app admin.

5. **Mobile** — le launcher est `position: fixed` plein écran. Aucune logique « bottom-nav ». Sur mobile, on aurait 2 systèmes de nav (launcher en haut + notre bottom-nav en bas).

6. **Coupling** — la liste des apps est dans le package. Toute modif (ajouter `admin`, changer une URL) = nouvelle release npm.

## Options d'intégration

### Option A — Launcher en outer shell + notre sidebar en inner
```
┌──────┬──────┬───────────────────┐
│ 66px │ 56px │ contenu           │
│ Lnch │ App  │                   │
│ er   │ Sdbr │                   │
└──────┴──────┴───────────────────┘
```
- Cross-app navigation via launcher (gauche extrême)
- Sous-nav interne via notre AppSidebar
- Total = **122 px** de chrome à gauche (lourd)
- Retirer 01 Deck/Intra/Émargement de notre `NAV_APPS` (doublon)

### Option B — Launcher remplace nos apps externes uniquement
- Garder uniquement le launcher en sidebar principal
- Ajouter nos sections admin via `children` ? Non, `children` est le contenu, pas une seconde nav
- Pas viable sans modif du package

### Option C — Launcher comme petit widget en haut (header)
- Détourner l'usage : placer le launcher en mode étendu uniquement, en haut du SiteHeader, sans son `<main>`
- Pas prévu par le package, pas propre

### Option D — Recommandée : attendre v2.1 avec `'admin'` + thème
Demander à ton collègue :
1. Ajouter `'admin'` dans `AppId` + entrée URL pour l'admin dashboard
2. Exposer un prop `theme?: 'dark' | 'light' | 'auto'`
3. Exposer un prop `position?: 'fixed-left' | 'bottom-mobile'` ou laisser un mode CSS pour mobile
4. Corriger les URLs vers `zone01rouennormandie.org`

En attendant, garder notre `AppSidebar` actuelle.

## Recommandation immédiate

**Option A modifiée** : monter le launcher en outer shell **mais uniquement sur desktop**, et retirer 01 Deck / Intra / Émargement de notre `NAV_APPS`. Sur mobile, garder notre bottom-nav existante.

Bénéfices :
- Cohérence cross-app Zone01 (1 seul launcher visuel dans tous les outils)
- Réduction du bruit dans notre AppSidebar (les externes partent dans le launcher)

Inconvénients :
- 122 px de chrome à gauche sur desktop
- `activeAppId` faux temporairement (set sur `'01deck'`) jusqu'à v2.1
- Theme dark cassera le rendu light/Aurora

## Action proposée

1. **Maintenant** : créer un wrapper `components/launcher-shell.tsx` (`'use client'`) qui wrap `LauncherSidebar`, mais le **masquer en dev/admin** par feature-flag (`NEXT_PUBLIC_USE_LAUNCHER=false`) tant que les 4 problèmes ci-dessus ne sont pas adressés.
2. **À discuter avec le collègue** : v2.1 avec `'admin'` AppId + thème configurable + URL `rouennormandie`.
3. **Une fois ces fixes faits** : flip le feature flag, retirer les 3 externes de `NAV_APPS`.

Veux-tu :
- (a) que je crée le wrapper feature-flagged maintenant (option A)
- (b) que je liste ce qu'il faudrait dans une v2.1 et qu'on attende
- (c) que je l'intègre direct sans flag pour tester le rendu visuel ?
