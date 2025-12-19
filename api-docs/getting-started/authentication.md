# 🔐 Authentification

L'API utilise principalement une authentification basée sur les sessions ou les tokens, selon le contexte (Stack Auth, NextAuth, ou custom).

## 🔑 Authentification Standard

Pour les endpoints protégés, vous devez être authentifié.

### Connexion

Utilisez l'endpoint `/api/authenticate` pour obtenir une session ou un token.

```http
POST /api/authenticate
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

## 🤖 Authentification Système (Cron / Webhooks)

Certains endpoints système (comme `/api/cron`) nécessitent une authentification par token Bearer via un header `Authorization`.

```http
Authorization: Bearer VOTRE_CRON_SECRET
```

## 🛡️ Rate Limiting

Pour protéger l'API contre les abus, certains endpoints (comme `/api/authenticate` et `/api/register`) implémentent une limitation de débit (Rate Limiting) basée sur l'adresse IP.

*   **Login** : Max 5 tentatives par minute. Blocage temporaire de 15 minutes après échecs répétés.
*   **Register** : Max 5 tentatives par minute.
