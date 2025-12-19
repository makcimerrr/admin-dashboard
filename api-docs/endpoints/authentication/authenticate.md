# 🔐 Authentifier un utilisateur

Cet endpoint permet d'authentifier un utilisateur avec son email et son mot de passe.

## 📝 Détails de l'Endpoint

- **URL** : `/api/authenticate`
- **Méthode** : `POST`
- **Authentification** : Aucune requise

## 📥 Corps de la Requête (JSON)

| Champ      | Type   | Requis | Description                                      |
| :--------- | :----- | :----- | :----------------------------------------------- |
| `email`    | String | ✅ Oui | L'adresse email de l'utilisateur.                |
| `password` | String | ✅ Oui | Le mot de passe de l'utilisateur.                |

### Exemple de Requête

```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

## 📤 Réponses

### ✅ Succès (200 OK)

L'authentification a réussi. Retourne les informations de l'utilisateur.

```json
{
  "id": "cm7...",
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### ❌ Erreur Client (400 Bad Request)

Données manquantes ou invalides.

```json
{
  "message": "Email and password are required"
}
```

### ❌ Non Autorisé (401 Unauthorized)

Email ou mot de passe incorrect.

```json
{
  "message": "Invalid email or password"
}
```

### ❌ Trop de requêtes (429 Too Many Requests)

Trop de tentatives de connexion échouées.

```json
{
  "message": "Too many login attempts. Please try again later."
}
```

### ❌ Erreur Serveur (500 Internal Server Error)

Une erreur interne s'est produite.

```json
{
  "message": "Internal server error"
}
```
