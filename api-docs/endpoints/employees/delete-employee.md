# 🗑️ Supprimer un employé

Cet endpoint permet de supprimer un employé.

## 📝 Détails de l'Endpoint

- **URL** : `/api/employees/[id]`
- **Méthode** : `DELETE`
- **Headers** :
  - `x-user-id`: ID de l'utilisateur effectuant l'action.
  - `x-user-email`: Email de l'utilisateur effectuant l'action.

## 📥 Paramètres d'URL

| Paramètre | Type   | Requis | Description                     |
| :-------- | :----- | :----- | :------------------------------ |
| `id`      | String | ✅ Oui | L'ID de l'employé à supprimer.  |

## 📤 Réponses

### ✅ Succès (200 OK)

```json
{
  "message": "Employee deleted successfully"
}
```

### ❌ Non Trouvé (404 Not Found)

```json
{
  "error": "Employee not found"
}
```
