# Statut des Retards

Cet endpoint récupère le statut des retards des étudiants.

**Méthode**: `GET`  
**Endpoint**: `/api/delay-status`

## Paramètres de requête

- `promo` (string, optionnel) : Filtrer par promotion.

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "data": [
    {
      "studentId": "student-id",
      "delay": 2,
      "status": "en_retard"
    }
  ]
}
```
