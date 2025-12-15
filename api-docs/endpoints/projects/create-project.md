# Create a project

Crée un nouveau projet dans une technologie spécifique.

## Endpoint

```
POST /api/projects
```

## Authentification

❌ Non requise (mais recommandée en production)

## Body de la requête

```json
{
  "name": "my_game_engine",
  "project_time_week": 6,
  "tech": "Rust"
}
```

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| name | string | Oui | Nom du projet |
| project_time_week | number | Oui | Durée du projet en semaines |
| tech | string | Oui | Technologie (Golang, Javascript, Rust) |

## Réponse

### Succès (200 OK)

```json
{
  "message": "Project added.",
  "projects": {
    "Golang": [...],
    "Javascript": [...],
    "Rust": [
      ...,
      {
        "id": 25,
        "name": "my_game_engine",
        "project_time_week": 6
      }
    ]
  }
}
```

### Erreur - Données invalides (400 Bad Request)

```json
{
  "error": "Invalid project data."
}
```

## Comportement

1. **Génération de l'ID** : L'ID est auto-incrémenté (max ID existant + 1)
2. **Ajout à la technologie** : Le projet est ajouté à la fin de la liste de la technologie spécifiée
3. **Création de technologie** : Si la technologie n'existe pas, elle est créée automatiquement
4. **Sauvegarde** : Les modifications sont écrites dans `config/projects.json`

## Exemples

### cURL

```bash
curl -X POST "https://votre-domaine.com/api/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_game_engine",
    "project_time_week": 6,
    "tech": "Rust"
  }'
```

### JavaScript (Fetch)

```javascript
async function createProject(name, weeks, tech) {
  try {
    const response = await fetch('https://votre-domaine.com/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        project_time_week: weeks,
        tech,
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

// Utilisation
createProject('my_game_engine', 6, 'Rust');
```

### Python (requests)

```python
import requests

def create_project(name, weeks, tech):
    url = "https://votre-domaine.com/api/projects"
    headers = {"Content-Type": "application/json"}
    payload = {
        "name": name,
        "project_time_week": weeks,
        "tech": tech
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(data['message'])
        return data['projects']
    else:
        error = response.json()
        print(f"Error: {error.get('error', 'Unknown error')}")
        return None

# Utilisation
create_project("my_game_engine", 6, "Rust")
```

## Validation

La validation côté serveur vérifie que :
- ✅ `name` est fourni et non vide
- ✅ `project_time_week` est fourni et est un nombre
- ✅ `tech` est fourni et non vide

## Notes importantes

- ⚠️ **Modifications du fichier** : L'endpoint modifie directement `config/projects.json`
- ⚠️ **Pas d'authentification** : L'endpoint n'est pas protégé (à sécuriser en production)
- ⚠️ **Pas d'audit** : Les créations ne sont pas loggées dans l'historique
- ⚠️ **ID auto-incrémenté** : Les IDs sont calculés automatiquement

## Recommandations de sécurité

En production, il est recommandé de :
1. Ajouter une authentification (headers x-user-id, x-user-email)
2. Valider les permissions (seuls les admins peuvent créer des projets)
3. Ajouter un logging dans l'historique
4. Valider plus strictement les données (format du nom, durée maximum, etc.)

## Cas d'usage

1. **Ajout de nouveau projet** au curriculum
2. **Extension d'une technologie** avec de nouveaux projets
3. **Import de projets** depuis une source externe

## Endpoints liés

- [List all projects](list-projects.md) - Voir tous les projets
- [Update a project](update-project.md) - Réorganiser les projets
- [Delete a project](delete-project.md) - Supprimer un projet

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Projet créé avec succès |
| 400 | Données invalides (paramètres manquants ou incorrects) |
