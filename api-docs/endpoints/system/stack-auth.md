# Authentification Stack

Cet endpoint est utilisé pour un flux d'authentification spécifique lié à la stack technique.

**Méthode**: `POST`  
**Endpoint**: `/api/stack-auth`

## Notes

Il s'agit d'un endpoint interne qui ne doit pas être utilisé directement par les utilisateurs finaux.

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "message": "Authentification de la stack réussie"
}
```
