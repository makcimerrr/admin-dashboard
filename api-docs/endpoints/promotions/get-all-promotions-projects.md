# Get all promotions' last 3 projects

Récupère les statistiques des 3 derniers projets pour **toutes les promotions** en une seule requête.

## Endpoint

```
GET /api/promotions/all/projects/last-three
```

## Authentification

❌ Non requise

## Paramètres

Aucun paramètre requis.

## Réponse

### Succès (200 OK)

```json
{
  "success": true,
  "promotions": [
    {
      "promoId": "12345",
      "promoKey": "B3",
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
    },
    {
      "promoId": "12346",
      "promoKey": "M1",
      "promotionName": "Master 1",
      "language": "Javascript",
      "currentProject": "my_rpg",
      "projects": [...],
      "meta": {...}
    }
  ]
}
```

### Erreur avec certaines promotions

Si une promotion rencontre une erreur, elle sera incluse dans la réponse avec un champ `error` :

```json
{
  "success": true,
  "promotions": [
    {
      "promoId": "12345",
      "promoKey": "B3",
      "promotionName": "Bachelor 3",
      "language": null,
      "currentProject": null,
      "projects": [],
      "meta": {
        "totalStudents": 0,
        "aheadCount": 0,
        "aheadPercentage": 0
      },
      "error": "Database connection failed"
    }
  ]
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
| promotions | array | Liste de toutes les promotions avec leurs statistiques |

### Objet Promotion

| Champ | Type | Description |
|-------|------|-------------|
| promoId | string | Identifiant unique de la promotion (eventId) |
| promoKey | string | Clé courte de la promotion (ex: "B3", "M1") |
| promotionName | string | Nom complet de la promotion |
| language | string \| null | Langage actuellement étudié |
| currentProject | string \| null | Nom du projet actuel |
| projects | array | Liste des 3 derniers projets avec statistiques |
| meta | object | Métadonnées sur les étudiants |
| error | string | (Optionnel) Message d'erreur si le traitement a échoué |

Pour la structure détaillée des objets `projects` et `meta`, voir [Get promotion's last 3 projects](get-promotion-projects.md).

## Traitement parallèle

Cette route utilise `Promise.all()` pour traiter toutes les promotions en parallèle, ce qui rend la requête plus rapide que d'appeler l'endpoint individuel pour chaque promotion.

### Différences avec l'endpoint individuel

1. **Optimisation** : Récupération des étudiants directement depuis la base de données (pas de requêtes HTTP internes)
2. **Gestion d'erreur** : Une erreur sur une promotion n'empêche pas le traitement des autres
3. **Format** : Chaque promotion inclut `promoId` et `promoKey` pour faciliter l'identification

## Exemples

### cURL

```bash
curl -X GET "https://votre-domaine.com/api/promotions/all/projects/last-three" \
  -H "Content-Type: application/json"
```

### JavaScript (Fetch)

```javascript
async function getAllPromotionsProjects() {
  try {
    const response = await fetch(
      'https://votre-domaine.com/api/promotions/all/projects/last-three',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch promotions projects');
    }

    const data = await response.json();

    console.log(`Total promotions: ${data.promotions.length}`);

    data.promotions.forEach(promo => {
      if (promo.error) {
        console.error(`${promo.promoKey}: Error - ${promo.error}`);
      } else {
        console.log(`\n${promo.promoKey} - ${promo.promotionName}`);
        console.log(`Current: ${promo.currentProject} (${promo.language})`);
        console.log(`Students: ${promo.meta.totalStudents} (${promo.meta.aheadPercentage}% ahead)`);

        promo.projects.forEach(project => {
          console.log(`  - ${project.name}: ${project.percentage}%`);
        });
      }
    });

    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

getAllPromotionsProjects();
```

### Python (requests)

```python
import requests

def get_all_promotions_projects():
    url = "https://votre-domaine.com/api/promotions/all/projects/last-three"
    headers = {"Content-Type": "application/json"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"Total promotions: {len(data['promotions'])}")

        for promo in data['promotions']:
            if 'error' in promo:
                print(f"{promo['promoKey']}: Error - {promo['error']}")
            else:
                print(f"\n{promo['promoKey']} - {promo['promotionName']}")
                print(f"Current: {promo['currentProject']} ({promo['language']})")
                print(f"Students: {promo['meta']['totalStudents']} ({promo['meta']['aheadPercentage']}% ahead)")

                for project in promo['projects']:
                    print(f"  - {project['name']}: {project['percentage']}%")

        return data
    else:
        print(f"Error: {response.status_code}")
        return None

get_all_promotions_projects()
```

### React Component Example

```javascript
import { useEffect, useState } from 'react';

function PromotionsOverview() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          'https://votre-domaine.com/api/promotions/all/projects/last-three'
        );
        const data = await response.json();
        setPromotions(data.promotions);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Promotions Overview</h1>
      {promotions.map(promo => (
        <div key={promo.promoId}>
          <h2>{promo.promotionName}</h2>
          {promo.error ? (
            <p>Error: {promo.error}</p>
          ) : (
            <>
              <p>Current: {promo.currentProject} ({promo.language})</p>
              <p>Students: {promo.meta.totalStudents}</p>
              <ul>
                {promo.projects.map(project => (
                  <li key={project.id}>
                    {project.name}: {project.percentage}%
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Notes importantes

- **Performance optimisée** : Récupération directe depuis la base de données (pas de HTTP)
- **Traitement parallèle** : Toutes les promotions sont traitées simultanément
- **Résilience** : Une erreur sur une promotion n'affecte pas les autres
- **Durée** : Peut prendre 10-30 secondes selon le nombre de promotions et d'étudiants

## Cas d'usage

1. **Dashboard global** : Vue d'ensemble de toutes les promotions sur une page
2. **Rapports agrégés** : Comparer la progression entre promotions
3. **Monitoring** : Surveiller l'avancement de toutes les classes
4. **Analytics** : Identifier les tendances entre promotions

## Performance

⚠️ **Attention** : Cette route peut être **très lente** car elle :
1. Traite **toutes les promotions** en parallèle
2. Récupère **tous les étudiants** de chaque promotion
3. Calcule les **statistiques complètes** pour chaque promotion

**Temps de réponse estimé** :
- 2-3 promotions : 5-10 secondes
- 5-10 promotions : 15-30 secondes
- 10+ promotions : 30+ secondes

### Optimisations recommandées

1. **Caching** : Mettre en cache les résultats (TTL: 5-10 minutes)
2. **Background job** : Précalculer les statistiques périodiquement
3. **Pagination** : Charger les promotions par groupe
4. **Loading states** : Afficher un indicateur de chargement côté client

## Endpoints liés

- [List all promotions](list-promotions.md) - Liste toutes les promotions
- [Get promotion's last 3 projects](get-promotion-projects.md) - Statistiques pour une promotion
- [Get students](../students/get-students.md) - Liste des étudiants

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Statistiques calculées pour toutes les promotions (même avec erreurs partielles) |
| 500 | Erreur serveur critique empêchant le traitement |
