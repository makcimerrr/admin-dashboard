# Obtenir l'historique

Cet endpoint récupère l'historique des opérations.

**Méthode**: `GET`  
**Endpoint**: `/api/history`

## Paramètres de requête

- `limit` (number, optionnel) : Le nombre d'entrées d'historique à récupérer.
- `offset` (number, optionnel) : Le point de départ des entrées d'historique.

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "data": [
    {
      "id": "history-id",
      "operation": "create_project",
      "userId": "user-id",
      "timestamp": "2024-07-30T10:00:00.000Z"
    }
  ]
}
```
