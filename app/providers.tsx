'use client';

import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "@/lib/stack-client";
import ThemeProviderWrapper from '@/components/theme-provider-wrapper';
import { NextAuthProvider } from "@/components/providers/nextauth-provider";
import { UIPreferencesProvider } from "@/contexts/ui-preferences-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthProvider>
      <StackProvider app={stackClientApp}>
        <StackTheme>
          <ThemeProviderWrapper>
            <UIPreferencesProvider>
              {children}
            </UIPreferencesProvider>
          </ThemeProviderWrapper>
        </StackTheme>
      </StackProvider>
    </NextAuthProvider>
  );
}
