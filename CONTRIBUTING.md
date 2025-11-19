# 🤝 Contributing to Zone01 Admin Dashboard

Merci de votre intérêt pour contribuer au Zone01 Admin Dashboard ! Ce guide vous aidera à démarrer.

## 📋 Table des matières

- [Code de conduite](#-code-de-conduite)
- [Comment contribuer](#-comment-contribuer)
- [Workflow de développement](#-workflow-de-développement)
- [Conventions de code](#-conventions-de-code)
- [Processus de Pull Request](#-processus-de-pull-request)
- [Signaler des bugs](#-signaler-des-bugs)
- [Proposer des fonctionnalités](#-proposer-des-fonctionnalités)

---

## 📜 Code de conduite

En participant à ce projet, vous acceptez de respecter notre code de conduite :

- ✅ Soyez respectueux et inclusif
- ✅ Acceptez les critiques constructives
- ✅ Concentrez-vous sur ce qui est le mieux pour la communauté
- ❌ Pas de harcèlement ou de comportement inapproprié
- ❌ Pas de spam ou de publicité non sollicitée

---

## 💡 Comment contribuer

Il existe plusieurs façons de contribuer :

### 🐛 Signaler des bugs
- Vérifiez que le bug n'a pas déjà été signalé dans [Issues](https://github.com/makcimerrr/admin-dashboard/issues)
- Utilisez le template de bug report
- Incluez des détails (version, OS, navigateur)
- Ajoutez des captures d'écran si pertinent

### ✨ Proposer des fonctionnalités
- Ouvrez une [Discussion](https://github.com/makcimerrr/admin-dashboard/discussions) pour discuter de l'idée
- Expliquez le cas d'usage et les bénéfices
- Attendez les retours avant de commencer le développement

### 📝 Améliorer la documentation
- Corrigez les fautes de frappe
- Ajoutez des exemples
- Clarifiez les sections confuses
- Traduisez en d'autres langues

### 🔧 Corriger des bugs
- Consultez les [Issues marquées "good first issue"](https://github.com/makcimerrr/admin-dashboard/labels/good%20first%20issue)
- Commentez l'issue pour indiquer que vous travaillez dessus
- Suivez le workflow de développement ci-dessous

### 🚀 Développer des fonctionnalités
- Discutez d'abord de la fonctionnalité dans une issue
- Attendez l'approbation d'un mainteneur
- Suivez le workflow de développement

---

## 🔄 Workflow de développement

### 1. Fork et clone

```bash
# Fork le repository sur GitHub, puis :
git clone https://github.com/VOTRE_USERNAME/admin-dashboard.git
cd admin-dashboard

# Ajouter le remote upstream
git remote add upstream https://github.com/makcimerrr/admin-dashboard.git
```

### 2. Configuration

```bash
# Installer les dépendances
pnpm install

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Initialiser la base de données
pnpm drizzle-kit push
```

### 3. Créer une branche

```bash
# Mettre à jour main
git checkout main
git pull upstream main

# Créer une branche pour votre travail
git checkout -b feature/ma-fonctionnalite
# ou
git checkout -b fix/correction-bug
```

**Conventions de nommage des branches :**
- `feature/` - Nouvelles fonctionnalités
- `fix/` - Corrections de bugs
- `docs/` - Documentation uniquement
- `refactor/` - Refactoring de code
- `test/` - Ajout ou modification de tests
- `chore/` - Tâches de maintenance

### 4. Développer

```bash
# Lancer le serveur de développement
pnpm dev

# Accéder à http://localhost:3000
```

**Bonnes pratiques :**
- ✅ Écrire du code TypeScript typé
- ✅ Suivre les conventions de code (voir ci-dessous)
- ✅ Commenter le code complexe
- ✅ Tester vos changements
- ✅ Vérifier que tout fonctionne en production (`pnpm build`)

### 5. Commit

Utilisez [Conventional Commits](https://www.conventionalcommits.org/) :

```bash
# Format : type(scope): description

# Exemples
git commit -m "feat(students): add search filter"
git commit -m "fix(planning): correct date calculation"
git commit -m "docs(readme): update installation steps"
git commit -m "refactor(auth): simplify login logic"
git commit -m "style(ui): format button component"
git commit -m "test(api): add students endpoint tests"
git commit -m "chore(deps): update next to 15.2.4"
```

**Types de commits :**
- `feat` - Nouvelle fonctionnalité
- `fix` - Correction de bug
- `docs` - Documentation uniquement
- `style` - Formatage (pas de changement de code)
- `refactor` - Refactoring (pas de nouvelle fonctionnalité)
- `perf` - Amélioration des performances
- `test` - Ajout ou modification de tests
- `chore` - Maintenance, dépendances
- `ci` - Changements CI/CD
- `build` - Changements build system

### 6. Push et Pull Request

```bash
# Push vers votre fork
git push origin feature/ma-fonctionnalite

# Créer une Pull Request sur GitHub
```

---

## 📏 Conventions de code

### TypeScript

```typescript
// ✅ BON
interface Student {
  id: string;
  name: string;
  email: string;
}

export async function getStudents(): Promise<Student[]> {
  // Implementation
}

// ❌ MAUVAIS
function getStudents() {  // Pas de type de retour
  // any utilisé implicitement
}
```

### React Components

```typescript
// ✅ BON - Server Component
export default async function StudentsPage() {
  const students = await getStudents();

  return (
    <div>
      <StudentsList students={students} />
    </div>
  );
}

// ✅ BON - Client Component
'use client';

interface Props {
  students: Student[];
}

export function StudentsList({ students }: Props) {
  const [filter, setFilter] = useState('');
  // ...
}

// ❌ MAUVAIS - Pas de types pour les props
export function StudentsList({ students }) {
  // ...
}
```

### Styling

```tsx
// ✅ BON - Utiliser Tailwind + cn()
import { cn } from '@/lib/utils';

export function Button({ className, ...props }) {
  return (
    <button
      className={cn(
        "px-4 py-2 bg-blue-500 hover:bg-blue-600",
        className
      )}
      {...props}
    />
  );
}

// ❌ MAUVAIS - CSS inline
<button style={{ padding: '8px 16px' }}>
  Click me
</button>
```

### Imports

```typescript
// ✅ BON - Ordre et organisation
// 1. External dependencies
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal absolute imports
import { Button } from '@/components/ui/button';
import { getStudents } from '@/lib/db/services/students';

// 3. Relative imports
import { StudentCard } from './student-card';

// 4. Types
import type { Student } from '@/types';

// ❌ MAUVAIS - Mélange désordonné
import { StudentCard } from './student-card';
import { useState } from 'react';
import type { Student } from '@/types';
```

### Naming Conventions

```typescript
// Components - PascalCase
export function StudentCard() {}

// Functions/Variables - camelCase
const getStudentData = () => {};
const studentCount = 10;

// Constants - UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRIES = 3;

// Types/Interfaces - PascalCase
interface StudentData {}
type UserRole = 'admin' | 'user';

// Files
// - Components: PascalCase.tsx (StudentCard.tsx)
// - Utilities: kebab-case.ts (get-students.ts)
// - Pages: kebab-case (page.tsx dans students/ folder)
```

### Code Quality

```bash
# Avant de commit, vérifiez :

# 1. Linting
pnpm lint

# 2. Type checking
pnpm tsc --noEmit

# 3. Formatting
pnpm prettier --write .

# 4. Build
pnpm build
```

---

## 🔍 Processus de Pull Request

### Checklist avant de soumettre

- [ ] Code compilé sans erreurs (`pnpm build`)
- [ ] Linting passé (`pnpm lint`)
- [ ] Types corrects (pas d'erreurs TypeScript)
- [ ] Code formaté avec Prettier
- [ ] Testé localement
- [ ] Commits suivent Conventional Commits
- [ ] Branche à jour avec `main`
- [ ] Documentation mise à jour si nécessaire

### Template de PR

```markdown
## 📝 Description

Décrivez brièvement les changements apportés.

## 🎯 Type de changement

- [ ] 🐛 Bug fix
- [ ] ✨ Nouvelle fonctionnalité
- [ ] 💥 Breaking change
- [ ] 📝 Documentation
- [ ] 🔧 Refactoring

## 📋 Checklist

- [ ] Code testé localement
- [ ] Documentation mise à jour
- [ ] Pas de console.log oubliés
- [ ] Types TypeScript corrects
- [ ] Build réussi

## 🖼️ Captures d'écran

Si pertinent, ajoutez des captures d'écran.

## 📌 Issues liées

Closes #123
Related to #456
```

### Processus de review

1. **Soumission** - Vous ouvrez la PR
2. **Review automatique** - CI/CD vérifie le code
3. **Review manuelle** - Un mainteneur examine le code
4. **Discussion** - Échanges sur les changements
5. **Modifications** - Vous apportez les corrections demandées
6. **Approbation** - La PR est approuvée
7. **Merge** - Merge dans main par un mainteneur

---

## 🐛 Signaler des bugs

### Template de bug report

```markdown
## 🐛 Description du bug

Description claire et concise du problème.

## 📋 Étapes pour reproduire

1. Aller sur '...'
2. Cliquer sur '...'
3. Voir l'erreur

## ✅ Comportement attendu

Ce qui devrait se passer.

## ❌ Comportement actuel

Ce qui se passe réellement.

## 🖼️ Captures d'écran

Si applicable, ajoutez des captures.

## 🔧 Environnement

- OS: [e.g. macOS 14.0]
- Browser: [e.g. Chrome 120]
- Node version: [e.g. 18.17.0]
- Version du projet: [e.g. commit hash ou version]

## 📝 Informations supplémentaires

Logs d'erreur, contexte additionnel, etc.
```

---

## ✨ Proposer des fonctionnalités

### Template de feature request

```markdown
## 🎯 Problème à résoudre

Quel problème cette fonctionnalité résout-elle ?

## 💡 Solution proposée

Décrivez la solution que vous aimeriez voir.

## 🔄 Alternatives considérées

Autres solutions envisagées.

## 📊 Impact

- Utilisateurs concernés
- Effort de développement estimé
- Bénéfices attendus

## 📝 Détails additionnels

Mockups, exemples, références, etc.
```

---

## 🧪 Tests

```bash
# Lancer les tests (quand disponibles)
pnpm test

# Tests en mode watch
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Écrire des tests

```typescript
// tests/students.test.ts
import { describe, it, expect } from 'vitest';
import { getStudents } from '@/lib/db/services/students';

describe('getStudents', () => {
  it('should return array of students', async () => {
    const students = await getStudents();
    expect(Array.isArray(students)).toBe(true);
  });

  it('should have required properties', async () => {
    const students = await getStudents();
    if (students.length > 0) {
      expect(students[0]).toHaveProperty('id');
      expect(students[0]).toHaveProperty('name');
    }
  });
});
```

---

## 📞 Obtenir de l'aide

Si vous avez des questions ou besoin d'aide :

- 💬 [GitHub Discussions](https://github.com/makcimerrr/admin-dashboard/discussions)
- 📧 Email: maximedubs@proton.me
- 📖 Documentation: [docs/](./docs/)

---

## 🙏 Remerciements

Merci de contribuer au Zone01 Admin Dashboard ! Chaque contribution, petite ou grande, est appréciée.

---

<div align="center">

**🤝 Built with ❤️ by the community**

[View Contributors](https://github.com/makcimerrr/admin-dashboard/graphs/contributors)

</div>
