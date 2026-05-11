"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"
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
import {
  IconZone01Logo,
  IconSun,
  IconMoon,
  IconPalette,
} from "@/components/icons/zone-apps"

import {
  NAV_APPS,
  NAV_BOTTOM,
  findActiveApp,
  pathMatches,
  filterAppsByRole,
  type NavApp,
} from "@/lib/nav-apps"

const STORAGE_KEY = 'app-sidebar-expanded'
const COLLAPSED_W = 'w-16'
const EXPANDED_W = 'md:w-52'

// ─── Theme picker config ────────────────────────────────────────────────────

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

// ─── Sub-components ─────────────────────────────────────────────────────────

function NavRow({
  icon: Icon,
  label,
  href,
  external,
  active,
  expanded,
  onActivate,
}: {
  icon: NavApp['icon']
  label: string
  href: string
  external?: boolean
  active: boolean
  expanded: boolean
  onActivate?: () => void
}) {
  const baseClasses = cn(
    'relative flex items-center h-10 rounded-lg transition-colors group/item',
    expanded ? 'w-full px-2.5 gap-2.5' : 'w-10 justify-center mx-auto',
    active
      ? 'bg-primary/15 text-foreground'
      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
  )

  const content = (
    <>
      {active && (
        <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon className={cn('shrink-0', expanded ? 'h-5 w-5' : 'h-5 w-5')} />
      {expanded && (
        <>
          <span className={cn('text-[13px] truncate flex-1', active && 'font-medium text-foreground')}>
            {label}
          </span>
          {external && (
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">↗</span>
          )}
        </>
      )}
    </>
  )

  const inner = expanded ? (
    content
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center">{content}</span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}{external && ' ↗'}
      </TooltipContent>
    </Tooltip>
  )

  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={baseClasses}
      onClick={onActivate}
    >
      {inner}
    </a>
  ) : (
    <Link href={href} className={baseClasses} onClick={onActivate}>
      {inner}
    </Link>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AppSidebar({ user }: { user?: User | null }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useUIPreferences()
  const [themePickerOpen, setThemePickerOpen] = React.useState(false)
  const isDark = theme === 'dark'

  // Expand/collapse state — persisted, collapsed by default
  const [expanded, setExpanded] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    setExpanded(window.localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, String(expanded))
  }, [expanded])
  // Escape closes the menu
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const mainApps = filterAppsByRole(NAV_APPS, user?.role)
  const bottomApps = filterAppsByRole(NAV_BOTTOM, user?.role)
  const activeApp = findActiveApp(pathname)

  const isAppActive = (app: NavApp) => {
    if (app.url) return pathMatches(pathname, app.url) && (app.url !== '/' || pathname === '/')
    return activeApp?.key === app.key
  }

  // Split apps: internal (admin) on top, external (cross-app Zone01) at bottom
  const internalApps = mainApps.filter((a) => !a.external)
  const externalApps = mainApps.filter((a) => a.external)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border shrink-0',
          'transition-[width] duration-200 ease-out',
          expanded ? EXPANDED_W : COLLAPSED_W
        )}
      >
        {/* Logo — toggles expanded */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Réduire le menu' : 'Développer le menu'}
          className={cn(
            'group/logo flex items-center h-12 border-b border-sidebar-border shrink-0',
            'bg-primary text-primary-foreground',
            'transition-all duration-200',
            expanded ? 'px-3 gap-2.5 justify-start' : 'justify-center'
          )}
        >
          <IconZone01Logo size={20} />
          {expanded && (
            <span className="text-sm font-bold tracking-tight">Zone01</span>
          )}
        </button>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5">
          {internalApps.length > 0 && (
            <>
              {expanded && (
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 px-2 pt-1 pb-1.5">
                  Outils admin
                </p>
              )}
              {internalApps.map((app) => (
                <NavRow
                  key={app.key}
                  icon={app.icon}
                  label={app.label}
                  href={app.url ?? app.defaultUrl ?? '#'}
                  active={isAppActive(app)}
                  expanded={expanded}
                />
              ))}
            </>
          )}

          {externalApps.length > 0 && (
            <>
              <div className="my-2 h-px bg-sidebar-border mx-1" />
              {expanded && (
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 px-2 pt-1 pb-1.5">
                  Outils Zone01
                </p>
              )}
              {externalApps.map((app) => (
                <NavRow
                  key={app.key}
                  icon={app.icon}
                  label={app.label}
                  href={app.url ?? '#'}
                  external
                  active={false}
                  expanded={expanded}
                />
              ))}
            </>
          )}
        </nav>

        {/* Bottom: theme tools + admin nav */}
        <div className="border-t border-sidebar-border py-2 px-2 space-y-0.5">
          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={cn(
                  'flex items-center h-9 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors',
                  expanded ? 'w-full px-2.5 gap-2.5' : 'w-10 justify-center mx-auto'
                )}
              >
                {isDark ? <IconSun size={16} className="shrink-0" /> : <IconMoon size={16} className="shrink-0" />}
                {expanded && <span className="text-[12px] flex-1 text-left">{isDark ? 'Mode clair' : 'Mode sombre'}</span>}
              </button>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right" sideOffset={8}>
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </TooltipContent>
            )}
          </Tooltip>

          {/* Theme color picker */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setThemePickerOpen((v) => !v)}
                  className={cn(
                    'flex items-center h-9 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors',
                    expanded ? 'w-full px-2.5 gap-2.5' : 'w-10 justify-center mx-auto'
                  )}
                >
                  <IconPalette size={16} className="shrink-0" />
                  {expanded && <span className="text-[12px] flex-1 text-left">Thème</span>}
                  {expanded && (() => {
                    const c = themes.find((t) => t.value === colorTheme)?.colors
                    return c ? (
                      <div className="flex h-3 w-5 overflow-hidden rounded-sm border border-border/60">
                        <div className="flex-1" style={{ backgroundColor: c[0] }} />
                        <div className="flex-1" style={{ backgroundColor: c[1] }} />
                        <div className="flex-1" style={{ backgroundColor: c[2] }} />
                      </div>
                    ) : null
                  })()}
                </button>
              </TooltipTrigger>
              {!expanded && <TooltipContent side="right" sideOffset={8}>Thème</TooltipContent>}
            </Tooltip>
            {themePickerOpen && (
              <div className="absolute left-full bottom-0 ml-2 w-40 rounded-lg border bg-popover p-1.5 shadow-lg z-50">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setColorTheme(t.value); setThemePickerOpen(false) }}
                    className={cn(
                      'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-colors',
                      colorTheme === t.value ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
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

          {/* Admin bottom nav (Config / Settings) */}
          {bottomApps.map((app) => (
            <NavRow
              key={app.key}
              icon={app.icon}
              label={app.label}
              href={app.url ?? '#'}
              active={app.url ? pathMatches(pathname, app.url) : false}
              expanded={expanded}
            />
          ))}
        </div>

        {/* User footer */}
        <div className={cn(
          'border-t border-sidebar-border flex items-center',
          expanded ? 'px-2 py-2 gap-2' : 'py-2 justify-center'
        )}>
          <NavUser user={user} compact={!expanded} />
          {expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Réduire le menu"
              className="h-7 w-7 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center justify-center shrink-0"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
