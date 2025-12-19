# 💻 Semaine Hackathon

Cet endpoint permet de définir ou de vérifier si une semaine donnée est une semaine de Hackathon.

## 📝 Détails de l'Endpoint

- **URL** : `/api/hackaton-week`
- **Méthode** : `GET`, `POST`

## 📥 Opérations

### GET - Vérifier une semaine

**Paramètres :** `weekKey` (ex: `2024-W10`)

**Réponse :**
```json
{
  "weekKey": "2024-W10",
  "isHackaton": true
}
```

### POST - Définir une semaine de Hackathon

**Corps de la requête :**
```json
{
  "weekKey": "2024-W10",
  "isHackaton": true
}
```

**Réponse :**
```json
{
  "success": true
}
```
