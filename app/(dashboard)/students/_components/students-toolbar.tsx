'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Search,
  UserCheck,
  UserX,
  Users,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Workflow
} from 'lucide-react';
import { FilterChips, FilterChip } from './filter-chips';
import debounce from 'lodash.debounce';

interface StudentsToolbarProps {
  search: string;
}

export function StudentsToolbar({ search }: StudentsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        const query = new URLSearchParams(searchParams.toString());
        if (value) {
          query.set('q', value);
        } else {
          query.delete('q');
        }
        query.set('offset', '0');
        router.push(`${pathname}?${query.toString()}`, { scroll: false });
      }, 300),
    [searchParams, pathname, router]
  );

  // Sync search value with URL
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  // Get current filter values
  const currentDropoutFilter = searchParams.get('dropout_filter') || 'active';
  const currentStatus = searchParams.get('status') || '';
  const currentDelayLevel = searchParams.get('delay_level') || '';
  const currentTrack = searchParams.get('track') || '';
  const currentTrackCompleted = searchParams.get('track_completed') || '';

  // Build active filters array
  const activeFilters: FilterChip[] = useMemo(() => {
    const filters: FilterChip[] = [];

    if (currentDropoutFilter !== 'active') {
      filters.push({
        key: 'dropout_filter',
        label: 'Statut',
        value: currentDropoutFilter === 'dropout' ? 'Perdition' : 'Tous'
      });
    }

    if (currentStatus) {
      const statusLabels: Record<string, string> = {
        audit: 'Audit',
        working: 'En cours',
        'without group': 'Sans groupe'
      };
      filters.push({
        key: 'status',
        label: 'Projet',
        value: statusLabels[currentStatus] || currentStatus
      });
    }

    if (currentDelayLevel) {
      filters.push({
        key: 'delay_level',
        label: 'Retard',
        value: currentDelayLevel
      });
    }

    if (currentTrack) {
      const trackLabel = currentTrack.charAt(0).toUpperCase() + currentTrack.slice(1);
      const completedLabel = currentTrackCompleted === 'true' ? 'terminé' : 'en cours';
      filters.push({
        key: 'track',
        label: 'Tronc',
        value: `${trackLabel} ${completedLabel}`
      });
    }

    return filters;
  }, [currentDropoutFilter, currentStatus, currentDelayLevel, currentTrack, currentTrackCompleted]);

  // Filter handlers
  const updateFilter = (key: string, value: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (value === '' || (key === 'dropout_filter' && value === 'active')) {
      query.delete(key);
      if (key === 'track') {
        query.delete('track_completed');
      }
    } else {
      query.set(key, value);
    }
    query.set('offset', '0');
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const setTrackFilter = (track: string, completed: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (track === '') {
      query.delete('track');
      query.delete('track_completed');
    } else {
      query.set('track', track);
      query.set('track_completed', completed);
    }
    query.set('offset', '0');
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const removeFilter = (key: string) => {
    const query = new URLSearchParams(searchParams.toString());
    query.delete(key);
    if (key === 'track') {
      query.delete('track_completed');
    }
    query.set('offset', '0');
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    const query = new URLSearchParams(searchParams.toString());
    query.delete('dropout_filter');
    query.delete('status');
    query.delete('delay_level');
    query.delete('track');
    query.delete('track_completed');
    query.delete('filter');
    query.delete('direction');
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par nom ou login..."
            className="pl-9 w-full"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              debouncedSearch(e.target.value);
            }}
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Dropout filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={currentDropoutFilter !== 'active' ? 'default' : 'outline'}
                size="sm"
                className={
                  currentDropoutFilter === 'dropout'
                    ? 'bg-red-500 hover:bg-red-600'
                    : ''
                }
              >
                {currentDropoutFilter === 'active' && (
                  <UserCheck className="h-4 w-4 mr-1.5" />
                )}
                {currentDropoutFilter === 'dropout' && (
                  <UserX className="h-4 w-4 mr-1.5" />
                )}
                {currentDropoutFilter === 'all' && (
                  <Users className="h-4 w-4 mr-1.5" />
                )}
                {currentDropoutFilter === 'active'
                  ? 'Actifs'
                  : currentDropoutFilter === 'dropout'
                  ? 'Perdition'
                  : 'Tous'}
                <ChevronDown className="h-4 w-4 ml-1.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => updateFilter('dropout_filter', 'active')}
              >
                <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                Étudiants actifs
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilter('dropout_filter', 'dropout')}
              >
                <UserX className="h-4 w-4 mr-2 text-red-600" />
                En perdition
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilter('dropout_filter', 'all')}
              >
                <Users className="h-4 w-4 mr-2" />
                Tous les étudiants
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={currentStatus ? 'default' : 'outline'}
                size="sm"
              >
                <Clock className="h-4 w-4 mr-1.5" />
                Statut
                <ChevronDown className="h-4 w-4 ml-1.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
              <DropdownMenuLabel>Filtrer par projet</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => updateFilter('status', '')}>
                Tous
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateFilter('status', 'audit')}>
                Audit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateFilter('status', 'working')}>
                Working
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilter('status', 'without group')}
              >
                Sans groupe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delay level filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={currentDelayLevel ? 'default' : 'outline'}
                size="sm"
              >
                <AlertCircle className="h-4 w-4 mr-1.5" />
                Retard
                <ChevronDown className="h-4 w-4 ml-1.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
              <DropdownMenuLabel>Filtrer par retard</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => updateFilter('delay_level', '')}>
                Tous
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilter('delay_level', 'bien')}
              >
                Bien
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilter('delay_level', 'en retard')}
              >
                En Retard
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilter('delay_level', 'en avance')}
              >
                En Avance
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilter('delay_level', 'spécialité')}
              >
                Spécialité
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilter('delay_level', 'Validé')}
              >
                Validé
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateFilter('delay_level', 'Non Validé')}
              >
                Non Validé
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Track filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={currentTrack ? 'default' : 'outline'}
                size="sm"
              >
                <Workflow className="h-4 w-4 mr-1.5" />
                Troncs
                <ChevronDown className="h-4 w-4 ml-1.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filtrer par tronc</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTrackFilter('', '')}>
                Tous
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Golang
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTrackFilter('golang', 'true')}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Golang terminé
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTrackFilter('golang', 'false')}>
                <Clock className="h-4 w-4 mr-2 text-orange-600" />
                Golang en cours
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Javascript
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setTrackFilter('javascript', 'true')}
              >
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Javascript terminé
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTrackFilter('javascript', 'false')}
              >
                <Clock className="h-4 w-4 mr-2 text-orange-600" />
                Javascript en cours
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Rust
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTrackFilter('rust', 'true')}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Rust terminé
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTrackFilter('rust', 'false')}>
                <Clock className="h-4 w-4 mr-2 text-orange-600" />
                Rust en cours
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Java
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTrackFilter('java', 'true')}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Java terminé
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTrackFilter('java', 'false')}>
                <Clock className="h-4 w-4 mr-2 text-orange-600" />
                Java en cours
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active filters chips */}
      <FilterChips
        filters={activeFilters}
        onRemove={removeFilter}
        onClearAll={clearAllFilters}
      />
    </div>
  );
}
