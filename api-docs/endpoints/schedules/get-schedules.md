# 📅 Obtenir les plannings par semaine

Cet endpoint récupère les plannings pour une semaine donnée.

## 📝 Détails de l'Endpoint

- **URL** : `/api/schedules`
- **Méthode** : `GET`

## 📥 Paramètres d'URL (Query Params)

| Paramètre | Type   | Requis | Description                     |
| :-------- | :----- | :----- | :------------------------------ |
| `weekKey` | String | ✅ Oui | La clé de la semaine (ex: `2024-W01`). |

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne la liste des plannings pour la semaine.

```json
[
  {
    "id": "sch_1",
    "employeeId": "emp_1",
    "weekKey": "2024-W01",
    "day": "lundi",
    "timeSlots": [
      { "start": "09:00", "end": "12:00", "type": "work" }
    ]
  }
  // ...
]
```

### ❌ Erreur Client (400 Bad Request)

Paramètre `weekKey` manquant.

```json
{
  "error": "Week key is required"
}
```
