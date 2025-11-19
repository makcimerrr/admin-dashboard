# Configuration des Métadonnées Automatiques

Ce guide explique comment configurer l'attribution automatique de métadonnées par défaut pour tous les nouveaux utilisateurs.

## 🎯 Objectif

Lorsqu'un utilisateur se connecte pour la première fois (via OAuth ou email/password), il reçoit automatiquement :
- **`role: 'user'`** - Pas d'accès admin par défaut
- **`planningPermission: 'reader'`** - Lecture seule par défaut

## 🔧 Deux systèmes de sécurité

### 1. **Webhook Stack Auth** (Méthode recommandée)

Le webhook est appelé par Stack Auth lors de la création d'un utilisateur.

**Fichier :** `app/api/stack-auth/webhook/route.ts`

**Événements gérés :**
- `user.created` - Définit les métadonnées lors de la création
- `user.signed_in` - Vérifie et crée si manquant (filet de sécurité)

### 2. **Middleware automatique** (Solution de secours)

Si le webhook ne fonctionne pas, le middleware crée automatiquement les métadonnées lors de la première requête.

**Fichier :** `middleware.ts`

**Fonctionnement :**
- Détecte si un utilisateur connecté n'a pas de `role`
- Crée automatiquement les métadonnées par défaut
- Les métadonnées sont disponibles à la prochaine requête

## 📝 Configuration du Webhook (Recommandé)

### Étape 1 : Créer le webhook dans Stack Auth

1. Aller sur https://app.stack-auth.com
2. Sélectionner votre projet
3. Aller dans **"Settings"** → **"Webhooks"**
4. Cliquer sur **"Add Webhook"** ou **"Create Webhook"**

### Étape 2 : Configurer le webhook

**URL du webhook :**

**Développement (avec ngrok ou similaire) :**
```
https://votre-tunnel.ngrok.io/api/stack-auth/webhook
```

**Production :**
```
https://votredomaine.com/api/stack-auth/webhook
```

**Événements à cocher :**
- ✅ `user.created`
- ✅ `user.signed_in` (optionnel, filet de sécurité)

### Étape 3 : Tester le webhook

**En développement avec ngrok :**

1. Installer ngrok :
   ```bash
   brew install ngrok  # macOS
   # ou télécharger depuis https://ngrok.com
   ```

2. Démarrer votre serveur :
   ```bash
   npm run dev
   ```

3. Créer un tunnel ngrok :
   ```bash
   ngrok http 3000
   ```

4. Copier l'URL ngrok (ex: `https://abc123.ngrok.io`)

5. Dans Stack Auth Dashboard :
   - URL webhook : `https://abc123.ngrok.io/api/stack-auth/webhook`
   - Sauvegarder

6. Créer un nouvel utilisateur (OAuth ou email/password)

7. Vérifier les logs :
   ```bash
   📥 Webhook reçu: user.created { user_id: '...' }
   👤 Nouvel utilisateur créé: abc123...
   ✅ Métadonnées définies pour: abc123...
   ```

### Étape 4 : Vérifier que ça fonctionne

**Dans Stack Auth Dashboard :**
1. Aller dans "Users"
2. Sélectionner l'utilisateur nouvellement créé
3. Onglet "Server Metadata"
4. Devrait contenir :
   ```json
   {
     "role": "user",
     "planningPermission": "reader"
   }
   ```

## 🛡️ Solution de secours (Middleware)

Si le webhook ne peut pas être configuré (développement local sans tunnel), le middleware crée automatiquement les métadonnées.

**Fonctionnement :**

1. L'utilisateur se connecte
2. Le middleware détecte `user.serverMetadata?.role` est `undefined`
3. Appelle automatiquement `ensureUserMetadata(user.id)`
4. Les métadonnées sont créées
5. À la prochaine requête, l'utilisateur a son rôle

**Logs à observer :**

```bash
👤 User: votre@email.com (user)  # Première requête, pas de role
⚠️  Création automatique des métadonnées pour: abc123
✅ Métadonnées créées automatiquement pour: abc123
👤 User: votre@email.com (user)  # Requête suivante, role défini
```

