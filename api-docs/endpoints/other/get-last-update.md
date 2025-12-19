# 🕒 Dernière Mise à Jour

Cet endpoint permet de gérer l'information concernant la dernière mise à jour des données du système.

## 📝 Détails de l'Endpoint

- **URL** : `/api/last_update`
- **Méthode** : `GET`, `POST`

## 📥 Opérations

### GET - Obtenir les dernières mises à jour

Récupère la liste des dernières mises à jour enregistrées.

**Réponse (200 OK) :**
```json
[
  {
    "id": 1,
    "last_update": "2024-03-15T10:00:00Z",
    "event_id": 123
  }
]
```

**Réponse (404 Not Found) :**
```json
{
  "message": "Aucune mise à jour trouvée."
}
```

### POST - Enregistrer une mise à jour

Met à jour le timestamp de la dernière mise à jour pour un événement donné.

**Corps de la requête :**
```json
{
  "eventId": 123
}
```

**Réponse (200 OK) :**
```json
{
  "last_update": "2024-03-15T10:05:00Z",
  "event_id": 123
}
```
