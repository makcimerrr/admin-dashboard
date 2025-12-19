# 🔐 Vue d'ensemble de la Sécurité

La sécurité est une priorité dans l'API Admin Dashboard. Voici les mécanismes mis en place.

## 🛡️ Authentification & Autorisation

*   **Utilisateurs** : L'accès au dashboard est protégé par une authentification (email/mot de passe ou OAuth via Stack Auth).
*   **API Routes** : Les routes sensibles vérifient la présence d'une session active ou d'un token valide.
*   **Système** : Les routes critiques comme `/api/cron` sont protégées par un secret (`CRON_SECRET`) vérifié dans les headers.

## 🚫 Protection contre les attaques

*   **Rate Limiting** :
    *   Mise en place sur les endpoints de login (`/api/authenticate`) et d'inscription (`/api/register`).
    *   Limite le nombre de tentatives par IP pour prévenir les attaques par force brute.
    *   Blocage temporaire des IP après plusieurs échecs.
*   **Validation des Entrées** :
    *   Toutes les données entrantes (body, query params) sont validées (types, formats, dates) avant d'être traitées pour éviter les injections et les erreurs logiques.
    *   Utilisation de `zod` ou de vérifications manuelles strictes.

## 🔒 Sécurité des Données

*   **Mots de passe** : Les mots de passe sont hachés avant d'être stockés en base de données (via les mécanismes d'authentification utilisés).
*   **HTTPS** : En production, toutes les communications doivent passer par HTTPS.

## 📝 Audit & Logs

*   **Historique** : Les actions critiques (création/suppression d'employés, modification de plannings) sont enregistrées dans une table d'historique (`/api/history`).
*   **Traçabilité** : Chaque entrée d'historique contient l'ID de l'utilisateur, l'action, le timestamp et les détails des modifications (avant/après).
