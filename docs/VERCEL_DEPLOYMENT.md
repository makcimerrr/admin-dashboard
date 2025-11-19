# 🚀 Guide de déploiement Vercel - Zone01 Admin Dashboard

Ce guide vous aidera à résoudre l'erreur de build Vercel et à déployer correctement l'application.

## ⚠️ Erreur actuelle

```
Error: Welcome to Stack Auth! It seems that you haven't provided a project ID.
Please create a project on the Stack dashboard at https://app.stack-auth.com
and put it in the NEXT_PUBLIC_STACK_PROJECT_ID environment variable.
```

## ✅ Solution

Les variables d'environnement Stack Auth ne sont pas configurées sur Vercel. Suivez ces étapes :

---

## 📋 Étape 1 : Accéder aux paramètres Vercel

1. Aller sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Sélectionner votre projet `admin-dashboard`
3. Cliquer sur **Settings**
4. Aller dans **Environment Variables**

---

## 🔐 Étape 2 : Ajouter les variables Stack Auth (CRITIQUES)

Ces variables sont **OBLIGATOIRES** pour que l'application fonctionne :

### NEXT_PUBLIC_STACK_PROJECT_ID
```
Valeur : your_stack_project_id
```
☑️ Production
☑️ Preview
☑️ Development

### NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
```
Valeur : your_publishable_client_key
```
☑️ Production
☑️ Preview
☑️ Development

### STACK_SECRET_SERVER_KEY
```
Valeur : your_secret_server_key
```
☑️ Production
☑️ Preview
☑️ Development

---

## 🗄️ Étape 3 : Ajouter les variables de base de données

### DATABASE_URL
```
Valeur : postgresql://user:password@host/database?sslmode=require
```
☑️ Production
☑️ Preview
☑️ Development

### POSTGRES_URL
```
Valeur : postgresql://user:password@host/database?sslmode=require
```
☑️ Production
☑️ Preview
☑️ Development

---

## 🌐 Étape 4 : Ajouter les variables de configuration

### NEXT_PUBLIC_ACCESS_TOKEN
```
Valeur : your_zone01_api_token
```
☑️ Production
☑️ Preview
☑️ Development

### AUTHENDPOINT
```
Valeur : https://hub.zone01normandie.org
```
☑️ Production
☑️ Preview
☑️ Development

### CRON_SECRET
```
Valeur : your_cron_secret_here
```
☑️ Production
☑️ Preview
☑️ Development

### AUTH_SECRET
```
Valeur : your_auth_secret_here
```
☑️ Production
☑️ Preview
☑️ Development

### NEXT_PUBLIC_BASE_URL
```
Production : https://votre-app.vercel.app
Preview : https://votre-app-git-branch.vercel.app
Development : http://localhost:3000
```
⚠️ **Important** : Remplacez par votre URL réelle de production Vercel

---

## 🔄 Étape 5 : Redéployer

Une fois toutes les variables ajoutées :

### Option A : Via le Dashboard Vercel
1. Aller dans **Deployments**
2. Cliquer sur les **3 points** du dernier déploiement
3. Cliquer sur **Redeploy**
4. Confirmer

### Option B : Via Git
```bash
git commit --allow-empty -m "trigger: redeploy with env vars"
git push origin main
```

---

## ✅ Vérification

Après le redéploiement, vérifiez que :

1. **Build réussi** ✅
   - Aucune erreur dans les logs de build
   - Message : "Build completed successfully"

2. **Application accessible** ✅
   - Ouvrir l'URL de production
   - La page de login s'affiche correctement

3. **Authentification fonctionne** ✅
   - Tester la connexion avec Google ou GitHub
   - Vérifier la redirection après login

4. **Dashboard accessible** ✅
   - Après connexion, accéder au dashboard
   - Vérifier que les données se chargent

---

## 🐛 Problèmes courants

### Build échoue toujours après ajout des variables

**Solution** : Vérifiez que vous avez coché les 3 environnements (Production, Preview, Development) pour chaque variable.

```bash
# Vérifier dans Vercel CLI
vercel env ls
```

### Erreur "Invalid project ID"

**Solution** : Vérifiez que `NEXT_PUBLIC_STACK_PROJECT_ID` est correct (sans espaces supplémentaires).

### Erreur de connexion à la base de données

**Solution** :
1. Vérifiez que l'URL contient `?sslmode=require`
2. Testez la connexion dans Neon Dashboard
3. Régénérez la connexion string si nécessaire

### OAuth callback errors

**Solution** : Mettez à jour les callback URLs dans Stack Auth Dashboard :
```
https://votre-app.vercel.app/api/stack-auth/oauth/callback
```

---

## 📝 Liste de vérification complète

Avant de déployer, assurez-vous que :

- [ ] Toutes les variables Stack Auth sont ajoutées
- [ ] Les variables de base de données sont correctes
- [ ] NEXT_PUBLIC_BASE_URL pointe vers l'URL de production
- [ ] Les 3 environnements sont cochés pour chaque variable
- [ ] Les callback URLs OAuth sont mis à jour
- [ ] Le code compile localement (`pnpm build`)
- [ ] Aucun secret n'est hardcodé dans le code

---

## 🔍 Logs utiles

### Voir les logs de build
```
Vercel Dashboard > Deployments > [Deployment] > Building
```

### Voir les logs runtime
```
Vercel Dashboard > Deployments > [Deployment] > Functions
```

### Logs en temps réel
```bash
vercel logs --follow
```

---

## 📞 Besoin d'aide ?

Si vous rencontrez toujours des problèmes :

1. **Vérifier les logs** - Dashboard Vercel > Logs
2. **Tester localement** - `pnpm build && pnpm start`
3. **Consulter la doc** - [docs/](./docs/)
4. **Ouvrir une issue** - [GitHub Issues](https://github.com/makcimerrr/admin-dashboard/issues)

---

## 📚 Ressources

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Stack Auth Documentation](https://docs.stack-auth.com/)
- [Neon Database Documentation](https://neon.tech/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

<div align="center">

**🚀 Bon déploiement !**

Une fois déployé avec succès, n'oubliez pas de :
- ✅ Tester toutes les fonctionnalités
- ✅ Configurer les Cron Jobs
- ✅ Mettre à jour les URLs OAuth
- ✅ Monitorer les logs

</div>
