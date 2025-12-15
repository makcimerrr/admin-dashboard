# List all employees

Récupère la liste complète de tous les employés.

## Endpoint

```
GET /api/employees
```

## Authentification

❌ Non requise

## Paramètres

Aucun paramètre requis.

## Réponse

### Succès (200 OK)

```json
[
  {
    "id": "emp_123",
    "name": "Jean Dupont",
    "initial": "JD",
    "role": "Formateur",
    "avatar": "https://example.com/avatar.jpg",
    "color": "#3B82F6",
    "email": "jean.dupont@example.com",
    "phone": "+33612345678",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-12-15T15:30:00Z"
  }
]
```

### Erreur (500 Internal Server Error)

```json
{
  "error": "Failed to fetch employees"
}
```

## Structure de l'objet Employee

| Champ | Type | Description |
|-------|------|-------------|
| id | string | Identifiant unique de l'employé |
| name | string | Nom complet de l'employé |
| initial | string | Initiales (2-3 caractères) |
| role | string | Rôle de l'employé |
| avatar | string | URL de l'avatar |
| color | string | Couleur hexadécimale pour l'interface |
| email | string | Email de l'employé |
| phone | string | Numéro de téléphone |
| created_at | string | Date de création (ISO 8601) |
| updated_at | string | Date de dernière mise à jour (ISO 8601) |

## Exemples

### cURL

```bash
curl -X GET "https://votre-domaine.com/api/employees" \
  -H "Content-Type: application/json"
```

### JavaScript (Fetch)

```javascript
async function getEmployees() {
  try {
    const response = await fetch('https://votre-domaine.com/api/employees', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }

    const employees = await response.json();
    console.log(`Total employees: ${employees.length}`);

    employees.forEach(emp => {
      console.log(`${emp.name} (${emp.role}) - ${emp.email}`);
    });

    return employees;
  } catch (error) {
    console.error('Error:', error);
  }
}

getEmployees();
```

### Python (requests)

```python
import requests

def get_employees():
    url = "https://votre-domaine.com/api/employees"
    headers = {"Content-Type": "application/json"}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        employees = response.json()
        print(f"Total employees: {len(employees)}")
        for emp in employees:
            print(f"{emp['name']} ({emp['role']}) - {emp['email']}")
        return employees
    else:
        print(f"Error: {response.status_code}")
        return None

get_employees()
```

## Cas d'usage

1. **Liste des employés** : Afficher tous les employés dans l'interface
2. **Sélection d'employé** : Créer une liste déroulante pour assigner des tâches
3. **Annuaire** : Afficher un annuaire avec contacts
4. **Planning** : Lister les employés pour créer des plannings

## Endpoints liés

- [Create an employee](create-employee.md) - Créer un nouvel employé
- [Update an employee](update-employee.md) - Modifier un employé
- [Delete an employee](delete-employee.md) - Supprimer un employé

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Liste des employés retournée avec succès |
| 500 | Erreur lors de la récupération des employés |
