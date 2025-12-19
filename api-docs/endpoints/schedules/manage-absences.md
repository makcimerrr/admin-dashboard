# 🏖️ Gérer les absences

Ces endpoints permettent de gérer les absences (congés, maladie, etc.).

## 📝 Détails des Endpoints

- **URL** : `/api/schedules/absences` (GET)
- **URL** : `/api/schedules/range` (POST)

## 📥 Opérations

### GET - Lister les absences

Récupère la liste des absences.

**Paramètres (Query) :**
- `employeeId` (optionnel)
- `type` (optionnel) : Type d'absence (ex: `vacation`, `sick`).
- `start` / `end` (optionnel) : Filtre par date.

**Réponse (200 OK) :**
```json
[
  {
    "employeeId": "emp_1",
    "type": "vacation",
    "weekKey": "2024-W10",
    "day": "lundi",
    "start": "00:00",
    "end": "23:59"
  }
]
```

### POST - Créer une absence sur une période

Crée une absence pour un employé sur une plage de dates.

**Corps de la requête (JSON) :**
```json
{
  "employeeId": "emp_1",
  "startDate": "2024-07-01",
  "endDate": "2024-07-15",
  "slotType": "vacation"
}
```

**Réponse (200 OK) :**
```json
{
  "success": true
}
```
