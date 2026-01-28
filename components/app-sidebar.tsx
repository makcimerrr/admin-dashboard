'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  BotIcon,
  BriefcaseIcon,
  CalendarIcon,
  CameraIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderArchiveIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  MoreHorizontalIcon,
  MoonIcon,
  SunIcon,
  Maximize2Icon,
  MinimizeIcon,
  CommandIcon,
  PaletteIcon
} from 'lucide-react';
import { useUIPreferences, ColorScheme } from '@/contexts/ui-preferences-context';
import { formatShortcut, SHORTCUTS } from '@/lib/keyboard-shortcuts';

import { NavDocuments } from '@/components/nav-documents';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import { NavAssistant } from '@/components/nav-assistant';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/',
      icon: LayoutDashboardIcon
    },
    {
      title: 'Students',
      url: '/students',
      icon: ListIcon,
      items: [
        {
          title: 'Alternants',
          url: '/alternants'
        }
      ]
    },
    {
      title: 'Analytics',
      url: '/analytics',
      icon: BarChartIcon
    },
    {
      title: 'Code Reviews',
      url: '/code-reviews',
      icon: ClipboardCheckIcon
    },
    {
      title: 'Planning',
      url: '/planning',
      icon: ClipboardListIcon,
      items: [
        {
          title: 'Absences',
          url: '/planning/absences'
        },
        {
          title: 'Extraction',
          url: '/planning/extraction'
        },
        {
          title: 'Employés',
          url: '/employees'
        },
        {
          title: 'Historique',
          url: '/history'
        }
      ]
    },
    {
      title: 'Config',
      url: '/config',
      icon: FolderIcon
    },
    {
      title: '01 Deck',
      url: '/01deck',
      icon: UsersIcon
    },
    {
      title: 'Word Assistant',
      url: '/word_assistant',
      icon: FileIcon,
      items: [
        {
          title: 'Calendrier',
          url: '/word_assistant/calendar'
        },
        {
          title: 'Evenements',
          url: '/word_assistant/events'
        },
        {
          title: 'Templates',
          url: '/word_assistant/templates'
        }
      ]
    }
  ],
  navClouds: [
    {
      title: 'Capture',
      icon: CameraIcon,
      isActive: true,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#'
        },
        {
          title: 'Archived',
          url: '#'
        }
      ]
    },
    {
      title: 'Proposal',
      icon: FileTextIcon,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#'
        },
        {
          title: 'Archived',
          url: '#'
        }
      ]
    },
    {
      title: 'Prompts',
      icon: FileCodeIcon,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#'
        },
        {
          title: 'Archived',
          url: '#'
        }
      ]
    }
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '#',
      icon: SettingsIcon
    },
    {
      title: 'Get Help',
      url: '#',
      icon: HelpCircleIcon
    },
    {
      title: 'Search',
      url: '#',
      icon: SearchIcon
    }
  ],
  documents: [
    {
      name: 'Data Library',
      url: '/promos/status',
      icon: DatabaseIcon
    },
    {
      name: 'Gestion Promos',
      url: '/promos/manage',
      icon: FolderArchiveIcon
    },
    {
      name: 'Reports',
      url: '/reports',
      icon: ClipboardListIcon
    }
  ]
};

let User:
  | {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
      role?: string;
    }
  | undefined;

function NavMenu({ items }: { items: typeof data.navMain }) {
  const [openMenus, setOpenMenus] = React.useState<string | null>(null);
  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => (prev === title ? null : title));
  };
  return (
    <nav className="space-y-1 relative">
      {items.map((item) => {
        const isOpen = openMenus === item.title;
        return (
          <div key={item.title}>
            <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted hover:text-foreground">
              <Link
                href={item.url}
                className="flex items-center gap-2 text-sm font-medium"
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
              {Array.isArray(item.items) && item.items.length > 0 && (
                <button
                  onClick={() => toggleMenu(item.title)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {Array.isArray(item.items) && item.items.length > 0 && isOpen && (
              <div className="ml-6 mt-1 space-y-1">
                {item.items.map((subItem) => (
                  <Link
                    key={subItem.title}
                    href={subItem.url}
                    className="flex items-center gap-2 rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <span className="text-xs">•</span>
                    {subItem.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user?: typeof User }) {
  const [colorSchemeOpen, setColorSchemeOpen] = React.useState(false);

  // Use global UI preferences
  const {
    theme,
    toggleTheme,
    density,
    toggleDensity,
    colorScheme,
    setColorScheme,
    openCommandPalette,
  } = useUIPreferences();

  const isDark = theme === 'dark';

  const colorSchemes: { value: ColorScheme; label: string; color: string }[] = [
    { value: 'default', label: 'Défaut', color: '#3b82f6' },
    { value: 'blue', label: 'Bleu', color: '#0ea5e9' },
    { value: 'purple', label: 'Violet', color: '#8b5cf6' },
    { value: 'green', label: 'Vert', color: '#10b981' },
    { value: 'orange', label: 'Orange', color: '#f59e0b' },
    { value: 'rose', label: 'Rose', color: '#f43f5e' },
    { value: 'slate', label: 'Ardoise', color: '#475569' },
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="https://zone01rouennormandie.org/">
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">Zone01 Rouen</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMenu items={data.navMain} />
        <NavAssistant />
        <NavDocuments items={data.documents} />
        <div className="mt-4 border-t pt-3 space-y-1">
          {/* Appearance */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              {isDark ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
              <span>Appearance</span>
            </div>
            <span className="text-xs font-medium">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Density */}
          <button
            type="button"
            onClick={toggleDensity}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
            aria-label={`Switch to ${density === 'comfortable' ? 'compact' : 'comfortable'} density`}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              {density === 'comfortable' ? (
                <Maximize2Icon className="h-4 w-4" />
              ) : (
                <MinimizeIcon className="h-4 w-4" />
              )}
              <span>Density</span>
            </div>
            <span className="text-xs font-medium capitalize">{density}</span>
          </button>

          {/* Color Scheme */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setColorSchemeOpen(!colorSchemeOpen)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
              aria-label="Change color scheme"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <PaletteIcon className="h-4 w-4" />
                <span>Palette</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-3 w-3 rounded-full border"
                  style={{
                    backgroundColor: colorSchemes.find(s => s.value === colorScheme)?.color
                  }}
                />
                <span className="text-xs font-medium capitalize">
                  {colorSchemes.find(s => s.value === colorScheme)?.label}
                </span>
              </div>
            </button>

            {colorSchemeOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-56 rounded-lg border bg-popover p-2 shadow-lg z-50">
                <div className="grid grid-cols-2 gap-2">
                  {colorSchemes.map((scheme) => (
                    <button
                      key={scheme.value}
                      onClick={() => {
                        setColorScheme(scheme.value);
                        setColorSchemeOpen(false);
                      }}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                        colorScheme === scheme.value
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div
                        className="h-4 w-4 rounded-full border-2 border-current"
                        style={{ backgroundColor: scheme.color }}
                      />
                      <span className="text-xs font-medium">{scheme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Command palette */}
          <button
            type="button"
            onClick={openCommandPalette}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
            aria-label="Open command palette"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <CommandIcon className="h-4 w-4" />
              <span>Command palette</span>
            </div>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              {formatShortcut(SHORTCUTS.COMMAND_PALETTE)}
            </kbd>
          </button>
        </div>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
