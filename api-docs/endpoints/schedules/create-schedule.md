# ➕ Créer ou mettre à jour un planning

Cet endpoint permet de créer ou de mettre à jour le planning d'un employé pour un jour spécifique.

## 📝 Détails de l'Endpoint

- **URL** : `/api/schedules`
- **Méthode** : `POST`
- **Headers** :
  - `x-user-id`: ID de l'utilisateur.
  - `x-user-email`: Email de l'utilisateur.

## 📥 Corps de la Requête (JSON)

| Champ        | Type   | Requis | Description                                      |
| :----------- | :----- | :----- | :----------------------------------------------- |
| `employeeId` | String | ✅ Oui | L'ID de l'employé.                               |
| `weekKey`    | String | ✅ Oui | La semaine concernée (ex: `2024-W01`).           |
| `day`        | String | ✅ Oui | Le jour de la semaine (ex: `lundi`).             |
| `timeSlots`  | Array  | ✅ Oui | Liste des créneaux horaires.                     |

### Exemple

```json
{
  "employeeId": "emp_1",
  "weekKey": "2024-W01",
  "day": "lundi",
  "timeSlots": [
    { "start": "09:00", "end": "12:00", "type": "work" },
    { "start": "13:00", "end": "17:00", "type": "work" }
  ]
}
```

## 📤 Réponses

### ✅ Succès (200 OK)

Retourne le planning créé ou mis à jour.

```json
{
  "id": "sch_1",
  "employeeId": "emp_1",
  "weekKey": "2024-W01",
  "day": "lundi",
  "timeSlots": [ ... ]
}
```
