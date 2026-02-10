"use client"

import * as React from "react"
import Link from "next/link"
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
  PaletteIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useUIPreferences, type ThemeName } from "@/contexts/ui-preferences-context"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NavAssistant } from "@/components/nav-assistant"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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
      url: '/settings',
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

let User: {
  id?: string
  name?: string
  email?: string
  image?: string
  role?: string
} | undefined

function NavMenu({ items }: { items: typeof data.navMain }) {
  const [openMenus, setOpenMenus] = React.useState<string | null>(null)
  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => (prev === title ? null : title))
  }
  return (
    <nav className="space-y-1 relative">
      {items.map((item) => {
        const isOpen = openMenus === item.title
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
        )
      })}
    </nav>
  )
}

const themes: { value: ThemeName; label: string; colors: [string, string, string] }[] = [
  { value: 'aurora-admin', label: 'Aurora', colors: ['#ede8f5', '#7C3AED', '#6EE7B7'] },
  { value: 'solar-desk', label: 'Solar', colors: ['#f0e8dc', '#EA580C', '#D97706'] },
  { value: 'carbon-redline', label: 'Carbon', colors: ['#1a1d22', '#B91C1C', '#64748B'] },
  { value: 'oceanic-flow', label: 'Oceanic', colors: ['#152535', '#0369A1', '#0891B2'] },
  { value: 'clay-studio', label: 'Clay', colors: ['#ede6de', '#C2410C', '#6D7B52'] },
  { value: 'blueprint', label: 'Blueprint', colors: ['#fafafa', '#2563EB', '#e2e8f0'] },
]

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: typeof User }) {
  const { theme, setTheme } = useTheme()
  const { density, setDensity, colorTheme, setColorTheme } = useUIPreferences()
  const [themePickerOpen, setThemePickerOpen] = React.useState(false)
  const isDark = theme === 'dark'

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

          {/* Preference buttons */}
          <div className="mx-2 mt-4 border-t pt-3 space-y-1">
            {/* Appearance toggle */}
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                <span>Apparence</span>
              </div>
              <span className="text-xs font-medium">{isDark ? 'Sombre' : 'Clair'}</span>
            </button>

            {/* Density toggle */}
            <button
              type="button"
              onClick={() => setDensity(density === 'comfort' ? 'compact' : 'comfort')}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                {density === 'comfort' ? <MinimizeIcon className="h-4 w-4" /> : <Maximize2Icon className="h-4 w-4" />}
                <span>Densité</span>
              </div>
              <span className="text-xs font-medium">{density === 'comfort' ? 'Confort' : 'Dense'}</span>
            </button>

            {/* Theme picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemePickerOpen(!themePickerOpen)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <PaletteIcon className="h-4 w-4" />
                  <span>Thème</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const c = themes.find(t => t.value === colorTheme)?.colors;
                    return c ? (
                      <div className="flex h-3 w-5 overflow-hidden rounded-sm border">
                        <div className="flex-1" style={{ backgroundColor: c[0] }} />
                        <div className="flex-1" style={{ backgroundColor: c[1] }} />
                        <div className="flex-1" style={{ backgroundColor: c[2] }} />
                      </div>
                    ) : null;
                  })()}
                  <span className="text-xs font-medium">
                    {themes.find(t => t.value === colorTheme)?.label}
                  </span>
                </div>
              </button>

              {themePickerOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-full rounded-lg border bg-popover p-2 shadow-lg z-50">
                  <div className="grid grid-cols-1 gap-1">
                    {themes.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => {
                          setColorTheme(t.value)
                          setThemePickerOpen(false)
                        }}
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                          colorTheme === t.value
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex h-4 w-6 overflow-hidden rounded-sm border">
                          <div className="flex-1" style={{ backgroundColor: t.colors[0] }} />
                          <div className="flex-1" style={{ backgroundColor: t.colors[1] }} />
                          <div className="flex-1" style={{ backgroundColor: t.colors[2] }} />
                        </div>
                        <span className="text-xs font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user}/>
        </SidebarFooter>
      </Sidebar>
  )
}