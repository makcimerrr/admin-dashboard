'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

// ---- Types ----
export type ThemeName = 'aurora-admin' | 'solar-desk' | 'carbon-redline' | 'oceanic-flow' | 'clay-studio' | 'blueprint';
export type Density = 'comfort' | 'compact';

interface UIPreferences {
  colorTheme: ThemeName;
  density: Density;
}

interface UIPreferencesContextValue {
  colorTheme: ThemeName;
  setColorTheme: (theme: ThemeName) => void;
  density: Density;
  setDensity: (density: Density) => void;
  resetPreferences: () => void;
}

// ---- Constants ----
const STORAGE_KEY = 'ui-preferences';
const DEFAULTS: UIPreferences = { colorTheme: 'aurora-admin', density: 'comfort' };

const ALL_THEME_CLASSES = [
  'theme-aurora-admin',
  'theme-solar-desk',
  'theme-carbon-redline',
  'theme-oceanic-flow',
  'theme-clay-studio',
  'theme-blueprint',
] as const;

const ALL_DENSITY_CLASSES = ['density-comfort', 'density-compact'] as const;

// ---- Context ----
const UIPreferencesContext = createContext<UIPreferencesContextValue | null>(null);

function loadPreferences(): UIPreferences {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration from old formats
      if (parsed.colorScheme && !parsed.colorTheme) {
        parsed.colorTheme = 'aurora-admin';
        delete parsed.colorScheme;
      }
      // Migrate removed theme names
      const removed = ['midnight-ops', 'slate-control', 'pulse-neon'];
      if (removed.includes(parsed.colorTheme)) {
        parsed.colorTheme = 'aurora-admin';
      }
      if (parsed.density === 'default') {
        parsed.density = 'comfort';
      }
      return { ...DEFAULTS, ...parsed };
    }
  } catch {}
  return DEFAULTS;
}

function applyToDOM(prefs: UIPreferences) {
  const root = document.documentElement;

  // Clean up old/removed classes (migration)
  root.classList.remove('scheme-blue', 'scheme-purple', 'scheme-green', 'scheme-orange', 'scheme-rose');
  root.classList.remove('theme-midnight-ops', 'theme-slate-control', 'theme-pulse-neon');
  root.classList.remove('density-default');

  // Apply theme
  ALL_THEME_CLASSES.forEach(cls => root.classList.remove(cls));
  root.classList.add(`theme-${prefs.colorTheme}`);

  // Apply density
  ALL_DENSITY_CLASSES.forEach(cls => root.classList.remove(cls));
  root.classList.add(`density-${prefs.density}`);
}

export function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UIPreferences>(DEFAULTS);

  useEffect(() => {
    const loaded = loadPreferences();
    setPrefs(loaded);
    applyToDOM(loaded);
  }, []);

  const persist = useCallback((next: UIPreferences) => {
    setPrefs(next);
    applyToDOM(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const setColorTheme = useCallback((colorTheme: ThemeName) => {
    persist({ ...prefs, colorTheme });
  }, [prefs, persist]);

  const setDensity = useCallback((density: Density) => {
    persist({ ...prefs, density });
  }, [prefs, persist]);

  const resetPreferences = useCallback(() => {
    persist(DEFAULTS);
  }, [persist]);

  return (
    <UIPreferencesContext.Provider value={{
      colorTheme: prefs.colorTheme,
      setColorTheme,
      density: prefs.density,
      setDensity,
      resetPreferences,
    }}>
      {children}
    </UIPreferencesContext.Provider>
  );
}

export function useUIPreferences() {
  const ctx = useContext(UIPreferencesContext);
  if (!ctx) throw new Error('useUIPreferences must be used within UIPreferencesProvider');
  return ctx;
}
