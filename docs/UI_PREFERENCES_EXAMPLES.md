# UI Preferences System - Usage Examples

## 🎯 Real-World Examples

### 1. Theme Toggle Button

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useUIPreferences();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <MoonIcon className="h-4 w-4" />
      ) : (
        <SunIcon className="h-4 w-4" />
      )}
    </Button>
  );
}
```

### 2. Density Selector

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DensitySelector() {
  const { density, setDensity } = useUIPreferences();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="density" className="text-sm font-medium">
        Density:
      </label>
      <Select value={density} onValueChange={setDensity}>
        <SelectTrigger id="density" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="comfortable">Comfortable</SelectItem>
          <SelectItem value="compact">Compact</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

### 3. Preferences Panel

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function PreferencesPanel() {
  const {
    theme,
    setTheme,
    density,
    setDensity,
    resetPreferences,
  } = useUIPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme */}
        <div className="flex items-center justify-between">
          <Label htmlFor="dark-mode">Dark Mode</Label>
          <Switch
            id="dark-mode"
            checked={theme === 'dark'}
            onCheckedChange={(checked) =>
              setTheme(checked ? 'dark' : 'light')
            }
          />
        </div>

        {/* Density */}
        <div className="flex items-center justify-between">
          <Label htmlFor="compact-mode">Compact Density</Label>
          <Switch
            id="compact-mode"
            checked={density === 'compact'}
            onCheckedChange={(checked) =>
              setDensity(checked ? 'compact' : 'comfortable')
            }
          />
        </div>

        {/* Reset */}
        <button
          onClick={resetPreferences}
          className="text-sm text-destructive hover:underline"
        >
          Reset to defaults
        </button>
      </CardContent>
    </Card>
  );
}
```

### 4. Command Palette Trigger

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { CommandIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatShortcut, SHORTCUTS } from '@/lib/keyboard-shortcuts';

export function CommandPaletteTrigger() {
  const { openCommandPalette } = useUIPreferences();

  return (
    <Button
      variant="outline"
      onClick={openCommandPalette}
      className="justify-between w-full"
    >
      <div className="flex items-center gap-2">
        <CommandIcon className="h-4 w-4" />
        <span>Search...</span>
      </div>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        {formatShortcut(SHORTCUTS.COMMAND_PALETTE)}
      </kbd>
    </Button>
  );
}
```

### 5. Density-Aware Table

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function DataTable({ data }: { data: any[] }) {
  const { density } = useUIPreferences();

  return (
    <Table>
      <TableHeader>
        <TableRow className={density === 'compact' ? 'h-9' : 'h-12'}>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row.id}
            className={density === 'compact' ? 'h-9' : 'h-12'}
          >
            <TableCell
              className={
                density === 'compact'
                  ? 'py-2 text-sm'
                  : 'py-3 text-base'
              }
            >
              {row.name}
            </TableCell>
            <TableCell
              className={
                density === 'compact'
                  ? 'py-2 text-sm'
                  : 'py-3 text-base'
              }
            >
              {row.email}
            </TableCell>
            <TableCell
              className={
                density === 'compact'
                  ? 'py-2 text-sm'
                  : 'py-3 text-base'
              }
            >
              {row.status}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 6. Custom Keyboard Shortcut - Save

```tsx
'use client';

import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

export function DocumentEditor() {
  const [content, setContent] = useState('');

  const handleSave = () => {
    // Save logic
    toast({
      title: 'Saved',
      description: 'Document saved successfully',
    });
  };

  // Register ⌘S / Ctrl+S shortcut
  useKeyboardShortcut('s', ['meta'], handleSave, {
    description: 'Save document',
    category: 'general',
  });

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-96 p-4 border rounded"
        placeholder="Start typing... (⌘S to save)"
      />
      <div className="mt-2 text-sm text-muted-foreground">
        Press <kbd className="px-1 py-0.5 bg-muted rounded">⌘S</kbd> to save
      </div>
    </div>
  );
}
```

### 7. Multiple Shortcuts - Editor Actions

```tsx
'use client';

import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useState } from 'react';

