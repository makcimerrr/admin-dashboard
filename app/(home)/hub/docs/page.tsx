// app/(home)/docs/page.tsx
import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocsPage() {
  const categories = [
    {
      title: 'Premiers pas',
      description: 'Découvrez les bases pour commencer à utiliser notre API.',
      links: [
        { title: 'Introduction', href: '/hub/docs/introduction' },
        { title: 'Authentification', href: '/hub/docs/authentication' },
        { title: 'Exemples rapides', href: '/hub/docs/quickstart' },
      ]
    },
    {
      title: 'Guides',
      description: 'Guides détaillés pour intégrer et utiliser notre API.',
      links: [
        { title: 'Gestion des ressources', href: '/hub/docs/resources' },
        { title: 'Pagination', href: '/hub/docs/pagination' },
        { title: 'Gestion des erreurs', href: '/hub/docs/errors' },
      ]
    },
    {
      title: 'Référence API',
      description: 'Documentation technique complète de tous les endpoints.',
      links: [
        { title: 'Endpoints', href: '/hub/docs/endpoints' },
        { title: 'Objets', href: '/hub/docs/objects' },
        { title: 'Webhooks', href: '/hub/docs/webhooks' },
      ]
    },
  ];

  return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 hover:bg-blue-700">API</Badge>
            <Badge variant="outline">v1.0</Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Documentation de l'API
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400">
            Guide complet pour intégrer et utiliser notre API REST
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.links.map((link, j) => (
                        <li key={j}>
                          <Link
                              href={link.href}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            {link.title}
                          </Link>
                        </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={category.links[0].href}>Voir {category.title}</Link>
                  </Button>
                </CardFooter>
              </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Versions de l'API</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center">
                  v1.0
                  <Badge className="ml-2 bg-green-600 hover:bg-green-700">Active</Badge>
                </h3>
                <p className="text-sm text-gray-500 mt-1">Fin de support : Décembre 2026</p>
                <p className="mt-2">Version stable et complète de notre API.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center">
                  v2.0
                  <Badge className="ml-2" variant="outline">Beta</Badge>
                </h3>
                <p className="text-sm text-gray-500 mt-1">En cours de développement</p>
                <p className="mt-2">Version en développement avec de nouvelles fonctionnalités.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Besoin d'aide ?</CardTitle>
            <CardDescription>
              Nous sommes là pour vous aider à intégrer notre API.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-between" asChild>
              <Link href="/hub/docs/faq">
                FAQ
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="justify-between" asChild>
              <Link href="/hub/docs/community">
                Communauté
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="justify-between" asChild>
              <Link href="/hub/docs/support">
                Support technique
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
  );
}