# 🐢 Statut des Retards

Cet endpoint fournit des statistiques sur les retards des étudiants pour une promotion donnée.

## 📝 Détails de l'Endpoint

- **URL** : `/api/delay-status`
- **Méthode** : `GET`

## 📥 Paramètres d'URL (Query Params)

| Paramètre | Type   | Requis | Description                                      |
| :-------- | :----- | :----- | :----------------------------------------------- |
| `promoId` | String | ✅ Oui | L'ID de la promotion.                            |
| `action`  | String | ✅ Oui | Type d'action : `status` ou `summary`.           |

## 📥 Opérations

### Action: `status`

Retourne le statut détaillé des retards.

**Exemple de requête :** `/api/delay-status?promoId=123&action=status`

**Réponse :**
```json
{
  "totalStudents": 20,
  "delayedStudents": 5,
  "details": [ ... ]
}
```

### Action: `summary`

Retourne un résumé mensuel des retards moyens.

**Exemple de requête :** `/api/delay-status?promoId=123&action=summary`

**Réponse :**
```json
[
  { "month": "Janvier", "averageDelay": 2.5 },
  { "month": "Février", "averageDelay": 1.8 }
]
```
