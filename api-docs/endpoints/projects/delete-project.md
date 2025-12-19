# 🗑️ Supprimer un projet

Cet endpoint permet de supprimer un projet existant.

## 📝 Détails de l'Endpoint

- **URL** : `/api/projects`
- **Méthode** : `DELETE`

## 📥 Corps de la Requête (JSON)

| Champ  | Type   | Requis | Description               |
| :----- | :----- | :----- | :------------------------ |
| `tech` | String | ✅ Oui | La technologie du projet. |
| `id`   | Number | ✅ Oui | L'ID du projet à supprimer.|

### Exemple

```json
{
  "tech": "Rust",
  "id": 20
}
```

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne un message de succès et la liste mise à jour.

```json
{
  "message": "Project deleted.",
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
