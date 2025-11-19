# État de l'authentification Stack Auth

## ✅ Ce qui fonctionne

### 1. Authentification OAuth (Google/GitHub)
- ✅ Les boutons OAuth sont actifs
- ✅ Stack Auth gère la redirection OAuth
- ✅ Les cookies de session sont correctement définis
- ✅ Le SDK Stack Auth fonctionne dans les Server Components

### 2. Server Components
- ✅ `stackServerApp.getUser()` fonctionne dans les layouts et pages
- ✅ Import lazy du SDK pour éviter les problèmes Edge Runtime
- ✅ Les métadonnées utilisateur sont récupérées (Server/Client Read-Only/Client)

### 3. Authentification dans les layouts
- ✅ `app/(dashboard)/layout.tsx` - Vérifie l'auth et redirige vers `/login` si non connecté
- ✅ `app/(home)/layout.tsx` - Vérifie l'auth
- ✅ Logs pour déboguer : affiche email et rôle de l'utilisateur

### 4. Métadonnées automatiques
- ✅ Webhook configuré : `/api/stack-auth/webhook`
- ✅ Création automatique des métadonnées par défaut (`role: 'user'`, `planningPermission: 'reader'`)
- ✅ Fallback dans `lib/ensure-user-metadata.ts`

## ⚠️ Limitations actuelles

### 1. Middleware désactivé
**Raison :** Incompatibilité entre le SDK Stack Auth et Edge Runtime

Le middleware est temporairement désactivé car :
- Le SDK Stack Auth utilise des hooks React non disponibles dans Edge Runtime
- L'API Stack Auth ne reconnaît pas les JWT extraits des cookies (erreur: `CANNOT_GET_OWN_USER_WITHOUT_USER`)
- Format des cookies Stack Auth : `["refreshToken", "accessTokenJWT"]`

**Impact :**
- Pas de protection au niveau middleware
- La protection se fait au niveau des layouts (Server Components)
- Légèrement moins performant (vérification après le chargement du layout)

**Fichier :** `middleware.ts` (laisse passer toutes les requêtes)

### 2. API directe Stack Auth non fonctionnelle dans middleware
**Problème :** Le JWT extrait du cookie `stack-access` n'est pas reconnu par l'API

**Testé :**
- ✅ Extraction du JWT depuis `stack-access[1]` (le 2ème élément)
- ✅ Headers testés : avec/sans `x-stack-access-type`, avec/sans `x-stack-publishable-client-key`
- ❌ API retourne toujours : `CANNOT_GET_OWN_USER_WITHOUT_USER`

**Fichier :** `lib/stack-middleware-auth.ts` (non utilisé actuellement)

## 🔧 Configuration actuelle

### Valeurs par défaut pour nouveaux utilisateurs
```json
{
  "role": "user",
  "planningPermission": "reader"
}
```

### Rôles disponibles
- `Admin` - Accès complet au dashboard
- `Super Admin` - Accès complet au dashboard
- `user` - Accès limité (redirigé vers `/non-admin`)

### Protection des routes
**Actuellement :** Au niveau du layout (Server Component)
- Si non connecté → redirect `/login`
- Si connecté → accès autorisé (logique métier dans les pages)

## 🎯 Prochaines étapes

### Option 1 : Continuer sans middleware (Recommandé)
**Avantages :**
- Fonctionne actuellement
- Utilise le SDK Stack Auth officiel
- Simple à maintenir

**Inconvénients :**
- Protection au niveau layout (moins optimal)
- Légèrement moins performant

### Option 2 : Résoudre l'API Stack Auth dans middleware
**Nécessite :**
- Contacter le support Stack Auth pour comprendre le format JWT attendu
- Ou trouver la documentation API exacte pour l'authentification JWT

**Fichiers à réactiver :**
- `middleware.ts` - Décommenter la logique d'auth
- `lib/stack-middleware-auth.ts` - Fonction `getStackUserFromRequest()`

### Option 3 : Utiliser Stack Auth SDK dans middleware (Futur)
**Attend :**
- Que Stack Auth rende son SDK compatible Edge Runtime
- Ou utiliser une version spécifique Edge-compatible

## 📝 Comment utiliser actuellement

### 1. Connexion
- Aller sur `/login`
- Cliquer sur "Login with Google" ou "Login with Github"
- Stack Auth gère la redirection OAuth
- Retour sur l'application avec session active

### 2. Vérifier l'utilisateur
```typescript
// Dans un Server Component
import { stackServerApp } from '@/lib/stack-server';

export default async function Page() {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect('/login');
  }

  // Utiliser user.serverMetadata?.role, etc.
}
```

### 3. Déconnexion
```typescript
// Dans un Server Action
'use server';
import { stackServerApp } from '@/lib/stack-server';

export async function logout() {
  await stackServerApp.signOut();
}
```

### 4. Promouvoir un utilisateur en Admin
**Via Stack Auth Dashboard :**
1. https://app.stack-auth.com → Users
2. Sélectionner l'utilisateur
3. Server Metadata → Éditer
4. Changer `role` à `"Admin"` et `planningPermission` à `"editor"`

## 🐛 Dépannage

### L'utilisateur est toujours redirigé vers /login
**Vérifier :**
1. Les cookies Stack Auth sont présents (DevTools → Application → Cookies)
   - `stack-access`
   - `stack-refresh-{PROJECT_ID}--default`
2. Les variables d'environnement sont correctes
3. Les logs serveur : `✅ Dashboard - Utilisateur connecté: email@example.com Role: user`

### Le SDK ne charge pas
**Erreur :** `'useContext' is not exported from 'react'`

**Solution :** Déjà corrigée - Import lazy dans `lib/stack-server.ts`

### Les métadonnées ne sont pas créées
**Vérifier :**
1. Le webhook est configuré dans Stack Auth Dashboard
2. OU le middleware de fallback est actif (actuellement désactivé)
3. Créer manuellement via le dashboard

## 📚 Fichiers importants

- `lib/stack-server.ts` - SDK Stack Auth pour Server Components ✅
- `lib/stack-client.ts` - SDK Stack Auth pour Client Components ✅
- `lib/stack-helpers.ts` - Fonctions helper pour formater l'utilisateur ✅
- `middleware.ts` - Auth désactivée ⚠️
- `lib/stack-middleware-auth.ts` - API directe (non fonctionnelle) ❌
- `app/api/stack-auth/webhook/route.ts` - Webhook métadonnées automatiques ✅
- `lib/ensure-user-metadata.ts` - Création auto métadonnées ✅

## ✅ Statut final

**L'authentification Stack Auth fonctionne !**

- OAuth Google/GitHub : ✅
- Session utilisateur : ✅
- Protection des routes : ✅ (via layouts)
- Métadonnées automatiques : ✅ (via webhook)
- Middleware : ⚠️ (désactivé temporairement)

**Pour utiliser l'application :**
1. Se connecter via OAuth
2. Définir le rôle Admin dans Stack Auth Dashboard
3. Accéder au dashboard

**Tout fonctionne sauf le middleware qui est désactivé pour éviter les erreurs.**
