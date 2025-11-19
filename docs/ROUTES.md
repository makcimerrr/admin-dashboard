# Routes de l'application

## Vue d'ensemble

Cette application utilise **Next.js App Router** avec une architecture organisée en groupes de routes.

## Structure des dossiers

```
app/
├── (dashboard)/        # Routes protégées du dashboard (auth requise + rôle Admin)
├── (home)/            # Routes publiques et semi-publiques
├── login/             # Authentification
├── register/          # Inscription
└── handler/           # Gestionnaires Stack Auth
```

## 🔓 Routes publiques

| Route | Description | Fichier |
|-------|-------------|---------|
| `/login` | Page de connexion | `app/login/page.tsx` |
| `/register` | Page d'inscription | `app/register/page.tsx` |
| `/non-admin` | Accès refusé (rôle insuffisant) | `app/(home)/non-admin/page.tsx` |
| `/hub` | Hub public | `app/(home)/hub/page.tsx` |
| `/hub/contact` | Page de contact | `app/(home)/hub/contact/page.tsx` |
| `/hub/docs` | Documentation | `app/(home)/hub/docs/page.tsx` |
| `/hub/docs/[slug]` | Page de doc spécifique | `app/(home)/hub/docs/[slug]/page.tsx` |
| `/handler/[...stack]` | Stack Auth handlers | `app/handler/[...stack]/page.tsx` |

## 🔒 Routes protégées (Dashboard)

### Conditions d'accès
- ✅ Utilisateur authentifié
- ✅ Rôle : `Admin` ou `Super Admin`

### Dashboard principal

| Route | Description | Fichier | Permissions supplémentaires |
|-------|-------------|---------|----------------------------|
| `/` | Page d'accueil dashboard | `app/(dashboard)/page.tsx` | - |

### Planning

| Route | Description | Fichier | Permissions |
|-------|-------------|---------|-------------|
| `/planning` | Gestion du planning | `app/(dashboard)/planning/page.tsx` | `planningPermission: editor/reader` |
| `/planning/absences` | Gestion des absences | `app/(dashboard)/planning/absences/page.tsx` | `planningPermission: editor/reader` |
| `/planning/extraction` | Extraction des données | `app/(dashboard)/planning/extraction/page.tsx` | `planningPermission: editor/reader` |

**Différence editor vs reader :**
- **Editor** : Peut créer, modifier, supprimer (boutons actifs)
- **Reader** : Lecture seule (boutons désactivés)

### Ressources Humaines

| Route | Description | Fichier |
|-------|-------------|---------|
| `/employees` | Gestion des employés | `app/(dashboard)/employees/page.tsx` |
| `/students` | Gestion des étudiants | `app/(dashboard)/students/page.tsx` |

### Administration

| Route | Description | Fichier | Permission spéciale |
|-------|-------------|---------|---------------------|
| `/history` | Historique des modifications | `app/(dashboard)/history/page.tsx` | `planningPermission: editor` uniquement |
| `/config` | Configuration | `app/(dashboard)/config/page.tsx` | - |
| `/account` | Compte utilisateur | `app/(dashboard)/account/page.tsx` | - |

### Analytics & Business

| Route | Description | Fichier |
|-------|-------------|---------|
| `/analytics` | Tableau de bord analytique | `app/(dashboard)/analytics/page.tsx` |
| `/01deck` | 01deck | `app/(dashboard)/01deck/page.tsx` |
| `/customers` | Gestion clients | `app/(dashboard)/customers/page.tsx` |
| `/promos/status` | Statut des promotions | `app/(dashboard)/promos/status/page.tsx` |

## 🛣️ Routes API

Toutes les routes API sont dans `app/api/` et ne nécessitent pas de configuration middleware spéciale.

