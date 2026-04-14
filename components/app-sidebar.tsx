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
  FileBarChartIcon,
  FileIcon,
  FolderArchiveIcon,
  FolderIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  MoonIcon,
  SunIcon,
  PaletteIcon,
  SettingsIcon,
  UsersIcon,
  ChevronLeft,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useUIPreferences, type ThemeName } from "@/contexts/ui-preferences-context"
import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ─── Navigation structure ───────────────────────────────────────────────────

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

interface NavSection {
  key: string
  label: string
  icon: LucideIcon
  url?: string // direct link (no sub-items)
  items?: NavItem[]
}

const navSections: NavSection[] = [
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboardIcon,
    url: '/',
  },
  {
    key: 'pedagogie',
    label: 'Pédagogie',
    icon: GraduationCapIcon,
    items: [
      { title: 'Étudiants', url: '/students', icon: UsersIcon },
      { title: 'Alternants', url: '/alternants', icon: BriefcaseIcon },
      { title: 'Spécialités', url: '/specialties', icon: GraduationCapIcon },
      { title: 'Code Reviews', url: '/code-reviews', icon: ClipboardCheckIcon },
      { title: 'Suivi', url: '/code-reviews/suivi', icon: BellIcon },
      { title: 'Gestion Promos', url: '/promos/manage', icon: FolderArchiveIcon },
      { title: 'Analytics', url: '/analytics', icon: BarChartIcon },
    ],
  },
  {
    key: 'planning',
    label: 'Planning',
    icon: CalendarIcon,
    items: [
      { title: 'Planning', url: '/planning', icon: CalendarIcon },
      { title: 'Absences', url: '/planning/absences', icon: CalendarX2Icon },
      { title: 'Extraction', url: '/planning/extraction', icon: FileBarChartIcon },
      { title: 'Employés', url: '/employees', icon: UsersIcon },
    ],
  },
  {
    key: 'outils',
    label: 'Outils',
    icon: LayoutGridIcon,
    items: [
      { title: '01 Deck', url: '/01deck', icon: LayoutGridIcon },
      { title: 'Word Assistant', url: '/word_assistant', icon: FileIcon },
      { title: 'Assistant IA', url: '/assistant', icon: BotIcon },
    ],
  },
]

const navBottom: NavSection[] = [
  { key: 'config', label: 'Configuration', icon: FolderIcon, url: '/config' },
  { key: 'settings', label: 'Paramètres', icon: SettingsIcon, url: '/settings' },
]

// ─── Theme config ───────────────────────────────────────────────────────────

const themes: { value: ThemeName; label: string; colors: [string, string, string] }[] = [
  { value: 'aurora-admin', label: 'Aurora', colors: ['#ede8f5', '#7C3AED', '#6EE7B7'] },
  { value: 'solar-desk', label: 'Solar', colors: ['#f0e8dc', '#EA580C', '#D97706'] },
  { value: 'carbon-redline', label: 'Carbon', colors: ['#1a1d22', '#B91C1C', '#64748B'] },
  { value: 'oceanic-flow', label: 'Oceanic', colors: ['#152535', '#0369A1', '#0891B2'] },
  { value: 'clay-studio', label: 'Clay', colors: ['#ede6de', '#C2410C', '#6D7B52'] },
  { value: 'blueprint', label: 'Blueprint', colors: ['#fafafa', '#2563EB', '#e2e8f0'] },
]

// ─── Types ──────────────────────────────────────────────────────────────────

let User: {
  id?: string
  name?: string
  email?: string
  image?: string
  role?: string
} | undefined

// ─── Component ──────────────────────────────────────────────────────────────

