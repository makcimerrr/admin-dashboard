# Connexion Hub

Cet endpoint est utilisé pour la connexion d'un utilisateur au Hub.

**Méthode**: `POST`  
**Endpoint**: `/api/hub/login`

## Corps de la requête

```json
{
  "email": "utilisateur@example.com",
  "password": "votremotdepasse"
}
```

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "data": {
    "token": "votre-jeton-jwt"
  }
}
```
