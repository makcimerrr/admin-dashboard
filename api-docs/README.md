# 📚 Documentation API Admin Dashboard

Bienvenue dans la documentation de l'API de l'Admin Dashboard. Cette API permet de gérer les étudiants, les promotions, les projets, les employés et les plannings.

## 🌟 Fonctionnalités Principales

*   **👥 Gestion des Utilisateurs & Employés** : Création, modification, suppression et listage.
*   **🎓 Suivi des Promotions & Étudiants** : Vue d'ensemble des promotions, suivi des projets étudiants, statistiques de retard.
*   **📅 Plannings & Calendriers** : Gestion des emplois du temps, jours fériés, semaines de hackathon.
*   **🛠️ Configuration Système** : Gestion des projets, mises à jour, tâches cron.
*   **🔐 Sécurité & Audit** : Authentification, historique des actions (logs).

## 🚀 Accès Rapide

*   [Guide de Démarrage](getting-started/introduction.md)
*   [Authentification](endpoints/authentication/authenticate.md)
*   [Liste des Endpoints](SUMMARY.md)

## 🛠️ Technologies

Cette API est construite avec :
*   **Next.js** (App Router)
*   **TypeScript**
*   **Drizzle ORM** (PostgreSQL)
*   **Tailwind CSS** (pour le frontend associé)

## 📝 Conventions

*   Toutes les réponses sont au format **JSON**.
*   Les dates sont au format **ISO 8601** (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm:ss.sssZ`).
*   Les erreurs suivent un format standard `{ "error": "Message d'erreur" }` ou `{ "message": "Message d'erreur" }`.
