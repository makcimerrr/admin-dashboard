# 🗑️ Supprimer un planning

Cet endpoint supprime le planning d'un employé pour un jour spécifique.

## 📝 Détails de l'Endpoint

- **URL** : `/api/schedules`
- **Méthode** : `DELETE`
- **Headers** :
  - `x-user-id`: ID de l'utilisateur.
  - `x-user-email`: Email de l'utilisateur.

## 📥 Paramètres d'URL (Query Params)

| Paramètre    | Type   | Requis | Description                     |
| :----------- | :----- | :----- | :------------------------------ |
| `employeeId` | String | ✅ Oui | L'ID de l'employé.              |
| `weekKey`    | String | ✅ Oui | La semaine concernée.           |
| `day`        | String | ✅ Oui | Le jour concerné.               |

## 📤 Réponses

### ✅ Succès (200 OK)

```json
{
  "success": true
}
```

### ❌ Erreur Client (400 Bad Request)

Paramètres manquants.

```json
{
  "error": "Missing required parameters"
}
```
