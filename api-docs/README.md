# 📚 API Documentation - Admin Dashboard

Bienvenue dans la documentation officielle de l'API Admin Dashboard. Cette API RESTful est conçue pour permettre une gestion complète et efficace des promotions, étudiants, projets, employés et plannings au sein de votre établissement. Développée avec Next.js 15, elle offre une interface robuste et sécurisée pour interagir avec vos données.

## ✨ Fonctionnalités Clés

*   **Gestion des Promotions** : Accédez aux informations détaillées des promotions et suivez l'avancement de leurs projets.
*   **Gestion des Étudiants** : Effectuez des recherches et des filtrages avancés sur les étudiants (par promotion, statut, niveau de retard, etc.).
*   **Gestion des Projets** : Bénéficiez d'un ensemble complet d'opérations CRUD (Créer, Lire, Mettre à jour, Supprimer) pour les projets pédagogiques.
*   **Gestion des Employés** : Créez, mettez à jour et gérez les profils de vos employés.
*   **Gestion des Plannings** : Planifiez et organisez les emplois du temps hebdomadaires avec flexibilité.
*   **Authentification Sécurisée** : Un système d'authentification robuste avec des mécanismes de protection contre les abus (rate limiting).
*   **Audit et Historique** : Toutes les opérations critiques sont tracées pour une meilleure traçabilité et conformité.

## 🚀 Démarrage Rapide

Pour commencer à utiliser l'API, suivez ces étapes simples :

1.  **Authentification** : Obtenez un jeton d'authentification en utilisant l'endpoint `/api/authenticate`.
2.  **Exploration des Endpoints** : Parcourez la section [API Reference](#api-reference) pour découvrir tous les endpoints disponibles et leurs fonctionnalités.
3.  **Tests** : Utilisez des outils comme Postman ou Insomnia pour tester vos requêtes.

## 🔗 URL de Base

Toutes les requêtes API doivent être préfixées par l'URL de base suivante :

```
https://votre-domaine.com/api
```
*N'oubliez pas de remplacer `votre-domaine.com` par l'adresse de déploiement de votre API.*

## 📊 Format des Données

L'API utilise exclusivement le format **JSON** pour toutes les requêtes et réponses.

### Headers Requis

Pour la plupart des requêtes, le header `Content-Type` est nécessaire :

```http
Content-Type: application/json
```

### Headers d'Authentification (si applicable)

Certains endpoints sécurisés nécessitent des informations d'authentification. Ces headers sont généralement fournis après une authentification réussie :

```http
x-user-id: <user-id>
x-user-email: <user-email>
```

## 🔄 Conventions de Réponse

L'API suit une structure de réponse standardisée pour faciliter l'intégration :

### ✅ Réponse Réussie (HTTP 200 OK, 201 Created, etc.)
```json
{
  "success": true,
  "data": {
    // Les données de la réponse
  }
}
```

### ⛔️ Réponse avec Erreur (HTTP 4xx Client Error, 5xx Server Error)
```json
{
  "success": false,
  "error": "Description concise de l'erreur.",
  "details": "Informations supplémentaires pour le débogage ou la résolution."
}
```

## 🆘 Codes de Statut HTTP

Comprenez les codes de statut HTTP pour interpréter correctement les réponses de l'API :

| Code | Catégorie | Description |
| :--- | :-------- | :---------- |
| `200 OK` | Succès | La requête a été traitée avec succès. |
| `201 Created` | Succès | Une nouvelle ressource a été créée avec succès. |
| `400 Bad Request` | Erreur Client | La requête est mal formée ou contient des paramètres invalides. |
| `401 Unauthorized` | Erreur Client | L'authentification est requise ou a échoué. |
| `403 Forbidden` | Erreur Client | L'utilisateur n'a pas les permissions nécessaires pour accéder à la ressource. |
| `404 Not Found` | Erreur Client | La ressource demandée n'existe pas. |
| `429 Too Many Requests` | Erreur Client | Le client a envoyé trop de requêtes dans un laps de temps donné (rate limiting). |
| `500 Internal Server Error` | Erreur Serveur | Une erreur inattendue est survenue côté serveur. |

## 📜 Pagination

Les endpoints qui retournent des collections de ressources supportent la pagination pour gérer de grands ensembles de données. Utilisez les paramètres de requête suivants :

*   `offset` : Indique la position de départ dans la collection (par défaut : `0`).
*   `limit` : Spécifie le nombre maximum d'éléments à retourner par page.

**Exemple :**
```
GET /api/get_students?offset=0&limit=10&promo=B3
```

## ⏱️ Rate Limiting

L'endpoint d'authentification est protégé par un mécanisme de rate limiting pour prévenir les attaques par force brute :

*   **Limite** : 5 tentatives d'authentification maximum par minute par adresse IP.
*   **Blocage** : Après 5 échecs consécutifs, l'adresse IP est bloquée pendant 15 minutes.

## 📝 Audit et Historique

Pour garantir la traçabilité et la conformité, toutes les opérations de création, modification et suppression de ressources sont automatiquement enregistrées. L'historique inclut :

*   Le type d'opération effectuée.
*   L'identifiant de l'utilisateur ayant initié l'opération.
*   Les détails des modifications (valeurs avant/après).
*   L'horodatage précis de l'événement.

## ➡️ Prochaines Étapes

*   **[Quickstart Guide](getting-started/introduction.md)** : Apprenez à configurer votre environnement et à faire votre première requête.
*   **[Authentication](getting-started/authentication.md)** : Comprenez les mécanismes d'authentification et comment sécuriser vos requêtes.
*   **[API Reference](#api-reference)** : Explorez la documentation détaillée de chaque endpoint.

## ❓ Support

Pour toute question, suggestion ou problème technique, n'hésitez pas à contacter l'équipe de développement via [adresse email/lien support].

## 🗓️ Changelog

### Version 1.0 (Décembre 2025)
*   Lancement initial de l'API Admin Dashboard.
*   Implémentation des endpoints de base pour la gestion des promotions, étudiants, projets et employés.
*   Mise en place du système d'authentification avec rate limiting.
*   Ajout de la gestion des plannings hebdomadaires.
*   Intégration du système d'audit et d'historique des opérations.
