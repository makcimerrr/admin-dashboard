# Inscription Utilisateur

Cet endpoint est utilisé pour l'inscription d'un nouvel utilisateur.

**Méthode**: `POST`  
**Endpoint**: `/api/register`

## Corps de la requête

```json
{
  "email": "nouvelutilisateur@example.com",
  "password": "motdepassesolide",
  "name": "Nouvel Utilisateur"
}
```

## Réponse

**Succès (201 Created)**
```json
{
  "success": true,
  "data": {
    "id": "new-user-id",
    "name": "Nouvel Utilisateur",
    "email": "nouvelutilisateur@example.com"
  }
}
```
