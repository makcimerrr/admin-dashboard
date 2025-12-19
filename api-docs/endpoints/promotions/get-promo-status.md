# 🚦 Statut de la promotion

Cet endpoint retourne le statut actuel des promotions pour l'affichage (ex: dashboard).

## 📝 Détails de l'Endpoint

- **URL** : `/api/promos/status`
- **Méthode** : `GET`

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne le statut des promotions.

```json
{
  "success": true,
  "promos": [
    {
      "promoKey": "P2024",
      "status": "OK",
      "currentProject": "Projet X",
      "progress": 85,
      "lastUpdated": "2024-03-15T10:00:00Z"
    }
    // ...
  ]
}
```

### ❌ Erreur Serveur (500 Internal Server Error)

```json
{
  "status": 500
}
```
