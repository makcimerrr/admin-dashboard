# Jours Fériés

Cet endpoint récupère la liste des jours fériés.

**Méthode**: `GET`  
**Endpoint**: `/api/holidays`

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "name": "Jour de l'an"
    },
    {
      "date": "2024-12-25",
      "name": "Noël"
    }
  ]
}
```
