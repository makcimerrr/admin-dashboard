# Guide des Métadonnées Stack Auth

## Types de métadonnées

Stack Auth propose 3 types de métadonnées pour stocker des informations utilisateur personnalisées :

### 1. **Server Metadata** (Recommandé pour role et planningPermission)

**Caractéristiques :**
- ✅ Accessible UNIQUEMENT côté serveur
- ✅ L'utilisateur ne peut JAMAIS y accéder directement
- ✅ Le plus sécurisé
- ❌ Non accessible dans les composants clients

**Quand l'utiliser :**
- Informations sensibles (rôles, permissions, données admin)
- Informations que l'utilisateur ne doit pas pouvoir modifier

**Comment l'utiliser :**

```typescript
// Côté serveur uniquement
const user = await stackServerApp.getUser();
const role = user?.serverMetadata?.role;
```

**Définir dans Stack Auth Dashboard :**
1. Users → Sélectionner utilisateur
2. Onglet "Server Metadata"
3. Ajouter :
```json
{
  "role": "Admin",
  "planningPermission": "editor"
}
```

### 2. **Client Read-Only Metadata** (Alternative pour affichage)

**Caractéristiques :**
- ✅ Accessible côté client ET serveur
- ✅ Modifiable UNIQUEMENT par le serveur
- ✅ L'utilisateur peut le lire mais pas le modifier
- ✅ Utile pour afficher le rôle dans l'UI

**Quand l'utiliser :**
- Informations que l'utilisateur doit voir mais pas modifier
- Badges, statuts, rôles affichés dans l'interface

**Comment l'utiliser :**

```typescript
// Côté serveur
const user = await stackServerApp.getUser();
const role = user?.clientReadOnlyMetadata?.role;

// Côté client
const user = stackClientApp.useUser();
const role = user?.clientReadOnlyMetadata?.role;
```

**Définir dans Stack Auth Dashboard :**
1. Users → Sélectionner utilisateur
2. Onglet "Client Read-Only Metadata"
3. Ajouter :
```json
{
  "role": "Admin",
  "planningPermission": "editor"
}
```

### 3. **Client Metadata** (Non recommandé pour role/permissions)

**Caractéristiques :**
- ✅ Accessible côté client ET serveur
- ⚠️ Modifiable par l'utilisateur
- ❌ Pas sécurisé pour les permissions

**Quand l'utiliser :**
- Préférences utilisateur (thème, langue, etc.)
- Informations non critiques
- JAMAIS pour les rôles ou permissions

**Comment l'utiliser :**

```typescript
// Côté client - L'utilisateur peut modifier
const user = stackClientApp.useUser();
await user?.update({
  clientMetadata: {
    theme: 'dark',
    language: 'fr'
  }
});
```

## Configuration actuelle

Notre application vérifie les métadonnées dans cet ordre :

```typescript
role = user.serverMetadata?.role ||
       user.clientReadOnlyMetadata?.role ||
       user.clientMetadata?.role ||
       'user'
```

