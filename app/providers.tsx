'use client';

import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "@/lib/stack-client";
import ThemeProviderWrapper from '@/components/theme-provider-wrapper';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <ThemeProviderWrapper>
          {children}
        </ThemeProviderWrapper>
      </StackTheme>
    </StackProvider>
  );
}