### Authentification
- `POST /api/stack-auth/signin` - Connexion
- `POST /api/stack-auth/signup` - Inscription
- `POST /api/stack-auth/signout` - Déconnexion
- `GET /api/stack-auth/session` - Session actuelle
- `POST /api/stack-auth/webhook` - Webhook Stack Auth

### Planning & Employés
- `GET/POST /api/schedules` - Plannings
- `GET /api/schedules/absences` - Absences
- `POST /api/schedules/copy` - Copie de planning
- `GET /api/schedules/range` - Planning sur une période
- `GET/POST/PUT/DELETE /api/employees` - Employés
- `GET/PUT/DELETE /api/employees/[id]` - Employé spécifique

### Autres
- `GET /api/history` - Historique
- `GET /api/holidays` - Jours fériés
- `GET /api/projects` - Projets
- `GET /api/promos` - Promotions
- `GET /api/users/[id]` - Utilisateur spécifique

## 🔐 Protection des routes

### Middleware (Premier niveau)
**Fichier** : `middleware.ts`

Vérifie la présence du cookie Stack Auth :
- ✅ Cookie présent → Continue
- ❌ Cookie absent → Redirect `/login`

### Layout Server Component (Second niveau)
**Fichier** : `app/(dashboard)/layout.tsx`

Vérifie :
1. Authentification complète (SDK Stack Auth)
2. Rôle utilisateur (Admin/Super Admin)
3. Redirect `/non-admin` si rôle insuffisant

### Composants individuels (Troisième niveau)
**Exemple** : Pages planning

Vérifient `planningPermission` :
- **editor** : Tous les boutons actifs
- **reader** : Boutons de modification désactivés

## 📊 Matrice des permissions

| Route | Auth requise | Rôle requis | Permission planning |
|-------|--------------|-------------|---------------------|
| `/login` | ❌ | - | - |
| `/hub/*` | ❌ | - | - |
| `/` | ✅ | Admin/Super Admin | - |
| `/planning` | ✅ | Admin/Super Admin | editor/reader |
| `/history` | ✅ | Admin/Super Admin | **editor uniquement** |
| `/employees` | ✅ | Admin/Super Admin | - |
| `/account` | ✅ | Admin/Super Admin | - |

## 🚀 Ajouter une nouvelle route

### Route publique

1. Créer le fichier dans `app/(home)/` ou à la racine
2. Ajouter la route dans `middleware.ts` → `publicRoutes`

### Route protégée

1. Créer le fichier dans `app/(dashboard)/`
2. Ajouter la route dans `middleware.ts` → `protectedRoutes`
3. Le layout `app/(dashboard)/layout.tsx` gérera automatiquement l'auth

### Route avec permissions spéciales

1. Créer la route dans `app/(dashboard)/`
2. Dans le composant, récupérer les permissions :

```typescript
const stackUser = useUser(); // Client component
// ou
const stackUser = await stackServerApp.getUser(); // Server component

const planningPermission = stackUser?.clientReadOnlyMetadata?.planningPermission || 'reader';

// Conditionner l'affichage
{planningPermission === 'editor' && (
  <Button>Action réservée aux éditeurs</Button>
)}
```

## 📝 Notes importantes

1. **Toujours tester les routes** après ajout/modification
2. **Les routes du hub** (`/hub/*`) sont publiques par design (documentation, contact)
3. **La page d'accueil** (`/`) nécessite une authentification (c'est le dashboard)
4. **Les gestionnaires Stack Auth** (`/handler/*`) doivent rester publics
5. **Le middleware ne vérifie que les cookies** (rapide), la vérification complète est dans le layout

## 🔧 Maintenance

Pour vérifier toutes les pages de l'app :
```bash
find app -name "page.tsx" -o -name "page.ts" | sort
```

Pour tester l'authentification :
1. Déconnexion → Accès à `/planning` → Redirect `/login` ✅
2. Connexion avec compte `user` → Redirect `/non-admin` ✅
3. Connexion avec compte `Admin` → Accès `/planning` ✅
