# Get promotion's last 3 projects

Récupère les statistiques des 3 derniers projets d'une promotion, incluant le pourcentage d'étudiants ayant terminé chaque projet.

## Endpoint

```
GET /api/promotions/{promoId}/projects/last-three
```

## Authentification

❌ Non requise

## Paramètres d'URL

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| promoId | string | Oui | L'identifiant unique de la promotion (eventId) |

## Réponse

### Succès (200 OK)

```json
{
  "success": true,
  "promotionName": "Bachelor 3",
  "language": "Golang",
  "currentProject": "mini_printf",
  "projects": [
    {
      "id": 1,
      "name": "my_ls",
      "project_time_week": 2,
      "count": 45,
      "percentage": 90
    },
    {
      "id": 2,
      "name": "my_tar",
      "project_time_week": 3,
      "count": 42,
      "percentage": 84
    },
    {
      "id": 3,
      "name": "mini_printf",
      "project_time_week": 2,
      "count": 15,
      "percentage": 30
    }
  ],
  "meta": {
    "totalStudents": 50,
    "aheadCount": 8,
    "aheadPercentage": 16
  }
}
```

### Erreur - Promotion non trouvée (404 Not Found)

```json
{
  "success": false,
  "message": "Promotion not found"
}
```

### Erreur serveur (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Internal error",
  "details": "Error message"
}
```

## Structure de la réponse

### Champs principaux

| Champ | Type | Description |
|-------|------|-------------|
| success | boolean | Indique si la requête a réussi |
| promotionName | string | Nom complet de la promotion |
| language | string | Langage actuellement étudié (Golang, Javascript, Rust) |
| currentProject | string | Nom du projet actuel |
| projects | array | Liste des 3 derniers projets avec statistiques |
| meta | object | Métadonnées sur les étudiants |

### Objet Project

| Champ | Type | Description |
|-------|------|-------------|
| id | number | Identifiant unique du projet |
| name | string | Nom du projet |
| project_time_week | number | Durée du projet en semaines |
| count | number | Nombre d'étudiants ayant terminé ce projet |
| percentage | number | Pourcentage d'étudiants ayant terminé (0-100) |

### Objet Meta

| Champ | Type | Description |
|-------|------|-------------|
| totalStudents | number | Nombre total d'étudiants dans la promotion |
| aheadCount | number | Nombre d'étudiants en avance sur le projet actuel |
| aheadPercentage | number | Pourcentage d'étudiants en avance (0-100) |

## Logique de calcul

### Sélection des 3 derniers projets

Les 3 projets retournés sont :
1. Les 2 projets précédents (dans le même langage ou le langage précédent)
2. Le projet actuel

Si la promotion est terminée (projet = "Fin"), le dernier projet de Rust est utilisé.

### Calcul du pourcentage de complétion

Un étudiant est considéré comme ayant terminé un projet si :
- Il est sur un projet **après** celui-ci dans la même track/langage
- OU il a complété toute la track (golang_completed, javascript_completed, rust_completed)
- OU il est sur ce projet exact avec un statut `progress_status = "finished"`

### Étudiants en avance

Les étudiants en avance sont ceux qui travaillent sur un projet **après** le projet actuel de la promotion.

## Exemples

### cURL

```bash
curl -X GET "https://votre-domaine.com/api/promotions/12345/projects/last-three" \
  -H "Content-Type: application/json"
```

### JavaScript (Fetch)

```javascript
async function getPromotionProjects(promoId) {
  try {
    const response = await fetch(
      `https://votre-domaine.com/api/promotions/${promoId}/projects/last-three`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch promotion projects');
    }

    const data = await response.json();

    console.log(`Promotion: ${data.promotionName}`);
    console.log(`Current project: ${data.currentProject} (${data.language})`);
    console.log(`Total students: ${data.meta.totalStudents}`);
    console.log(`Students ahead: ${data.meta.aheadPercentage}%`);

    data.projects.forEach(project => {
      console.log(
        `${project.name}: ${project.percentage}% completed (${project.count}/${data.meta.totalStudents})`
      );
    });

    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

getPromotionProjects('12345');
```

### Python (requests)

```python
import requests

def get_promotion_projects(promo_id):
    url = f"https://votre-domaine.com/api/promotions/{promo_id}/projects/last-three"
    headers = {"Content-Type": "application/json"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"Promotion: {data['promotionName']}")
        print(f"Current project: {data['currentProject']} ({data['language']})")
        print(f"Total students: {data['meta']['totalStudents']}")
        print(f"Students ahead: {data['meta']['aheadPercentage']}%")

        for project in data['projects']:
            print(f"{project['name']}: {project['percentage']}% completed")

        return data
    elif response.status_code == 404:
        print("Promotion not found")
        return None
    else:
        print(f"Error: {response.status_code}")
        return None

get_promotion_projects("12345")
```

## Notes importantes

- **Performance** : Cette route peut être lente car elle récupère tous les étudiants de la promotion avec pagination
- **Calcul dynamique** : Les statistiques sont calculées en temps réel à chaque requête
- **Multi-langage** : Les 3 projets peuvent provenir de différents langages (ex: 2 projets Golang + 1 Javascript)
- **Promotion terminée** : Si la promotion a terminé tous les projets, les 3 derniers projets de Rust sont utilisés

## Cas d'usage

1. **Dashboard de progression** : Afficher un aperçu de la progression de la promotion
2. **Statistiques de complétion** : Identifier les projets difficiles (faible pourcentage)
3. **Suivi de groupe** : Voir combien d'étudiants sont en avance ou en retard
4. **Rapports** : Générer des rapports de progression

## Endpoints liés

- [List all promotions](list-promotions.md) - Liste toutes les promotions
- [Get promotion by ID](get-promotion.md) - Détails d'une promotion
- [Get all promotions' last 3 projects](get-all-promotions-projects.md) - Statistiques pour toutes les promotions
- [Get students](../students/get-students.md) - Liste des étudiants

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Statistiques calculées et retournées avec succès |
| 404 | Promotion non trouvée (ID invalide) |
| 500 | Erreur serveur lors du traitement ou de la récupération des étudiants |

## Performance

⚠️ **Attention** : Cette route peut prendre plusieurs secondes à répondre car elle :
1. Récupère tous les étudiants de la promotion avec pagination
2. Calcule les statistiques pour chaque projet
3. Détermine le projet actuel via l'agenda

Pour les promotions avec beaucoup d'étudiants (>100), le temps de réponse peut atteindre 5-10 secondes.
