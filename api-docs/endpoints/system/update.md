# Mise à jour Système

Cet endpoint est utilisé pour déclencher une mise à jour du système.

**Méthode**: `POST`  
**Endpoint**: `/api/update`

## Sécurité

Cet endpoint doit être protégé et accessible uniquement par les administrateurs.

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "message": "Mise à jour du système démarrée"
}
```
