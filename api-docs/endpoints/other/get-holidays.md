# 🎉 Jours Fériés

Cet endpoint permet de gérer les jours fériés et vacances.

## 📝 Détails de l'Endpoint

- **URL** : `/api/holidays`
- **Méthode** : `GET`, `POST`, `DELETE`

## 📥 Opérations

### GET - Lister les jours fériés

Retourne tous les jours fériés configurés.

**Réponse :**
```json
{
  "success": true,
  "data": {
    "Noël": [{ "start": "2024-12-25", "end": "2024-12-25" }]
  }
}
```

### POST - Ajouter un jour férié

**Corps :**
```json
{
  "name": "Vacances Été",
  "start": "2024-07-01",
  "end": "2024-08-31"
}
```

### DELETE - Supprimer un jour férié

**Corps :**
```json
{
  "name": "Vacances Été"
}
```