export function TextEditor() {
  const [history, setHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleRedo = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSelectAll = () => {
    // Select all logic
  };

  // Register multiple shortcuts
  useKeyboardShortcuts([
    {
      id: 'undo',
      key: 'z',
      modifiers: ['meta'],
      description: 'Undo',
      category: 'general',
      action: handleUndo,
    },
    {
      id: 'redo',
      key: 'z',
      modifiers: ['meta', 'shift'],
      description: 'Redo',
      category: 'general',
      action: handleRedo,
    },
    {
      id: 'select-all',
      key: 'a',
      modifiers: ['meta'],
      description: 'Select all',
      category: 'general',
      action: handleSelectAll,
    },
  ]);

  return (
    <div>
      {/* Editor UI */}
    </div>
  );
}
```

### 8. Conditional Keyboard Shortcut

```tsx
'use client';

import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';
import { useState } from 'react';

export function ModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  // Only enable shortcut when modal is open
  useKeyboardShortcut('Escape', [], () => setIsOpen(false), {
    description: 'Close modal',
    category: 'general',
    enabled: isOpen, // 👈 Conditional
  });

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Open Modal
      </button>

      {isOpen && (
        <div className="modal">
          <p>Press ESC to close</p>
          <button onClick={() => setIsOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
```

### 9. Theme-Aware Component

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { Card } from '@/components/ui/card';

export function ThemedCard() {
  const { theme } = useUIPreferences();

  return (
    <Card
      className={
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
          : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
      }
    >
      <div className="p-6">
        <h2 className="text-2xl font-bold">
          Current theme: {theme}
        </h2>
      </div>
    </Card>
  );
}
```

### 10. Full Settings Page

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon, Maximize2Icon, MinimizeIcon } from 'lucide-react';

export function SettingsPage() {
  const {
    theme,
    setTheme,
    density,
    setDensity,
    resetPreferences,
  } = useUIPreferences();

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your preferences and customize your experience
        </p>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how the app looks to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={setTheme}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                <SunIcon className="h-4 w-4" />
                Light
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                <MoonIcon className="h-4 w-4" />
                Dark
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Density Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Density</CardTitle>
          <CardDescription>
            Control the spacing and size of UI elements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={density} onValueChange={setDensity}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="comfortable" id="comfortable" />
              <Label htmlFor="comfortable" className="flex items-center gap-2 cursor-pointer">
                <Maximize2Icon className="h-4 w-4" />
                Comfortable
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="compact" id="compact" />
              <Label htmlFor="compact" className="flex items-center gap-2 cursor-pointer">
                <MinimizeIcon className="h-4 w-4" />
                Compact
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts Info */}
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardDescription>
            Use these shortcuts for quick access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Command Palette</span>
              <kbd className="px-2 py-1 bg-muted rounded font-mono">⌘K</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Toggle Theme</span>
              <kbd className="px-2 py-1 bg-muted rounded font-mono">⌘⇧L</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Toggle Density</span>
              <kbd className="px-2 py-1 bg-muted rounded font-mono">⌘⇧D</kbd>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card>
        <CardHeader>
          <CardTitle>Reset</CardTitle>
          <CardDescription>
            Restore all settings to their defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={resetPreferences}
          >
            Reset All Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🎨 Styling Examples

### CSS Variables Usage

```css
/* Use in your CSS files */
.my-card {
  padding: var(--card-padding);
  gap: var(--spacing-md);
}

.my-button {
  padding: var(--button-padding-y) var(--button-padding-x);
  font-size: var(--text-base);
}

.my-table-row {
  height: var(--table-row-height);
}
```

### Tailwind with Density

```tsx
<div className="p-[var(--spacing-md)]">
  <h1 className="text-[var(--text-lg)]">
    This adapts to density
  </h1>
</div>
```

---

## 🚀 Advanced Patterns

### 1. Sync Preferences Across Tabs

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { useEffect } from 'react';

export function SyncedPreferences() {
  const { preferences, setTheme, setDensity } = useUIPreferences();

  useEffect(() => {
    // Listen for storage events (changes from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ui-preferences' && e.newValue) {
        const newPrefs = JSON.parse(e.newValue);
        setTheme(newPrefs.theme);
        setDensity(newPrefs.density);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setTheme, setDensity]);

  return null; // This component just syncs, doesn't render
}
```

### 2. Export/Import Preferences

```tsx
'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { Button } from '@/components/ui/button';

export function PreferencesExportImport() {
  const { preferences, setTheme, setDensity } = useUIPreferences();

  const handleExport = () => {
    const data = JSON.stringify(preferences, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preferences.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setTheme(data.theme);
        setDensity(data.density);
      } catch (error) {
        console.error('Invalid preferences file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleExport}>
        Export Preferences
      </Button>
      <label>
        <Button as="span">Import Preferences</Button>
        <input
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
        />
      </label>
    </div>
  );
}
```

---

## 📚 More Resources

- [Main Documentation](./UI_PREFERENCES_SYSTEM.md)
- [Keyboard Shortcuts Reference](../lib/keyboard-shortcuts.ts)
- [Context Implementation](../contexts/ui-preferences-context.tsx)
