# 🔄 Mise à jour Projet (Interne)

Cet endpoint permet de mettre à jour le statut d'un projet pour un étudiant spécifique. Il est probablement utilisé par des webhooks ou des processus internes.

## 📝 Détails de l'Endpoint

- **URL** : `/api/update_project`
- **Méthode** : `POST`

## 📥 Corps de la Requête (JSON)

| Champ                    | Type   | Description                                      |
| :----------------------- | :----- | :----------------------------------------------- |
| `login`                  | String | Login de l'étudiant.                             |
| `project_name`           | String | Nom du projet.                                   |
| `project_status`         | String | Statut du projet (ex: `finished`).               |
| `delay_level`            | String | Niveau de retard.                                |
| `last_projects_finished` | Array  | Liste des derniers projets finis.                |
| `common_projects`        | Array  | Projets communs.                                 |
| `promo_name`             | String | Nom de la promotion.                             |

## 📤 Réponses

### ✅ Succès (200 OK)

```json
{
  "message": "Project updated successfully"
}
```

### ❌ Erreur Serveur (500 Internal Server Error)

```json
{
  "message": "Error updating project"
}
```
