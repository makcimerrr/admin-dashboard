# Update project order

Réorganise l'ordre des projets dans une technologie spécifique.

## Endpoint

```
PATCH /api/projects
```

## Authentification

❌ Non requise (mais recommandée en production)

## Body de la requête

```json
{
  "tech": "Golang",
  "reorderedProjects": [2, 1, 3]
}
```

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| tech | string | Oui | Technologie dont les projets doivent être réorganisés |
| reorderedProjects | array<number> | Oui | Tableau des IDs de projets dans le nouvel ordre souhaité |

## Réponse

### Succès (200 OK)

```json
{
  "message": "Projects reordered.",
  "projects": {
    "Golang": [
      {
        "id": 2,
        "name": "my_tar",
        "project_time_week": 3
      },
      {
        "id": 1,
        "name": "my_ls",
        "project_time_week": 2
      },
      {
        "id": 3,
        "name": "mini_printf",
        "project_time_week": 2
      }
    ],
    "Javascript": [...],
    "Rust": [...]
  }
}
```

### Erreur - Technologie non trouvée (400 Bad Request)

```json
{
  "error": "Tech not found."
}
```

## Comportement

1. **Vérification** : Vérifie que la technologie existe
2. **Réorganisation** : Trie les projets selon l'ordre des IDs fourni dans `reorderedProjects`
3. **Sauvegarde** : Écrit les modifications dans `config/projects.json`

## Logique de tri

Les projets sont triés en utilisant la fonction :
```javascript
projects[tech].sort((a, b) =>
  reorderedProjects.indexOf(a.id) - reorderedProjects.indexOf(b.id)
)
```

## Exemples

### cURL

```bash
curl -X PATCH "https://votre-domaine.com/api/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "tech": "Golang",
    "reorderedProjects": [2, 1, 3]
  }'
```

### JavaScript (Fetch)

```javascript
async function reorderProjects(tech, orderedIds) {
  try {
    const response = await fetch('https://votre-domaine.com/api/projects', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tech,
        reorderedProjects: orderedIds,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    console.log(data.message);
    return data.projects;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Utilisation - Déplacer le projet ID 2 en première position
reorderProjects('Golang', [2, 1, 3, 4, 5]);
```

### Python (requests)

```python
import requests

def reorder_projects(tech, ordered_ids):
    url = "https://votre-domaine.com/api/projects"
    headers = {"Content-Type": "application/json"}
    payload = {
        "tech": tech,
        "reorderedProjects": ordered_ids
    }

    response = requests.patch(url, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(data['message'])
        return data['projects']
    else:
        error = response.json()
        print(f"Error: {error.get('error', 'Unknown error')}")
        return None

# Utilisation - Inverser l'ordre des 3 premiers projets
reorder_projects("Golang", [2, 1, 3])
```

### React with Drag & Drop

```javascript
import { useState } from 'react';

function ProjectReorder({ tech, projects }) {
  const [orderedProjects, setOrderedProjects] = useState(projects);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(orderedProjects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedProjects(items);

    // Envoyer le nouvel ordre au serveur
    const orderedIds = items.map(p => p.id);
    await reorderProjects(tech, orderedIds);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="projects">
        {(provided) => (
          <ul {...provided.droppableProps} ref={provided.innerRef}>
            {orderedProjects.map((project, index) => (
              <Draggable key={project.id} draggableId={String(project.id)} index={index}>
                {(provided) => (
                  <li
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    {project.name}
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

## Notes importantes

- ⚠️ **Ordre du curriculum** : La réorganisation affecte directement l'ordre d'apprentissage
- ⚠️ **IDs requis** : Tous les IDs de projets de la technologie doivent être fournis
- ⚠️ **Pas d'authentification** : L'endpoint n'est pas protégé (à sécuriser en production)
- ⚠️ **Impact direct** : Les modifications affectent immédiatement tous les utilisateurs

## Validation

- ✅ Vérifie que la technologie existe
- ❌ Ne vérifie PAS que tous les IDs sont présents
- ❌ Ne vérifie PAS que les IDs sont valides

## Cas d'usage

1. **Interface drag & drop** : Réorganiser les projets par glisser-déposer
2. **Ajustement du curriculum** : Modifier l'ordre pédagogique
3. **Optimisation** : Réordonner selon la difficulté ou les dépendances

## Impact

La réorganisation affecte :
- 📚 **Ordre d'apprentissage** : Les étudiants suivront le nouvel ordre
- 📊 **Statistiques** : Les calculs de progression utilisent l'ordre des projets
- 📅 **Planning** : L'agenda est calculé selon l'ordre des projets

## Endpoints liés

- [List all projects](list-projects.md) - Voir l'ordre actuel
- [Create a project](create-project.md) - Ajouter un nouveau projet
- [Delete a project](delete-project.md) - Supprimer un projet

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Projets réorganisés avec succès |
| 400 | Technologie non trouvée |
