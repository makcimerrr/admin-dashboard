# Obtenir/Modifier/Supprimer un utilisateur par ID

Cet endpoint permet d'obtenir, mettre à jour ou supprimer un utilisateur via son identifiant.

## Obtenir un utilisateur

**Méthode**: `GET`  
**Endpoint**: `/api/users/{id}`

### Réponse
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "name": "Nom de l'utilisateur",
    "email": "utilisateur@example.com"
  }
}
```

## Mettre à jour un utilisateur

**Méthode**: `PUT` ou `PATCH`  
**Endpoint**: `/api/users/{id}`

### Corps de la requête
```json
{
  "name": "Nouveau nom de l'utilisateur"
}
```

### Réponse
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "name": "Nouveau nom de l'utilisateur",
    "email": "utilisateur@example.com"
  }
}
```

## Supprimer un utilisateur

**Méthode**: `DELETE`  
**Endpoint**: `/api/users/{id}`

### Réponse
```json
{
  "success": true,
  "message": "Utilisateur supprimé avec succès"
}
```
