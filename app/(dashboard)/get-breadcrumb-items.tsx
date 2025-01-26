'use client';

import { usePathname, useSearchParams } from 'next/navigation';
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

export function DashboardBreadcrumb() {
  const pathname = usePathname(); // Récupérer le chemin actuel
  const searchParams = useSearchParams(); // Récupérer les paramètres de requête

  // Fonction utilitaire pour formater les titres
  const formatTitle = (segment: string) => {
    const exceptions: { [key: string]: string } = {
      '01deck': '01Deck', // Cas particulier
    };

    return exceptions[segment.toLowerCase()] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  // Récupérer les informations pertinentes depuis les paramètres de l'URL
  const promo = searchParams.get('promo'); // Par exemple "P1 2024"

  // Divise le chemin en segments
  const pathSegments = pathname.split('/').filter(Boolean);

  // Construit dynamiquement les éléments du breadcrumb
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    return {
      title: formatTitle(segment),
      href: path,
      isCurrent: false,
    };
  });

  // Ajouter le dernier élément pour le paramètre "promo" s'il existe
  if (promo) {
    breadcrumbItems.push({
      title: promo,
      href: `${pathname}?promo=${encodeURIComponent(promo)}`, // Garde les paramètres dans l'URL
      isCurrent: true,
    });
  } else if (breadcrumbItems.length > 0) {
    // Marquer le dernier élément comme courant si "promo" est manquant
    breadcrumbItems[breadcrumbItems.length - 1].isCurrent = true;
  }

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isCurrent ? (
                <BreadcrumbPage>{item.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.title}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}