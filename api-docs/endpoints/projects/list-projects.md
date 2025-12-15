# List all projects

Récupère la liste complète de tous les projets organisés par technologie.

## Endpoint

```
GET /api/projects
```

## Authentification

❌ Non requise

## Paramètres

Aucun paramètre requis.

## Réponse

### Succès (200 OK)

```json
{
  "Golang": [
    {
      "id": 1,
      "name": "my_ls",
      "project_time_week": 2
    },
    {
      "id": 2,
      "name": "my_tar",
      "project_time_week": 3
    }
  ],
  "Javascript": [
    {
      "id": 10,
      "name": "my_rpg",
      "project_time_week": 4
    }
  ],
  "Rust": [
    {
      "id": 20,
      "name": "my_paint",
      "project_time_week": 5
    }
  ]
}
```

## Structure de la réponse

La réponse est un objet dont les clés sont les noms des technologies (Golang, Javascript, Rust) et les valeurs sont des tableaux de projets.

### Objet Project

| Champ | Type | Description |
|-------|------|-------------|
| id | number | Identifiant unique du projet |
| name | string | Nom du projet |
| project_time_week | number | Durée du projet en semaines |

## Exemples

### cURL

```bash
curl -X GET "https://votre-domaine.com/api/projects" \
  -H "Content-Type: application/json"
```

### JavaScript (Fetch)

```javascript
async function getProjects() {
  try {
    const response = await fetch('https://votre-domaine.com/api/projects', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const projects = await response.json();

    Object.keys(projects).forEach(tech => {
      console.log(`\n${tech}:`);
      projects[tech].forEach(project => {
        console.log(`  - ${project.name} (${project.project_time_week} weeks)`);
      });
    });

    return projects;
  } catch (error) {
    console.error('Error:', error);
  }
}

getProjects();
```

### Python (requests)

```python
import requests

def get_projects():
    url = "https://votre-domaine.com/api/projects"
    headers = {"Content-Type": "application/json"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        projects = response.json()
        for tech, project_list in projects.items():
            print(f"\n{tech}:")
            for project in project_list:
                print(f"  - {project['name']} ({project['project_time_week']} weeks)")
        return projects
    else:
        print(f"Error: {response.status_code}")
        return None

get_projects()
```

## Notes

- Les projets sont chargés depuis `config/projects.json`
- L'ordre des projets dans chaque technologie correspond à l'ordre du curriculum
- Les technologies supportées sont : Golang, Javascript, Rust

## Cas d'usage

1. **Interface d'administration** : Afficher tous les projets pour modification
2. **Sélecteur de projets** : Créer une liste déroulante de projets
3. **Vue d'ensemble** : Consulter le curriculum complet

## Endpoints liés

- [Create a project](create-project.md) - Ajouter un nouveau projet
- [Update a project](update-project.md) - Réorganiser les projets
- [Delete a project](delete-project.md) - Supprimer un projet

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Liste des projets retournée avec succès |
