"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  BellIcon,
  BotIcon,
  BriefcaseIcon,
  CalendarIcon,
  CalendarX2Icon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileBarChartIcon,
  FileIcon,
  FolderArchiveIcon,
  FolderIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  MoonIcon,
  SunIcon,
  Maximize2Icon,
  MinimizeIcon,
  PaletteIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useUIPreferences, type ThemeName } from "@/contexts/ui-preferences-context"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"

// ─── Navigation structure ───────────────────────────────────────────────────

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [
      { title: 'Tableau de bord', url: '/', icon: LayoutDashboardIcon },
    ],
  },
  {
    label: 'Étudiants',
    items: [
      { title: 'Étudiants', url: '/students', icon: UsersIcon },
      { title: 'Alternants', url: '/alternants', icon: BriefcaseIcon },
      { title: 'Spécialités', url: '/specialties', icon: GraduationCapIcon },
    ],
  },
  {
    label: 'Pédagogie',
    items: [
      { title: 'Code Reviews', url: '/code-reviews', icon: ClipboardCheckIcon },
      { title: 'Suivi notifications', url: '/code-reviews/suivi', icon: BellIcon },
    ],
  },
  {
    label: 'Suivi Promos',
    items: [
      { title: 'Data Library', url: '/promos/status', icon: DatabaseIcon },
      { title: 'Gestion Promos', url: '/promos/manage', icon: FolderArchiveIcon },
      { title: 'Analytics', url: '/analytics', icon: BarChartIcon },
      { title: 'Rapports', url: '/reports', icon: ClipboardListIcon },
    ],
  },
  {
    label: 'Planning',
    items: [
      { title: 'Planning', url: '/planning', icon: CalendarIcon },
      { title: 'Absences', url: '/planning/absences', icon: CalendarX2Icon },
      { title: 'Extraction', url: '/planning/extraction', icon: FileBarChartIcon },
      { title: 'Employés', url: '/employees', icon: UsersIcon },
    ],
  },
  {
    label: 'Outils',
    items: [
      { title: '01 Deck', url: '/01deck', icon: LayoutGridIcon },
      { title: 'Word Assistant', url: '/word_assistant', icon: FileIcon },
      { title: 'Assistant IA', url: '/assistant', icon: BotIcon },
    ],
  },
]

const navBottom: NavItem[] = [
  { title: 'Configuration', url: '/config', icon: FolderIcon },
  { title: 'Paramètres', url: '/settings', icon: SettingsIcon },
]

// ─── Types ──────────────────────────────────────────────────────────────────

let User: {
  id?: string
  name?: string
  email?: string
  image?: string
  role?: string
} | undefined

// ─── Theme config ───────────────────────────────────────────────────────────

const themes: { value: ThemeName; label: string; colors: [string, string, string] }[] = [
  { value: 'aurora-admin', label: 'Aurora', colors: ['#ede8f5', '#7C3AED', '#6EE7B7'] },
  { value: 'solar-desk', label: 'Solar', colors: ['#f0e8dc', '#EA580C', '#D97706'] },
  { value: 'carbon-redline', label: 'Carbon', colors: ['#1a1d22', '#B91C1C', '#64748B'] },
  { value: 'oceanic-flow', label: 'Oceanic', colors: ['#152535', '#0369A1', '#0891B2'] },
  { value: 'clay-studio', label: 'Clay', colors: ['#ede6de', '#C2410C', '#6D7B52'] },
  { value: 'blueprint', label: 'Blueprint', colors: ['#fafafa', '#2563EB', '#e2e8f0'] },
]

// ─── Component ──────────────────────────────────────────────────────────────

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: typeof User }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { density, setDensity, colorTheme, setColorTheme } = useUIPreferences()
  const [themePickerOpen, setThemePickerOpen] = React.useState(false)
  const isDark = theme === 'dark'

  const isActive = (url: string) => {
    if (url === '/') return pathname === '/'
    return pathname === url || pathname.startsWith(url + '/')
  }

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
        {/* Main navigation groups */}
        {navGroups.map((group, gi) => (
          <SidebarGroup key={gi} className="py-1">
            {group.label && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3 mb-0.5">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => {
                const active = isActive(item.url)
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {/* Preference buttons */}
        <div className="mx-2 mt-4 border-t pt-3 space-y-1">
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

        {/* Bottom nav */}
        <SidebarGroup className="mt-auto py-1">
          <SidebarMenu>
            {navBottom.map((item) => {
              const active = isActive(item.url)
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
