'use client';

import { useEffect, useCallback, useRef } from 'react';
import {
  KeyboardShortcut,
  ShortcutConfig,
  matchesShortcut,
  shouldIgnoreShortcut,
} from '@/lib/keyboard-shortcuts';

/**
 * Global keyboard shortcuts hook
 *
 * Registers keyboard shortcuts that work anywhere in the application.
 * Automatically ignores shortcuts when typing in input fields.
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     id: 'open-search',
 *     key: 'k',
 *     modifiers: ['meta'],
 *     description: 'Open search',
 *     category: 'general',
 *     action: () => openSearch(),
 *   },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if user is typing in an input field
    if (shouldIgnoreShortcut(document.activeElement)) {
      return;
    }

    // Check each shortcut
    for (const shortcut of shortcutsRef.current) {
      const config: ShortcutConfig = {
        key: shortcut.key,
        modifiers: shortcut.modifiers,
        description: shortcut.description,
        category: shortcut.category,
      };

      if (matchesShortcut(event, config)) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        break; // Only trigger one shortcut
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for a single keyboard shortcut
 *
 * Simplified version for registering one shortcut at a time.
 *
 * @example
 * ```tsx
 * useKeyboardShortcut('k', ['meta'], () => {
 *   console.log('Command+K pressed');
 * });
 * ```
 */
export function useKeyboardShortcut(
  key: string,
  modifiers: ('ctrl' | 'shift' | 'alt' | 'meta')[],
  action: () => void,
  options?: {
    description?: string;
    category?: 'navigation' | 'preferences' | 'general';
    enabled?: boolean;
  }
) {
  const { enabled = true, description = '', category = 'general' } = options || {};

  const shortcuts: KeyboardShortcut[] = enabled
    ? [
        {
          id: `${modifiers.join('+')}+${key}`,
          key,
          modifiers,
          description,
          category,
          action,
        },
      ]
    : [];

  useKeyboardShortcuts(shortcuts);
}
