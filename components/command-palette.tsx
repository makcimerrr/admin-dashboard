'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboardIcon,
  ListIcon,
  BarChartIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  FolderIcon,
  UsersIcon,
  FileIcon,
  CalendarIcon,
  DatabaseIcon,
  FolderArchiveIcon,
  MoonIcon,
  SunIcon,
  Maximize2Icon,
  MinimizeIcon,
  SearchIcon,
  ArrowRightIcon,
  SettingsIcon,
} from 'lucide-react';
import { useUIPreferences, ColorScheme } from '@/contexts/ui-preferences-context';
import { formatShortcut, SHORTCUTS } from '@/lib/keyboard-shortcuts';

/**
 * Command types
 */
type CommandType = 'navigation' | 'action' | 'preference';

interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  type: CommandType;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
}

/**
 * Command Palette Component
 *
 * A keyboard-accessible command palette for quick navigation and actions.
 */
export function CommandPalette() {
  const router = useRouter();
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    toggleTheme,
    toggleDensity,
    setColorScheme,
    theme,
    density,
    colorScheme,
  } = useUIPreferences();

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define all available commands
  const allCommands = useMemo<Command[]>(
    () => [
      // Navigation commands
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        description: 'Go to dashboard',
        icon: LayoutDashboardIcon,
        type: 'navigation',
        keywords: ['home', 'overview'],
        action: () => {
          router.push('/');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-students',
        title: 'Students',
        description: 'View all students',
        icon: ListIcon,
        type: 'navigation',
        keywords: ['users', 'list'],
        action: () => {
          router.push('/students');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-alternants',
        title: 'Alternants',
        description: 'View alternants',
        icon: UsersIcon,
        type: 'navigation',
        keywords: ['students', 'work-study'],
        action: () => {
          router.push('/alternants');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-analytics',
        title: 'Analytics',
        description: 'View analytics dashboard',
        icon: BarChartIcon,
        type: 'navigation',
        keywords: ['stats', 'metrics', 'data'],
        action: () => {
          router.push('/analytics');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-code-reviews',
        title: 'Code Reviews',
        description: 'Manage code reviews',
        icon: ClipboardCheckIcon,
        type: 'navigation',
        keywords: ['audit', 'review'],
        action: () => {
          router.push('/code-reviews');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-planning',
        title: 'Planning',
        description: 'View planning',
        icon: ClipboardListIcon,
        type: 'navigation',
        keywords: ['schedule', 'calendar'],
        action: () => {
          router.push('/planning');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-planning-absences',
        title: 'Absences',
        description: 'Manage absences',
        icon: CalendarIcon,
        type: 'navigation',
        keywords: ['planning', 'time-off'],
        action: () => {
          router.push('/planning/absences');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-config',
        title: 'Config',
        description: 'Configuration',
        icon: FolderIcon,
        type: 'navigation',
        keywords: ['settings', 'configure'],
        action: () => {
          router.push('/config');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-01deck',
        title: '01 Deck',
        description: 'View 01 Deck',
        icon: UsersIcon,
        type: 'navigation',
        action: () => {
          router.push('/01deck');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-word-assistant',
        title: 'Word Assistant',
        description: 'Open Word Assistant',
        icon: FileIcon,
        type: 'navigation',
        keywords: ['documents', 'word', 'templates'],
        action: () => {
          router.push('/word_assistant');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-word-calendar',
        title: 'Word Calendar',
        description: 'Word Assistant Calendar',
        icon: CalendarIcon,
        type: 'navigation',
        keywords: ['word', 'schedule'],
        action: () => {
          router.push('/word_assistant/calendar');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-word-events',
        title: 'Word Events',
        description: 'Word Assistant Events',
        icon: CalendarIcon,
        type: 'navigation',
        keywords: ['word', 'events'],
        action: () => {
          router.push('/word_assistant/events');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-word-templates',
        title: 'Word Templates',
        description: 'Word Assistant Templates',
        icon: FileIcon,
        type: 'navigation',
        keywords: ['word', 'templates', 'documents'],
        action: () => {
          router.push('/word_assistant/templates');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-data-library',
        title: 'Data Library',
        description: 'View data library',
        icon: DatabaseIcon,
        type: 'navigation',
        keywords: ['promos', 'status', 'data'],
        action: () => {
          router.push('/promos/status');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-promos-manage',
        title: 'Manage Promos',
        description: 'Promotion management',
        icon: FolderArchiveIcon,
        type: 'navigation',
        keywords: ['promos', 'manage'],
        action: () => {
          router.push('/promos/manage');
          closeCommandPalette();
        },
      },
      {
        id: 'nav-reports',
        title: 'Reports',
        description: 'View reports',
        icon: ClipboardListIcon,
        type: 'navigation',
        keywords: ['analytics', 'data'],
        action: () => {
          router.push('/reports');
          closeCommandPalette();
        },
      },

      // Preference actions
      {
        id: 'toggle-theme',
        title: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`,
        description: 'Toggle between light and dark theme',
        icon: theme === 'light' ? MoonIcon : SunIcon,
        type: 'preference',
        keywords: ['theme', 'dark', 'light', 'appearance'],
        shortcut: formatShortcut(SHORTCUTS.TOGGLE_THEME),
        action: () => {
          toggleTheme();
          closeCommandPalette();
        },
      },
      {
        id: 'toggle-density',
        title: `Switch to ${density === 'comfortable' ? 'Compact' : 'Comfortable'} Density`,
        description: 'Toggle interface density',
        icon: density === 'comfortable' ? MinimizeIcon : Maximize2Icon,
        type: 'preference',
        keywords: ['density', 'spacing', 'compact', 'comfortable'],
        shortcut: formatShortcut(SHORTCUTS.TOGGLE_DENSITY),
        action: () => {
          toggleDensity();
          closeCommandPalette();
        },
      },

      // Color Scheme actions
      {
        id: 'color-default',
        title: 'Default Color Scheme',
        description: 'Blue accent colors',
        icon: SettingsIcon,
        type: 'preference',
        keywords: ['color', 'palette', 'default', 'blue'],
        action: () => {
          setColorScheme('default' as ColorScheme);
          closeCommandPalette();
        },
      },
      {
        id: 'color-blue',
        title: 'Blue Color Scheme',
        description: 'Ocean blue colors',
        icon: SettingsIcon,
        type: 'preference',
        keywords: ['color', 'palette', 'blue', 'ocean'],
        action: () => {
          setColorScheme('blue' as ColorScheme);
          closeCommandPalette();
        },
      },
      {
        id: 'color-purple',
        title: 'Purple Color Scheme',
        description: 'Violet colors',
        icon: SettingsIcon,
        type: 'preference',
        keywords: ['color', 'palette', 'purple', 'violet'],
        action: () => {
          setColorScheme('purple' as ColorScheme);
          closeCommandPalette();
        },
      },
      {
        id: 'color-green',
        title: 'Green Color Scheme',
        description: 'Emerald colors',
        icon: SettingsIcon,
        type: 'preference',
        keywords: ['color', 'palette', 'green', 'emerald'],
        action: () => {
          setColorScheme('green' as ColorScheme);
          closeCommandPalette();
        },
      },
      {
        id: 'color-orange',
        title: 'Orange Color Scheme',
        description: 'Amber colors',
        icon: SettingsIcon,
        type: 'preference',
        keywords: ['color', 'palette', 'orange', 'amber'],
        action: () => {
          setColorScheme('orange' as ColorScheme);
          closeCommandPalette();
        },
      },
      {
        id: 'color-rose',
        title: 'Rose Color Scheme',
        description: 'Pink colors',
        icon: SettingsIcon,
        type: 'preference',
        keywords: ['color', 'palette', 'rose', 'pink'],
        action: () => {
          setColorScheme('rose' as ColorScheme);
          closeCommandPalette();
        },
      },
      {
        id: 'color-slate',
        title: 'Slate Color Scheme',
        description: 'Professional gray colors',
        icon: SettingsIcon,
        type: 'preference',
        keywords: ['color', 'palette', 'slate', 'gray', 'professional'],
        action: () => {
          setColorScheme('slate' as ColorScheme);
          closeCommandPalette();
        },
      },

      // General actions
      {
        id: 'search',
        title: 'Search',
        description: 'Search across the application',
        icon: SearchIcon,
        type: 'action',
        keywords: ['find', 'search'],
        action: () => {
          closeCommandPalette();
          // TODO: Implement global search
        },
      },
    ],
    [router, closeCommandPalette, toggleTheme, toggleDensity, theme, density]
  );

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) {
      return allCommands;
    }

    const searchLower = search.toLowerCase();

    return allCommands.filter(cmd => {
      // Search in title
      if (cmd.title.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in description
      if (cmd.description?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in keywords
      if (cmd.keywords?.some(kw => kw.toLowerCase().includes(searchLower))) {
        return true;
      }

      return false;
    });
  }, [allCommands, search]);

  // Group commands by type
  const groupedCommands = useMemo(() => {
    const groups: Record<CommandType, Command[]> = {
      navigation: [],
      action: [],
      preference: [],
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.type].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!isCommandPaletteOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;

        case 'Enter':
          e.preventDefault();
          const selected = filteredCommands[selectedIndex];
          if (selected) {
            selected.action();
          }
          break;

        case 'Escape':
          e.preventDefault();
          closeCommandPalette();
          break;
      }
    },
    [filteredCommands, selectedIndex, closeCommandPalette]
  );

  // Scroll selected item into view
  useEffect(() => {
    const selected = document.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  return (
    <Dialog open={isCommandPaletteOpen} onOpenChange={closeCommandPalette}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>
            Search for commands, navigate to pages, or change preferences
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="border-b px-4 py-3">
          <div className="relative">
            <SearchIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="pl-6 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* Commands List */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            <>
              {/* Navigation commands */}
              {groupedCommands.navigation.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Navigation
                  </div>
                  <div className="space-y-0.5">
                    {groupedCommands.navigation.map((cmd, idx) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <CommandItem
                          key={cmd.id}
                          command={cmd}
                          isSelected={globalIndex === selectedIndex}
                          onClick={() => cmd.action()}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preference commands */}
              {groupedCommands.preference.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Preferences
                  </div>
                  <div className="space-y-0.5">
                    {groupedCommands.preference.map((cmd, idx) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <CommandItem
                          key={cmd.id}
                          command={cmd}
                          isSelected={globalIndex === selectedIndex}
                          onClick={() => cmd.action()}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action commands */}
              {groupedCommands.action.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Actions
                  </div>
                  <div className="space-y-0.5">
                    {groupedCommands.action.map((cmd, idx) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <CommandItem
                          key={cmd.id}
                          command={cmd}
                          isSelected={globalIndex === selectedIndex}
                          onClick={() => cmd.action()}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>{' '}
              Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">ESC</kbd>{' '}
              Close
            </span>
          </div>
          <div>{filteredCommands.length} commands</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Command Item Component
 */
interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  onClick: () => void;
}

function CommandItem({ command, isSelected, onClick }: CommandItemProps) {
  const Icon = command.icon;

  return (
    <button
      type="button"
      data-selected={isSelected}
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-md text-left
        transition-colors
        ${
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        }
      `}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{command.title}</span>
          {command.type === 'navigation' && !isSelected && (
            <ArrowRightIcon className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
        </div>
        {command.description && (
          <p className={`text-xs truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            {command.description}
          </p>
        )}
      </div>

      {command.shortcut && (
        <kbd
          className={`
            px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0
            ${isSelected ? 'bg-primary-foreground/20' : 'bg-muted'}
          `}
        >
          {command.shortcut}
        </kbd>
      )}
    </button>
  );
}