export function AppSidebar({ user, ...props }: { user?: typeof User } & React.HTMLAttributes<HTMLDivElement>) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useUIPreferences()
  const [activePanel, setActivePanel] = React.useState<string | null>(null)
  const [themePickerOpen, setThemePickerOpen] = React.useState(false)
  const isDark = theme === 'dark'

  const isActive = (url: string) => {
    if (url === '/') return pathname === '/'
    return pathname === url || pathname.startsWith(url + '/')
  }

  // Auto-open panel for current section
  const currentSection = navSections.find(s =>
    s.items?.some(i => isActive(i.url))
  )

  const handleIconClick = (section: NavSection) => {
    if (section.url) {
      // Direct navigation, close panel
      setActivePanel(null)
      return
    }
    // Toggle panel
    setActivePanel(prev => prev === section.key ? null : section.key)
  }

  const activeSectionData = navSections.find(s => s.key === activePanel)
  const isPanelOpen = !!activeSectionData?.items

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full shrink-0" {...props}>
        {/* ── Icon Rail ────────────────────────────────────────── */}
        <div className="flex flex-col w-14 bg-sidebar border-r">
          {/* Logo */}
          <div className="flex items-center justify-center h-12 border-b">
            <a href="https://zone01rouennormandie.org/" className="text-primary hover:opacity-80 transition-opacity">
              <ArrowUpCircleIcon className="h-5 w-5" />
            </a>
          </div>

          {/* Main icons */}
          <div className="flex-1 flex flex-col items-center py-2 gap-1">
            {navSections.map((section) => {
              const Icon = section.icon
              const isSectionActive = section.url
                ? isActive(section.url)
                : section.items?.some(i => isActive(i.url))
              const isPanelTarget = activePanel === section.key

              return (
                <Tooltip key={section.key}>
                  <TooltipTrigger asChild>
                    {section.url ? (
                      <Link
                        href={section.url}
                        onClick={() => setActivePanel(null)}
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                          isSectionActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleIconClick(section)}
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                          isPanelTarget
                            ? "bg-accent text-accent-foreground ring-1 ring-border"
                            : isSectionActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {section.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>

          {/* Bottom icons */}
          <div className="flex flex-col items-center py-2 gap-1 border-t">
            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </TooltipContent>
            </Tooltip>

            {/* Theme color picker */}
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setThemePickerOpen(!themePickerOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                  >
                    <PaletteIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Thème</TooltipContent>
              </Tooltip>
              {themePickerOpen && (
                <div className="absolute left-12 bottom-0 w-40 rounded-lg border bg-popover p-1.5 shadow-lg z-50">
                  {themes.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => { setColorTheme(t.value); setThemePickerOpen(false) }}
                      className={cn(
                        "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-colors",
                        colorTheme === t.value ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                      )}
                    >
                      <div className="flex h-3 w-5 overflow-hidden rounded-sm border">
                        <div className="flex-1" style={{ backgroundColor: t.colors[0] }} />
                        <div className="flex-1" style={{ backgroundColor: t.colors[1] }} />
                        <div className="flex-1" style={{ backgroundColor: t.colors[2] }} />
                      </div>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {navBottom.map((section) => {
              const Icon = section.icon
              const active = section.url ? isActive(section.url) : false
              return (
                <Tooltip key={section.key}>
                  <TooltipTrigger asChild>
                    <Link
                      href={section.url!}
                      onClick={() => setActivePanel(null)}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>{section.label}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>

          {/* User avatar */}
          <div className="border-t py-2 px-2">
            <NavUser user={user} compact />
          </div>
        </div>

        {/* ── Panel ────────────────────────────────────────────── */}
        {isPanelOpen && activeSectionData && (
          <div className="w-52 bg-sidebar border-r flex flex-col animate-in slide-in-from-left-2 duration-150">
            {/* Panel header */}
            <div className="flex items-center justify-between h-12 px-3 border-b">
              <span className="text-sm font-semibold">{activeSectionData.label}</span>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Panel items */}
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {activeSectionData.items!.map((item) => {
                const active = isActive(item.url)
                const ItemIcon = item.icon
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <ItemIcon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
