# Migration vers Stack Auth (Neon Auth)

Ce document décrit la migration de NextAuth vers Stack Auth pour l'authentification de l'application.

## Changements effectués

### 1. Configuration Stack Auth

- Création de `lib/stack-auth.ts` avec les fonctions d'authentification
- Configuration des variables d'environnement Stack Auth (déjà présentes dans `.env`)
- Les routes API Stack Auth sont disponibles dans `app/api/stack-auth/`

### 2. Routes API créées

- `/api/stack-auth/signin` - Connexion avec email/password
- `/api/stack-auth/signup` - Inscription avec email/password
- `/api/stack-auth/signout` - Déconnexion
- `/api/stack-auth/session` - Récupération de la session courante

### 3. Fichiers modifiés

#### Composants
- `components/login-form.tsx` - Mise à jour pour utiliser l'API Stack Auth
- `components/nav-user.tsx` - Mise à jour de la fonction de déconnexion

#### Layouts
- `app/(dashboard)/layout.tsx` - Utilise `getStackSession()` au lieu de `auth()`
- `app/(home)/layout.tsx` - Utilise `getStackSession()` au lieu de `auth()`

#### Middleware
- `middleware.ts` - Utilise `getStackSession()` pour vérifier l'authentification

#### Autres
- `app/(dashboard)/user.tsx` - Utilise `getStackSession()` au lieu de `auth()`

### 4. Fichiers supprimés

- `app/api/auth/[...nextauth]/route.ts` - Ancien handler NextAuth
- `lib/auth.ts` - Ancienne configuration NextAuth
- `types/next-auth.d.ts` - Types NextAuth
- `app/api/save-oauth-user/` - API de sauvegarde OAuth (plus nécessaire)

### 5. Dépendances

#### Supprimées
- `next-auth` - Remplacé par Stack Auth
- `bcryptjs` - Non utilisé avec Stack Auth

#### Ajoutées
- `@stackframe/stack` - SDK Stack Auth (optionnel, nous utilisons l'API directement)

## Configuration Stack Auth Dashboard

### Étapes à suivre sur Stack Auth Dashboard

1. **Créer un compte sur Stack Auth** (si ce n'est pas déjà fait)
   - Aller sur https://stack-auth.com
   - Créer un nouveau projet ou utiliser le projet existant (ID: `your_stack_project_id`)

2. **Configurer les méthodes d'authentification**
   - Dans le dashboard Stack Auth, aller dans "Authentication Methods"
   - Activer "Email/Password"
   - (Optionnel) Configurer OAuth providers (Google, GitHub) si nécessaire

3. **Configurer les métadonnées utilisateur**
   Stack Auth permet de stocker des métadonnées côté serveur et client. Pour notre application, nous utilisons:

   **Server Metadata** (accessible uniquement côté serveur):
   - `role`: Le rôle de l'utilisateur ('Admin', 'Super Admin', 'user', etc.)
   - `planningPermission`: Permission pour le planning ('editor' ou 'reader')

   Ces métadonnées peuvent être configurées via l'API ou le dashboard.

4. **Configurer les URLs de callback**
   - URL de base: `http://localhost:3000` (dev) ou votre URL de production
   - Callback URLs: Autoriser les redirections vers `/` et autres routes de votre application

## Gestion des rôles et permissions

Avec Stack Auth, les rôles et permissions sont stockés dans `server_metadata`. Pour définir les rôles d'un utilisateur:

### Via l'API (dans votre code serveur)

```typescript
import { updateUserMetadata } from '@/lib/stack-auth';

await updateUserMetadata(userId, {
  server_metadata: {
    role: 'Admin',
    planningPermission: 'editor'
  }
});
```

### Via le Dashboard Stack Auth

1. Aller dans "Users" dans le dashboard
2. Sélectionner un utilisateur
3. Éditer "Server Metadata"
4. Ajouter les champs `role` et `planningPermission`

## Migration des utilisateurs existants

Si vous avez des utilisateurs existants dans votre base de données, vous devrez:

1. **Créer les comptes dans Stack Auth**
   - Utiliser l'API Stack Auth pour créer les comptes
   - Ou inviter les utilisateurs à se réinscrire

2. **Migrer les métadonnées**
   - Utiliser `updateUserMetadata()` pour définir les rôles et permissions

## Authentification OAuth (optionnel)

Pour activer Google/GitHub:

1. Dans le dashboard Stack Auth, aller dans "OAuth Providers"
2. Configurer Google OAuth:
   - Client ID: `594642361311-t68t57dg2551m7vj27j755uae4vojjon.apps.googleusercontent.com`
   - Client Secret: (déjà dans `.env`)

3. Configurer GitHub OAuth:
   - Client ID: `Ov23lirZgk0OH6FRJIOl`
   - Client Secret: (déjà dans `.env`)

4. Décommenter les boutons OAuth dans `components/login-form.tsx`

## Variables d'environnement

Les variables suivantes sont déjà configurées dans `.env`:

```bash
# Stack Auth Configuration
NEXT_PUBLIC_STACK_PROJECT_ID='your_stack_project_id'
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY='pck_r7dnt6vj4wsc3e5mrqqtz7g71b1gwy08h67qe12ad90k0'
STACK_SECRET_SERVER_KEY='ssk_q5g4ab6h6gexcdcwqssgrm5k8v00s9tpzdpa0r4mn2a1g'
```

⚠️ **Important**: Le `STACK_SECRET_SERVER_KEY` ne doit JAMAIS être exposé côté client.

## Différences avec l'ancien système

### Avant (NextAuth + DB)
- Authentification via NextAuth
- Rôles stockés dans PostgreSQL
- Session JWT gérée par NextAuth
- OAuth via NextAuth providers

### Maintenant (Stack Auth)
- Authentification via Stack Auth API
- Rôles stockés dans Stack Auth (server_metadata)
- Session gérée via cookies HTTP-only
- OAuth via Stack Auth (à configurer)
- Plus besoin de gérer la base de données pour l'authentification

## Avantages de Stack Auth

1. **Sécurité renforcée**: Stack Auth gère la sécurité des mots de passe, 2FA, etc.
2. **Moins de code à maintenir**: Pas besoin de gérer soi-même l'authentification
3. **Scalabilité**: Stack Auth est conçu pour gérer des millions d'utilisateurs
4. **Fonctionnalités avancées**: 2FA, passwordless, magic links, etc. disponibles out-of-the-box
5. **Compliance**: Stack Auth est conforme GDPR, SOC2, etc.

## Prochaines étapes

1. ✅ Tester l'authentification localement
2. Configurer les rôles pour les utilisateurs dans Stack Auth dashboard
3. Migrer les utilisateurs existants (si nécessaire)
4. Configurer OAuth providers (optionnel)
5. Tester en production
6. Supprimer les anciennes tables d'authentification de la base de données (optionnel)

## Support

- Documentation Stack Auth: https://docs.stack-auth.com
- Dashboard Stack Auth: https://app.stack-auth.com
