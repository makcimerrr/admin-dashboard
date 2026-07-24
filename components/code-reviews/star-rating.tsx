'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Note sur 10 affichée en 10 étoiles. Cliquer la n-ième étoile note n/10 ;
 * re-cliquer la même étoile efface la note (null = non noté).
 */
export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  showValue = true,
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
  showValue?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const starClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex items-center"
        onMouseLeave={() => setHover(null)}
        role={readOnly ? 'img' : 'radiogroup'}
        aria-label={value != null ? `Note : ${value}/10` : 'Non noté'}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            tabIndex={readOnly ? -1 : 0}
            aria-label={`${n}/10`}
            onMouseEnter={() => !readOnly && setHover(n)}
            onClick={() => {
              if (readOnly || !onChange) return;
              onChange(value === n ? null : n);
            }}
            className={cn('p-0 m-0 leading-none', !readOnly && 'cursor-pointer')}
          >
            <Star
              className={cn(
                starClass,
                n <= shown
                  ? 'fill-warning text-warning'
                  : 'fill-transparent text-muted-foreground/40',
                !readOnly && 'transition-colors',
              )}
            />
          </button>
        ))}
      </div>
      {showValue && (
        <span className={cn('tabular-nums text-muted-foreground', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
          {value != null ? `${value}/10` : '—'}
        </span>
      )}
    </div>
  );
}
