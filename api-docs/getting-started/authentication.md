# Authentication

## Vue d'ensemble

L'API Admin Dashboard utilise un système d'authentification basé sur email/mot de passe avec protection contre les attaques par force brute via rate limiting.

## Endpoint d'authentification

### POST /api/authenticate

Authentifie un utilisateur avec son email et mot de passe.

#### Requête

```http
POST /api/authenticate
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "votre-mot-de-passe"
}
```

#### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| email | string | Oui | Email de l'utilisateur |
| password | string | Oui | Mot de passe de l'utilisateur |

#### Réponse réussie (200 OK)

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin"
}
```

#### Réponse avec erreur (401 Unauthorized)

```json
{
  "message": "Invalid email or password"
}
```

## Rate Limiting

Pour protéger contre les attaques par force brute, l'endpoint d'authentification implémente un système de rate limiting strict :

### Règles de limitation

- **5 tentatives maximum** par minute par adresse IP
- **Blocage de 15 minutes** après 5 échecs consécutifs
- **Réinitialisation automatique** en cas de connexion réussie

### Réponse en cas de rate limiting (429 Too Many Requests)

```json
{
  "message": "Too many login attempts. Please try again in 847 seconds."
}
```

### Détection de l'IP

L'API utilise les headers suivants pour détecter l'IP du client :
1. `x-forwarded-for` (prioritaire)
2. `remoteAddress` (fallback)

## Headers d'authentification

Après une authentification réussie, certains endpoints nécessitent l'inclusion des headers suivants pour l'audit :

```http
x-user-id: <user-id>
x-user-email: <user-email>
```

### Endpoints nécessitant ces headers

- POST /api/employees
- PUT/PATCH /api/employees/:id
- DELETE /api/employees/:id
- POST /api/schedules
- DELETE /api/schedules

> **Note** : Ces headers sont utilisés pour l'audit et l'historique des modifications. S'ils ne sont pas fournis, la valeur "unknown" sera utilisée.

## Exemples d'utilisation

### JavaScript / Fetch API

```javascript
async function authenticate(email, password) {
  try {
    const response = await fetch('https://votre-domaine.com/api/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const user = await response.json();
    // Stocker les informations utilisateur
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// Utilisation
authenticate('user@example.com', 'password123')
  .then(user => console.log('Logged in:', user))
  .catch(error => console.error('Login error:', error));
```

### cURL

```bash
curl -X POST "https://votre-domaine.com/api/authenticate" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Python (requests)

```python
import requests

def authenticate(email, password):
    url = "https://votre-domaine.com/api/authenticate"
    payload = {
        "email": email,
        "password": password
    }
    headers = {
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        return response.json()
    elif response.status_code == 429:
        print("Rate limited:", response.json()['message'])
    else:
        print("Authentication failed:", response.json()['message'])

    return None

# Utilisation
user = authenticate("user@example.com", "password123")
if user:
    print(f"Logged in as: {user['name']}")
```

## Gestion de session

L'API ne maintient pas de session serveur. Après authentification :

1. **Stockez les informations utilisateur côté client** (localStorage, sessionStorage, cookies)
2. **Incluez les headers x-user-id et x-user-email** dans les requêtes suivantes
3. **Réauthentifiez si nécessaire** (expiration, déconnexion)

## Sécurité

### Bonnes pratiques

- **Utilisez HTTPS** : Ne jamais envoyer d'identifiants via HTTP
- **Stockage sécurisé** : Utilisez des mécanismes sécurisés pour stocker les tokens/credentials
- **Expiration** : Implémentez une logique d'expiration côté client
- **Déconnexion** : Supprimez les données utilisateur lors de la déconnexion

### Ce que l'API fait

- ✅ Rate limiting par IP
- ✅ Validation des paramètres requis
- ✅ Blocage temporaire après échecs répétés
- ✅ Logs des tentatives de connexion
- ✅ Comparaison sécurisée des mots de passe

### Ce que vous devez faire

- ⚠️ Chiffrer les mots de passe avant stockage en base
- ⚠️ Utiliser HTTPS en production
- ⚠️ Implémenter une gestion de session côté client
- ⚠️ Ajouter une authentification 2FA si nécessaire

## Codes d'erreur

| Code | Description |
|------|-------------|
| 200 | Authentification réussie |
| 400 | Email ou mot de passe manquant / IP non détectable |
| 401 | Email ou mot de passe incorrect |
| 429 | Trop de tentatives - Rate limit atteint |
| 500 | Erreur serveur interne |

## Prochaines étapes

- [Comprendre les erreurs](errors.md)
- [Explorer les endpoints](../endpoints/promotions/list-promotions.md)
