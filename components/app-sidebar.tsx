"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowUpCircleIcon,
  MoonIcon,
  SunIcon,
  PaletteIcon,
} from "lucide-react"
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
import { NAV_APPS, NAV_BOTTOM, findActiveApp, pathMatches, filterAppsByRole, type NavApp } from "@/lib/nav-apps"

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

type User = {
  id?: string
  name?: string
  email?: string
  image?: string
  role?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AppSidebar({ user }: { user?: User | null }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useUIPreferences()
  const [themePickerOpen, setThemePickerOpen] = React.useState(false)
  const isDark = theme === 'dark'

  const mainApps = filterAppsByRole(NAV_APPS, user?.role)
  const bottomApps = filterAppsByRole(NAV_BOTTOM, user?.role)
  const activeApp = findActiveApp(pathname)

  const isAppActive = (app: NavApp) => {
    if (app.url) return pathMatches(pathname, app.url) && (app.url !== '/' || pathname === '/')
    return activeApp?.key === app.key
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col w-14 bg-sidebar border-r shrink-0">
        {/* Logo */}
        <div className="flex items-center justify-center h-12 border-b">
          <a href="https://zone01rouennormandie.org/" className="text-primary hover:opacity-80 transition-opacity">
            <ArrowUpCircleIcon className="h-5 w-5" />
          </a>
        </div>

        {/* Main app icons */}
        <div className="flex-1 flex flex-col items-center py-2 gap-1">
          {mainApps.map((app) => {
            const Icon = app.icon
            const active = isAppActive(app)
            const href = app.url ?? app.defaultUrl ?? '#'
            const className = cn(
              "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )

            return (
              <Tooltip key={app.key}>
                <TooltipTrigger asChild>
                  {app.external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
                      <Icon className="h-5 w-5" />
                    </a>
                  ) : (
                    <Link href={href} className={className}>
                      <Icon className="h-5 w-5" />
                    </Link>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {app.label}
                  {app.external && <span className="ml-1 opacity-60">↗</span>}
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

          {bottomApps.map((app) => {
            const Icon = app.icon
            const active = app.url ? pathMatches(pathname, app.url) : false
            return (
              <Tooltip key={app.key}>
                <TooltipTrigger asChild>
                  <Link
                    href={app.url!}
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
                <TooltipContent side="right" sideOffset={8}>{app.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* User avatar */}
        <div className="border-t py-2 px-2">
          <NavUser user={user} compact />
        </div>
      </div>
    </TooltipProvider>
  )
}
