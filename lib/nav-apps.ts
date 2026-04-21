import {
  BarChartIcon,
  BellIcon,
  BriefcaseIcon,
  CalendarIcon,
  CalendarX2Icon,
  ClipboardCheckIcon,
  FileBarChartIcon,
  FileIcon,
  FolderArchiveIcon,
  FolderIcon,
  GlobeIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  SettingsIcon,
  SquareStackIcon,
  UserCheckIcon,
  UsersIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

export interface NavApp {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Default URL when user clicks the app icon (first item if omitted) */
  defaultUrl?: string;
  /** When defined, this app has sub-navigation (tabs). Otherwise it's a direct link. */
  items?: NavItem[];
  /** For direct-link apps without sub-nav */
  url?: string;
  /** If true, url is external (opens in new tab) */
  external?: boolean;
  /** If true, only Admin / Super Admin can see this app */
  adminOnly?: boolean;
}

export type UserRole = 'Admin' | 'Super Admin' | string;

export function isAdminRole(role: string | undefined): boolean {
  return role === 'Admin' || role === 'Super Admin';
}

export function filterAppsByRole(apps: NavApp[], role: string | undefined): NavApp[] {
  if (isAdminRole(role)) return apps;
  return apps.filter((a) => !a.adminOnly);
}

/** Main apps in the launcher-style sidebar */
export const NAV_APPS: NavApp[] = [
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboardIcon,
    url: '/',
    adminOnly: true,
  },
  {
    key: 'pedagogie',
    label: 'Pédagogie',
    icon: GraduationCapIcon,
    defaultUrl: '/students',
    adminOnly: true,
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
    defaultUrl: '/planning',
    adminOnly: true,
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
    defaultUrl: '/01deck',
    adminOnly: true,
    items: [
      { title: '01 Deck', url: '/01deck', icon: LayoutGridIcon },
      { title: 'Word Assistant', url: '/word_assistant', icon: FileIcon },
    ],
  },
  {
    key: '01deck-app',
    label: '01 Deck',
    icon: SquareStackIcon,
    url: 'https://01deck.zone01rouennormandie.org/',
    external: true,
  },
  {
    key: 'intra',
    label: 'Intra',
    icon: GlobeIcon,
    url: 'https://intra.zone01rouennormandie.org/',
    external: true,
  },
  {
    key: 'emargement',
    label: 'Émargement',
    icon: UserCheckIcon,
    url: 'https://emargement.zone01rouennormandie.org/',
    external: true,
  },
];

/** Bottom nav (config, settings) — always direct links */
export const NAV_BOTTOM: NavApp[] = [
  { key: 'config', label: 'Configuration', icon: FolderIcon, url: '/config', adminOnly: true },
  { key: 'settings', label: 'Paramètres', icon: SettingsIcon, url: '/settings' },
];

/** Check if a path matches a nav item (exact or deeper) */
export function pathMatches(pathname: string, url: string): boolean {
  if (url === '/') return pathname === '/';
  return pathname === url || pathname.startsWith(url + '/');
}

/** Find the app whose items best match the current pathname */
export function findActiveApp(pathname: string): NavApp | null {
  // For direct-URL internal apps (no sub-items), match by url
  for (const app of NAV_APPS) {
    if (app.external) continue;
    if (app.url && pathMatches(pathname, app.url)) {
      // Only the dashboard "/" is a direct app currently; avoid swallowing deeper routes
      if (app.url === '/' && pathname !== '/') continue;
      return app;
    }
  }
  // For apps with sub-items, match if any item matches
  for (const app of NAV_APPS) {
    if (app.items?.some(i => pathMatches(pathname, i.url))) {
      return app;
    }
  }
  return null;
}

/** Find the active sub-item within an app, picking the deepest match */
export function findActiveItem(app: NavApp, pathname: string): NavItem | null {
  if (!app.items) return null;
  let best: NavItem | null = null;
  for (const item of app.items) {
    if (pathMatches(pathname, item.url)) {
      if (!best || item.url.length > best.url.length) best = item;
    }
  }
  return best;
}
