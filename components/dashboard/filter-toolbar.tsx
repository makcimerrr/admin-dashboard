import type { ReactNode } from 'react';

/**
 * Purely visual container for a row of filters (search input + selects).
 * Responsive flex row with wrapping; holds no state and triggers no behavior.
 */
export function FilterToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-muted/50 rounded-lg border flex-wrap flex-shrink-0">
      {children}
    </div>
  );
}
