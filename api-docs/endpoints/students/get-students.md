# 🎓 Obtenir les étudiants (avec filtres)

Cet endpoint permet de récupérer la liste des étudiants avec des options de filtrage, de tri et de pagination.

## 📝 Détails de l'Endpoint

- **URL** : `/api/get_students`
- **Méthode** : `GET`

## 📥 Paramètres d'URL (Query Params)

| Paramètre         | Type   | Description                                      | Défaut |
| :---------------- | :----- | :----------------------------------------------- | :----- |
| `q`               | String | Recherche par mot-clé (nom, prénom, login).      | `''`   |
| `offset`          | Number | Offset pour la pagination.                       | `0`    |
| `promo`           | String | Filtrer par promotion (clé de promo).            | `''`   |
| `filter`          | String | Colonne sur laquelle trier.                      | `''`   |
| `direction`       | String | Direction du tri (`asc` ou `desc`).              | `asc`  |
| `status`          | String | Filtrer par statut (ex: `finished`, `in_progress`).| `''`   |
| `delay_level`     | String | Filtrer par niveau de retard.                    | `''`   |
| `track`           | String | Filtrer par cursus (ex: `golang`, `rust`).       | `null` |
| `track_completed` | String | Filtrer si le cursus est terminé (`true`/`false`).| `null` |

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne la liste des étudiants et les métadonnées de pagination.

```json
{
  "students": [
    {
      "id": 1,
      "first_name": "Alice",
      "last_name": "Smith",
      "login": "asmith",
      "promos": "P2024",
      // ... autres champs
    }
    // ...
  ],
  "newOffset": 20,
  "totalStudents": 150,
  "previousOffset": 0,
  "currentOffset": 0
}
```

### ❌ Erreur Serveur (500 Internal Server Error)

```json
{
  "message": "Error retrieving students",
  "error": { ... }
}
```
