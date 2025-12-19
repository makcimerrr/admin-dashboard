# 🔍 Obtenir une promotion par ID

Cet endpoint permet de récupérer les détails d'une promotion spécifique, y compris son projet actuel.

## 📝 Détails de l'Endpoint

- **URL** : `/api/promotions/[promoId]`
- **Méthode** : `GET`

## 📥 Paramètres d'URL

| Paramètre | Type   | Requis | Description                     |
| :-------- | :----- | :----- | :------------------------------ |
| `promoId` | String | ✅ Oui | L'ID de l'événement (eventId) de la promotion. |

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne les détails de la promotion.

```json
{
  "success": true,
  "promotion": {
    "key": "P2024",
    "eventId": 123,
    "title": "Promo 2024",
    "dates": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "currentProject": "Projet X"
  }
}
```

### ❌ Non Trouvé (404 Not Found)

```json
{
  "success": false,
  "message": "Promotion not found"
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
