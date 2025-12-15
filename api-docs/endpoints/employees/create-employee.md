# Create an employee

Crée un nouvel employé dans le système.

## Endpoint

```
POST /api/employees
```

## Authentification

✅ Requise (headers x-user-id et x-user-email pour l'audit)

## Headers

```http
Content-Type: application/json
x-user-id: user_123
x-user-email: admin@example.com
```

## Body de la requête

```json
{
  "name": "Jean Dupont",
  "initial": "JD",
  "role": "Formateur",
  "avatar": "https://example.com/avatar.jpg",
  "color": "#3B82F6",
  "email": "jean.dupont@example.com",
  "phone": "+33612345678"
}
```

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| name | string | Oui | Nom complet de l'employé |
| initial | string | Oui | Initiales (2-3 caractères) |
| role | string | Oui | Rôle de l'employé |
| email | string | Oui | Email unique de l'employé |
| avatar | string | Non | URL de l'avatar (défaut: placeholder) |
| color | string | Non | Couleur hexadécimale (auto-assignée si non fournie) |
| phone | string | Non | Numéro de téléphone |

## Réponse

### Succès (201 Created)

```json
{
  "id": "emp_456",
  "name": "Jean Dupont",
  "initial": "JD",
  "role": "Formateur",
  "avatar": "https://example.com/avatar.jpg",
  "color": "#3B82F6",
  "email": "jean.dupont@example.com",
  "phone": "+33612345678",
  "created_at": "2024-12-15T16:30:00Z",
  "updated_at": "2024-12-15T16:30:00Z"
}
```

### Erreur - Validation (400 Bad Request)

```json
{
  "error": "Le nom est requis, L'email doit être valide"
}
```

### Erreur - Email dupliqué (400 Bad Request)

```json
{
  "error": "Un employé avec cet email existe déjà"
}
```

### Erreur serveur (500 Internal Server Error)

```json
{
  "error": "Failed to create employee"
}
```

## Règles de validation

### Nom
- ✅ Requis
- ✅ Non vide après trim

### Initiales
- ✅ Requises
- ✅ 2-3 caractères

### Rôle
- ✅ Requis
- ✅ Non vide

### Email
- ✅ Requis
- ✅ Format email valide
- ✅ Unique dans le système
- ✅ Converti en minuscules automatiquement

### Couleur
- Si non fournie, une couleur disponible est assignée automatiquement
- Format hexadécimal (#RRGGBB)

## Attribution automatique de couleur

Le système maintient une palette de couleurs et assigne automatiquement une couleur non utilisée. Les couleurs disponibles incluent :
- Bleu (#3B82F6)
- Vert (#10B981)
- Rouge (#EF4444)
- Jaune (#F59E0B)
- Violet (#8B5CF6)
- etc.

## Exemples

### cURL

```bash
curl -X POST "https://votre-domaine.com/api/employees" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -H "x-user-email: admin@example.com" \
  -d '{
    "name": "Jean Dupont",
    "initial": "JD",
    "role": "Formateur",
    "email": "jean.dupont@example.com",
    "phone": "+33612345678"
  }'
```

### JavaScript (Fetch)

```javascript
async function createEmployee(employeeData, userId, userEmail) {
  try {
    const response = await fetch('https://votre-domaine.com/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-user-email': userEmail,
      },
      body: JSON.stringify(employeeData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const employee = await response.json();
    console.log('Employee created:', employee);
    return employee;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Utilisation
const newEmployee = {
  name: "Jean Dupont",
  initial: "JD",
  role: "Formateur",
  email: "jean.dupont@example.com",
  phone: "+33612345678"
};

createEmployee(newEmployee, 'user_123', 'admin@example.com');
```

### Python (requests)

```python
import requests

def create_employee(employee_data, user_id, user_email):
    url = "https://votre-domaine.com/api/employees"
    headers = {
        "Content-Type": "application/json",
        "x-user-id": user_id,
        "x-user-email": user_email
    }

    response = requests.post(url, json=employee_data, headers=headers)

    if response.status_code == 201:
        employee = response.json()
        print(f"Employee created: {employee['name']}")
        return employee
    else:
        error = response.json()
        print(f"Error: {error.get('error', 'Unknown error')}")
        return None

# Utilisation
new_employee = {
    "name": "Jean Dupont",
    "initial": "JD",
    "role": "Formateur",
    "email": "jean.dupont@example.com",
    "phone": "+33612345678"
}

create_employee(new_employee, "user_123", "admin@example.com")
```

## Audit

Chaque création d'employé est enregistrée dans l'historique avec :
- **Type** : 'employee'
- **Action** : 'create'
- **User ID** : ID de l'utilisateur qui a créé l'employé
- **User Email** : Email de l'utilisateur
- **Entity ID** : ID de l'employé créé
- **Details** : Payload complet de l'employé

## Notes

- L'email est automatiquement converti en minuscules
- Les espaces sont supprimés des champs name, initial, role et email
- Si aucun avatar n'est fourni, un placeholder est utilisé
- La couleur est assignée automatiquement si non fournie

## Cas d'usage

1. **Onboarding** : Ajouter un nouvel employé qui rejoint l'équipe
2. **Import** : Importer des employés depuis un fichier CSV
3. **Interface d'administration** : Formulaire de création d'employé

## Endpoints liés

- [List all employees](list-employees.md) - Voir tous les employés
- [Update an employee](update-employee.md) - Modifier un employé
- [Delete an employee](delete-employee.md) - Supprimer un employé

## Codes de statut

| Code | Description |
|------|-------------|
| 201 | Employé créé avec succès |
| 400 | Données invalides ou email dupliqué |
| 500 | Erreur serveur lors de la création |
