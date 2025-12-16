# Semaine Hackathon

Cet endpoint fournit des informations sur la semaine du hackathon.

**Méthode**: `GET`  
**Endpoint**: `/api/hackaton-week`

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "data": {
    "startDate": "2024-08-05",
    "endDate": "2024-08-09",
    "topic": "L'IA pour le bien commun"
  }
}
```
