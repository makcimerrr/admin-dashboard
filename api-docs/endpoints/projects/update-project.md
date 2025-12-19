# 🔄 Mettre à jour un projet (Réorganiser)

Cet endpoint permet de réorganiser l'ordre des projets pour une technologie donnée.

## 📝 Détails de l'Endpoint

- **URL** : `/api/projects`
- **Méthode** : `PATCH`

## 📥 Corps de la Requête (JSON)

| Champ               | Type          | Requis | Description                                      |
| :------------------ | :------------ | :----- | :----------------------------------------------- |
| `tech`              | String        | ✅ Oui | La technologie concernée.                        |
| `reorderedProjects` | Array<Number> | ✅ Oui | Liste des IDs de projets dans le nouvel ordre.   |

### Exemple

```json
{
  "tech": "Rust",
  "reorderedProjects": [21, 20, 22]
}
```

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne un message de succès et la liste mise à jour.

```json
{
  "message": "Projects reordered.",
  "projects": { ... }
}
```

### ❌ Erreur Client (400 Bad Request)

Technologie non trouvée.

```json
{
  "error": "Tech not found."
}
```
