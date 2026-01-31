'use client';

import { Button } from '@/components/ui/button';
import { UserX, Search, Filter, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type?: 'no-results' | 'no-students' | 'error';
  searchQuery?: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function EmptyState({
  type = 'no-results',
  searchQuery,
  hasFilters = false,
  onClearFilters,
  onRetry,
  className
}: EmptyStateProps) {
  const configs = {
    'no-results': {
      icon: Search,
      iconClass: 'text-muted-foreground',
      bgClass: 'bg-muted/30',
      title: searchQuery
        ? `Aucun résultat pour "${searchQuery}"`
        : 'Aucun étudiant trouvé',
      description: hasFilters
        ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
        : 'Aucun étudiant ne correspond à votre recherche.',
      showClearFilters: hasFilters
    },
    'no-students': {
      icon: UserX,
      iconClass: 'text-muted-foreground',
      bgClass: 'bg-muted/30',
      title: 'Aucun étudiant',
      description: 'Il n\'y a pas encore d\'étudiants dans cette promotion.',
      showClearFilters: false
    },
    error: {
      icon: RefreshCcw,
      iconClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
      title: 'Erreur de chargement',
      description: 'Impossible de charger les étudiants. Veuillez réessayer.',
      showClearFilters: false
    }
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4',
        config.bgClass,
        'rounded-lg border-2 border-dashed',
        className
      )}
    >
      <div className="flex flex-col items-center text-center max-w-md">
        <div
          className={cn(
            'p-4 rounded-full mb-4',
            type === 'error' ? 'bg-destructive/10' : 'bg-muted'
          )}
        >
          <Icon className={cn('h-8 w-8', config.iconClass)} />
        </div>

        <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {config.description}
        </p>

        <div className="flex items-center gap-3">
          {config.showClearFilters && onClearFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Réinitialiser les filtres
            </Button>
          )}

          {type === 'error' && onRetry && (
            <Button onClick={onRetry} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Réessayer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
