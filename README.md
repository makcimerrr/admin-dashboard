# 🎯 Zone01 Normandie - Admin Dashboard

Un tableau de bord d'administration moderne et complet conçu pour gérer efficacement les étudiants, les promotions, les plannings et les statistiques de Zone01 Normandie.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 📑 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#️-architecture)
- [Stack technique](#-stack-technique)
- [Installation](#-installation)
- [Configuration](#️-configuration)
- [Déploiement](#-déploiement)
- [Structure du projet](#-structure-du-projet)
- [Documentation](#-documentation)
- [Maintenance](#-maintenance)
- [Contribution](#-contribution)

---

## 🌟 Vue d'ensemble

Le **Zone01 Admin Dashboard** est une application web full-stack qui centralise la gestion administrative de l'école Zone01 Normandie. Il permet aux administrateurs de :

- 👥 Gérer les étudiants et suivre leur progression
- 📊 Visualiser des statistiques et analytics détaillées
- 📅 Planifier et organiser les sessions de formation
- 🎯 Gérer les promotions et les projets
- 📈 Suivre les retards et absences
- 🔐 Authentification sécurisée via Stack Auth

### Captures d'écran

![Dashboard Overview](/screenshots/img.png)

---

## ✨ Fonctionnalités

### 🔐 Authentification & Autorisation
- **Stack Auth** - Authentification moderne avec OAuth (Google, GitHub)
- **Gestion des rôles** - Admin, Super Admin avec permissions granulaires
- **Métadonnées utilisateur** - Rôles et permissions personnalisés
- **Sessions sécurisées** - Cookies HTTP-only

### 👥 Gestion des Étudiants
- Liste complète des étudiants avec recherche et filtres
- Informations détaillées (progression, projets, statistiques)
- Synchronisation automatique avec l'API Zone01
- Mise à jour en temps réel des données

### 📊 Analytics & Statistiques
- Tableau de bord avec métriques clés
- Graphiques interactifs (progression, taux de réussite)
- Statistiques par promotion et par projet
- Export des données (CSV, JSON)

### 📅 Planning
- Vue calendrier interactive
- Gestion des absences et retards
- Planification des projets et hackathons
- Configuration des jours fériés et vacances
- Export du planning (CSV)

### 🎯 Gestion des Promotions
- Suivi des promotions actives
- Statut en temps réel (en cours, terminée)
- Configuration des projets obligatoires
- Gestion des délais et échéances

### 🛠️ Configuration
- **Gestion des projets** - Configuration des projets obligatoires
- **Gestion des vacances** - Définition des périodes de congés
- **Gestion des promotions** - Création et modification

### 🔄 Automatisation
- **Cron Jobs** - Mise à jour automatique des données
- **Webhooks** - Synchronisation en temps réel
- **API REST** - Intégration avec services externes

---

## 🏗️ Architecture

### Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Next.js    │  │  React 19    │  │ TailwindCSS  │  │
│  │   Frontend   │  │  Components  │  │   Styling    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js 15 App Router                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Server        │  │ API Routes   │  │ Middleware   │  │
│  │Components    │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Stack Auth  │ │Zone01 Hub API│ │Neon Database │
    │   (OAuth)    │ │              │ │ (PostgreSQL) │
    └──────────────┘ └──────────────┘ └──────────────┘
```

### Flux de données

1. **Authentification** : Stack Auth → Server Components → Client
2. **Données étudiants** : Zone01 API → Neon DB → Server Components
3. **Planning** : Neon DB → API Routes → Client Components
4. **Mise à jour** : Cron Jobs → Zone01 API → Neon DB

---

## 🛠 Stack technique

### Frontend
- **[Next.js 15.2.4](https://nextjs.org/)** - Framework React avec App Router
- **[React 19](https://react.dev/)** - Bibliothèque UI avec Server Components
- **[TypeScript 5.7.2](https://www.typescriptlang.org/)** - Typage statique
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utility-first
- **[shadcn/ui](https://ui.shadcn.com/)** - Composants UI réutilisables
- **[Framer Motion](https://www.framer.com/motion/)** - Animations
- **[Recharts](https://recharts.org/)** - Graphiques et visualisations

### Backend
- **[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)** - Endpoints REST
- **[Neon Database](https://neon.tech/)** - PostgreSQL serverless
- **[Drizzle ORM](https://orm.drizzle.team/)** - ORM TypeScript-first
- **[Stack Auth](https://stack-auth.com/)** - Authentification complète

### DevOps & Outils
- **[Vercel](https://vercel.com/)** - Hébergement et déploiement
- **[pnpm](https://pnpm.io/)** - Gestionnaire de paquets
- **[ESLint](https://eslint.org/)** - Linting
- **[Prettier](https://prettier.io/)** - Formatage du code

---

## 🚀 Installation

### Prérequis

- **Node.js** >= 18.17.0
- **pnpm** >= 8.0.0
- **Compte Stack Auth** - [Créer un compte](https://app.stack-auth.com)
- **Base de données Neon** - [Créer une DB](https://neon.tech)
- **Accès à l'API Zone01** - Token d'accès requis

### Installation locale

1. **Cloner le repository**
```bash
git clone https://github.com/makcimerrr/admin-dashboard.git
cd admin-dashboard
```

2. **Installer les dépendances**
```bash
pnpm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditer le fichier `.env` avec vos valeurs (voir [Configuration](#️-configuration))

4. **Initialiser la base de données**
```bash
pnpm drizzle-kit push
```

5. **Lancer le serveur de développement**
```bash
pnpm dev
```

6. **Accéder à l'application**
Ouvrir [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration

### Variables d'environnement requises

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

#### 🔐 Stack Auth (Authentification)
```env
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
STACK_SECRET_SERVER_KEY=your_secret_key
```

**Comment obtenir ces clés :**
1. Créer un compte sur [Stack Auth Dashboard](https://app.stack-auth.com)
2. Créer un nouveau projet
3. Copier les clés depuis Settings > API Keys

#### 🗄️ Base de données
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
POSTGRES_URL=postgresql://user:password@host/database?sslmode=require
```

**Obtenir une base Neon :**
1. Créer un compte sur [Neon](https://neon.tech)
2. Créer une nouvelle base de données
3. Copier la connection string

#### 🌐 API Zone01
```env
AUTHENDPOINT=https://hub.zone01normandie.org
NEXT_PUBLIC_ACCESS_TOKEN=your_zone01_api_token
```

#### 🔧 Configuration générale
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CRON_SECRET=your_random_secret_for_cron
AUTH_SECRET=your_random_secret_32_chars
```

**Générer des secrets sécurisés :**
```bash
openssl rand -base64 32
```

### Configuration Stack Auth OAuth

Pour activer l'authentification Google et GitHub :

1. **Configurer les providers dans Stack Auth Dashboard**
   - Aller sur Settings > OAuth Providers
   - Ajouter Google OAuth
   - Ajouter GitHub OAuth

2. **Configurer les URLs de callback**
   ```
   Développement: http://localhost:3000/api/stack-auth/oauth/callback
   Production: https://votre-domaine.vercel.app/api/stack-auth/oauth/callback
   ```

📖 **Documentation détaillée** : Voir [docs/STACK_AUTH_OAUTH_SETUP.md](./docs/STACK_AUTH_OAUTH_SETUP.md)

---

## 🚢 Déploiement

### Déploiement sur Vercel (Recommandé)

#### Via GitHub (Automatique)

1. **Connecter votre repository GitHub à Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - Cliquer sur "New Project"
   - Importer votre repository

2. **Configurer les variables d'environnement**
   - Dans Vercel Dashboard > Settings > Environment Variables
   - Ajouter toutes les variables du fichier `.env`
   - ⚠️ Important : Sélectionner tous les environnements (Production, Preview, Development)

3. **Déployer**
   - Vercel déploie automatiquement à chaque push sur `main`
   - Chaque PR crée un déploiement preview

#### Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Déployer en production
vercel --prod
```

### Configuration post-déploiement

1. **Mettre à jour NEXT_PUBLIC_BASE_URL**
```env
NEXT_PUBLIC_BASE_URL=https://votre-app.vercel.app
```

2. **Configurer les Cron Jobs sur Vercel**
Créer `vercel.json` :
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

3. **Mettre à jour les URLs de callback OAuth**
   - Stack Auth Dashboard > OAuth Providers
   - Ajouter l'URL de production

### Déploiement sur d'autres plateformes

<details>
<summary><b>Docker</b></summary>

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

```bash
docker build -t admin-dashboard .
docker run -p 3000:3000 --env-file .env admin-dashboard
```
</details>

<details>
<summary><b>Autres plateformes</b></summary>

- **Railway** : Connecter le repo et configurer les variables
- **Render** : Importer le projet et ajouter les env vars
- **DigitalOcean App Platform** : Déployer depuis GitHub
</details>

---

## 📁 Structure du projet

```
admin-dashboard/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Routes dashboard (layout groupé)
│   │   ├── layout.tsx           # Layout dashboard avec auth
│   │   ├── page.tsx             # Page d'accueil dashboard
│   │   ├── students/            # Gestion étudiants
│   │   ├── analytics/           # Statistiques
│   │   ├── planning/            # Planning
│   │   │   ├── page.tsx         # Vue planning
│   │   │   ├── absences/        # Gestion absences
│   │   │   └── extraction/      # Export planning
│   │   ├── promos/              # Gestion promotions
│   │   │   └── status/          # Statut promotions
│   │   ├── config/              # Configuration
│   │   ├── employees/           # Gestion employés
│   │   ├── history/             # Historique
│   │   └── account/             # Compte utilisateur
│   ├── (home)/                  # Routes publiques
│   │   ├── layout.tsx           # Layout home
│   │   ├── hub/                 # Hub d'informations
│   │   └── non-admin/           # Page non-admin
│   ├── api/                     # API Routes
│   │   ├── auth/                # Authentification (legacy)
│   │   ├── stack-auth/          # Stack Auth endpoints
│   │   ├── students/            # API étudiants
│   │   ├── planning/            # API planning
│   │   ├── promos/              # API promotions
│   │   ├── cron/                # Cron jobs
│   │   └── webhooks/            # Webhooks
│   ├── login/                   # Page de connexion
│   ├── register/                # Page d'inscription
│   ├── handler/                 # Stack Auth handler
│   ├── layout.tsx               # Root layout
│   ├── providers.tsx            # Providers (Theme, Auth)
│   └── loading.tsx              # Loading state
├── components/                   # Composants réutilisables
│   ├── ui/                      # Composants shadcn/ui
│   ├── planning/                # Composants planning
│   ├── login-form.tsx           # Formulaire connexion
│   └── nav-user.tsx             # Navigation utilisateur
├── lib/                         # Utilitaires et configuration
│   ├── db/                      # Configuration DB
│   │   ├── config.ts            # Connection Neon
│   │   ├── schema.ts            # Schéma Drizzle
│   │   └── services/            # Services DB
│   ├── stack-auth.ts            # Config Stack Auth
│   ├── stack-server.ts          # Stack Auth server
│   ├── stack-client.ts          # Stack Auth client
│   ├── stack-helpers.ts         # Helpers Stack Auth
│   └── ensure-user-metadata.ts  # Sync métadonnées
├── config/                      # Fichiers de configuration
│   ├── promoConfig.json         # Config promotions
│   └── promoStatus.json         # Statut promotions
├── drizzle/                     # Migrations Drizzle
│   └── migrations/              # Fichiers migration SQL
├── public/                      # Assets statiques
│   └── screenshots/             # Captures d'écran
├── docs/                        # Documentation complète
│   ├── DEPLOYMENT.md            # Guide déploiement
│   ├── FEATURES.md              # Documentation features
│   ├── ARCHITECTURE.md          # Architecture détaillée
│   ├── MAINTENANCE.md           # Guide maintenance
│   └── ENV_VARIABLES.md         # Variables d'environnement
├── .env                         # Variables d'environnement (local)
├── .env.example                 # Template variables
├── middleware.ts                # Middleware Next.js
├── next.config.js               # Configuration Next.js
├── tailwind.config.ts           # Configuration Tailwind
├── tsconfig.json                # Configuration TypeScript
├── drizzle.config.ts            # Configuration Drizzle
├── package.json                 # Dépendances
└── README.md                    # Ce fichier
```

---

## 📚 Documentation

### Documentation complète

- 📖 **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Guide de déploiement détaillé
- 🎯 **[FEATURES.md](./docs/FEATURES.md)** - Documentation des fonctionnalités
- 🏗️ **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Architecture technique
- 🔧 **[MAINTENANCE.md](./docs/MAINTENANCE.md)** - Guide de maintenance
- ⚙️ **[ENV_VARIABLES.md](./docs/ENV_VARIABLES.md)** - Variables d'environnement

### Documentation Stack Auth

- 🔐 **[docs/STACK_AUTH_MIGRATION.md](./STACK_AUTH_MIGRATION.md)** - Migration NextAuth → Stack Auth
- 🌐 **[docs/STACK_AUTH_OAUTH_SETUP.md](./docs/STACK_AUTH_OAUTH_SETUP.md)** - Configuration OAuth
- 🔍 **[docs/STACK_AUTH_TROUBLESHOOTING.md](./STACK_AUTH_TROUBLESHOOTING.md)** - Dépannage
- 📊 **[docs/STACK_METADATA_GUIDE.md](./STACK_METADATA_GUIDE.md)** - Gestion métadonnées

### API Documentation

Les endpoints API sont documentés dans chaque fichier route. Exemples :

- `GET /api/students` - Liste des étudiants
- `GET /api/promos/status` - Statut des promotions
- `POST /api/planning/absences` - Créer une absence
- `GET /api/cron` - Trigger cron job

---

## 🔧 Maintenance

### Mise à jour des dépendances

```bash
# Vérifier les mises à jour
pnpm outdated

# Mettre à jour toutes les dépendances
pnpm update

# Mettre à jour une dépendance spécifique
pnpm update next
```

### Migrations de base de données

```bash
# Générer une migration
pnpm drizzle-kit generate

# Appliquer les migrations
pnpm drizzle-kit push

# Ouvrir Drizzle Studio
pnpm drizzle-kit studio
```

### Synchronisation des données

Les données sont automatiquement synchronisées via cron jobs. Pour forcer une synchronisation manuelle :

```bash
curl -X GET https://votre-app.vercel.app/api/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Logs et Monitoring

- **Logs Vercel** : Dashboard Vercel > Logs
- **Erreurs** : Vérifier les logs dans Vercel
- **Performance** : Vercel Analytics activé

### Sauvegardes

La base de données Neon effectue des sauvegardes automatiques. Pour une sauvegarde manuelle :

```bash
# Export de la base de données
pg_dump $DATABASE_URL > backup.sql
```

---

## 👥 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

### Workflow de contribution

1. **Fork** le projet
2. **Créer une branche** (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add: Amazing Feature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir une Pull Request**

### Conventions de code

- **TypeScript** - Typage strict requis
- **ESLint** - Suivre les règles configurées
- **Prettier** - Formater le code avant commit
- **Commits** - Suivre [Conventional Commits](https://www.conventionalcommits.org/)

```bash
# Format des commits
feat: nouvelle fonctionnalité
fix: correction de bug
docs: mise à jour documentation
style: formatage code
refactor: refactoring
test: ajout de tests
chore: tâches diverses
```

### Tests

```bash
# Lancer les tests (à venir)
pnpm test

# Linter
pnpm lint

# Formatter
pnpm format
```

---

## 📄 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- **[Zone01 Normandie](https://zone01normandie.org)** - Pour le projet et l'API
- **[Vercel](https://vercel.com)** - Pour l'hébergement gratuit
- **[Stack Auth](https://stack-auth.com)** - Pour la solution d'authentification
- **[shadcn/ui](https://ui.shadcn.com/)** - Pour les composants UI
- **[Neon](https://neon.tech)** - Pour la base de données PostgreSQL

---

## 📞 Contact & Support

**Développé par Maxime Dubois**

- 🌐 Website: [makcimerrr.com](https://makcimerrr.com)
- 💼 GitHub: [@makcimerrr](https://github.com/makcimerrr)
- 📧 Email: maximedubs@proton.me

### Besoin d'aide ?

- 📖 Consulter la [documentation complète](./docs/)
- 🐛 Signaler un bug via [GitHub Issues](https://github.com/makcimerrr/admin-dashboard/issues)
- 💬 Poser une question via [Discussions](https://github.com/makcimerrr/admin-dashboard/discussions)

---

<div align="center">

**⭐ Si ce projet vous a été utile, n'hésitez pas à lui donner une étoile !**

Made with ❤️ by [Maxime Dubois](https://github.com/makcimerrr)

</div>
