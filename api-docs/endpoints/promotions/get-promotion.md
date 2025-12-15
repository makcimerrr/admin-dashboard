# Get promotion by ID

Récupère les détails d'une promotion spécifique par son ID, incluant son projet actuel.

## Endpoint

```
GET /api/promotions/{promoId}
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
  "promotion": {
    "eventId": "12345",
    "key": "B3",
    "title": "Bachelor 3",
    "start": "2024-09-01",
    "end": "2025-07-31",
    "color": "#3B82F6",
    "description": "Promotion Bachelor 3",
    "currentProject": "mini_printf"
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

## Structure de l'objet Promotion

| Champ | Type | Description |
|-------|------|-------------|
| eventId | string | Identifiant unique de l'événement |
| key | string | Clé courte de la promotion (ex: "B3", "M1") |
| title | string | Nom complet de la promotion |
| start | string | Date de début (format ISO 8601) |
| end | string | Date de fin (format ISO 8601) |
| color | string | Couleur hexadécimale pour l'interface |
| description | string | Description de la promotion |
| currentProject | string \| null | Nom du projet actuel de la promotion |

## Exemples

### cURL

```bash
curl -X GET "https://votre-domaine.com/api/promotions/12345" \
  -H "Content-Type: application/json"
```

### JavaScript (Fetch)

```javascript
async function getPromotion(promoId) {
  try {
    const response = await fetch(`https://votre-domaine.com/api/promotions/${promoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.error('Promotion not found');
        return null;
      }
      throw new Error('Failed to fetch promotion');
    }

    const data = await response.json();
    console.log('Promotion:', data.promotion);
    return data.promotion;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Utilisation
getPromotion('12345');
```

### Python (requests)

```python
import requests

def get_promotion(promo_id):
    url = f"https://votre-domaine.com/api/promotions/{promo_id}"
    headers = {"Content-Type": "application/json"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        return data['promotion']
    elif response.status_code == 404:
        print("Promotion not found")
        return None
    else:
        print(f"Error: {response.status_code}")
        return None

promotion = get_promotion("12345")
if promotion:
    print(f"Promotion: {promotion['title']}")
    print(f"Current project: {promotion.get('currentProject', 'None')}")
```

## Détails du projet actuel

Le champ `currentProject` contient le nom du projet sur lequel la promotion travaille actuellement, calculé à partir de :
- La configuration des projets (`config/projects.json`)
- Le statut actuel de la promotion (`config/promoStatus.json`)
- Les dates de début/fin de la promotion
- Les jours fériés

Si aucun projet n'est actuellement en cours ou si la promotion est terminée, `currentProject` sera `null`.

## Notes

- L'`eventId` est utilisé comme identifiant dans l'URL, pas la `key`
- Le projet actuel est calculé dynamiquement à chaque requête
- Les données de promotion proviennent de `config/promoConfig.json`
- Le statut du projet provient de `config/promoStatus.json`

## Cas d'usage

1. **Afficher les détails d'une promotion** dans une page dédiée
2. **Consulter le projet actuel** d'une promotion
3. **Vérifier l'existence** d'une promotion avant d'effectuer d'autres opérations

## Endpoints liés

- [List all promotions](list-promotions.md) - Liste toutes les promotions
- [Get promotion's last 3 projects](get-promotion-projects.md) - Statistiques sur les derniers projets
- [Get students](../students/get-students.md) - Étudiants d'une promotion

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Promotion trouvée et retournée avec succès |
| 404 | Promotion non trouvée (ID invalide) |
| 500 | Erreur serveur lors du traitement |
