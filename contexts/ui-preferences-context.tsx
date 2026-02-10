'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Density = 'default' | 'compact';
export type ColorScheme = 'blue' | 'purple' | 'green' | 'orange' | 'rose';

interface UIPreferences {
  density: Density;
  colorScheme: ColorScheme;
}

interface UIPreferencesContextValue {
  density: Density;
  setDensity: (density: Density) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  resetPreferences: () => void;
}

const STORAGE_KEY = 'ui-preferences';
const DEFAULTS: UIPreferences = { density: 'default', colorScheme: 'blue' };

const UIPreferencesContext = createContext<UIPreferencesContextValue | null>(null);

function loadPreferences(): UIPreferences {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {}
  return DEFAULTS;
}

function applyToDOM(prefs: UIPreferences) {
  const root = document.documentElement;
  root.classList.remove('density-default', 'density-compact');
  root.classList.add(`density-${prefs.density}`);
  root.classList.remove('scheme-blue', 'scheme-purple', 'scheme-green', 'scheme-orange', 'scheme-rose');
  root.classList.add(`scheme-${prefs.colorScheme}`);
}

export function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UIPreferences>(DEFAULTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadPreferences();
    setPrefs(loaded);
    applyToDOM(loaded);
    setMounted(true);
  }, []);

  const persist = useCallback((next: UIPreferences) => {
    setPrefs(next);
    applyToDOM(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const setDensity = useCallback((density: Density) => {
    persist({ ...prefs, density });
  }, [prefs, persist]);

  const setColorScheme = useCallback((colorScheme: ColorScheme) => {
    persist({ ...prefs, colorScheme });
  }, [prefs, persist]);

  const resetPreferences = useCallback(() => {
    persist(DEFAULTS);
  }, [persist]);

  if (!mounted) return <>{children}</>;

  return (
    <UIPreferencesContext.Provider value={{ density: prefs.density, setDensity, colorScheme: prefs.colorScheme, setColorScheme, resetPreferences }}>
      {children}
    </UIPreferencesContext.Provider>
  );
}

export function useUIPreferences() {
  const ctx = useContext(UIPreferencesContext);
  if (!ctx) throw new Error('useUIPreferences must be used within UIPreferencesProvider');
  return ctx;
}
