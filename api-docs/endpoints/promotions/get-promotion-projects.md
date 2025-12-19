# 📊 Projets d'une promotion (3 derniers)

Cet endpoint retourne les 3 derniers projets pertinents pour une promotion donnée, avec des statistiques sur l'avancement des étudiants.

## 📝 Détails de l'Endpoint

- **URL** : `/api/promotions/[promoId]/projects/last-three`
- **Méthode** : `GET`

## 📥 Paramètres d'URL

| Paramètre | Type   | Requis | Description                     |
| :-------- | :----- | :----- | :------------------------------ |
| `promoId` | String | ✅ Oui | L'ID de l'événement (eventId) de la promotion. |

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne les projets et les statistiques.

```json
{
  "success": true,
  "promotionName": "Promo 2024",
  "language": "Rust",
  "currentProject": "Projet Final",
  "projects": [
    {
      "name": "Projet A",
      "language": "Rust",
      "count": 15,
      "percentage": 75
    },
    {
      "name": "Projet B",
      "language": "Rust",
      "count": 10,
      "percentage": 50
    },
    {
      "name": "Projet Final",
      "language": "Rust",
      "count": 2,
      "percentage": 10
    }
  ],
  "meta": {
    "totalStudents": 20,
    "aheadCount": 1,
    "aheadPercentage": 5
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
