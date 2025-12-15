# Delete an employee

Supprime définitivement un employé du système.

## Endpoint

```
DELETE /api/employees/{id}
```

## Authentification

✅ Requise (headers x-user-id et x-user-email pour l'audit)

## Headers

```http
x-user-id: user_123
x-user-email: admin@example.com
```

## Paramètres d'URL

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| id | string | Oui | ID de l'employé à supprimer |

## Réponse

### Succès (200 OK)

```json
{
  "message": "Employee deleted successfully"
}
```

### Erreur - Employé non trouvé (404 Not Found)

```json
{
  "error": "Employee not found"
}
```

### Erreur serveur (500 Internal Server Error)

```json
{
  "error": "Failed to delete employee"
}
```

## Exemples

### cURL

```bash
curl -X DELETE "https://votre-domaine.com/api/employees/emp_456" \
  -H "x-user-id: user_123" \
  -H "x-user-email: admin@example.com"
```

### JavaScript (Fetch)

```javascript
async function deleteEmployee(employeeId, userId, userEmail) {
  try {
    const response = await fetch(
      `https://votre-domaine.com/api/employees/${employeeId}`,
      {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const result = await response.json();
    console.log(result.message);
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// Utilisation
deleteEmployee('emp_456', 'user_123', 'admin@example.com');
```

### JavaScript avec confirmation

```javascript
async function deleteEmployeeWithConfirmation(employee, userId, userEmail) {
  const confirmed = window.confirm(
    `Êtes-vous sûr de vouloir supprimer ${employee.name} ?`
  );

  if (!confirmed) {
    console.log('Suppression annulée');
    return false;
  }

  try {
    const response = await fetch(`/api/employees/${employee.id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': userId,
        'x-user-email': userEmail,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete employee');
    }

    alert('Employé supprimé avec succès');
    return true;
  } catch (error) {
    alert(`Erreur: ${error.message}`);
    return false;
  }
}

// Utilisation
const employee = { id: 'emp_456', name: 'Jean Dupont' };
deleteEmployeeWithConfirmation(employee, 'user_123', 'admin@example.com');
```

### Python (requests)

```python
import requests

def delete_employee(employee_id, user_id, user_email):
    url = f"https://votre-domaine.com/api/employees/{employee_id}"
    headers = {
        "x-user-id": user_id,
        "x-user-email": user_email
    }

    response = requests.delete(url, headers=headers)

    if response.status_code == 200:
        result = response.json()
        print(result['message'])
        return True
    elif response.status_code == 404:
        print("Employee not found")
        return False
    else:
        error = response.json()
        print(f"Error: {error.get('error', 'Unknown error')}")
        return False

# Utilisation
if delete_employee("emp_456", "user_123", "admin@example.com"):
    print("Employee deleted successfully")
```

### React Component with Modal

```javascript
import { useState } from 'react';

function EmployeeDeleteButton({ employee, userId, userEmail, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      setShowModal(false);
      onDelete(employee.id);
    } catch (error) {
      alert('Error deleting employee');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>Delete</button>

      {showModal && (
        <div className="modal">
          <h3>Confirm Deletion</h3>
          <p>
            Are you sure you want to delete <strong>{employee.name}</strong>?
          </p>
          <p>This action cannot be undone.</p>
          <button onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
          <button onClick={() => setShowModal(false)} disabled={isDeleting}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
```

## Audit

Chaque suppression est enregistrée dans l'historique avec :
- **Type** : 'employee'
- **Action** : 'delete'
- **User ID** : ID de l'utilisateur qui a supprimé l'employé
- **User Email** : Email de l'utilisateur
- **Entity ID** : ID de l'employé supprimé
- **Details** : État complet de l'employé avant suppression

## Impact de la suppression

⚠️ **La suppression d'un employé peut affecter** :

1. **Plannings** : Les plannings associés à cet employé
2. **Historique** : Les entrées d'historique créées par cet employé
3. **Références** : Toutes les références à cet employé dans le système

## Recommandations

### Avant de supprimer :

1. ✅ **Vérifier les dépendances** : S'assurer qu'aucun planning n'est associé
2. ✅ **Backup** : Exporter les données de l'employé
3. ✅ **Communication** : Informer les utilisateurs concernés
4. ✅ **Alternative** : Envisager un soft delete (désactivation) au lieu d'une suppression

### Bon nes pratiques :

1. 🔒 **Confirmation** : Toujours demander une confirmation utilisateur
2. 📝 **Audit** : Les suppressions sont automatiquement loggées
3. ⏱️ **Soft delete** : Considérer marquer comme "inactif" plutôt que supprimer
4. 🔔 **Notifications** : Notifier les administrateurs des suppressions

## Alternative : Soft Delete

Pour une approche plus sûre, considérez d'ajouter un flag `active` :

```json
{
  "id": "emp_456",
  "name": "Jean Dupont",
  "active": false,
  "deleted_at": "2024-12-15T16:50:00Z"
}
```

Puis filtrer les employés inactifs :
```javascript
const activeEmployees = employees.filter(emp => emp.active);
```

## Notes importantes

- ⚠️ **Suppression définitive** : L'employé est supprimé de la base de données
- ⚠️ **Irréversible** : Aucun moyen de restaurer sans backup
- ⚠️ **Audit conservé** : L'entrée d'audit est conservée dans l'historique
- ⚠️ **Headers requis** : Les headers x-user-id et x-user-email sont nécessaires

## Cas d'usage

1. **Départ d'employé** : Supprimer un employé qui quitte l'organisation
2. **Correction d'erreur** : Supprimer un employé créé par erreur
3. **Nettoyage** : Supprimer les employés de test
4. **Conformité RGPD** : Supprimer les données sur demande

## Endpoints liés

- [List all employees](list-employees.md) - Voir tous les employés
- [Create an employee](create-employee.md) - Créer un employé
- [Update an employee](update-employee.md) - Modifier un employé

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Employé supprimé avec succès |
| 404 | Employé non trouvé (déjà supprimé ou ID invalide) |
| 500 | Erreur serveur lors de la suppression |
