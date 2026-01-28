# 🚀 UI Preferences - Quick Reference Card

## ⌨️ Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| **Command Palette** | `⌘K` | `Ctrl+K` |
| **Toggle Theme** | `⌘⇧L` | `Ctrl+Shift+L` |
| **Toggle Density** | `⌘⇧D` | `Ctrl+Shift+D` |
| **Close Modal** | `ESC` | `ESC` |

---

## 📦 Import

```tsx
import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';
import { formatShortcut, SHORTCUTS } from '@/lib/keyboard-shortcuts';
```

---

## 🎯 Basic Usage

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function MyComponent() {
  const {
    // State
    theme,              // 'light' | 'dark'
    density,            // 'comfortable' | 'compact'
    colorScheme,        // 'default' | 'blue' | 'purple' | 'green' | 'orange' | 'rose' | 'slate'
    preferences,        // Full preferences object

    // Theme
    setTheme,           // (theme: Theme) => void
    toggleTheme,        // () => void

    // Density
    setDensity,         // (density: Density) => void
    toggleDensity,      // () => void

    // Color Scheme
    setColorScheme,     // (scheme: ColorScheme) => void

    // Command Palette
    openCommandPalette,    // () => void
    closeCommandPalette,   // () => void
    isCommandPaletteOpen,  // boolean

    // Utils
    resetPreferences,   // () => void
  } = useUIPreferences();

  return (
    <div>
      <button onClick={toggleTheme}>Theme: {theme}</button>
      <button onClick={toggleDensity}>Density: {density}</button>
      <button onClick={openCommandPalette}>Open ⌘K</button>
    </div>
  );
}
```

---

## ⌨️ Register Keyboard Shortcut

```tsx
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';

// Single shortcut
useKeyboardShortcut('s', ['meta'], handleSave, {
  description: 'Save document',
  category: 'general',
});

// Multiple shortcuts
useKeyboardShortcuts([
  {
    id: 'save',
    key: 's',
    modifiers: ['meta'],
    description: 'Save',
    category: 'general',
    action: handleSave,
  },
  {
    id: 'undo',
    key: 'z',
    modifiers: ['meta'],
    description: 'Undo',
    category: 'general',
    action: handleUndo,
  },
]);
```

---

## 🎨 CSS Variables

```css
/* Use in your styles */
.my-element {
  padding: var(--spacing-md);
  font-size: var(--text-base);
  height: var(--table-row-height);
}
```

**Available Variables:**
- `--spacing-xs` to `--spacing-xl`
- `--text-xs` to `--text-lg`
- `--table-row-height`
- `--card-padding`
- `--button-padding-y` / `--button-padding-x`

---

## 📐 Density-Aware Component

```tsx
import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function MyTable() {
  const { density } = useUIPreferences();

  return (
    <table>
      <tr className={density === 'compact' ? 'h-9' : 'h-12'}>
        <td>Data</td>
      </tr>
    </table>
  );
}
```

---

## ⌘ Add Command to Palette

Edit `/components/command-palette.tsx`:

```tsx
const allCommands = [
  // ... existing commands

  {
    id: 'my-command',
    title: 'My Custom Action',
    description: 'Does something cool',
    icon: MyIcon,
    type: 'action',
    keywords: ['custom', 'action'],
    shortcut: '⌘⇧X',
    action: () => {
      doSomething();
      closeCommandPalette();
    },
  },
];
```

---

## 🎨 Change Color Scheme

```tsx
import { useUIPreferences } from '@/contexts/ui-preferences-context';

export function ColorSchemeSelector() {
  const { colorScheme, setColorScheme } = useUIPreferences();

  return (
    <select value={colorScheme} onChange={(e) => setColorScheme(e.target.value)}>
      <option value="default">Défaut (Blue)</option>
      <option value="blue">Bleu (Ocean)</option>
      <option value="purple">Violet</option>
      <option value="green">Vert (Emerald)</option>
      <option value="orange">Orange (Amber)</option>
      <option value="rose">Rose</option>
      <option value="slate">Ardoise (Gray)</option>
    </select>
  );
}
```

---

## 🎨 Theme Toggle Button

```tsx
import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { MoonIcon, SunIcon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useUIPreferences();

  return (
    <button onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
```

---

## 🔍 Display Shortcut

```tsx
import { formatShortcut, SHORTCUTS } from '@/lib/keyboard-shortcuts';

<kbd className="px-2 py-1 bg-muted rounded font-mono text-xs">
  {formatShortcut(SHORTCUTS.COMMAND_PALETTE)}
</kbd>
// Displays: ⌘K on Mac, Ctrl+K on Windows
```

---

## 🎯 Common Patterns

### 1. Preferences Panel

```tsx
<Switch
  checked={theme === 'dark'}
  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
/>
```

### 2. Save on ⌘S

```tsx
useKeyboardShortcut('s', ['meta'], handleSave);
```

### 3. Conditional Shortcut

```tsx
useKeyboardShortcut('Escape', [], closeModal, {
  enabled: isModalOpen, // Only when modal is open
});
```

### 4. Format for Display

```tsx
const shortcut = formatShortcut({
  key: 's',
  modifiers: ['meta'],
  description: 'Save',
  category: 'general',
});
// Returns: "⌘S" on Mac, "Ctrl+S" on Windows
```

---

## 🧪 Testing

```tsx
// Check if preferences work
const { theme, density } = useUIPreferences();
console.log('Current theme:', theme);
console.log('Current density:', density);

// Verify localStorage
localStorage.getItem('ui-preferences');

// Check DOM classes
document.documentElement.classList.contains('dark');
document.documentElement.classList.contains('density-compact');
```

---

## 📚 Full Documentation

- **[IMPLEMENTATION_OVERVIEW.md](./IMPLEMENTATION_OVERVIEW.md)** - Overview & testing
- **[docs/UI_PREFERENCES_SYSTEM.md](./docs/UI_PREFERENCES_SYSTEM.md)** - Complete guide
- **[docs/UI_PREFERENCES_EXAMPLES.md](./docs/UI_PREFERENCES_EXAMPLES.md)** - Examples

---

## 🐛 Troubleshooting

**Theme not persisting?**
→ Check localStorage permissions

**Shortcuts not working?**
→ Ensure not inside input/textarea
→ Check `GlobalKeyboardShortcuts` is mounted

**Density not applying?**
→ Use CSS variables: `var(--spacing-md)`
→ Check `density-*` classes on `<html>`

---

## 🎉 Quick Start

1. **Try it**: Press `⌘K`
2. **Toggle theme**: Press `⌘⇧L`
3. **Toggle density**: Press `⌘⇧D`
4. **Build with it**: See examples above

---

**Press ⌘K to explore!** 🚀
