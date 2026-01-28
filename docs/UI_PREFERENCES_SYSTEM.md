# UI Preferences System - Architecture & Usage

## 🎯 Overview

A production-grade, centralized UI preferences system that provides:

- **Theme Management** (Light/Dark mode)
- **Density Control** (Comfortable/Compact)
- **Command Palette** (⌘K / Ctrl+K)
- **Global Keyboard Shortcuts**
- **Persistent Storage** (localStorage)
- **Type-Safe API** (TypeScript)

---

## 🏗️ Architecture

### Core Components

```
contexts/
  └── ui-preferences-context.tsx    # Main preferences provider

hooks/
  └── use-keyboard-shortcuts.ts     # Keyboard shortcuts hook

lib/
  └── keyboard-shortcuts.ts          # Centralized shortcuts config

components/
  ├── command-palette.tsx            # ⌘K command palette modal
  ├── global-keyboard-shortcuts.tsx  # Global shortcuts registration
  └── app-sidebar.tsx                # Updated sidebar with preferences
```

### Data Flow

```
User Action
    ↓
Keyboard Shortcut / UI Click
    ↓
UI Preferences Context
    ↓
├─→ Update State
├─→ Apply to DOM (document.documentElement)
├─→ Save to localStorage
└─→ Trigger React Re-renders
```

---

## 📦 Installation

### 1. Files Created

All necessary files have been created:

- `/contexts/ui-preferences-context.tsx`
- `/hooks/use-keyboard-shortcuts.ts`
- `/lib/keyboard-shortcuts.ts`
- `/components/command-palette.tsx`
- `/components/global-keyboard-shortcuts.tsx`

### 2. Files Modified

- `/app/providers.tsx` - Added UIPreferencesProvider
- `/app/globals.css` - Added density CSS variables
- `/tsconfig.json` - Added path aliases
- `/components/app-sidebar.tsx` - Updated to use context

### 3. Dependencies

No additional npm packages required. Uses existing:
- React Context API
- Next.js App Router
- shadcn/ui components (Dialog, Input, Badge)
- Tailwind CSS

---

## 🚀 Usage

### Basic: Accessing Preferences

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function MyComponent() {
  const {
    // State
    theme,
    density,
    preferences,

    // Theme methods
    setTheme,
    toggleTheme,

    // Density methods
    setDensity,
    toggleDensity,

    // Command Palette
    openCommandPalette,
    closeCommandPalette,
    isCommandPaletteOpen,
  } = useUIPreferences();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>
        Toggle Theme
      </button>

      <p>Current density: {density}</p>
      <button onClick={toggleDensity}>
        Toggle Density
      </button>

      <button onClick={openCommandPalette}>
        Open Command Palette
      </button>
    </div>
  );
}
```

### Advanced: Custom Keyboard Shortcuts

```tsx
'use client';

import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';

export function SearchBox() {
  const [isOpen, setIsOpen] = useState(false);

  // Register shortcut: / to focus search
  useKeyboardShortcut('/', [], () => {
    setIsOpen(true);
  }, {
    description: 'Focus search box',
    category: 'general',
  });

  return (
    <div>
      {/* Your search component */}
    </div>
  );
}
```

### Multiple Shortcuts

```tsx
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

