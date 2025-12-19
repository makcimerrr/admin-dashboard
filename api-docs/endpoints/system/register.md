# 📝 Inscription Utilisateur

Cet endpoint permet de créer un nouveau compte utilisateur administrateur/staff.

## 📝 Détails de l'Endpoint

- **URL** : `/api/register`
- **Méthode** : `POST`

## 📥 Corps de la Requête (JSON)

| Champ             | Type   | Requis | Description                                      |
| :---------------- | :----- | :----- | :----------------------------------------------- |
| `name`            | String | ✅ Oui | Nom complet.                                     |
| `email`           | String | ✅ Oui | Adresse email valide.                            |
| `password`        | String | ✅ Oui | Mot de passe fort (8+ chars, majuscule, chiffre, spécial). |
| `confirmPassword` | String | ✅ Oui | Confirmation du mot de passe.                    |

## 📤 Réponses

### ✅ Succès (201 Created)

Retourne l'utilisateur créé.

```json
{
  "id": "user_123",
  "name": "New Admin",
  "email": "admin@example.com"
}
```

### ❌ Erreur Client (400 Bad Request)

Données invalides (mots de passe ne correspondent pas, format email incorrect, mot de passe trop faible).

### ❌ Trop de requêtes (429 Too Many Requests)

Trop de tentatives d'inscription depuis la même IP.
