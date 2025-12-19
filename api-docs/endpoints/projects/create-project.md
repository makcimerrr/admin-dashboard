# ➕ Créer un projet

Cet endpoint permet d'ajouter un nouveau projet à la configuration.

## 📝 Détails de l'Endpoint

- **URL** : `/api/projects`
- **Méthode** : `POST`

## 📥 Corps de la Requête (JSON)

| Champ               | Type   | Requis | Description                                      |
| :------------------ | :----- | :----- | :----------------------------------------------- |
| `name`              | String | ✅ Oui | Le nom du projet.                                |
| `project_time_week` | Number | ✅ Oui | La durée estimée du projet en semaines.          |
| `tech`              | String | ✅ Oui | La technologie associée (ex: "Golang", "Rust").  |

### Exemple

```json
{
  "name": "New Rust Project",
  "project_time_week": 2,
  "tech": "Rust"
}
```

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne un message de succès et la liste mise à jour des projets.

```json
{
  "message": "Project added.",
  "projects": { ... }
}
```

### ❌ Erreur Client (400 Bad Request)

Données invalides.

```json
{
  "error": "Invalid project data."
}
```
