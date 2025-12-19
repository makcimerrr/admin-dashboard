# 👤 Obtenir un Utilisateur par ID

Cet endpoint permet de récupérer les informations d'un utilisateur spécifique via son ID.

## 📝 Détails de l'Endpoint

- **URL** : `/api/users/[id]`
- **Méthode** : `GET`
- **Authentification** : Requise (Session)

## 📥 Paramètres d'URL

| Paramètre | Type   | Requis | Description                     |
| :-------- | :----- | :----- | :------------------------------ |
| `id`      | String | ✅ Oui | L'identifiant unique de l'utilisateur. |

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne l'objet utilisateur trouvé.

```json
{
  "id": "user_12345",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "user",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### ❌ Non Trouvé (404 Not Found)

L'utilisateur avec l'ID spécifié n'existe pas.

```json
{
  "error": "User not found"
}
```

### ❌ Erreur Serveur (500 Internal Server Error)

Une erreur interne s'est produite lors de la récupération.
