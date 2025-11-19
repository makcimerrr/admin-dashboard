# Stratégie d'authentification

## Architecture à deux niveaux

Notre application utilise une **approche hybride** pour l'authentification avec Stack Auth, combinant les avantages du middleware (Edge Runtime) et des Server Components (Node Runtime).

## 1. Middleware (Premier niveau - Edge Runtime)

**Fichier** : `middleware.ts`

**Responsabilités** :
- ✅ Vérification rapide de la présence des cookies Stack Auth
- ✅ Redirection immédiate vers `/login` si aucun cookie trouvé
- ✅ Performance optimale (Edge Runtime)

**Ce qu'il NE fait PAS** :
- ❌ Vérification complète du JWT (problème de compatibilité avec l'API Stack Auth en Edge Runtime)
- ❌ Vérification des rôles et permissions
- ❌ Accès aux métadonnées utilisateur

**Code simplifié** :
```typescript
// Vérification rapide du cookie
const stackAccessCookie = cookies.get('stack-access');
if (!stackAccessCookie) {
  redirect('/login');
}
// Sinon, laisser passer → vérification complète par Server Component
```

## 2. Server Components (Second niveau - Node Runtime)

**Fichier** : `app/(dashboard)/layout.tsx`

**Responsabilités** :
- ✅ Authentification complète via SDK Stack Auth
- ✅ Vérification du rôle (Admin / Super Admin)
- ✅ Vérification des permissions planning (editor / reader)
- ✅ Accès complet aux métadonnées utilisateur
- ✅ Redirection vers `/non-admin` si rôle insuffisant

**Code** :
```typescript
const stackUser = await stackServerApp.getUser();

if (!stackUser) {
  redirect('/login');
}

const role = stackUser.serverMetadata?.role ||
             stackUser.clientReadOnlyMetadata?.role ||
             'user';

if (role !== 'Admin' && role !== 'Super Admin') {
  redirect('/non-admin');
}
```

## Organisation des routes

### Routes publiques (pas d'authentification)
- `/login` - Page de connexion
- `/register` - Page d'inscription
- `/non-admin` - Page d'accès refusé (rôle insuffisant)
- `/handler/*` - Gestionnaires Stack Auth (OAuth, callbacks, etc.)
- `/hub/*` - Hub public (documentation, contact, etc.)

### Routes protégées (authentification requise)

**Dashboard principal :**
- `/` - Page d'accueil du dashboard

**Planning :**
- `/planning` - Gestion du planning
- `/planning/absences` - Gestion des absences
- `/planning/extraction` - Extraction des données

**Ressources humaines :**
- `/employees` - Gestion des employés
- `/students` - Gestion des étudiants

**Administration :**
- `/history` - Historique des modifications (éditeurs uniquement)
- `/config` - Configuration
- `/account` - Compte utilisateur

**Analytics & Business :**
- `/analytics` - Tableau de bord analytique
- `/01deck` - 01deck
- `/customers` - Gestion clients
- `/promos` - Promotions

## Flux d'authentification complet

```
Utilisateur accède à une route protégée (ex: /planning)
        ↓
[MIDDLEWARE - Edge Runtime]
- Route publique (/login, /hub, etc.) ?
  → OUI → Accès direct ✅
  → NON → Continue ↓
- Cookie Stack Auth présent ?
  → NON → Redirect /login
  → OUI → Continue ↓
        ↓
[SERVER COMPONENT - Node Runtime]
- Utilisateur authentifié ?
  → NON → Redirect /login
  → OUI → Continue ↓
- Rôle Admin/Super Admin ?
  → NON → Redirect /non-admin
  → OUI → Accès autorisé ✅
```

## Avantages de cette approche

### 🚀 Performance
- Premier niveau ultra-rapide (simple vérification de cookie)
- Évite les appels API inutiles pour les utilisateurs non authentifiés

### 🔒 Sécurité
- Double vérification (cookie + authentification complète)
- Vérification des rôles dans le Server Component (impossible à bypasser)
- Métadonnées sensibles (`serverMetadata`) accessibles uniquement côté serveur

### 🛠️ Compatibilité
- Edge Runtime : Compatible avec la vérification simple de cookies
- Node Runtime : Compatible avec le SDK Stack Auth complet
- Pas de problèmes de compatibilité JWT/API

## Métadonnées utilisateur

### Structure des métadonnées

```json
{
  "server_metadata": {
    "role": "Admin"
  },
  "client_read_only_metadata": {
    "role": "Admin",
    "planningPermission": "editor"
  }
}
```

### Où sont-elles accessibles ?

| Métadonnée | Middleware (Edge) | Server Component | Client (useUser) |
|-----------|-------------------|------------------|------------------|
| `serverMetadata` | ❌ | ✅ | ❌ |
| `clientReadOnlyMetadata` | ❌ | ✅ | ✅ |
| `clientMetadata` | ❌ | ✅ | ✅ |

### Priorité d'accès

**Server Components** :
```typescript
const role = stackUser.serverMetadata?.role ||
             stackUser.clientReadOnlyMetadata?.role ||
             'user';
```

**Client Components** :
```typescript
const role = stackUser.clientReadOnlyMetadata?.role ||
             stackUser.clientMetadata?.role ||
             'user';
```

## Pourquoi cette approche ?

### ❌ Approche initiale (middleware complet)

Nous avons d'abord essayé de faire l'authentification complète dans le middleware, mais :

1. **Problème d'API** : L'API Stack Auth retournait des erreurs avec le JWT en Edge Runtime
   ```
   CANNOT_GET_OWN_USER_WITHOUT_USER: You have specified 'me' as a userId,
   but did not provide authentication for a user.
   ```

2. **Incompatibilité SDK** : Le SDK Stack Auth n'est pas pleinement compatible avec l'Edge Runtime

3. **Complexité** : Extraction manuelle du JWT depuis les cookies, configuration complexe des headers

### ✅ Approche finale (hybride)

La solution hybride :
- ✅ Fonctionne de manière fiable
- ✅ Rapide (vérification cookie en Edge)
- ✅ Sécurisée (vérification complète en Node)
- ✅ Simple à maintenir

## Configuration des nouveaux utilisateurs

Lors de la création d'un compte via le webhook Stack Auth :

**Fichier** : `app/api/stack-auth/webhook/route.ts`

```typescript
{
  server_metadata: {
    role: 'user',
  },
  client_read_only_metadata: {
    role: 'user',
    planningPermission: 'reader',
  },
}
```

Les nouveaux utilisateurs ont par défaut :
- **Rôle** : `user` (pas d'accès au dashboard)
- **Planning** : `reader` (lecture seule)

Pour accorder l'accès au dashboard, un admin doit manuellement changer le rôle vers `Admin` ou `Super Admin` via le script :
```bash
node scripts/fix-user-permission.js <email> editor
```

## Maintenance

### Modifier les permissions d'un utilisateur

```bash
# Donner accès éditeur planning
node scripts/fix-user-permission.js user@example.com editor

# Donner accès lecteur planning
node scripts/fix-user-permission.js user@example.com reader
```

### Migration des métadonnées

Si vous avez des utilisateurs avec des métadonnées dans `server_metadata` au lieu de `client_read_only_metadata` :

```bash
node scripts/migrate-planning-permission.js
```

## Résumé

| Niveau | Runtime | Vérification | Redirection |
|--------|---------|--------------|-------------|
| Middleware | Edge | Cookie présent | → `/login` si aucun cookie |
| Layout | Node | Authentification complète + Rôle | → `/login` si non auth<br>→ `/non-admin` si rôle insuffisant |

Cette architecture garantit une protection robuste et performante de toutes les routes du dashboard.
