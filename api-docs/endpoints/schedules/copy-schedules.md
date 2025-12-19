# 📋 Copier des plannings

Cet endpoint permet de copier les plannings d'une semaine source vers une semaine cible pour un ou plusieurs employés.

## 📝 Détails de l'Endpoint

- **URL** : `/api/schedules/copy`
- **Méthode** : `POST`

## 📥 Corps de la Requête (JSON)

| Champ           | Type          | Requis | Description                                      |
| :-------------- | :------------ | :----- | :----------------------------------------------- |
| `fromWeekKey`   | String        | ✅ Oui | La clé de la semaine source (ex: `2024-W01`).    |
| `toWeekKey`     | String        | ✅ Oui | La clé de la semaine cible (ex: `2024-W02`).     |
| `employeeIds`   | Array<String> | ❌ Non | Liste des IDs employés. Si vide, copie pour tous.|

### Exemple

```json
{
  "fromWeekKey": "2024-W01",
  "toWeekKey": "2024-W02",
  "employeeIds": ["emp_1", "emp_2"]
}
```

## 📤 Réponses

### ✅ Succès (200 OK)

```json
{
  "message": "Schedules copied for 2 employees",
  "copiedEmployees": 2,
  "errors": []
}
```

### ❌ Erreur Client (400 Bad Request)

Paramètres manquants.

```json
{
  "error": "Missing week keys"
}
```
