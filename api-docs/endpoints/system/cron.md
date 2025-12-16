# Tâches Cron

Cet endpoint est utilisé pour déclencher des tâches planifiées (cron jobs).

**Méthode**: `POST`  
**Endpoint**: `/api/cron`

## Sécurité

Cet endpoint doit être protégé et accessible uniquement par des services de confiance.

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "message": "Tâches Cron exécutées avec succès"
}
```
