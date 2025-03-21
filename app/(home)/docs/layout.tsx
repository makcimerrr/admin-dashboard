"use client";

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Menu,
  ExternalLink,
  Search,
  Github,
  Twitter,
  Home,
  X,
  FileText,
  BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DocsLayoutProps {
  children: React.ReactNode;
}

// Type pour les éléments de navigation
interface NavigationItem {
  title: string;
  href: string;
  description?: string;
  keywords?: string[];
  category?: string;
  isNew?: boolean;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchResults, setSearchResults] = React.useState<NavigationItem[]>([]);
  const [isSearching, setIsSearching] = React.useState<boolean>(false);

  // Données enrichies pour la navigation
  const navigationItems: NavigationItem[] = [
    {
      title: 'Introduction',
      href: '/docs/introduction',
      description: 'Présentation de l\'API et premiers pas',
      keywords: ['démarrer', 'commencer', 'overview', 'aperçu', 'présentation'],
      category: 'Général'
    },
    {
      title: 'Authentification',
      href: '/docs/authentication',
      description: 'Méthodes d\'authentification et gestion des tokens',
      keywords: ['token', 'jwt', 'oauth', 'clés api', 'sécurité'],
      category: 'Sécurité'
    },
    {
      title: 'Endpoints',
      href: '/docs/endpoints',
      description: 'Liste complète des endpoints et leur utilisation',
      keywords: ['routes', 'api', 'ressources', 'url', 'http'],
      category: 'API'
    },
    {
      title: 'SDKs & Intégrations',
      href: '/docs/sdks',
      description: 'Bibliothèques officielles et outils d\'intégration',
      keywords: ['bibliothèques', 'librairies', 'outils', 'client', 'packages'],
      category: 'Intégration'
    },
    {
      title: 'Exemples',
      href: '/docs/examples',
      description: 'Exemples de code pour les cas d\'usage courants',
      keywords: ['code', 'samples', 'tutoriels', 'guides', 'demos'],
      category: 'Ressources'
    },
    {
      title: 'Limites de taux',
      href: '/docs/rate-limits',
      description: 'Comprendre et gérer les limites de requêtes',
      keywords: ['throttling', 'quotas', 'limitations', 'requêtes'],
      category: 'API',
      isNew: true
    },
    {
      title: 'Gestion des erreurs',
      href: '/docs/error-handling',
      description: 'Codes d\'erreur et stratégies de résolution',
      keywords: ['erreurs', 'codes', 'debugging', 'résolution', 'troubleshooting'],
      category: 'API'
    },
    {
      title: 'Webhooks',
      href: '/docs/webhooks',
      description: 'Configuration et utilisation des webhooks',
      keywords: ['événements', 'callbacks', 'notifications', 'temps réel'],
      category: 'Intégration'
    },
    {
      title: 'FAQ',
      href: '/docs/faq',
      description: 'Réponses aux questions fréquemment posées',
      keywords: ['questions', 'problèmes', 'aide', 'support'],
      category: 'Support'
    }
  ];

  const resourceItems: NavigationItem[] = [
    {
      title: 'Changelog',
      href: '/docs/changelog',
      description: 'Historique des versions et nouveautés',
      keywords: ['versions', 'mises à jour', 'historique', 'nouvelles fonctionnalités']
    },
    {
      title: 'Statut de l\'API',
      href: '/docs/status',
      description: 'État actuel et incidents du service',
      keywords: ['disponibilité', 'uptime', 'performance', 'incidents', 'maintenance']
    },
    {
      title: 'Support',
      href: '/docs/support',
      description: 'Comment contacter l\'équipe de support',
      keywords: ['aide', 'contact', 'assistance', 'tickets', 'problèmes']
    }
  ];

  // Fonction pour mettre en surbrillance les termes de recherche
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim() || !text) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));

    return (
        <>
          {parts.map((part, index) =>
              part.toLowerCase() === query.toLowerCase()
                  ? <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">{part}</mark>
                  : part
          )}
        </>
    );
  };

  // Fonction de recherche améliorée
  function handleSearch(query: string) {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Recherche dans les titres, descriptions et mots-clés
    const results = [...navigationItems, ...resourceItems].filter(item => {
      const titleMatch = item.title.toLowerCase().includes(query.toLowerCase());
      const descMatch = item.description?.toLowerCase().includes(query.toLowerCase());
      const keywordsMatch = item.keywords?.some(keyword =>
          keyword.toLowerCase().includes(query.toLowerCase())
      );

      return titleMatch || descMatch || keywordsMatch;
    });

    // Trier les résultats par pertinence (titre prioritaire, puis description, puis mots-clés)
    results.sort((a, b) => {
      const aInTitle = a.title.toLowerCase().includes(query.toLowerCase());
      const bInTitle = b.title.toLowerCase().includes(query.toLowerCase());

      if (aInTitle && !bInTitle) return -1;
      if (!aInTitle && bInTitle) return 1;

      return 0;
    });

    setSearchResults(results);
  }

  function clearSearch() {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }

  // Grouper les éléments de navigation par catégorie
  const groupedNavItems: { [key: string]: NavigationItem[] } = {};
  navigationItems.forEach(item => {
    const category = item.category || 'Autre';
    if (!groupedNavItems[category]) {
      groupedNavItems[category] = [];
    }
    groupedNavItems[category].push(item);
  });

  return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link href="/docs" className="flex items-center space-x-2">
                <span className="font-bold text-xl">API Docs</span>
              </Link>
            </div>
            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
              <div className="w-full flex-1 md:w-auto md:flex-none">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                      type="search"
                      placeholder="Rechercher dans la documentation..."
                      className="w-full rounded-md border border-input bg-background pl-8 pr-10 py-2 text-sm ring-offset-background"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                  />
                  {searchQuery && (
                      <button
                          className="absolute right-2.5 top-2.5"
                          onClick={clearSearch}
                          aria-label="Effacer la recherche"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                  )}
                </div>
              </div>
              <nav className="flex items-center">
                <Link
                    href="https://github.com/makcimerrr"
                    target="_blank"
                    rel="noreferrer"
                >
                  <Button variant="ghost" size="icon">
                    <Github className="h-4 w-4" />
                    <span className="sr-only">GitHub</span>
                  </Button>
                </Link>
                <Link
                    href="https://twitter.com/makcimezerrr"
                    target="_blank"
                    rel="noreferrer"
                >
                  <Button variant="ghost" size="icon">
                    <Twitter className="h-4 w-4" />
                    <span className="sr-only">Twitter</span>
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="ml-4">
                  Dashboard
                </Button>
              </nav>
            </div>
          </div>
        </header>
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
          <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
            <div className="h-full overflow-y-auto py-6 pr-6 lg:py-8">
              <div className="space-y-4">
                {/* Menu de navigation par catégorie */}
                {Object.entries(groupedNavItems).map(([category, items]) => (
                    <div key={category} className="px-4">
                      <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                        {category}
                      </h2>
                      <div className="space-y-1">
                        {items.map((item, index) => (
                            <Link
                                key={index}
                                href={item.href}
                                className="flex w-full items-center justify-between rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"
                            >
                              <span>{item.title}</span>
                              {item.isNew && (
                                  <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                    Nouveau
                                  </Badge>
                              )}
                            </Link>
                        ))}
                      </div>
                    </div>
                ))}

                {/* Ressources */}
                <div className="px-4">
                  <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                    Ressources
                  </h2>
                  <div className="space-y-1">
                    {resourceItems.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            className="flex w-full items-center rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"
                        >
                          {item.title}
                        </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
          <main className="relative py-6 lg:py-8">
            {isSearching && searchResults.length > 0 ? (
                <div className="search-results space-y-4">
                  <h2 className="text-2xl font-bold mb-4">
                    Résultats de recherche pour "{searchQuery}"
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {searchResults.length} résultat(s) trouvé(s)
                  </p>
                  <div className="grid gap-4">
                    {searchResults.map((result, index) => (
                        <Link
                            href={result.href}
                            key={index}
                            className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-start">
                            <div className="mr-3 mt-1">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-medium flex items-center">
                                {highlightText(result.title, searchQuery)}
                                {result.isNew && (
                                    <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                      Nouveau
                                    </Badge>
                                )}
                              </h3>
                              {result.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {highlightText(result.description, searchQuery)}
                                  </p>
                              )}
                              {result.category && (
                                  <div className="mt-2 flex items-center">
                                    <BookOpen className="h-3 w-3 mr-1 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                              {highlightText(result.category, searchQuery)}
                            </span>
                                  </div>
                              )}
                              {/* Affichage des mots-clés correspondants */}
                              {result.keywords && result.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase())) && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {result.keywords
                                        .filter(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map((kw, i) => (
                                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800">
                                  {highlightText(kw, searchQuery)}
                                </span>
                                        ))}
                                  </div>
                              )}
                            </div>
                          </div>
                        </Link>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={clearSearch}>
                      Effacer la recherche
                    </Button>
                  </div>
                </div>
            ) : isSearching && searchResults.length === 0 ? (
                <div className="search-results space-y-4">
                  <h2 className="text-2xl font-bold mb-4">
                    Aucun résultat pour "{searchQuery}"
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Essayez d'autres termes de recherche ou consultez notre menu de navigation.
                  </p>
                  <Button variant="outline" size="sm" onClick={clearSearch}>
                    Effacer la recherche
                  </Button>
                </div>
            ) : (
                <div className="prose dark:prose-invert max-w-none">
                  {children}
                </div>
            )}
          </main>
        </div>
        <footer className="py-6 md:px-8 md:py-0">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Votre Entreprise. Tous droits
              réservés.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-sm text-muted-foreground">
                Conditions d'utilisation
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground">
                Politique de confidentialité
              </Link>
            </div>
          </div>
        </footer>
      </div>
  );
}