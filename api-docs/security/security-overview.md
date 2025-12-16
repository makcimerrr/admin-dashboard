# 🔐 Security Overview

## 🎯 Objectif
Ce document fournit une vue d’ensemble claire et opérationnelle des bonnes pratiques de sécurité pour :
- une **API backend** (REST/GraphQL),
- des **clients React** (web / mobile).

Il couvre l’authentification, l’autorisation, la protection des transports, la gestion des secrets, la sécurisation des API et du frontend, ainsi que les pratiques CI/CD et de réponse aux incidents.

---

## 🧱 Principes fondamentaux
- **Principe du moindre privilège** : chaque composant n’a accès qu’au strict nécessaire.
- **Défense en profondeur** : plusieurs couches de sécurité indépendantes.
- **Secure by default & fail-secure** : refus par défaut, échec sécurisé.
- **Séparation stricte des environnements** : `dev`, `staging`, `prod`.

---

## 🔑 Authentification
- Utiliser des **JWT signés** :
   - *Access tokens* à durée de vie courte.
   - *Refresh tokens* à durée de vie plus longue.
- Hachage des mots de passe avec **bcrypt** ou **argon2**.
- Rotation et révocation des refresh tokens.
- Exemple d’en-tête HTTP :
  ```http
  Authorization: Bearer <access_token>
  ```

---

## 🛂 Autorisation
- Contrôles **RBAC** ou basés sur des **scopes / claims JWT**.
- Validation **systématique côté serveur** pour chaque endpoint.
- Accès refusé par défaut + **journalisation** des tentatives bloquées.

---

## 🔐 Transport & Chiffrement
- **TLS obligatoire** pour toutes les communications.
- Secrets stockés dans :
   - un **gestionnaire dédié** (Vault, KMS),
   - ou des **variables d’environnement chiffrées**.
- Rotation régulière des clés, certificats et tokens.

---

## 🛡️ Protection des API
- **Rate limiting** et protection contre le brute force.
- **CORS strict** avec liste blanche d’origines.
- Protection **CSRF** si cookies utilisés :
   - tokens CSRF,
   - ou éviter les cookies pour les access tokens.
- Headers de sécurité :
   - `Content-Security-Policy`
   - `X-Content-Type-Options`
   - `Strict-Transport-Security`  
     → via des middlewares comme **helmet**.

---

## 🧪 Validation & prévention des injections
- Validation stricte des entrées (schémas) :
   - `zod`, `joi`, `yup`.
- Accès base de données sécurisé :
   - requêtes **paramétrées**,
   - ou **ORM** (Prisma, Knex).
- **Jamais** de concaténation de chaînes SQL.
- Prévention XSS côté client :
   - échapper / sanitizer les entrées,
   - éviter `dangerouslySetInnerHTML` dans React.

---

## 🔒 Stockage & gestion des secrets
- Aucun secret dans le dépôt Git.
- Secrets injectés via :
   - CI/CD,
   - gestionnaire de secrets.
- Audits d’accès réguliers.
- Application stricte du moindre privilège.

---

## 📊 Logs & Surveillance
- Logs **structurés** avec masquage des données sensibles (PII, tokens).
- Alertes sur :
   - échecs d’authentification répétés,
   - pics de trafic anormaux.
- Sauvegardes régulières + tests de restauration.

---

## 🚀 Dépendances & CI/CD
- Scans de dépendances (SCA) :
   - Dependabot,
   - Snyk.
- Analyses statiques et tests de sécurité dans la pipeline.
- Déploiements reproductibles + revues de configuration.

---

## 🚨 Réponse aux incidents
- Playbook d’incident documenté :
   - rotation immédiate des clés,
   - révocation des tokens compromis.
- Journalisation d’audit.
- Communication maîtrisée et traçable.

---

## 🧰 Bibliothèques & outils recommandés
- **Auth / Tokens** : `jsonwebtoken`, `passport`, `oauth2-server`
- **Hashing** : `bcrypt`, `argon2`
- **Sécurité HTTP** : `helmet`, `cors`, `express-rate-limit`
- **ORM / SQL** : `Prisma`, `Knex`, `pg`
- **Validation** : `zod`, `joi`

---

## ✅ Checklist avant mise en production
- TLS actif + redirection HTTP → HTTPS.
- Secrets externalisés et audités.
- Rate limiting et monitoring en place.
- Tests de sécurité exécutés dans la CI.