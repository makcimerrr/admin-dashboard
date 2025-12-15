# Delete a project

Supprime un projet d'une technologie spécifique.

## Endpoint

```
DELETE /api/projects
```

## Authentification

❌ Non requise (mais recommandée en production)

## Body de la requête

```json
{
  "tech": "Rust",
  "id": 25
}
```

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| tech | string | Oui | Technologie du projet à supprimer |
| id | number | Oui | ID du projet à supprimer |

## Réponse

### Succès (200 OK)

```json
{
  "message": "Project deleted.",
  "projects": {
    "Golang": [...],
    "Javascript": [...],
    "Rust": [
      // Le projet avec id: 25 a été supprimé
    ]
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
2. **Filtrage** : Supprime le projet dont l'ID correspond
3. **Nettoyage** : Si la technologie n'a plus de projets, elle est supprimée
4. **Sauvegarde** : Écrit les modifications dans `config/projects.json`

## Exemples

### cURL

```bash
curl -X DELETE "https://votre-domaine.com/api/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "tech": "Rust",
    "id": 25
  }'
```

### JavaScript (Fetch)

```javascript
async function deleteProject(tech, projectId) {
  try {
    const response = await fetch('https://votre-domaine.com/api/projects', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tech,
        id: projectId,
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
deleteProject('Rust', 25);
```

### Python (requests)

```python
import requests

def delete_project(tech, project_id):
    url = "https://votre-domaine.com/api/projects"
    headers = {"Content-Type": "application/json"}
    payload = {
        "tech": tech,
        "id": project_id
    }

    response = requests.delete(url, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(data['message'])
        return data['projects']
    else:
        error = response.json()
        print(f"Error: {error.get('error', 'Unknown error')}")
        return None

# Utilisation
delete_project("Rust", 25)
```

### JavaScript avec confirmation

```javascript
async function deleteProjectWithConfirmation(tech, projectId, projectName) {
  const confirmed = window.confirm(
    `Êtes-vous sûr de vouloir supprimer le projet "${projectName}" ?`
  );

  if (!confirmed) {
    console.log('Suppression annulée');
    return;
  }

  try {
    const response = await fetch('https://votre-domaine.com/api/projects', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tech, id: projectId }),
    });

    if (!response.ok) {
      throw new Error('Échec de la suppression');
    }

    const data = await response.json();
    alert('Projet supprimé avec succès');
    return data.projects;
  } catch (error) {
    alert(`Erreur: ${error.message}`);
  }
}

// Utilisation
deleteProjectWithConfirmation('Rust', 25, 'my_game_engine');
```

## Notes importantes

- ⚠️ **Suppression définitive** : La suppression est immédiate et irréversible
- ⚠️ **Impact sur les étudiants** : Les étudiants travaillant sur ce projet seront affectés
- ⚠️ **Suppression de la technologie** : Si c'est le dernier projet d'une technologie, la technologie entière est supprimée
- ⚠️ **Pas d'authentification** : L'endpoint n'est pas protégé (à sécuriser en production)
- ⚠️ **Pas d'audit** : Les suppressions ne sont pas loggées

## Impact de la suppression

La suppression d'un projet peut affecter :

1. **Étudiants** : Les étudiants actuellement sur ce projet
2. **Statistiques** : Les calculs de progression et pourcentages
3. **Planning** : L'agenda et la chronologie des projets
4. **Historique** : Les données historiques référençant ce projet

## Recommandations

### Avant de supprimer un projet :

1. ✅ **Vérifier les dépendances** : S'assurer qu'aucun étudiant n'est sur ce projet
2. ✅ **Backup** : Sauvegarder le fichier `config/projects.json`
3. ✅ **Communication** : Informer les utilisateurs de la suppression
4. ✅ **Alternative** : Envisager de désactiver plutôt que supprimer

### En production :

1. 🔒 **Authentification** : Ajouter une vérification des permissions
2. 📝 **Audit** : Logger les suppressions dans l'historique
3. ⏱️ **Soft delete** : Marquer comme supprimé plutôt que supprimer physiquement
4. 🔔 **Notifications** : Notifier les administrateurs

## Validation

- ✅ Vérifie que la technologie existe
- ❌ Ne vérifie PAS si des étudiants sont sur ce projet
- ❌ Ne vérifie PAS les dépendances

## Cas d'usage

1. **Retrait du curriculum** : Supprimer un projet obsolète
2. **Correction d'erreur** : Supprimer un projet ajouté par erreur
3. **Réorganisation** : Nettoyer les projets non utilisés

## Alternative : Soft Delete

Pour une approche plus sûre, considérez un soft delete :

```json
{
  "id": 25,
  "name": "my_game_engine",
  "project_time_week": 6,
  "deleted": true,
  "deletedAt": "2024-12-15T10:30:00Z"
}
```

## Endpoints liés

- [List all projects](list-projects.md) - Voir tous les projets
- [Create a project](create-project.md) - Créer un nouveau projet
- [Update a project](update-project.md) - Réorganiser les projets

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Projet supprimé avec succès |
| 400 | Technologie non trouvée |
