# 🌱 Initialisation BDD (Seed)

Cet endpoint permet d'initialiser la base de données avec des données de test ou d'importation (ex: CSV).

> ⚠️ **Attention** : Cet endpoint est généralement utilisé uniquement en développement ou lors de la configuration initiale.

## 📝 Détails de l'Endpoint

- **URL** : `/api/seed`
- **Méthode** : `GET`

## 📤 Réponses

### ✅ Succès (200 OK)

```json
{
  "message": "Données insérées avec succès !"
}
```

### ❌ Erreur Serveur (500 Internal Server Error)

```json
{
  "message": "Une erreur est survenue lors de l'insertion."
}
```
