# 🔄 Mise à jour Système

Cet endpoint déclenche une mise à jour manuelle des données du système en appelant l'API de timeline et en mettant à jour les statuts.

## 📝 Détails de l'Endpoint

- **URL** : `/api/update`
- **Méthode** : `POST`

## 📤 Réponses

### ✅ Succès (200 OK)

```json
{
  "success": true,
  "message": "Data updated successfully",
  "response": { ... }
}
```

### ❌ Erreur Serveur (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Error updating data"
}
```
