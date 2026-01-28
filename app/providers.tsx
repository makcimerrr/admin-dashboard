'use client';

import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "@/lib/stack-client";
import ThemeProviderWrapper from '@/components/theme-provider-wrapper';
import { NextAuthProvider } from "@/components/providers/nextauth-provider";
import { UIPreferencesProvider } from '@/contexts/ui-preferences-context';
import { GlobalKeyboardShortcuts } from '@/components/global-keyboard-shortcuts';
import { CommandPalette } from '@/components/command-palette';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthProvider>
      <StackProvider app={stackClientApp}>
        <StackTheme>
          <ThemeProviderWrapper>
            <UIPreferencesProvider>
              <GlobalKeyboardShortcuts />
              <CommandPalette />
              {children}
            </UIPreferencesProvider>
          </ThemeProviderWrapper>
        </StackTheme>
      </StackProvider>
    </NextAuthProvider>
  );
}
