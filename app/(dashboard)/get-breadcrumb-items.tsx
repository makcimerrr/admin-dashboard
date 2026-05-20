'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import React from 'react';

/**
 * Friendly French labels for known path segments. Anything missing falls
 * back to the raw value with the first letter capitalised.
 */
const SEGMENT_LABELS: Record<string, string> = {
  'code-reviews': 'Code Reviews',
  suivi: 'Suivi',
  group: 'Groupes',
  audit: 'Audit',
  overview: 'Vue d’ensemble',
  students: 'Étudiants',
  specialties: 'Spécialités',
  alternants: 'Alternants',
  analytics: 'Analytics',
  planning: 'Planning',
  absences: 'Absences',
  extraction: 'Extraction',
  employees: 'Employés',
  history: 'Historique',
  promos: 'Promos',
  manage: 'Gestion',
  '01deck': '01 Deck',
  word_assistant: 'Word Assistant',
  events: 'Événements',
  templates: 'Modèles',
  calendar: 'Calendrier',
  new: 'Nouveau',
  edit: 'Modifier',
  assistant: 'Assistant',
  settings: 'Paramètres',
  config: 'Configuration',
  help: 'Aide',
  account: 'Compte',
};

/**
 * Dynamic-segment heuristics: when we hit a path part that's purely numeric
 * (a promo or student or group id) we display a parent-context label
 * instead of the raw id. This avoids the user seeing breadcrumbs like
 * "Code Reviews › 904 › Group › 9305".
 */
const DYNAMIC_SEGMENT_LABEL_BY_PARENT: Record<string, string> = {
  'code-reviews': 'Promo',
  group: 'Groupe',
  students: 'Étudiant',
  events: 'Événement',
  templates: 'Modèle',
  assistant: 'Conversation',
};

function isDynamicId(segment: string): boolean {
  // Numeric, UUID-like, or long hex hash — anything that's an id rather than a friendly route.
  if (/^[0-9]+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f-]+$/i.test(segment)) return true;
  if (/^[0-9a-z_-]{20,}$/i.test(segment)) return true;
  return false;
}

function labelForSegment(segment: string, parent: string | undefined): string {
  if (isDynamicId(segment) && parent) {
    return DYNAMIC_SEGMENT_LABEL_BY_PARENT[parent] ?? '#' + segment.slice(0, 6);
  }
  const mapped = SEGMENT_LABELS[segment.toLowerCase()];
  if (mapped) return mapped;
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Root-level pages don't need breadcrumbs — the page title is enough.
  if (segments.length === 0) return null;

  const items = segments.map((seg, i) => {
    const parent = i > 0 ? segments[i - 1] : undefined;
    return {
      label: labelForSegment(seg, parent),
      href: '/' + segments.slice(0, i + 1).join('/'),
      isCurrent: i === segments.length - 1,
    };
  });

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Tableau de bord</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item) => (
          <React.Fragment key={item.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isCurrent ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
