# 🎨 Guide des Palettes de Couleurs

## Vue d'ensemble

Le système de palettes de couleurs permet de personnaliser l'apparence de l'application avec 7 thèmes différents, chacun optimisé pour des cas d'usage spécifiques.

---

## 🎯 Les 7 Palettes Disponibles

### 1. Default (Bleu Classique) 🔵
```
Couleur principale: #3b82f6
Utilisation: Usage général, professionnel
Parfait pour: Dashboard, vues générales
```

**Variables CSS:**
```css
--accent-primary: 221 83% 53%;
--chart-accent-1: #3b82f6;
--chart-accent-2: #60a5fa;
--chart-accent-3: #93c5fd;
```

**Cas d'usage:**
- Dashboard principal
- Navigation générale
- Vues professionnelles standards

---

### 2. Blue (Bleu Océan) 🌊
```
Couleur principale: #0ea5e9
Utilisation: Analytics, données
Parfait pour: Graphiques, statistiques, data viz
```

**Variables CSS:**
```css
--accent-primary: 217 91% 60%;
--chart-accent-1: #0ea5e9;
--chart-accent-2: #38bdf8;
--chart-accent-3: #7dd3fc;
```

**Cas d'usage:**
- Page Analytics
- Dashboards de données
- Rapports statistiques
- Graphiques complexes

**Exemple de graphiques:**
```
Chart 1: #0ea5e9 (Bleu ciel)
Chart 2: #f97316 (Orange)
Chart 3: #06b6d4 (Cyan)
Chart 4: #8b5cf6 (Violet)
Chart 5: #10b981 (Vert)
Chart 6: #ef4444 (Rouge)
```

---

### 3. Purple (Violet) 💜
```
Couleur principale: #8b5cf6
Utilisation: Créatif, marketing
Parfait pour: Design, projets créatifs
```

**Variables CSS:**
```css
--accent-primary: 262 83% 58%;
--chart-accent-1: #8b5cf6;
--chart-accent-2: #a78bfa;
--chart-accent-3: #c4b5fd;
```

**Cas d'usage:**
- Projets créatifs
- Marketing
- Design review
- Portfolio

**Personnalité:**
- Créatif
- Moderne
- Énergique
- Distinctif

---

### 4. Green (Vert Émeraude) 🌿
```
Couleur principale: #10b981
Utilisation: Success, environnement, finance
Parfait pour: Validations, croissance, écologie
```

**Variables CSS:**
```css
--accent-primary: 142 76% 36%;
--chart-accent-1: #10b981;
--chart-accent-2: #34d399;
--chart-accent-3: #6ee7b7;
```

**Cas d'usage:**
- Indicateurs de succès
- Croissance/progrès
- Finance (positif)
- Écologie/environnement

**Exemple de graphiques:**
```
Chart 1: #10b981 (Vert émeraude)
Chart 2: #f59e0b (Ambre)
Chart 3: #14b8a6 (Teal)
Chart 4: #3b82f6 (Bleu)
Chart 5: #22c55e (Vert clair)
Chart 6: #ef4444 (Rouge)
```

---

### 5. Orange (Ambré) 🔥
```
Couleur principale: #f59e0b
Utilisation: Énergie, attention, warnings
Parfait pour: Alertes, actions importantes
```

**Variables CSS:**
```css
--accent-primary: 32 95% 44%;
--chart-accent-1: #f59e0b;
--chart-accent-2: #fbbf24;
--chart-accent-3: #fcd34d;
```

**Cas d'usage:**
- Alertes importantes
- Call-to-actions
- Mises en avant
- Tableaux de bord dynamiques

**Personnalité:**
- Énergique
- Attire l'attention
- Dynamique
- Chaleureux

---

### 6. Rose (Pink) 🌸
```
Couleur principale: #f43f5e
Utilisation: Design, créatif, moderne
Parfait pour: Interfaces modernes, projets design
```

**Variables CSS:**
```css
--accent-primary: 330 81% 60%;
--chart-accent-1: #f43f5e;
--chart-accent-2: #fb7185;
--chart-accent-3: #fda4af;
```

**Cas d'usage:**
- Design moderne
- Projets créatifs
- Interfaces jeunes
- Branding distinctif

**Exemple de graphiques:**
```
Chart 1: #f43f5e (Rose)
Chart 2: #f97316 (Orange)
Chart 3: #ec4899 (Pink)
Chart 4: #8b5cf6 (Violet)
Chart 5: #10b981 (Vert)
Chart 6: #dc2626 (Rouge foncé)
```

---

