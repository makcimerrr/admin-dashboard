# 👋 Introduction

Bienvenue dans la documentation de l'API Admin Dashboard. Cette API RESTful vous permet d'interagir avec les données de l'application de tableau de bord administratif.

## 🌐 URL de Base

L'URL de base pour toutes les requêtes API est :

```
https://votre-domaine.com/api
```

En développement local :
```
http://localhost:3000/api
```

## 📦 Format des Données

L'API accepte et retourne des données au format **JSON**. Assurez-vous de définir l'en-tête `Content-Type` sur `application/json` pour les requêtes POST, PUT et PATCH.

```http
Content-Type: application/json
```

## 🚦 Codes de Statut HTTP

L'API utilise les codes de statut HTTP standard pour indiquer le succès ou l'échec d'une requête.

*   `200 OK` : La requête a réussi.
*   `201 Created` : La ressource a été créée avec succès.
*   `400 Bad Request` : La requête est invalide (paramètres manquants, données incorrectes).
*   `401 Unauthorized` : Authentification requise ou échouée.
*   `403 Forbidden` : Vous n'avez pas les droits pour accéder à cette ressource.
*   `404 Not Found` : La ressource demandée n'existe pas.
*   `429 Too Many Requests` : Vous avez dépassé la limite de requêtes autorisée.
*   `500 Internal Server Error` : Une erreur est survenue côté serveur.

## 📚 Pagination

Certains endpoints de liste (comme `/api/get_students`) supportent la pagination via des paramètres de requête (query params) comme `offset` et `limit`.

Exemple :
```
GET /api/get_students?offset=20
```
