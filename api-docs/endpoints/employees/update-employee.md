# ✏️ Mettre à jour un employé

Cet endpoint permet de modifier les informations d'un employé existant.

## 📝 Détails de l'Endpoint

- **URL** : `/api/employees/[id]`
- **Méthode** : `PUT`
- **Headers** :
  - `x-user-id`: ID de l'utilisateur effectuant l'action.
  - `x-user-email`: Email de l'utilisateur effectuant l'action.

## 📥 Paramètres d'URL

| Paramètre | Type   | Requis | Description                     |
| :-------- | :----- | :----- | :------------------------------ |
| `id`      | String | ✅ Oui | L'ID de l'employé à modifier.   |

## 📥 Corps de la Requête (JSON)

Tous les champs sont optionnels. Seuls les champs fournis seront mis à jour.

| Champ     | Type   | Description                                      |
| :-------- | :----- | :----------------------------------------------- |
| `name`    | String | Nom complet.                                     |
| `initial` | String | Initiales.                                       |
| `role`    | String | Rôle.                                            |
| `email`   | String | Email (doit être unique).                        |
| `color`   | String | Couleur.                                         |
| ...       | ...    | Autres champs modifiables.                       |

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne l'employé mis à jour.

```json
{
  "id": "emp_123",
  "name": "Alice Cooper",
  // ...
}
```

### ❌ Non Trouvé (404 Not Found)

```json
{
  "error": "Employee not found"
}
```

### ❌ Erreur Client (400 Bad Request)

Données invalides.
