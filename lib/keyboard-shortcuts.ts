/**
 * Keyboard Shortcuts Configuration
 *
 * Centralized configuration for all keyboard shortcuts in the application.
 * Easily extensible for future shortcuts.
 */

export type ShortcutModifier = 'ctrl' | 'shift' | 'alt' | 'meta';

export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: readonly ShortcutModifier[];
  description: string;
  category: 'navigation' | 'preferences' | 'general';
  action: () => void;
}

export interface ShortcutConfig {
  key: string;
  modifiers: readonly ShortcutModifier[];
  description: string;
  category: 'navigation' | 'preferences' | 'general';
}

/**
 * Check if a keyboard event matches a shortcut configuration
 */
export function matchesShortcut(
  event: KeyboardEvent,
  config: ShortcutConfig
): boolean {
  // Check if the key matches (case-insensitive)
  if (event.key.toLowerCase() !== config.key.toLowerCase()) {
    return false;
  }

  // Check modifiers
  const hasCtrl = config.modifiers.includes('ctrl');
  const hasShift = config.modifiers.includes('shift');
  const hasAlt = config.modifiers.includes('alt');
  const hasMeta = config.modifiers.includes('meta');

  return (
    event.ctrlKey === hasCtrl &&
    event.shiftKey === hasShift &&
    event.altKey === hasAlt &&
    event.metaKey === hasMeta
  );
}

/**
 * Format shortcut for display
 * Returns a human-readable string like "⌘K" or "Ctrl+K"
 */
export function formatShortcut(config: ShortcutConfig): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  const parts: string[] = [];

  config.modifiers.forEach(mod => {
    switch (mod) {
      case 'meta':
        parts.push(isMac ? '⌘' : 'Ctrl');
        break;
      case 'ctrl':
        parts.push(isMac ? '⌃' : 'Ctrl');
        break;
      case 'shift':
        parts.push(isMac ? '⇧' : 'Shift');
        break;
      case 'alt':
        parts.push(isMac ? '⌥' : 'Alt');
        break;
    }
  });

  parts.push(config.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}

/**
 * Check if element should ignore keyboard shortcuts
 * Returns true for input fields, textareas, etc.
 */
export function shouldIgnoreShortcut(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isEditable = element.getAttribute('contenteditable') === 'true';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isEditable ||
    (element as HTMLElement).isContentEditable
  );
}

/**
 * Default keyboard shortcuts configuration
 */
export const SHORTCUTS = {
  COMMAND_PALETTE: {
    key: 'k',
    modifiers: ['meta' as const],
    description: 'Open command palette',
    category: 'general' as const,
  },
  TOGGLE_THEME: {
    key: 'l',
    modifiers: ['meta' as const, 'shift' as const],
    description: 'Toggle light/dark theme',
    category: 'preferences' as const,
  },
  TOGGLE_DENSITY: {
    key: 'd',
    modifiers: ['meta' as const, 'shift' as const],
    description: 'Toggle comfortable/compact density',
    category: 'preferences' as const,
  },
  CLOSE_MODAL: {
    key: 'Escape',
    modifiers: [],
    description: 'Close modal or dialog',
    category: 'general' as const,
  },
  SEARCH: {
    key: '/',
    modifiers: [],
    description: 'Focus search',
    category: 'general' as const,
  },
} as const;

/**
 * Get all shortcuts as an array
 */
export function getAllShortcuts(): ShortcutConfig[] {
  return Object.values(SHORTCUTS);
}

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(
  category: 'navigation' | 'preferences' | 'general'
): ShortcutConfig[] {
  return getAllShortcuts().filter(s => s.category === category);
}
