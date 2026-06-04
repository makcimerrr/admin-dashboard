"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"
import { useTheme } from "next-themes"
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
    'relative flex items-center h-9 rounded-md transition-colors group/item',
    expanded ? 'w-full px-2.5 gap-3' : 'w-9 justify-center mx-auto',
    active
      ? 'bg-sidebar-accent text-sidebar-primary'
      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
  )

  const content = (
    <>
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {expanded && (
        <>
          <span className={cn('text-[13px] truncate flex-1', active && 'font-medium')}>
            {label}
          </span>
          {external && (
            <span className="text-[10px] text-sidebar-foreground/60">↗</span>
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
            'group/logo flex items-center h-14 border-b border-sidebar-border shrink-0',
            'text-sidebar-foreground hover:bg-sidebar-accent/50',
            'transition-all duration-200',
            expanded ? 'px-3.5 gap-2.5 justify-start' : 'justify-center'
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
            <IconZone01Logo size={18} />
          </span>
          {expanded && (
            <span className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">Zone01</span>
          )}
        </button>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-0.5">
          {internalApps.length > 0 && (
            <>
              {expanded && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50 px-2 pt-1 pb-2">
                  Onglets
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
              <div className="my-3 h-px bg-sidebar-border mx-1" />
              {expanded && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50 px-2 pt-1 pb-2">
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
        <div className="border-t border-sidebar-border py-2 px-2.5 space-y-0.5">
          {expanded && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50 px-2 pt-1 pb-2">
              Préférences
            </p>
          )}
          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={cn(
                  'flex items-center h-9 rounded-md text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors',
                  expanded ? 'w-full px-2.5 gap-3' : 'w-9 justify-center mx-auto'
                )}
              >
                {isDark ? <IconSun size={18} className="shrink-0" /> : <IconMoon size={18} className="shrink-0" />}
                {expanded && <span className="text-[13px] flex-1 text-left">{isDark ? 'Mode clair' : 'Mode sombre'}</span>}
              </button>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right" sideOffset={8}>
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </TooltipContent>
            )}
          </Tooltip>

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
              className="h-7 w-7 rounded-md border border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60 transition-colors flex items-center justify-center shrink-0"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
