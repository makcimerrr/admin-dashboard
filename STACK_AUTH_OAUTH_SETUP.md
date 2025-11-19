# Configuration OAuth pour Stack Auth

Les boutons Google et GitHub sont maintenant actifs et utilisent le SDK Stack Auth ! Voici comment configurer OAuth dans Stack Auth.

## ✅ Configuration actuelle

- Le SDK Stack Auth (`@stackframe/stack`) est utilisé pour gérer OAuth
- La méthode `signInWithOAuth()` gère automatiquement le flux OAuth
- Les sessions sont stockées dans des cookies HTTP-only

## ⚠️ IMPORTANT : Configuration requise

Pour que Google et GitHub OAuth fonctionnent, vous devez configurer les providers dans le **Stack Auth Dashboard**.

## 📝 Étapes de configuration

### 1. Accéder au Stack Auth Dashboard

1. Aller sur https://app.stack-auth.com
2. Se connecter avec votre compte
3. Sélectionner votre projet (ID: `dd6e2f80-b3da-4d4b-85f9-9cf7f443ab97`)

### 2. Configurer Google OAuth

1. Dans le dashboard Stack Auth, aller dans **"OAuth Providers"** ou **"Authentication"**
2. Cliquer sur **"Add Provider"** ou **"Configure"**
3. Sélectionner **Google**
4. Entrer les informations suivantes :

   ```
   Client ID: YOUR_GOOGLE_CLIENT_ID
   Client Secret: YOUR_GOOGLE_CLIENT_SECRET
   ```

5. Configurer l'URL de callback :
   ```
   http://localhost:3000/api/stack-auth/oauth/callback (développement)
   https://votredomaine.com/api/stack-auth/oauth/callback (production)
   ```

6. Sauvegarder

### 3. Configurer GitHub OAuth

1. Dans le dashboard Stack Auth, cliquer sur **"Add Provider"**
2. Sélectionner **GitHub**
3. Entrer les informations suivantes :

   ```
   Client ID: YOUR_GITHUB_CLIENT_ID
   Client Secret: YOUR_GITHUB_CLIENT_SECRET
   ```

4. Configurer l'URL de callback (même que Google) :
   ```
   http://localhost:3000/api/stack-auth/oauth/callback (développement)
   https://votredomaine.com/api/stack-auth/oauth/callback (production)
   ```

5. Sauvegarder

### 4. Mettre à jour les OAuth Apps (si nécessaire)

Si vous obtenez des erreurs de redirection, vous devrez peut-être mettre à jour vos OAuth Apps sur Google et GitHub :

#### Google Cloud Console

1. Aller sur https://console.cloud.google.com
2. Sélectionner votre projet
3. Aller dans **"APIs & Services" > "Credentials"**
4. Trouver votre OAuth 2.0 Client ID
5. Ajouter l'URI de redirection Stack Auth dans **"Authorized redirect URIs"**

#### GitHub OAuth Apps

1. Aller sur https://github.com/settings/developers
2. Cliquer sur votre OAuth App
3. Mettre à jour **"Authorization callback URL"** avec l'URL fournie par Stack Auth

## 🔧 Fichiers créés/modifiés

- ✅ `lib/stack-client.ts` - Configuration du client Stack Auth
- ✅ `app/layout.tsx` - StackProvider configuré pour toute l'application
- ✅ `components/login-form.tsx` - Boutons OAuth utilisant `signInWithOAuth()`
- ✅ `app/api/stack-auth/oauth/callback/route.ts` - Handler de callback OAuth (optionnel avec SDK)

## 🧪 Tester OAuth

1. Lancer l'application : `npm run dev`
2. Aller sur `/login`
3. Cliquer sur "Login with Google" ou "Login with Github"
4. Vous serez redirigé vers Stack Auth OAuth
5. Après connexion, vous serez redirigé vers votre application

## ❓ FAQ

### Les boutons OAuth ne fonctionnent pas

- Vérifiez que vous avez bien configuré les providers dans Stack Auth Dashboard
- Vérifiez que les URLs de callback sont correctes
- Vérifiez la console du navigateur pour voir les erreurs

### Erreur "redirect_uri_mismatch"

- L'URL de callback dans Stack Auth ne correspond pas à celle configurée dans Google/GitHub
- Assurez-vous que l'URL est exactement la même (avec ou sans trailing slash)

### Les métadonnées utilisateur (role, planningPermission) ne sont pas définies

- Après la première connexion OAuth, vous devrez définir les métadonnées via le dashboard Stack Auth ou l'API
- Aller dans "Users" dans le dashboard, sélectionner l'utilisateur, et éditer "Server Metadata"

## 📚 Ressources

- Stack Auth OAuth Documentation: https://docs.stack-auth.com/authentication/oauth
- Google OAuth Setup: https://console.cloud.google.com
- GitHub OAuth Setup: https://github.com/settings/developers
