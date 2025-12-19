# 🌐 Projets de toutes les promotions (3 derniers)

Cet endpoint retourne les 3 derniers projets pertinents pour **toutes** les promotions configurées, avec des statistiques.

## 📝 Détails de l'Endpoint

- **URL** : `/api/promotions/all/projects/last-three`
- **Méthode** : `GET`

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne une liste d'objets contenant les infos pour chaque promotion.

```json
{
  "success": true,
  "promotions": [
    {
      "promoId": 123,
      "promoKey": "P2024",
      "promotionName": "Promo 2024",
      "language": "Rust",
      "currentProject": "Projet Final",
      "projects": [
        { "name": "Projet A", "count": 15, "percentage": 75 },
        // ...
      ],
      "meta": { "totalStudents": 20, "aheadCount": 1, "aheadPercentage": 5 }
    },
    {
      "promoId": 124,
      "promoKey": "P2025",
      // ...
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
