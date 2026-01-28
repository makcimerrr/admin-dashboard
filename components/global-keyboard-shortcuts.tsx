'use client';

import { useUIPreferences } from '@/contexts/ui-preferences-context';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { SHORTCUTS } from '@/lib/keyboard-shortcuts';
import { KeyboardShortcut } from '@/lib/keyboard-shortcuts';

/**
 * Global Keyboard Shortcuts Provider
 *
 * Registers all global keyboard shortcuts for the application.
 * Must be mounted once at the root level.
 */
export function GlobalKeyboardShortcuts() {
  const {
    toggleTheme,
    toggleDensity,
    openCommandPalette,
    closeCommandPalette,
    isCommandPaletteOpen,
  } = useUIPreferences();

  // Define all global shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Command Palette: ⌘K / Ctrl+K
    {
      id: 'open-command-palette',
      ...SHORTCUTS.COMMAND_PALETTE,
      action: openCommandPalette,
    },

    // Toggle Theme: ⌘⇧L / Ctrl+Shift+L
    {
      id: 'toggle-theme',
      ...SHORTCUTS.TOGGLE_THEME,
      action: toggleTheme,
    },

    // Toggle Density: ⌘⇧D / Ctrl+Shift+D
    {
      id: 'toggle-density',
      ...SHORTCUTS.TOGGLE_DENSITY,
      action: toggleDensity,
    },

    // Close Modal: ESC
    {
      id: 'close-modal',
      ...SHORTCUTS.CLOSE_MODAL,
      action: () => {
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        }
      },
    },
  ];

  // Register shortcuts
  useKeyboardShortcuts(shortcuts);

  // This component doesn't render anything
  return null;
}
