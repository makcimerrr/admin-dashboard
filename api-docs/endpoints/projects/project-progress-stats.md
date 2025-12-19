# 📊 Statistiques de progression projet

Cet endpoint fournit des statistiques détaillées sur la progression d'un projet spécifique pour une promotion donnée.

## 📝 Détails de l'Endpoint

- **URL** : `/api/project-progress-stats`
- **Méthode** : `GET`

## 📥 Paramètres d'URL (Query Params)

| Paramètre | Type   | Requis | Description                                      |
| :-------- | :----- | :----- | :----------------------------------------------- |
| `promo`   | String | ✅ Oui | La clé de la promotion (ex: `P2024`).            |
| `project` | String | ✅ Oui | Le nom du projet (ou objet JSON stringifié).     |

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne les statistiques de progression.

```json
{
  "totalStudents": 20,
  "finished": 15,
  "inProgress": 3,
  "notStarted": 2,
  "averageDelay": 1.5,
  "details": [ ... ]
}
```

### ❌ Erreur Client (400 Bad Request)

Paramètres manquants.

```json
{
  "error": "Missing promo or project parameter"
}
```

### ❌ Erreur Serveur (500 Internal Server Error)

```json
{
  "error": "Error retrieving project progress stats"
}
```
