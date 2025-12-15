# API Documentation - Admin Dashboard

Bienvenue dans la documentation de l'API Admin Dashboard. Cette API permet de gérer les promotions, étudiants, projets, employés et plannings de votre établissement.

## Vue d'ensemble

L'API Admin Dashboard est une API RESTful construite avec Next.js 15 qui fournit des endpoints pour :

- **Gestion des promotions** : Consulter les promotions et leurs projets en cours
- **Gestion des étudiants** : Rechercher et filtrer les étudiants par promotion, statut et niveau de retard
- **Gestion des projets** : CRUD complet sur les projets pédagogiques
- **Gestion des employés** : Créer et gérer les profils des employés
- **Gestion des plannings** : Planifier et organiser les emplois du temps hebdomadaires
- **Authentification** : Système d'authentification sécurisé avec rate limiting

## URL de base

```
https://votre-domaine.com/api
```

## Format des données

Toutes les requêtes et réponses utilisent le format **JSON**.

### Headers requis

```http
Content-Type: application/json
```

### Headers d'authentification (optionnel selon l'endpoint)

```http
x-user-id: <user-id>
x-user-email: <user-email>
```

## Conventions de réponse

Toutes les réponses de l'API suivent une structure cohérente :

### Réponse réussie
```json
{
  "success": true,
  "data": { ... }
}
```

### Réponse avec erreur
```json
{
  "success": false,
  "error": "Description de l'erreur",
  "details": "Informations supplémentaires"
}
```

## Codes de statut HTTP

| Code | Description |
|------|-------------|
| 200 | Requête réussie |
| 201 | Ressource créée avec succès |
| 400 | Requête invalide (paramètres manquants ou incorrects) |
| 401 | Non autorisé (authentification requise) |
| 404 | Ressource non trouvée |
| 429 | Trop de requêtes (rate limiting) |
| 500 | Erreur interne du serveur |

## Pagination

Les endpoints qui retournent des listes supportent la pagination via les paramètres :

- `offset` : Position de départ (défaut: 0)
- `limit` : Nombre d'éléments à retourner

Exemple :
```
GET /api/get_students?offset=0&promo=B3
```

## Rate Limiting

L'endpoint d'authentification implémente un système de rate limiting :
- **5 tentatives maximum** par minute par IP
- **Blocage de 15 minutes** après 5 échecs consécutifs

## Audit et historique

Les opérations de création, modification et suppression sont automatiquement enregistrées dans l'historique avec :
- Type d'opération
- Utilisateur concerné
- Détails avant/après modification
- Horodatage

## Prochaines étapes

Explorez la documentation des endpoints dans les sections suivantes :

- [Getting Started](getting-started/introduction.md) - Pour démarrer avec l'API
- [Authentication](getting-started/authentication.md) - Système d'authentification
- [Endpoints](endpoints/promotions/list-promotions.md) - Documentation détaillée de tous les endpoints

## Support

Pour toute question ou problème, contactez l'équipe de développement.

## Changelog

### Version 1.0 (Décembre 2025)
- Lancement initial de l'API
- Endpoints de base pour la gestion des promotions, étudiants, projets et employés
- Système d'authentification avec rate limiting
- Gestion des plannings hebdomadaires
