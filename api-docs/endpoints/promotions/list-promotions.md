# 📋 Lister toutes les promotions

Cet endpoint permet de récupérer la liste de toutes les promotions configurées.

## 📝 Détails de l'Endpoint

- **URL** : `/api/promotions`
- **Méthode** : `GET`

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne la liste des promotions.

```json
{
  "success": true,
  "promotions": [
    {
      "key": "P2024",
      "eventId": 123,
      "title": "Promo 2024",
      "dates": {
        "start": "2024-01-01",
        "end": "2024-12-31"
      }
    },
    {
      "key": "P2025",
      "eventId": 124,
      "title": "Promo 2025",
      "dates": {
        "start": "2025-01-01",
        "end": "2025-12-31"
      }
    }
  ]
}
```

### ❌ Erreur Serveur (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Internal error",
  "details": "Error message..."
}
```
