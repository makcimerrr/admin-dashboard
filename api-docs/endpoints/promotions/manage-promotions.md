# 🛠️ Gérer les promotions (CRUD)

Cet endpoint permet de gérer la configuration des promotions (Ajout, Suppression, Liste).

## 📝 Détails de l'Endpoint

- **URL** : `/api/promos`
- **Méthode** : `GET`, `POST`, `DELETE`

## 📥 Opérations

### GET - Lister les promotions

Retourne la liste des promotions configurées (similaire à `/api/promotions`).

**Réponse (200 OK) :**
```json
{
  "promos": [
    {
      "key": "P2024",
      "eventId": 123,
      "title": "Promo 2024",
      "dates": { ... }
    }
  ]
}
```

### POST - Ajouter une promotion

Ajoute une nouvelle promotion à la configuration.

**Corps de la requête (JSON) :**
```json
{
  "key": "P2026",
  "eventId": 126,
  "title": "Promo 2026",
  "dates": {
    "start": "2026-01-01",
    "end": "2026-12-31",
    "piscine-js-start": "2026-02-01",
    "piscine-js-end": "2026-02-28"
  }
}
```

**Réponse (200 OK) :**
```json
{
  "message": "Promotion ajoutée avec succès."
}
```

**Erreurs (400) :**
- Champs obligatoires manquants.
- Dates invalides ou incohérentes (ex: fin avant début).
- Conflit (ID ou clé déjà existante).

### DELETE - Supprimer une promotion

Supprime une promotion de la configuration.

**Corps de la requête (JSON) :**
```json
{
  "key": "P2026"
}
```

**Réponse (200 OK) :**
```json
{
  "message": "Promotion supprimée avec succès."
}
```
