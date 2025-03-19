// app/(home)/docs/layout.tsx
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
    Home
} from 'lucide-react';

interface DocsLayoutProps {
    children: React.ReactNode;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
    const navigationItems = [
        { title: 'Introduction', href: '/docs/introduction' },
        { title: 'Authentification', href: '/docs/authentication' },
        { title: 'Endpoints', href: '/docs/endpoints' },
        { title: 'SDKs & Intégrations', href: '/docs/sdks' },
        { title: 'Exemples', href: '/docs/examples' },
        { title: 'FAQ', href: '/docs/faq' },
    ];

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 flex">
                        <Link href="/" className="flex items-center space-x-2">
                            <span className="font-bold text-xl">API Docs</span>
                        </Link>
                    </div>
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        <div className="w-full flex-1 md:w-auto md:flex-none">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="search"
                                    placeholder="Rechercher..."
                                    className="w-full rounded-md border border-input bg-background pl-8 py-2 text-sm ring-offset-background"
                                />
                            </div>
                        </div>
                        <nav className="flex items-center">
                            <Link href="https://github.com" target="_blank" rel="noreferrer">
                                <Button variant="ghost" size="icon">
                                    <Github className="h-4 w-4" />
                                    <span className="sr-only">GitHub</span>
                                </Button>
                            </Link>
                            <Link href="https://twitter.com" target="_blank" rel="noreferrer">
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
                    <div className="h-full py-6 pr-6 lg:py-8">
                        <div className="space-y-4">
                            <div className="px-4">
                                <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                                    Documentation
                                </h2>
                                <div className="space-y-1">
                                    {navigationItems.map((item, index) => (
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
                            <div className="px-4">
                                <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                                    Ressources
                                </h2>
                                <div className="space-y-1">
                                    <Link
                                        href="/docs/changelog"
                                        className="flex w-full items-center rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"
                                    >
                                        Changelog
                                    </Link>
                                    <Link
                                        href="/docs/status"
                                        className="flex w-full items-center rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"
                                    >
                                        Statut de l'API
                                    </Link>
                                    <Link
                                        href="/docs/support"
                                        className="flex w-full items-center rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"
                                    >
                                        Support
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
                <main className="relative py-6 lg:py-8">
                    <div className="prose dark:prose-invert max-w-none">
                        {children}
                    </div>
                </main>
            </div>
            <footer className="py-6 md:px-8 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Votre Entreprise. Tous droits réservés.
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