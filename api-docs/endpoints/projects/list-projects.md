# 📋 Lister tous les projets

Cet endpoint retourne la liste complète des projets configurés, organisés par technologie.

## 📝 Détails de l'Endpoint

- **URL** : `/api/projects`
- **Méthode** : `GET`

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne un objet JSON où les clés sont les technologies et les valeurs sont des listes de projets.

```json
{
  "Golang": [
    { "id": 1, "name": "Go Project 1", "project_time_week": 1 },
    { "id": 2, "name": "Go Project 2", "project_time_week": 2 }
  ],
  "Javascript": [
    { "id": 10, "name": "JS Project 1", "project_time_week": 1 }
  ],
  "Rust": [
    { "id": 20, "name": "Rust Project 1", "project_time_week": 2 }
  ]
}
```
