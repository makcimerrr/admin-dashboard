# ⚠️ Erreurs & Codes de Statut

Cette section détaille la gestion des erreurs dans l'API.

## Structure d'une Erreur

En cas d'erreur, l'API retourne généralement un objet JSON contenant un message descriptif.

```json
{
  "error": "Description de l'erreur",
  "details": "Informations supplémentaires (optionnel)"
}
```

Ou parfois :

```json
{
  "message": "Description de l'erreur"
}
```

## Codes d'Erreur Courants

| Code | Signification | Description |
| :--- | :--- | :--- |
| **400** | Bad Request | La requête est mal formée ou des paramètres sont manquants/invalides. |
| **401** | Unauthorized | Vous devez être authentifié pour accéder à cette ressource. |
| **403** | Forbidden | Vous êtes authentifié mais n'avez pas les permissions nécessaires. |
| **404** | Not Found | La ressource demandée (utilisateur, projet, etc.) n'existe pas. |
| **405** | Method Not Allowed | La méthode HTTP utilisée n'est pas supportée par cet endpoint. |
| **429** | Too Many Requests | Trop de requêtes envoyées dans un court laps de temps. |
| **500** | Internal Server Error | Une erreur inattendue s'est produite côté serveur. |

## Gestion des Erreurs de Validation

Lors de la création ou de la mise à jour de ressources (ex: Employé, Projet), si les données ne respectent pas les règles de validation, une erreur `400` est renvoyée avec les détails des champs invalides.

Exemple :
```json
{
  "error": "Les dates de début ou de fin sont invalides."
}
```
