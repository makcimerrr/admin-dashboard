# ➕ Créer un employé

Cet endpoint permet d'ajouter un nouvel employé.

## 📝 Détails de l'Endpoint

- **URL** : `/api/employees`
- **Méthode** : `POST`
- **Headers** :
  - `x-user-id`: ID de l'utilisateur effectuant l'action (pour l'audit).
  - `x-user-email`: Email de l'utilisateur effectuant l'action.

## 📥 Corps de la Requête (JSON)

| Champ     | Type   | Requis | Description                                      |
| :-------- | :----- | :----- | :----------------------------------------------- |
| `name`    | String | ✅ Oui | Nom complet de l'employé.                        |
| `initial` | String | ✅ Oui | Initiales de l'employé.                          |
| `role`    | String | ✅ Oui | Rôle ou poste de l'employé.                      |
| `email`   | String | ✅ Oui | Adresse email professionnelle.                   |
| `phone`   | String | ❌ Non | Numéro de téléphone.                             |
| `avatar`  | String | ❌ Non | URL de l'avatar.                                 |
| `color`   | String | ❌ Non | Code couleur hexadécimal (généré si absent).     |

### Exemple

```json
{
  "name": "Alice Wonderland",
  "initial": "AW",
  "role": "Developer",
  "email": "alice@example.com"
}
```

## 📤 Réponses

### ✅ Succès (201 Created)

Retourne l'employé créé.

```json
{
  "id": "emp_123",
  "name": "Alice Wonderland",
  "email": "alice@example.com",
  "color": "#123456",
  // ...
}
```

### ❌ Erreur Client (400 Bad Request)

Données invalides ou email déjà existant.

```json
{
  "error": "Un employé avec cet email existe déjà"
}
```
