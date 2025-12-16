# Timeline Projet

Cet endpoint récupère la chronologie (timeline) d'un projet spécifique.

**Méthode**: `GET`  
**Endpoint**: `/api/timeline_project`

## Paramètres de requête

- `projectId` (string, requis) : L'identifiant du projet.

## Réponse

**Succès (200 OK)**
```json
{
  "success": true,
  "data": [
    {
      "event": "Début du projet",
      "date": "2024-07-01"
    },
    {
      "event": "Revue à mi-parcours",
      "date": "2024-07-15"
    },
    {
      "event": "Fin du projet",
      "date": "2024-07-30"
    }
  ]
}
```
