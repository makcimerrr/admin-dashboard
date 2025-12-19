# 👥 Lister tous les employés

Cet endpoint retourne la liste de tous les employés enregistrés.

## 📝 Détails de l'Endpoint

- **URL** : `/api/employees`
- **Méthode** : `GET`

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne la liste des employés.

```json
[
  {
    "id": "emp_1",
    "name": "Bob Jones",
    "email": "bob@example.com",
    "role": "Manager",
    "color": "#FF5733",
    "avatar": "/avatars/bob.png"
  },
  {
    "id": "emp_2",
    "name": "Sarah Connor",
    // ...
  }
]
```

### ❌ Erreur Serveur (500 Internal Server Error)

```json
{
  "error": "Failed to fetch employees"
}
```
