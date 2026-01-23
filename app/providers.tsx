'use client';

import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "@/lib/stack-client";
import ThemeProviderWrapper from '@/components/theme-provider-wrapper';
import { NextAuthProvider } from "@/components/providers/nextauth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthProvider>
      <StackProvider app={stackClientApp}>
        <StackTheme>
          <ThemeProviderWrapper>
            {children}
          </ThemeProviderWrapper>
        </StackTheme>
      </StackProvider>
    </NextAuthProvider>
  );
}