### 7. Slate (Gris Professionnel) ⚫
```
Couleur principale: #475569
Utilisation: Corporate, sérieux, professionnel
Parfait pour: Environnements formels, B2B
```

**Variables CSS:**
```css
--accent-primary: 215 28% 17%;
--chart-accent-1: #475569;
--chart-accent-2: #64748b;
--chart-accent-3: #94a3b8;
```

**Cas d'usage:**
- Environnements corporate
- Présentations formelles
- B2B dashboards
- Rapports officiels

**Personnalité:**
- Professionnel
- Sérieux
- Neutre
- Intemporel

---

## 📊 Comparaison des Palettes

### Pour Analytics/Data

**Recommandé:**
1. **Blue (Ocean)** - Le meilleur pour les données
2. **Green** - Pour les métriques de succès
3. **Purple** - Pour différencier des sections

**À éviter:**
- Slate (trop monotone pour des graphiques)

### Pour Code Reviews

**Recommandé:**
1. **Default** - Classique et lisible
2. **Purple** - Moderne et distinctif
3. **Blue** - Professionnel

**À éviter:**
- Orange (trop intense pour de longues sessions)

### Pour Planning/Calendrier

**Recommandé:**
1. **Blue (Ocean)** - Calme et organisé
2. **Green** - Positif et clair
3. **Default** - Neutre et pro

### Pour Dashboard Principal

**Recommandé:**
1. **Default** - Valeur sûre
2. **Blue** - Dynamique
3. **Slate** - Corporate

---

## 🎨 Utilisation dans le Code

### Accéder à la palette active

```tsx
import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function MyComponent() {
  const { colorScheme, setColorScheme } = useUIPreferences();

  return (
    <div>
      <p>Palette actuelle: {colorScheme}</p>
      <button onClick={() => setColorScheme('blue')}>
        Passer en bleu
      </button>
    </div>
  );
}
```

### Utiliser les variables CSS

```tsx
// Dans votre composant
<div style={{
  backgroundColor: 'var(--chart-accent-1)',
  color: 'white'
}}>
  Cet élément utilise la couleur de la palette active
</div>
```

### Créer des graphiques adaptatifs

```tsx
import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function Chart() {
  const { colorScheme } = useUIPreferences();

  // Les couleurs changent automatiquement avec la palette
  const data = [
    { name: 'A', value: 100, fill: 'var(--chart-accent-1)' },
    { name: 'B', value: 200, fill: 'var(--chart-accent-2)' },
    { name: 'C', value: 150, fill: 'var(--chart-accent-3)' },
  ];

  return <BarChart data={data} />;
}
```

---

## 🎯 Guide de Sélection

### Questions à se poser

**1. Quel est le contexte d'utilisation ?**
- Professionnel/Corporate → Slate ou Default
- Créatif → Purple ou Rose
- Données/Analytics → Blue
- Finance/Succès → Green

**2. Quelle est l'audience ?**
- B2B → Slate ou Default
- B2C → Blue, Purple, ou Rose
- Mixte → Default ou Blue

**3. Quel message véhiculer ?**
- Confiance → Blue
- Succès → Green
- Énergie → Orange
- Créativité → Purple ou Rose
- Professionnalisme → Slate

**4. Quelle durée d'utilisation ?**
- Longue (>1h) → Default, Blue, ou Slate (moins fatiguant)
- Courte (<30min) → N'importe quelle palette

---

## 💡 Bonnes Pratiques

### DO ✅

- **Choisir selon le contexte** : Analytics → Blue, Corporate → Slate
- **Rester cohérent** : Une palette par session de travail
- **Tester avec vos données** : Certaines palettes se marient mieux avec certains types de graphiques
- **Considérer l'accessibilité** : Toutes les palettes ont un bon contraste

### DON'T ❌

- **Changer trop souvent** : Peut être désorientant
- **Ignorer le contexte** : Orange pour du travail prolongé
- **Oublier les collègues** : Si vous partagez votre écran, pensez à eux
- **Négliger les graphiques** : Vérifier que les couleurs ont du sens avec vos données

---

## 🔧 Personnalisation Avancée

### Créer votre propre palette

1. **Ajouter le type dans le contexte:**
```tsx
export type ColorScheme =
  | 'default'
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'rose'
  | 'slate'
  | 'custom'; // 👈 Votre nouvelle palette
```

