# Profil Hub

Cet endpoint récupère le profil de l'utilisateur actuellement authentifié dans le Hub.

**Méthode**: `GET`  
**Endpoint**: `/api/hub/profile`

## En-têtes

- `Authorization`: `Bearer votre-jeton-jwt`

## Réponse

**Succès (200 OK)**
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
