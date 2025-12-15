# Get students with filters

Récupère une liste paginée d'étudiants avec de multiples filtres et options de tri.

## Endpoint

```
GET /api/get_students
```

## Authentification

❌ Non requise

## Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| q | string | Non | "" | Mot-clé de recherche (nom, email) |
| offset | number | Non | 0 | Position de départ pour la pagination |
| promo | string | Non | "" | Filtrer par clé de promotion (ex: "B3", "M1") |
| filter | string | Non | "" | Colonne à trier |
| direction | string | Non | "asc" | Direction du tri ("asc" ou "desc") |
| status | string | Non | "" | Filtrer par statut de progression |
| delay_level | string | Non | "" | Filtrer par niveau de retard |

## Réponse

### Succès (200 OK)

```json
{
  "students": [
    {
      "id": "student_123",
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "promo": "B3",
      "actual_project_name": "mini_printf",
      "golang_project": "my_tar",
      "javascript_project": "my_rpg",
      "rust_project": null,
      "golang_completed": true,
      "javascript_completed": false,
      "rust_completed": false,
      "progress_status": "in_progress",
      "delay_level": "on_time",
      "created_at": "2024-09-01T10:00:00Z",
      "updated_at": "2024-12-15T15:30:00Z"
    }
  ],
  "newOffset": 20,
  "totalStudents": 150,
  "previousOffset": 0,
  "currentOffset": 0
}
```

### Erreur (500 Internal Server Error)

```json
{
  "message": "Error retrieving students",
  "error": "Error details"
}
```

## Structure de l'objet Student

| Champ | Type | Description |
|-------|------|-------------|
| id | string | Identifiant unique de l'étudiant |
| email | string | Email de l'étudiant |
| first_name | string | Prénom |
| last_name | string | Nom de famille |
| promo | string | Clé de la promotion (B3, M1, etc.) |
| actual_project_name | string | Nom du projet actuel |
| golang_project | string \| null | Dernier projet Golang |
| javascript_project | string \| null | Dernier projet Javascript |
| rust_project | string \| null | Dernier projet Rust |
| golang_completed | boolean | Track Golang terminée |
| javascript_completed | boolean | Track Javascript terminée |
| rust_completed | boolean | Track Rust terminée |
| progress_status | string | Statut de progression |
| delay_level | string | Niveau de retard |
| created_at | string | Date de création (ISO 8601) |
| updated_at | string | Date de dernière mise à jour (ISO 8601) |

## Pagination

La pagination est gérée avec `offset` :
- **Page size** : 20 étudiants par page
- **newOffset** : Position pour la page suivante (-1 si dernière page)
- **previousOffset** : Position pour la page précédente (-1 si première page)

## Exemples

### cURL - Recherche simple

```bash
curl -X GET "https://votre-domaine.com/api/get_students?q=john&promo=B3" \
  -H "Content-Type: application/json"
```

### JavaScript (Fetch) - Avec pagination

```javascript
async function getStudents(search = '', offset = 0, promo = '') {
  try {
    const params = new URLSearchParams({
      q: search,
      offset: offset.toString(),
      promo,
    });

    const response = await fetch(
      `https://votre-domaine.com/api/get_students?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch students');
    }

    const data = await response.json();

    console.log(`Total students: ${data.totalStudents}`);
    console.log(`Current page: ${data.students.length} students`);
    console.log(`Next offset: ${data.newOffset}`);

    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Utilisation
getStudents('john', 0, 'B3');
```

### Python (requests) - Avec filtres multiples

```python
import requests

def get_students(search="", offset=0, promo="", status="", delay_level=""):
    url = "https://votre-domaine.com/api/get_students"
    params = {
        "q": search,
        "offset": offset,
        "promo": promo,
        "status": status,
        "delay_level": delay_level
    }

    response = requests.get(url, params=params)

    if response.status_code == 200:
        data = response.json()
        print(f"Total students: {data['totalStudents']}")
        for student in data['students']:
            print(f"{student['first_name']} {student['last_name']} - {student['actual_project_name']}")
        return data
    else:
        print(f"Error: {response.status_code}")
        return None

# Utilisation - Étudiants de B3 en retard
get_students(promo="B3", delay_level="behind")
```

### React Component - Liste paginée

```javascript
import { useState, useEffect } from 'react';

function StudentsList() {
  const [students, setStudents] = useState([]);
  const [offset, setOffset] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    promo: '',
    status: '',
  });

  useEffect(() => {
    async function fetchStudents() {
      const params = new URLSearchParams({
        q: filters.search,
        offset: offset.toString(),
        promo: filters.promo,
        status: filters.status,
      });

      const response = await fetch(`/api/get_students?${params}`);
      const data = await response.json();

      setStudents(data.students);
      setTotalStudents(data.totalStudents);
    }

    fetchStudents();
  }, [offset, filters]);

  const handleNextPage = () => {
    setOffset(offset + 20);
  };

  const handlePreviousPage = () => {
    setOffset(Math.max(0, offset - 20));
  };

  return (
    <div>
      <h1>Students ({totalStudents})</h1>

      {/* Filtres */}
      <div>
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.promo}
          onChange={(e) => setFilters({ ...filters, promo: e.target.value })}
        >
          <option value="">All promos</option>
          <option value="B3">B3</option>
          <option value="M1">M1</option>
        </select>
      </div>

      {/* Liste */}
      <ul>
        {students.map(student => (
          <li key={student.id}>
            {student.first_name} {student.last_name} - {student.actual_project_name}
          </li>
        ))}
      </ul>

      {/* Pagination */}
      <div>
        <button onClick={handlePreviousPage} disabled={offset === 0}>
          Previous
        </button>
        <span>Page {Math.floor(offset / 20) + 1}</span>
        <button
          onClick={handleNextPage}
          disabled={offset + 20 >= totalStudents}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Filtres disponibles

### Par promotion
```
?promo=B3
```

### Par statut de progression
```
?status=in_progress
?status=finished
```

### Par niveau de retard
```
?delay_level=on_time
?delay_level=behind
?delay_level=very_behind
```

### Recherche textuelle
```
?q=john
```

### Tri
```
?filter=last_name&direction=asc
?filter=created_at&direction=desc
```

## Cas d'usage

1. **Liste d'étudiants** : Afficher tous les étudiants avec pagination
2. **Recherche** : Trouver un étudiant par nom ou email
3. **Filtrage par promotion** : Voir les étudiants d'une promo spécifique
4. **Suivi des retards** : Identifier les étudiants en difficulté
5. **Export de données** : Récupérer tous les étudiants pour analyse

## Performance

- **Page size fixe** : 20 étudiants par page
- **Index de base de données** : Utilise les index pour des requêtes rapides
- **Temps de réponse moyen** : < 200ms pour une page

## Notes

- Les filtres sont cumulatifs (AND)
- La recherche textuelle porte sur nom, prénom et email
- La pagination utilise un offset simple (pas de curseur)

## Endpoints liés

- [List all promotions](../promotions/list-promotions.md) - Pour les filtres de promotion
- [Get promotion by ID](../promotions/get-promotion.md) - Détails d'une promotion

## Codes de statut

| Code | Description |
|------|-------------|
| 200 | Liste d'étudiants retournée avec succès |
| 500 | Erreur lors de la récupération des étudiants |
