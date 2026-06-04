'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

// ---- Types ----
export type Density = 'comfort' | 'compact';

interface UIPreferences {
  density: Density;
}

interface UIPreferencesContextValue {
  density: Density;
  setDensity: (density: Density) => void;
  resetPreferences: () => void;
}

// ---- Constants ----
const STORAGE_KEY = 'ui-preferences';
const DEFAULTS: UIPreferences = { density: 'comfort' };

const ALL_DENSITY_CLASSES = ['density-comfort', 'density-compact'] as const;

// Legacy theme classes that may linger on <html> from older versions.
const LEGACY_THEME_CLASSES = [
  'theme-aurora-admin',
  'theme-solar-desk',
  'theme-carbon-redline',
  'theme-oceanic-flow',
  'theme-clay-studio',
  'theme-blueprint',
] as const;

// ---- Context ----
const UIPreferencesContext = createContext<UIPreferencesContextValue | null>(null);

function loadPreferences(): UIPreferences {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.density === 'default') {
        parsed.density = 'comfort';
      }
      const density: Density = parsed.density === 'compact' ? 'compact' : 'comfort';
      return { density };
    }
  } catch {}
  return DEFAULTS;
}

function applyToDOM(prefs: UIPreferences) {
  const root = document.documentElement;

  // Clean up old/removed classes (migration to the single palette)
  root.classList.remove('scheme-blue', 'scheme-purple', 'scheme-green', 'scheme-orange', 'scheme-rose');
  root.classList.remove('density-default');
  LEGACY_THEME_CLASSES.forEach(cls => root.classList.remove(cls));

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

  const setDensity = useCallback((density: Density) => {
    persist({ ...prefs, density });
  }, [prefs, persist]);

  const resetPreferences = useCallback(() => {
    persist(DEFAULTS);
  }, [persist]);

  return (
    <UIPreferencesContext.Provider value={{
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
