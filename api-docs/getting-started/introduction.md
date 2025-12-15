# Introduction

## Bienvenue

Bienvenue dans la documentation de l'API Admin Dashboard. Cette API a été conçue pour faciliter la gestion complète d'un établissement d'enseignement, de ses promotions, étudiants, projets et plannings.

## Architecture

L'API est construite avec :
- **Next.js 15** - Framework React avec App Router
- **TypeScript** - Pour une typage fort et une meilleure maintenabilité
- **Drizzle ORM** - Pour la gestion de la base de données
- **PostgreSQL** - Base de données relationnelle

## Principes de conception

### RESTful API

L'API suit les principes REST :
- **GET** : Récupérer des ressources
- **POST** : Créer de nouvelles ressources
- **PATCH/PUT** : Modifier des ressources existantes
- **DELETE** : Supprimer des ressources

### Cohérence des réponses

Toutes les réponses suivent une structure cohérente avec un objet JSON contenant :
- Un champ `success` (boolean)
- Les données dans un champ approprié ou un champ `error` en cas d'échec

### Gestion des erreurs

L'API utilise les codes de statut HTTP standards et retourne des messages d'erreur descriptifs pour faciliter le debugging.

## Fonctionnalités principales

### 1. Gestion des promotions

Consultez les informations sur les promotions, leurs projets en cours et les statistiques de progression des étudiants.

### 2. Gestion des étudiants

Recherchez et filtrez les étudiants par :
- Promotion
- Statut de progression
- Niveau de retard
- Mot-clé de recherche

### 3. Gestion des projets

CRUD complet sur les projets pédagogiques avec support de :
- Multiples technologies (Golang, Javascript, Rust)
- Durée des projets en semaines
- Réorganisation par drag & drop

### 4. Gestion des employés

Créez et gérez les profils des employés avec :
- Informations de contact
- Rôles et couleurs pour l'interface
- Validation des données

### 5. Plannings hebdomadaires

Gérez les emplois du temps avec :
- Planning par semaine et par jour
- Détection automatique des jours fériés
- Créneaux horaires personnalisables
- Historique des modifications

## Prérequis

Pour utiliser cette API, vous devez :

1. **Avoir accès à une instance déployée** de l'application
2. **Disposer d'identifiants valides** (pour les endpoints protégés)
3. **Utiliser HTTPS** en production

## Base URL

```
Production: https://votre-domaine.com/api
Development: http://localhost:3000/api
```

## Format des requêtes

Toutes les requêtes doivent :
- Utiliser le format **JSON** pour les body
- Inclure le header `Content-Type: application/json`
- Encoder correctement les paramètres d'URL

### Exemple de requête

```bash
curl -X GET "https://votre-domaine.com/api/promos" \
  -H "Content-Type: application/json"
```

## Prochaines étapes

- [Configuration de l'authentification](authentication.md)
- [Gestion des erreurs](errors.md)
- [Explorer les endpoints](../endpoints/promotions/list-promotions.md)

## Limites et quotas

Actuellement, l'API implémente :
- **Rate limiting sur l'authentification** : 5 tentatives/minute par IP
- **Pagination** : Configurable selon les endpoints
- **Timeout** : Les requêtes complexes peuvent prendre plusieurs secondes

## Versions

Version actuelle : **v1.0**

L'API est actuellement en version stable. Les changements breaking seront communiqués à l'avance et une période de transition sera fournie.
