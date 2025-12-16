# Initialisation BDD (Seed)

Cet endpoint est utilisé pour initialiser la base de données avec des données de départ.

**Méthode**: `POST`  
**Endpoint**: `/api/seed`

## Sécurité

Cet endpoint doit être protégé et utilisé uniquement dans des environnements de développement ou de configuration.

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "message": "Base de données initialisée avec succès"
}
```
