# 📜 Obtenir l'historique

Cet endpoint permet de consulter l'historique des actions effectuées sur le système (audit logs).

## 📝 Détails de l'Endpoint

- **URL** : `/api/history`
- **Méthode** : `GET`

## 📥 Paramètres d'URL (Query Params)

| Paramètre | Type   | Description                                      | Défaut |
| :-------- | :----- | :----------------------------------------------- | :----- |
| `type`    | String | Filtrer par type d'entité (ex: `employee`, `planning`). | -      |
| `userId`  | String | Filtrer par ID utilisateur ayant fait l'action.  | -      |
| `action`  | String | Filtrer par type d'action (ex: `create`, `update`). | -      |
| `limit`   | Number | Nombre maximum d'entrées à retourner.            | `100`  |

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne la liste des entrées d'historique.

```json
[
  {
    "id": "hist_1",
    "type": "employee",
    "action": "create",
    "userId": "user_1",
    "timestamp": "2024-01-01T12:00:00Z",
    "details": { ... }
  }
  // ...
]
```

### ❌ Erreur Serveur (500 Internal Server Error)

```json
{
  "error": "Erreur lors de la récupération de l'historique"
}
```
