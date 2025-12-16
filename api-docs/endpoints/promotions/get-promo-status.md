# Statut de la promotion

Cet endpoint récupère le statut d'une promotion.

**Méthode**: `GET`  
**Endpoint**: `/api/promos/status`

## Paramètres de requête

- `promoId` (string, requis) : L'identifiant de la promotion.

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "data": {
    "status": "in_progress"
  }
}
```
