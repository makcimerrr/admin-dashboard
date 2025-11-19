# Stack Auth - Guide de dépannage

## Problème : Reste sur /login après connexion OAuth

### Cause
Lorsqu'un utilisateur se connecte pour la première fois via OAuth (Google/GitHub), il n'a pas de métadonnées définies (`role`, `planningPermission`). Le middleware redirige vers `/login` car il ne reconnaît pas l'utilisateur comme ayant un rôle valide.

### Solutions

#### Solution 1 : Définir les rôles manuellement (temporaire)

1. **Se connecter via Stack Auth Dashboard**
   - Aller sur https://app.stack-auth.com
   - Sélectionner votre projet
   - Aller dans "Users"
   - Sélectionner l'utilisateur qui vient de se connecter
   - Cliquer sur "Edit" ou "Server Metadata"

2. **Ajouter les métadonnées**
   ```json
   {
     "role": "Admin",
     "planningPermission": "editor"
   }
   ```

3. **Sauvegarder et réessayer**
   - L'utilisateur devrait maintenant pouvoir accéder au dashboard

#### Solution 2 : Utiliser les webhooks Stack Auth (recommandé)

Stack Auth peut appeler un webhook lorsqu'un nouvel utilisateur est créé. Cela permet de définir automatiquement les métadonnées.

**Configuration :**

1. **Dans le Stack Auth Dashboard**
   - Aller dans "Settings" > "Webhooks"
   - Ajouter un nouveau webhook
   - URL : `https://votredomaine.com/api/stack-auth/webhook`
   - Événements : Cocher "user.created"

2. **Le webhook est déjà créé**
   - Fichier : `app/api/stack-auth/webhook/route.ts`
   - Définit automatiquement `role: 'user'` et `planningPermission: 'reader'`

3. **Personnaliser les rôles par défaut**
   - Éditer `app/api/stack-auth/webhook/route.ts`
   - Changer les valeurs par défaut selon vos besoins

#### Solution 3 : Définir les rôles via l'API

Vous pouvez aussi créer une route API admin pour gérer les rôles :

```typescript
// app/api/admin/update-user-role/route.ts
import { updateUserMetadata } from '@/lib/stack-auth';

export async function POST(req: Request) {
  const { userId, role, planningPermission } = await req.json();

  await updateUserMetadata(userId, {
    server_metadata: {
      role,
      planningPermission,
    },
  });

  return Response.json({ success: true });
}
```

## Vérifier que l'authentification fonctionne

### Console du navigateur
Après connexion, vérifiez la console :
```javascript
// Devrait afficher l'utilisateur connecté
console.log('User:', userFormatted);
```

### Cookies
Vérifiez que les cookies Stack Auth sont définis :
- `stack-access-token-...`
- `stack-refresh-token-...`

### Logs serveur
Dans la console serveur (terminal où `npm run dev` tourne) :
```
User: { id: '...', email: '...', role: 'Admin', ... } URL: /
```

## Problèmes courants

### "L'utilisateur est bien connecté mais redirigé vers /non-admin"

**Cause :** Le rôle n'est pas "Admin" ou "Super Admin"

**Solution :**
- Définir le rôle à "Admin" via le dashboard Stack Auth
- Ou modifier le middleware pour autoriser d'autres rôles

### "Les métadonnées sont undefined"

**Cause :** Les métadonnées serveur ne sont pas définies

**Solution :**
- Vérifier que `serverMetadata` est bien défini dans Stack Auth
- Utiliser le webhook pour définir les métadonnées automatiquement
- Ou les définir manuellement via le dashboard

### "Cannot read properties of null"

**Cause :** `stackServerApp.getUser()` retourne `null`

**Solution :**
- Vérifier que les cookies Stack Auth sont bien présents
- Vérifier que les variables d'environnement sont correctes
- Vider le cache et les cookies du navigateur
- Redémarrer le serveur de développement

## Configuration actuelle

### Rôles disponibles
- `Admin` - Accès complet au dashboard
- `Super Admin` - Accès complet au dashboard
- `user` - Accès limité (redirigé vers /non-admin)

### Permissions planning
- `editor` - Peut modifier le planning
- `reader` - Lecture seule

### Routes autorisées sans rôle Admin
- `/non-admin`
- `/contact`
- `/docs`
- `/settings`
- `/privacy`

## Modifier les règles d'accès

Éditez `middleware.ts` pour personnaliser les règles :

```typescript
// Autoriser tous les utilisateurs connectés (pas besoin d'être Admin)
if (userFormatted) {
  return NextResponse.next();
}

// Ou autoriser certains rôles spécifiques
if (userFormatted && ['Admin', 'Super Admin', 'Manager'].includes(userFormatted.role)) {
  return NextResponse.next();
}
```

## Support

- Stack Auth Documentation: https://docs.stack-auth.com
- Stack Auth Dashboard: https://app.stack-auth.com
