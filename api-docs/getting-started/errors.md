# Errors & Status Codes

## Vue d'ensemble

L'API Admin Dashboard utilise les codes de statut HTTP standards pour indiquer le succès ou l'échec d'une requête. Chaque réponse d'erreur inclut un message descriptif pour faciliter le debugging.

## Structure des erreurs

### Format standard

```json
{
  "success": false,
  "error": "Description de l'erreur",
  "details": "Informations supplémentaires (optionnel)"
}
```

ou dans certains cas :

```json
{
  "message": "Description de l'erreur"
}
```

### Exemples

#### Paramètre manquant (400)
```json
{
  "error": "Week key is required"
}
```

#### Ressource non trouvée (404)
```json
{
  "success": false,
  "message": "Promotion not found"
}
```

#### Erreur serveur (500)
```json
{
  "success": false,
  "error": "Internal error",
  "details": "Database connection failed"
}
```

## Codes de statut HTTP

### 2xx - Succès

#### 200 OK
Requête réussie. La ressource demandée a été retournée.

**Exemple :**
```http
GET /api/promos
200 OK
```

#### 201 Created
Ressource créée avec succès.

**Exemple :**
```http
POST /api/employees
201 Created
```

### 4xx - Erreurs client

#### 400 Bad Request
La requête est invalide ou mal formée. Vérifiez les paramètres requis.

**Causes courantes :**
- Paramètres manquants
- Format de données incorrect
- Validation échouée

**Exemple :**
```json
{
  "error": "Invalid project data."
}
```

**Solution :**
- Vérifiez que tous les paramètres requis sont présents
- Validez le format des données (email, dates, etc.)
- Consultez la documentation de l'endpoint

#### 401 Unauthorized
Authentification échouée. Les identifiants sont incorrects.

**Exemple :**
```json
{
  "message": "Invalid email or password"
}
```

**Solution :**
- Vérifiez l'email et le mot de passe
- Assurez-vous que le compte existe

#### 404 Not Found
La ressource demandée n'existe pas.

**Exemple :**
```json
{
  "success": false,
  "message": "Promotion not found"
}
```

**Solution :**
- Vérifiez l'ID de la ressource
- Assurez-vous que la ressource n'a pas été supprimée

#### 429 Too Many Requests
Rate limit atteint. Trop de requêtes ont été envoyées.

**Exemple :**
```json
{
  "message": "Too many login attempts. Please try again in 847 seconds."
}
```

**Solution :**
- Attendez avant de réessayer
- Implémentez un backoff exponentiel
- Pour l'authentification : attendez 15 minutes après 5 échecs

### 5xx - Erreurs serveur

#### 500 Internal Server Error
Erreur interne du serveur. Le problème vient du backend.

**Exemple :**
```json
{
  "success": false,
  "error": "Internal error",
  "details": "String(...)"
}
```

**Solution :**
- Réessayez la requête
- Si le problème persiste, contactez le support
- Vérifiez les logs serveur

## Erreurs par endpoint

### Authentification (POST /api/authenticate)

| Code | Message | Cause |
|------|---------|-------|
| 400 | "Email and password are required" | Paramètres manquants |
| 400 | "Unable to determine IP address" | Headers réseau incorrects |
| 401 | "Invalid email or password" | Identifiants incorrects |
| 429 | "Too many login attempts..." | Rate limit atteint |
| 500 | "Internal server error" | Erreur base de données |

### Promotions

| Code | Message | Cause |
|------|---------|-------|
| 404 | "Promotion not found" | ID de promotion invalide |
| 500 | "Internal error" | Erreur lors du traitement |

### Projects

| Code | Message | Cause |
|------|---------|-------|
| 400 | "Invalid project data." | Données de projet invalides |
| 400 | "Tech not found." | Technologie inexistante |

### Students

| Code | Message | Cause |
|------|---------|-------|
| 500 | "Error retrieving students" | Erreur base de données |

### Employees

| Code | Message | Cause |
|------|---------|-------|
| 400 | Validation errors | Données employé invalides |
| 400 | "Un employé avec cet email existe déjà" | Email dupliqué |
| 500 | "Failed to fetch/create employees" | Erreur base de données |

### Schedules

| Code | Message | Cause |
|------|---------|-------|
| 400 | "Week key is required" | Paramètre weekKey manquant |
| 400 | "Missing required parameters" | Paramètres manquants pour DELETE |
| 500 | "Internal Server Error" | Erreur base de données |

## Gestion des erreurs côté client

### JavaScript / Fetch API

```javascript
async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 400:
          console.error('Requête invalide:', error);
          // Afficher un message à l'utilisateur
          break;
        case 401:
          console.error('Non autorisé:', error);
          // Rediriger vers la page de connexion
          break;
        case 404:
          console.error('Ressource non trouvée:', error);
          break;
        case 429:
          console.error('Rate limit atteint:', error);
          // Attendre avant de réessayer
          break;
        case 500:
          console.error('Erreur serveur:', error);
          // Afficher un message générique
          break;
        default:
          console.error('Erreur inconnue:', error);
      }

      throw new Error(error.message || error.error);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur réseau:', error);
    throw error;
  }
}
```

### Retry avec backoff exponentiel

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited - attendre avant de réessayer
        const waitTime = Math.pow(2, i) * 1000; // Backoff exponentiel
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Attendre avant de réessayer
      const waitTime = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

## Bonnes pratiques

### 1. Toujours vérifier le code de statut

```javascript
if (response.ok) {
  // Traiter la réponse
} else {
  // Gérer l'erreur
}
```

### 2. Afficher des messages utilisateur clairs

```javascript
const errorMessages = {
  400: "Les données fournies sont invalides. Veuillez vérifier votre saisie.",
  401: "Identifiants incorrects. Veuillez réessayer.",
  404: "La ressource demandée n'existe pas.",
  429: "Trop de tentatives. Veuillez patienter quelques minutes.",
  500: "Une erreur s'est produite. Veuillez réessayer plus tard."
};
```

### 3. Logger les erreurs

```javascript
function logError(error, context) {
  console.error('API Error:', {
    message: error.message,
    context: context,
    timestamp: new Date().toISOString()
  });

  // Envoyer à un service de monitoring (Sentry, etc.)
}
```

### 4. Gérer les timeouts

```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    ...options
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout');
  }
} finally {
  clearTimeout(timeout);
}
```

## Debugging

### Vérifier les logs serveur

En cas d'erreur 500, les détails complets sont loggés côté serveur :

```
Error in authentication API: Error: Database connection failed
  at getUserFromDb (services/users.ts:42)
  ...
```

### Utiliser les outils de développement

1. **Network tab** : Inspectez les requêtes et réponses
2. **Console** : Vérifiez les logs d'erreur
3. **Headers** : Assurez-vous que les headers sont corrects

### Tester avec cURL

```bash
# Tester un endpoint
curl -v -X POST "https://votre-domaine.com/api/authenticate" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'

# Le flag -v affiche tous les détails de la requête et réponse
```

## Support

Si vous rencontrez une erreur non documentée ou un comportement inattendu :

1. Vérifiez cette documentation
2. Consultez les logs côté serveur
3. Contactez l'équipe de développement avec :
   - URL de l'endpoint
   - Payload de la requête
   - Code de statut et message d'erreur
   - Timestamp de l'erreur

## Prochaines étapes

- [Explorer les endpoints](../endpoints/promotions/list-promotions.md)
- [Exemples de workflows](../examples/common-workflows.md)
