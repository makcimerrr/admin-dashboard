# 📚 Flux de travail courants (Workflows)

Voici quelques exemples de séquences d'appels API pour réaliser des tâches courantes.

## 1. Créer une nouvelle promotion et ajouter des étudiants

1.  **Créer la promotion**
    *   `POST /api/promos`
    *   Body: `{ "key": "P2025", "title": "Promo 2025", ... }`

2.  **Importer les étudiants (via Seed ou autre méthode)**
    *   Actuellement, l'import se fait souvent via `/api/seed` (dev) ou via des scripts directs en base de données.

3.  **Vérifier la liste des étudiants**
    *   `GET /api/get_students?promo=P2025`

## 2. Gérer le planning d'un employé

1.  **Lister les employés pour obtenir l'ID**
    *   `GET /api/employees`

2.  **Récupérer le planning de la semaine en cours**
    *   `GET /api/schedules?weekKey=2024-W10`

3.  **Ajouter un créneau pour un employé**
    *   `POST /api/schedules`
    *   Body: `{ "employeeId": "emp_1", "weekKey": "2024-W10", "day": "lundi", "timeSlots": [...] }`

## 3. Suivre l'avancement d'un projet

1.  **Obtenir le statut actuel des promotions**
    *   `GET /api/promos/status`

2.  **Voir les détails d'une promotion spécifique**
    *   `GET /api/promotions/123`

3.  **Analyser les statistiques des 3 derniers projets**
    *   `GET /api/promotions/123/projects/last-three`

## 4. Mettre à jour les données du dashboard (Cron manuel)

1.  **Déclencher la mise à jour**
    *   `POST /api/update`
    *   Cela va rafraîchir les données de timeline et de progression.