**Pourquoi cet ordre ?**
1. **Server Metadata** en premier (le plus sécurisé)
2. **Client Read-Only** en second (si vous voulez l'afficher côté client)
3. **Client Metadata** en dernier (fallback, pas recommandé)
4. `'user'` par défaut si rien n'est défini

## Recommandation pour role et planningPermission

### ✅ Option A : Server Metadata (Le plus sécurisé)

**Avantages :**
- Maximum de sécurité
- L'utilisateur ne peut jamais voir ou modifier ses permissions
- Idéal pour les applications admin

**Inconvénients :**
- Non accessible côté client
- Ne peut pas afficher le rôle dans l'UI client directement

**Configuration :**
```json
// Dans Stack Auth Dashboard → Users → Server Metadata
{
  "role": "Admin",
  "planningPermission": "editor"
}
```

### ✅ Option B : Client Read-Only Metadata (Recommandé pour affichage)

**Avantages :**
- Sécurisé (utilisateur ne peut pas modifier)
- Accessible côté client pour affichage dans l'UI
- Bon compromis sécurité/fonctionnalité

**Inconvénients :**
- L'utilisateur peut voir son rôle (généralement pas un problème)

**Configuration :**
```json
// Dans Stack Auth Dashboard → Users → Client Read-Only Metadata
{
  "role": "Admin",
  "planningPermission": "editor"
}
```

### ❌ Option C : Client Metadata (Non recommandé)

**Problème :** L'utilisateur pourrait modifier son propre rôle ! Ne jamais utiliser pour les permissions.

## Modifier les métadonnées

### Via le Dashboard Stack Auth

1. Aller sur https://app.stack-auth.com
2. Sélectionner votre projet
3. Users → Cliquer sur l'utilisateur
4. Choisir l'onglet approprié :
   - "Server Metadata" pour le plus sécurisé
   - "Client Read-Only Metadata" pour affichage
5. Ajouter/modifier les métadonnées

### Via l'API

```typescript
// Dans votre code serveur
import { updateUserMetadata } from '@/lib/stack-auth';

// Server Metadata
await updateUserMetadata(userId, {
  server_metadata: {
    role: 'Admin',
    planningPermission: 'editor'
  }
});

// Client Read-Only Metadata
await updateUserMetadata(userId, {
  client_metadata: {
    role: 'Admin',
    planningPermission: 'editor'
  }
});
```

### Via un Webhook (Automatique)

Le fichier `app/api/stack-auth/webhook/route.ts` définit automatiquement les métadonnées lors de la création d'un utilisateur.

**Actuellement configuré pour Server Metadata.**

Pour utiliser Client Read-Only à la place, modifiez :

```typescript
// Avant (Server Metadata)
await updateUserMetadata(userId, {
  server_metadata: {
    role: 'user',
    planningPermission: 'reader'
  }
});

// Après (Client Read-Only)
await updateUserMetadata(userId, {
  client_metadata: {  // Stack API utilise client_metadata pour read-only
    role: 'user',
    planningPermission: 'reader'
  }
});
```

## Vérifier les métadonnées

### Dans les logs serveur

Après connexion, vérifiez la console :

```bash
User: {
  id: '...',
  email: '...',
  role: 'Admin',          # ← Devrait être défini
  planningPermission: 'editor'  # ← Devrait être défini
}
```

### Déboguer les métadonnées

Ajoutez temporairement dans `middleware.ts` :

```typescript
console.log('Server Metadata:', user?.serverMetadata);
console.log('Client Read-Only:', user?.clientReadOnlyMetadata);
console.log('Client Metadata:', user?.clientMetadata);
```

## Valeurs par défaut

**Rôles disponibles :**
- `Admin` - Accès complet
- `Super Admin` - Accès complet
- `user` - Accès limité (par défaut)

**Permissions planning :**
- `editor` - Peut modifier
- `reader` - Lecture seule (par défaut)

## FAQ

### Dois-je utiliser Server ou Client Read-Only ?

**Server Metadata** si :
- Vous ne voulez pas que l'utilisateur voie son rôle
- Sécurité maximale requise
- Application admin uniquement

**Client Read-Only** si :
- Vous voulez afficher le rôle dans l'UI
- Vous avez besoin d'accéder au rôle côté client
- Bon compromis sécurité/UX

### Comment migrer de Server vers Client Read-Only ?

1. Copier les métadonnées de Server → Client Read-Only dans le dashboard
2. Tester que tout fonctionne
3. (Optionnel) Supprimer les Server Metadata

### Les métadonnées ne se mettent pas à jour

- Vider le cache du navigateur
- Se déconnecter et reconnecter
- Redémarrer le serveur de dev
- Vérifier que les métadonnées sont bien dans le bon onglet du dashboard
