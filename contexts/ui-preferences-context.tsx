'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * UI Preferences Types
 */
export type Theme = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
export type ColorScheme = 'default' | 'blue' | 'purple' | 'green' | 'orange' | 'rose' | 'slate';

export interface UIPreferences {
  theme: Theme;
  density: Density;
  colorScheme: ColorScheme;
  commandPaletteEnabled: boolean;
}

interface UIPreferencesContextValue {
  // State
  preferences: UIPreferences;
  isCommandPaletteOpen: boolean;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Density
  density: Density;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;

  // Color Scheme
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;

  // Command Palette
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Utilities
  resetPreferences: () => void;
}

const UIPreferencesContext = createContext<UIPreferencesContextValue | undefined>(undefined);

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: UIPreferences = {
  theme: 'light',
  density: 'comfortable',
  colorScheme: 'default',
  commandPaletteEnabled: true,
};

/**
 * Storage keys
 */
const STORAGE_KEY = 'ui-preferences';

/**
 * Detect system theme preference
 */
const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

/**
 * Load preferences from localStorage
 */
const loadPreferences = (): UIPreferences => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UIPreferences>;
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
      };
    }
  } catch (error) {
    console.error('Failed to load UI preferences:', error);
  }

  // If no stored preference, use system theme
  return {
    ...DEFAULT_PREFERENCES,
    theme: getSystemTheme(),
  };
};

/**
 * Save preferences to localStorage
 */
const savePreferences = (preferences: UIPreferences): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save UI preferences:', error);
  }
};

/**
 * Apply theme to document
 */
const applyTheme = (theme: Theme): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

/**
 * Apply density to document
 */
const applyDensity = (density: Density): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Remove all density classes
  root.classList.remove('density-comfortable', 'density-compact');

  // Add current density class
  root.classList.add(`density-${density}`);

  // Set CSS variable
  root.style.setProperty('--ui-density', density);
};

/**
 * Apply color scheme to document
 */
const applyColorScheme = (scheme: ColorScheme): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Remove all color scheme classes
  root.classList.remove(
    'color-scheme-default',
    'color-scheme-blue',
    'color-scheme-purple',
    'color-scheme-green',
    'color-scheme-orange',
    'color-scheme-rose',
    'color-scheme-slate'
  );

  // Add current color scheme class
  root.classList.add(`color-scheme-${scheme}`);

  // Set CSS variable
  root.style.setProperty('--ui-color-scheme', scheme);
};

/**
 * UI Preferences Provider
 */
export function UIPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UIPreferences>(DEFAULT_PREFERENCES);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize preferences on mount
  useEffect(() => {
    setIsMounted(true);
    const loadedPreferences = loadPreferences();
    setPreferences(loadedPreferences);
    applyTheme(loadedPreferences.theme);
    applyDensity(loadedPreferences.density);
    applyColorScheme(loadedPreferences.colorScheme);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (isMounted) {
      savePreferences(preferences);
    }
  }, [preferences, isMounted]);

  // Apply theme changes
  useEffect(() => {
    if (isMounted) {
      applyTheme(preferences.theme);
    }
  }, [preferences.theme, isMounted]);

  // Apply density changes
  useEffect(() => {
    if (isMounted) {
      applyDensity(preferences.density);
    }
  }, [preferences.density, isMounted]);

  // Apply color scheme changes
  useEffect(() => {
    if (isMounted) {
      applyColorScheme(preferences.colorScheme);
    }
  }, [preferences.colorScheme, isMounted]);

  // Listen to system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-sync if user hasn't explicitly set a preference
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setPreferences(prev => ({
          ...prev,
          theme: e.matches ? 'dark' : 'light',
        }));
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Theme methods
  const setTheme = useCallback((theme: Theme) => {
    setPreferences(prev => ({ ...prev, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  }, []);

  // Density methods
  const setDensity = useCallback((density: Density) => {
    setPreferences(prev => ({ ...prev, density }));
  }, []);

  const toggleDensity = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      density: prev.density === 'comfortable' ? 'compact' : 'comfortable',
    }));
  }, []);

  // Color Scheme methods
  const setColorScheme = useCallback((colorScheme: ColorScheme) => {
    setPreferences(prev => ({ ...prev, colorScheme }));
  }, []);

  // Command Palette methods
  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(prev => !prev);
  }, []);

  // Reset preferences
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value: UIPreferencesContextValue = {
    preferences,
    isCommandPaletteOpen,
    theme: preferences.theme,
    setTheme,
    toggleTheme,
    density: preferences.density,
    setDensity,
    toggleDensity,
    colorScheme: preferences.colorScheme,
    setColorScheme,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    resetPreferences,
  };

  return (
    <UIPreferencesContext.Provider value={value}>
      {children}
    </UIPreferencesContext.Provider>
  );
}

/**
 * Hook to use UI Preferences
 */
export function useUIPreferences() {
  const context = useContext(UIPreferencesContext);

  if (context === undefined) {
    throw new Error('useUIPreferences must be used within a UIPreferencesProvider');
  }

  return context;
}
