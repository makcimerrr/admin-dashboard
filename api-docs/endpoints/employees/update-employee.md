# Update an employee

Met à jour les informations d'un employé existant.

## Endpoint

```
PUT /api/employees/{id}
```

## Authentification

✅ Requise (headers x-user-id et x-user-email pour l'audit)

## Headers

```http
Content-Type: application/json
x-user-id: user_123
x-user-email: admin@example.com
```

## Paramètres d'URL

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| id | string | Oui | ID de l'employé à modifier |

## Body de la requête

Tous les champs sont optionnels. Seuls les champs fournis seront mis à jour.

```json
{
  "name": "Jean Dupont",
  "initial": "JD",
  "role": "Formateur Senior",
  "avatar": "https://example.com/new-avatar.jpg",
  "color": "#10B981",
  "email": "jean.dupont@example.com",
  "phone": "+33612345678"
}
```

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| name | string | Non | Nom complet de l'employé |
| initial | string | Non | Initiales (2-3 caractères) |
| role | string | Non | Rôle de l'employé |
| avatar | string | Non | URL de l'avatar |
| color | string | Non | Couleur hexadécimale |
| email | string | Non | Email de l'employé (doit être unique) |
| phone | string | Non | Numéro de téléphone |

## Réponse

### Succès (200 OK)

```json
{
  "id": "emp_456",
  "name": "Jean Dupont",
  "initial": "JD",
  "role": "Formateur Senior",
  "avatar": "https://example.com/new-avatar.jpg",
  "color": "#10B981",
  "email": "jean.dupont@example.com",
  "phone": "+33612345678",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-12-15T16:45:00Z"
}
```

### Erreur - Employé non trouvé (404 Not Found)

```json
{
  "error": "Employee not found"
}
```

### Erreur - Validation (400 Bad Request)

```json
{
  "error": "L'email doit être valide"
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
  "error": "Failed to update employee"
}
```

## Règles de validation

La validation est effectuée sur les champs modifiés en combinaison avec les valeurs existantes :

### Nom
- ✅ Si fourni : non vide après trim

### Initiales
- ✅ Si fournies : 2-3 caractères

### Rôle
- ✅ Si fourni : non vide

### Email
- ✅ Si fourni : format email valide
- ✅ Si fourni et différent de l'actuel : doit être unique
- ✅ Converti en minuscules automatiquement

### Couleur
- ✅ Si fournie : format hexadécimal

## Exemples

### cURL - Mise à jour partielle

```bash
curl -X PUT "https://votre-domaine.com/api/employees/emp_456" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -H "x-user-email: admin@example.com" \
  -d '{
    "role": "Formateur Senior"
  }'
```

### JavaScript (Fetch) - Mise à jour complète

```javascript
async function updateEmployee(employeeId, updates, userId, userEmail) {
  try {
    const response = await fetch(
      `https://votre-domaine.com/api/employees/${employeeId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-email': userEmail,
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const employee = await response.json();
    console.log('Employee updated:', employee);
    return employee;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Utilisation - Changer le rôle
updateEmployee(
  'emp_456',
  { role: 'Formateur Senior' },
  'user_123',
  'admin@example.com'
);

// Utilisation - Mettre à jour plusieurs champs
updateEmployee(
  'emp_456',
  {
    role: 'Formateur Senior',
    phone: '+33698765432',
    color: '#10B981'
  },
  'user_123',
  'admin@example.com'
);
```

### Python (requests)

```python
import requests

def update_employee(employee_id, updates, user_id, user_email):
    url = f"https://votre-domaine.com/api/employees/{employee_id}"
    headers = {
        "Content-Type": "application/json",
        "x-user-id": user_id,
        "x-user-email": user_email
    }

    response = requests.put(url, json=updates, headers=headers)

    if response.status_code == 200:
        employee = response.json()
        print(f"Employee updated: {employee['name']}")
        return employee
    elif response.status_code == 404:
        print("Employee not found")
        return None
    else:
        error = response.json()
        print(f"Error: {error.get('error', 'Unknown error')}")
        return None

# Utilisation
updates = {
    "role": "Formateur Senior",
    "phone": "+33698765432"
}

update_employee("emp_456", updates, "user_123", "admin@example.com")
```

### React Form Example

```javascript
import { useState } from 'react';

function EmployeeEditForm({ employee, userId, userEmail, onSuccess }) {
  const [formData, setFormData] = useState({
    name: employee.name,
    initial: employee.initial,
    role: employee.role,
    email: employee.email,
    phone: employee.phone,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-email': userEmail,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }

      const updated = await response.json();
      alert('Employee updated successfully');
      onSuccess(updated);
    } catch (error) {
      alert('Error updating employee');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
      />
      <input
        type="text"
        value={formData.role}
        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        placeholder="Role"
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      <button type="submit">Update Employee</button>
    </form>
  );
}
```

## Audit

Chaque mise à jour est enregistrée dans l'historique avec :
- **Type** : 'employee'
- **Action** : 'update'
- **User ID** : ID de l'utilisateur qui a modifié l'employé
- **User Email** : Email de l'utilisateur
- **Entity ID** : ID de l'employé modifié
- **Details** : État avant et après modification

## Notes

- Seuls les champs fournis sont mis à jour
- L'email est automatiquement converti en minuscules
- La vérification d'unicité d'email n'est effectuée que si l'email est modifié
- Le champ `updated_at` est automatiquement mis à jour
- Les espaces sont supprimés automatiquement (trim)

## Cas d'usage

1. **Modification de profil** : Mettre à jour les informations d'un employé
2. **Changement de rôle** : Promouvoir ou changer le rôle
3. **Mise à jour de contact** : Changer email ou téléphone
4. **Personnalisation** : Modifier la couleur ou l'avatar

## Endpoints liés

- [List all employees](list-employees.md) - Voir tous les employés
- [Create an employee](create-employee.md) - Créer un employé
- [Delete an employee](delete-employee.md) - Supprimer un employé

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Employé mis à jour avec succès |
| 400 | Données invalides ou email dupliqué |
| 404 | Employé non trouvé |
| 500 | Erreur serveur lors de la mise à jour |