## 🔒 Valeurs par défaut

**Définies dans :**
- `app/api/stack-auth/webhook/route.ts`
- `lib/ensure-user-metadata.ts`

```typescript
{
  role: 'user',              // Pas d'accès admin
  planningPermission: 'reader'  // Lecture seule
}
```

**Pour changer les valeurs par défaut :**

Éditez les deux fichiers et changez :

```typescript
server_metadata: {
  role: 'visitor',           // Nouveau rôle par défaut
  planningPermission: 'none'  // Nouvelle permission par défaut
}
```

## 🎭 Promouvoir un utilisateur en Admin

### Manuellement via Dashboard

1. https://app.stack-auth.com → Users
2. Sélectionner l'utilisateur
3. Server Metadata → Éditer
4. Changer :
   ```json
   {
     "role": "Admin",
     "planningPermission": "editor"
   }
   ```

### Via l'API

Créez une route API admin (protégée !) :

```typescript
// app/api/admin/promote-user/route.ts
import { stackServerApp } from '@/lib/stack-server';

export async function POST(req: Request) {
  // Vérifier que l'appelant est admin
  const currentUser = await stackServerApp.getUser();
  if (currentUser?.serverMetadata?.role !== 'Admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, role, planningPermission } = await req.json();

  const response = await fetch(
    `https://api.stack-auth.com/api/v1/users/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
        'x-stack-secret-server-key': process.env.STACK_SECRET_SERVER_KEY!,
      },
      body: JSON.stringify({
        server_metadata: { role, planningPermission },
      }),
    }
  );

  return Response.json({ success: response.ok });
}
```

## 🐛 Dépannage

### Le webhook ne se déclenche pas

**Vérifications :**
1. ✅ L'URL est accessible depuis Internet (utilisez ngrok en dev)
2. ✅ L'URL se termine par `/api/stack-auth/webhook`
3. ✅ Les événements sont cochés dans Stack Auth
4. ✅ Le webhook est activé (toggle ON)

**Test manuel :**
```bash
curl -X POST http://localhost:3000/api/stack-auth/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user.created",
    "data": {
      "user_id": "test-user-123"
    }
  }'
```

### Les métadonnées ne sont pas créées

**Vérifier les logs serveur :**
```bash
# Devrait voir
📥 Webhook reçu: user.created
✅ Métadonnées définies pour: ...

# Ou avec le middleware
⚠️  Création automatique des métadonnées pour: ...
✅ Métadonnées créées automatiquement pour: ...
```

**Si rien ne s'affiche :**
- Le webhook n'est pas configuré OU
- Le middleware ne détecte pas l'absence de métadonnées

### Les métadonnées existent mais sont vides

Vérifiez dans Stack Auth Dashboard que les valeurs sont bien :
- Dans **"Server Metadata"** (pas Client !)
- Avec les bonnes clés : `role` et `planningPermission`

## 📊 Flux complet

```
Nouvel utilisateur se connecte
    ↓
Stack Auth crée l'utilisateur
    ↓
Webhook déclenché → user.created
    ↓
API /webhook reçoit l'événement
    ↓
Définit server_metadata { role: 'user', planningPermission: 'reader' }
    ↓
Utilisateur a ses métadonnées
    ↓
(Si webhook a échoué)
    ↓
Middleware détecte absence de role
    ↓
ensureUserMetadata() crée les métadonnées
    ↓
Utilisateur a ses métadonnées
```

## ✅ Checklist

- [ ] Webhook configuré dans Stack Auth Dashboard
- [ ] URL webhook correcte et accessible
- [ ] Événements `user.created` et `user.signed_in` cochés
- [ ] Testé avec un nouvel utilisateur
- [ ] Métadonnées visibles dans Dashboard → Users → Server Metadata
- [ ] Logs montrent la création des métadonnées
- [ ] Solution de secours (middleware) fonctionne si webhook échoue