export function MyComponent() {
  useKeyboardShortcuts([
    {
      id: 'save',
      key: 's',
      modifiers: ['meta'],
      description: 'Save document',
      category: 'general',
      action: () => handleSave(),
    },
    {
      id: 'undo',
      key: 'z',
      modifiers: ['meta'],
      description: 'Undo action',
      category: 'general',
      action: () => handleUndo(),
    },
  ]);

  // Component logic...
}
```

---

## ⌨️ Default Keyboard Shortcuts

| Action               | Mac        | Windows/Linux   |
| -------------------- | ---------- | --------------- |
| Command Palette      | ⌘K         | Ctrl+K          |
| Toggle Theme         | ⌘⇧L        | Ctrl+Shift+L    |
| Toggle Density       | ⌘⇧D        | Ctrl+Shift+D    |
| Close Modal          | ESC        | ESC             |

### Customizing Shortcuts

Edit `/lib/keyboard-shortcuts.ts`:

```ts
export const SHORTCUTS = {
  MY_SHORTCUT: {
    key: 'n',
    modifiers: ['meta', 'shift'],
    description: 'My custom action',
    category: 'general',
  },
};
```

---

## 🎨 Theme System

### How It Works

1. **Initial Load**: Checks localStorage → System preference → Defaults to light
2. **User Changes**: Immediately applies + saves to localStorage
3. **DOM Updates**: Adds/removes `.dark` class on `<html>` element
4. **Persistence**: Survives page refreshes and browser restarts

### Custom Theme Usage

```tsx
import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function ThemeToggle() {
  const { theme, setTheme } = useUIPreferences();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

### CSS Integration

Themes work with Tailwind's dark mode:

```tsx
<div className="bg-white dark:bg-gray-900">
  <p className="text-black dark:text-white">
    This text adapts to theme
  </p>
</div>
```

---

## 📐 Density System

### How It Works

1. **CSS Variables**: Defines spacing/sizing based on density
2. **Class Toggle**: Adds `density-comfortable` or `density-compact` to `<html>`
3. **Auto-Apply**: Tables, cards, buttons adjust automatically
4. **Customizable**: Add your own density-aware styles

### CSS Variables Available

```css
/* Comfortable (default) */
--spacing-xs: 0.5rem;
--spacing-sm: 0.75rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;

--table-row-height: 3rem;
--card-padding: 1.5rem;
--button-padding-y: 0.5rem;
--button-padding-x: 1rem;

/* Compact */
.density-compact {
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.25rem;

  --table-row-height: 2.25rem;
  --card-padding: 1rem;
  --button-padding-y: 0.375rem;
  --button-padding-x: 0.75rem;
}
```

### Making Components Density-Aware

#### Option 1: Use CSS Variables

```tsx
<div style={{ padding: 'var(--card-padding)' }}>
  Content
</div>
```

#### Option 2: Use Density Classes

```tsx
<div className="card-spacing">
  Content adapts automatically
</div>
```

#### Option 3: Conditional Rendering

```tsx
import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function MyTable() {
  const { density } = useUIPreferences();

  return (
    <table>
      <tr className={density === 'compact' ? 'h-9' : 'h-12'}>
        {/* Table content */}
      </tr>
    </table>
  );
}
```

---

## ⌘ Command Palette

### Features

- **Fast Search**: Fuzzy search across all commands
- **Keyboard Navigation**: Arrow keys + Enter
- **Grouped Display**: Navigation, Preferences, Actions
- **Visual Shortcuts**: Shows keyboard shortcuts
- **Extensible**: Easy to add new commands

### Adding Custom Commands

Edit `/components/command-palette.tsx`:

```tsx
const allCommands = useMemo<Command[]>(
  () => [
    // Existing commands...

    // Add your custom command
    {
      id: 'my-action',
      title: 'My Custom Action',
      description: 'Does something cool',
      icon: MyIcon,
      type: 'action',
      keywords: ['custom', 'action'],
      shortcut: '⌘⇧A',
      action: () => {
        doSomething();
        closeCommandPalette();
      },
    },
  ],
  [/* dependencies */]
);
```

### Command Types

- **navigation**: Routes to different pages
- **preference**: Changes settings
- **action**: Executes actions (search, etc.)

---

## 🔧 API Reference

### UIPreferencesContext

#### State

```ts
interface UIPreferences {
  theme: 'light' | 'dark';
  density: 'comfortable' | 'compact';
  commandPaletteEnabled: boolean;
}
```

#### Methods

**Theme:**
- `theme: 'light' | 'dark'` - Current theme
- `setTheme(theme)` - Set specific theme
- `toggleTheme()` - Toggle between light/dark

**Density:**
- `density: 'comfortable' | 'compact'` - Current density
- `setDensity(density)` - Set specific density
- `toggleDensity()` - Toggle between comfortable/compact

**Command Palette:**
- `isCommandPaletteOpen: boolean` - Palette state
- `openCommandPalette()` - Open palette
- `closeCommandPalette()` - Close palette
- `toggleCommandPalette()` - Toggle palette

**Utilities:**
- `preferences: UIPreferences` - Full preferences object
- `resetPreferences()` - Reset to defaults

---

## 🎯 Best Practices

### 1. Always Use the Hook

```tsx
// ✅ Good
import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function MyComponent() {
  const { theme, toggleTheme } = useUIPreferences();
  // ...
}

// ❌ Bad
export function MyComponent() {
  const [theme, setTheme] = useState('light');
  // This won't sync with global preferences!
}
```

### 2. Don't Ignore Input Fields

Keyboard shortcuts automatically ignore input fields, textareas, and contenteditable elements.

### 3. Use Semantic Shortcuts

```tsx
// ✅ Good - Standard conventions
⌘K - Command Palette
⌘S - Save
⌘Z - Undo

// ❌ Bad - Non-standard
⌘X - Open Settings
⌘Q - Toggle Theme
```

### 4. Provide Visual Feedback

```tsx
<button onClick={toggleTheme}>
  {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
  <span>Toggle Theme</span>
  <kbd>⌘⇧L</kbd>
</button>
```

### 5. Accessibility First

- Always provide `aria-label` on buttons
- Use semantic HTML
- Support keyboard navigation
- Respect `prefers-reduced-motion`

---

## 🐛 Troubleshooting

### Theme Not Persisting

**Problem**: Theme resets on page reload

**Solution**: Check localStorage permissions:
```ts
// Verify localStorage is accessible
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('✅ localStorage works');
} catch (e) {
  console.error('❌ localStorage blocked', e);
}
```

### Shortcuts Not Working

**Problem**: Keyboard shortcuts don't trigger

**Checklist**:
1. ✅ `<GlobalKeyboardShortcuts />` mounted in layout?
2. ✅ `<UIPreferencesProvider>` wraps app?
3. ✅ Not inside an input/textarea?
4. ✅ Using correct modifiers (⌘ on Mac, Ctrl on Windows)?

### Density Not Applying

**Problem**: Components don't respect density

**Solution**: Ensure CSS variables are used:
```css
/* ❌ Bad */
.my-card {
  padding: 1.5rem;
}

/* ✅ Good */
.my-card {
  padding: var(--card-padding);
}
```

---

## 🚀 Future Extensions

The system is designed to be extensible. Potential additions:

### 1. Language Preference

```ts
// In ui-preferences-context.tsx
export type Language = 'en' | 'fr' | 'es';

interface UIPreferences {
  theme: Theme;
  density: Density;
  language: Language; // 👈 Add this
}
```

### 2. Layout Options

```ts
export type Layout = 'sidebar' | 'topbar' | 'minimal';

interface UIPreferences {
  theme: Theme;
  density: Density;
  layout: Layout; // 👈 Add this
}
```

### 3. Font Size

```ts
export type FontSize = 'small' | 'medium' | 'large';

interface UIPreferences {
  theme: Theme;
  density: Density;
  fontSize: FontSize; // 👈 Add this
}
```

### 4. Animations

```ts
export type AnimationSpeed = 'none' | 'normal' | 'fast';

interface UIPreferences {
  theme: Theme;
  density: Density;
  animationSpeed: AnimationSpeed; // 👈 Add this
}
```

---

## 📝 Code Quality

### TypeScript Coverage

- ✅ 100% TypeScript
- ✅ Strict mode enabled
- ✅ No `any` types
- ✅ Full IntelliSense support

### Testing Considerations

```tsx
// Example: Testing theme toggle
import { render, screen } from '@testing-library/react';
import { UIPreferencesProvider } from '@/contexts/ui-preferences-context';

test('theme toggles correctly', () => {
  render(
    <UIPreferencesProvider>
      <MyComponent />
    </UIPreferencesProvider>
  );

  const button = screen.getByRole('button', { name: /toggle theme/i });
  fireEvent.click(button);

  expect(document.documentElement).toHaveClass('dark');
});
```

### Performance

- ⚡ Context updates are memoized
- ⚡ localStorage operations are batched
- ⚡ No unnecessary re-renders
- ⚡ Keyboard shortcuts use event delegation

---

## 🎓 Summary

You now have a **production-grade UI preferences system** that:

1. ✅ Works globally across the entire app
2. ✅ Persists across sessions
3. ✅ Supports keyboard shortcuts
4. ✅ Provides a command palette (⌘K)
5. ✅ Manages theme and density
6. ✅ Is fully typed with TypeScript
7. ✅ Is easily extensible
8. ✅ Follows accessibility best practices

**Quick Start:**
```tsx
import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function MyComponent() {
  const { theme, density, toggleTheme, openCommandPalette } = useUIPreferences();

  return (
    <div>
      <button onClick={toggleTheme}>Theme: {theme}</button>
      <button onClick={openCommandPalette}>Open ⌘K</button>
    </div>
  );
}
```

Press **⌘K** (or **Ctrl+K**) anywhere in the app to try it! 🎉
