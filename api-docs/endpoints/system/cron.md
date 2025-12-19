# ⏰ Tâches Cron

Cet endpoint est utilisé par un planificateur de tâches (Cron Job) pour mettre à jour périodiquement les statuts des promotions.

## 📝 Détails de l'Endpoint

- **URL** : `/api/cron`
- **Méthode** : `GET`
- **Authentification** : Bearer Token (via `CRON_SECRET`)

## 📥 Headers Requis

| Header          | Valeur                  |
| :-------------- | :---------------------- |
| `Authorization` | `Bearer <CRON_SECRET>`  |

## 📤 Réponses

### ✅ Succès (200 OK)

La mise à jour a été effectuée.

```json
{
  "success": true,
  "updated": 2
}
```

### ❌ Non Autorisé (401 Unauthorized)

Le token secret est manquant ou invalide.

### ❌ Erreur Serveur (500 Internal Server Error)

Une erreur est survenue lors de l'exécution du cron.
