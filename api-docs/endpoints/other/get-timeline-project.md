# ⏳ Timeline Projet

Cet endpoint calcule et retourne la timeline des projets pour toutes les promotions, en tenant compte des jours fériés et de la configuration des projets.

## 📝 Détails de l'Endpoint

- **URL** : `/api/timeline_project`
- **Méthode** : `GET`, `POST`

## 📥 Opérations

### GET - Obtenir la timeline

Calcule l'agenda et la progression pour chaque promotion.

**Réponse (200 OK) :**
```json
{
  "success": true,
  "data": [
    {
      "promotion": {
        "key": "P2024",
        "title": "Promo 2024",
        // ...
      },
      "timeline": {
        "agenda": [ ... ],
        "progress": { ... }
      },
      "currentProjects": {
        "single": "Projet X"
      },
      "status": "success"
    }
  ],
  "timestamp": "2024-03-15T10:00:00Z"
}
```

### POST - Mettre à jour l'environnement (Interne)

Met à jour le fichier de configuration en fonction du projet actuel.

**Corps de la requête :**
```json
{
  "projectName": "Projet Y",
  "promotion": "P2024"
}
```