2. **Définir les couleurs dans globals.css:**
```css
.color-scheme-custom {
    --accent-primary: 180 80% 45%; /* Votre couleur HSL */
    --accent-primary-hover: 180 80% 40%;

    --chart-accent-1: #00bcd4; /* Votre couleur hex */
    --chart-accent-2: #26c6da;
    --chart-accent-3: #4dd0e1;

    --chart-1: #00bcd4;
    --chart-2: #ff9800;
    --chart-3: #00acc1;
    --chart-4: #9c27b0;
    --chart-5: #4caf50;
    --chart-6: #f44336;
}
```

3. **Ajouter dans la sidebar:**
```tsx
{ value: 'custom', label: 'Ma Palette', color: '#00bcd4' }
```

---

## 📱 Exemples Visuels

### Tableau avec palette Blue
```
┌──────────────────────────────────────┐
│ ● Titre (en #0ea5e9)                 │
├──────────────────────────────────────┤
│ Donnée 1  │ Valeur  │ ● Status      │
│ Donnée 2  │ Valeur  │ ● Status      │
└──────────────────────────────────────┘
Les indicateurs (●) utilisent chart-accent-1
```

### Badge avec palette Purple
```
┌─────────────┐
│ ● Nouveau   │  ← Fond: #8b5cf6
└─────────────┘
```

### Graphique avec palette Green
```
   |
   |     ▓▓▓
   |  ▓▓▓▓▓▓▓     ▓▓▓
   |  ▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓
   |__▓▓▓▓▓▓▓__▓▓▓▓▓▓▓__
      #10b981  #34d399
```

---

## 🎓 Cas d'Usage Réels

### Scénario 1: Présentation Analytics
**Palette recommandée:** Blue (Ocean)
**Raison:** Excellente lisibilité des graphiques, couleurs distinctives

```tsx
setColorScheme('blue');
// Ouvrir la page Analytics
// Les graphiques s'adaptent automatiquement
```

### Scénario 2: Session de Code Review
**Palette recommandée:** Default ou Purple
**Raison:** Confortable pour de longues sessions, bonne lisibilité du code

```tsx
setColorScheme('default');
// ou
setColorScheme('purple'); // Pour une touche moderne
```

### Scénario 3: Dashboard Exécutif
**Palette recommandée:** Slate
**Raison:** Professionnel, sobre, focus sur les données

```tsx
setColorScheme('slate');
// Parfait pour des présentations formelles
```

### Scénario 4: Suivi de Croissance
**Palette recommandée:** Green
**Raison:** Associé au succès et à la croissance

```tsx
setColorScheme('green');
// Les métriques positives ressortent naturellement
```

---

## 🌈 Palette du Jour

### Suggestion par jour de la semaine

- **Lundi** 💼 : Slate (démarrer professionnel)
- **Mardi** 📊 : Blue (jour d'analyse)
- **Mercredi** 💜 : Purple (milieu de semaine créatif)
- **Jeudi** 🌿 : Green (positif, on avance)
- **Vendredi** 🔥 : Orange (énergie pour finir la semaine)
- **Weekend** 🌸 : Rose (si vous travaillez, autant que ce soit joli)

---

## 🚀 Raccourcis Rapides

Pour changer de palette rapidement:

1. **Via Command Palette** (⌘K)
   - Taper "blue color" → Enter
   - Taper "purple color" → Enter
   - etc.

2. **Via Sidebar**
   - Clic sur "Palette"
   - Sélection visuelle rapide

3. **Via Code**
   ```tsx
   const { setColorScheme } = useUIPreferences();
   setColorScheme('blue');
   ```

---

## 📊 Tableau Récapitulatif

| Palette | Couleur | Use Case | Personnalité | Meilleur Pour |
|---------|---------|----------|--------------|---------------|
| Default | #3b82f6 | Général | Professionnel | Dashboard, Navigation |
| Blue | #0ea5e9 | Analytics | Données | Graphiques, Stats |
| Purple | #8b5cf6 | Créatif | Moderne | Design, Marketing |
| Green | #10b981 | Succès | Positif | Finance, Croissance |
| Orange | #f59e0b | Énergie | Dynamique | Alertes, CTA |
| Rose | #f43f5e | Design | Créatif | Interfaces modernes |
| Slate | #475569 | Corporate | Sérieux | B2B, Formel |

---

## ✨ Conclusion

Les palettes de couleurs vous permettent d'adapter l'interface à votre contexte de travail :

- 🎯 **7 palettes** soigneusement choisies
- 🎨 **Application automatique** sur toute l'interface
- 📊 **Graphiques adaptatifs** qui changent de couleurs
- 💾 **Persistance** de votre choix
- ⚡ **Changement instantané** sans rechargement

**Testez-les toutes et trouvez celle qui vous convient !**

Press ⌘K → "color" → Explorez ! 🚀
