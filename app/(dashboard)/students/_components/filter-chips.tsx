'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';

export interface FilterChip {
  key: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs text-muted-foreground font-medium">
        Filtres actifs:
      </span>
      {filters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="gap-1.5 pr-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors group"
          onClick={() => onRemove(filter.key)}
        >
          <span className="text-muted-foreground">{filter.label}:</span>
          <span className="font-medium">{filter.value}</span>
          <span className="ml-1 p-0.5 rounded-sm bg-muted group-hover:bg-destructive/20">
            <X className="h-3 w-3" />
          </span>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Tout effacer
      </Button>
    </div>
  );
}
