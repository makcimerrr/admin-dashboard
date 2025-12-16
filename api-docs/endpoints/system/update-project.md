# Mise à jour Projet (Interne)

Cet endpoint est une route interne pour la mise à jour d'un projet.

**Méthode**: `POST`  
**Endpoint**: `/api/update_project`

## Notes

Cet endpoint peut faire partie d'un flux de travail plus large et n'est pas destiné à une utilisation publique directe. Il peut avoir des règles de validation ou des effets de bord différents de l'endpoint public `PUT /api/projects/{id}`.

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "message": "Projet mis à jour via l'endpoint interne"
}
```
