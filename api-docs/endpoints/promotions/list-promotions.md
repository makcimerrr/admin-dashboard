# List all promotions

Récupère la liste complète de toutes les promotions configurées dans le système.

## Endpoint

```
GET /api/promotions
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
      "eventId": "12345",
      "key": "B3",
      "title": "Bachelor 3",
      "start": "2024-09-01",
      "end": "2025-07-31",
      "color": "#3B82F6",
      "description": "Promotion Bachelor 3"
    },
    {
      "eventId": "12346",
      "key": "M1",
      "title": "Master 1",
      "start": "2024-09-01",
      "end": "2025-07-31",
      "color": "#10B981",
      "description": "Promotion Master 1"
    }
  ]
}
```

### Erreur (500 Internal Server Error)

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

## Exemples

### cURL

```bash
curl -X GET "https://votre-domaine.com/api/promotions" \
  -H "Content-Type: application/json"
```

### JavaScript (Fetch)

```javascript
async function getPromotions() {
  try {
    const response = await fetch('https://votre-domaine.com/api/promotions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch promotions');
    }

    const data = await response.json();
    console.log('Promotions:', data.promotions);
    return data.promotions;
  } catch (error) {
    console.error('Error:', error);
  }
}

getPromotions();
```

### Python (requests)

```python
import requests

def get_promotions():
    url = "https://votre-domaine.com/api/promotions"
    headers = {"Content-Type": "application/json"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        return data['promotions']
    else:
        print(f"Error: {response.status_code}")
        return None

promotions = get_promotions()
if promotions:
    for promo in promotions:
        print(f"{promo['key']}: {promo['title']}")
```

## Notes

- Les promotions sont chargées depuis le fichier de configuration `config/promoConfig.json`
- La liste est statique et ne peut pas être modifiée via l'API
- Pour ajouter/modifier des promotions, modifiez directement le fichier de configuration

## Cas d'usage

1. **Affichage de la liste des promotions** dans une interface utilisateur
2. **Sélection d'une promotion** pour filtrer les étudiants
3. **Navigation** entre différentes promotions

## Endpoints liés

- [Get promotion by ID](get-promotion.md) - Détails d'une promotion spécifique
- [Get promotion's last 3 projects](get-promotion-projects.md) - Projets d'une promotion
- [Get students](../students/get-students.md) - Filtrer les étudiants par promotion

## Code de statut

| Code | Description |
|------|-------------|
| 200 | Liste des promotions retournée avec succès |
| 500 | Erreur serveur lors de la lecture du fichier de configuration |
