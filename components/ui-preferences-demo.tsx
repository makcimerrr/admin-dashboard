'use client';

import React from 'react';
import { useUIPreferences, ColorScheme } from '@/contexts/ui-preferences-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  SunIcon,
  MoonIcon,
  Maximize2Icon,
  MinimizeIcon,
  PaletteIcon,
  CheckCircle2Icon,
} from 'lucide-react';

/**
 * UI Preferences Demo Component
 *
 * Démontre visuellement les différents modes (density) et palettes de couleurs
 * Utile pour tester et visualiser les changements
 */
export function UIPreferencesDemo() {
  const {
    theme,
    toggleTheme,
    density,
    toggleDensity,
    colorScheme,
    setColorScheme,
  } = useUIPreferences();

  const colorSchemes: { value: ColorScheme; label: string; color: string; desc: string }[] = [
    { value: 'default', label: 'Défaut', color: '#3b82f6', desc: 'Bleu classique' },
    { value: 'blue', label: 'Bleu', color: '#0ea5e9', desc: 'Bleu océan' },
    { value: 'purple', label: 'Violet', color: '#8b5cf6', desc: 'Violet créatif' },
    { value: 'green', label: 'Vert', color: '#10b981', desc: 'Vert émeraude' },
    { value: 'orange', label: 'Orange', color: '#f59e0b', desc: 'Orange ambré' },
    { value: 'rose', label: 'Rose', color: '#f43f5e', desc: 'Rose moderne' },
    { value: 'slate', label: 'Ardoise', color: '#475569', desc: 'Gris pro' },
  ];

  const demoData = [
    { id: 1, name: 'Projet Alpha', status: 'En cours', progress: 75 },
    { id: 2, name: 'Projet Beta', status: 'Terminé', progress: 100 },
    { id: 3, name: 'Projet Gamma', status: 'En attente', progress: 30 },
    { id: 4, name: 'Projet Delta', status: 'En cours', progress: 60 },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">UI Preferences Demo</h1>
        <p className="text-muted-foreground mt-2">
          Testez et visualisez les différents modes et palettes de couleurs
        </p>
      </div>

      {/* Current Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres Actuels</CardTitle>
          <CardDescription>
            Vos préférences actives
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Theme */}
            <div>
              <label className="text-sm font-medium mb-2 block">Theme</label>
              <Button
                onClick={toggleTheme}
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </span>
                <Badge variant="secondary">Actif</Badge>
              </Button>
            </div>

            {/* Density */}
            <div>
              <label className="text-sm font-medium mb-2 block">Density</label>
              <Button
                onClick={toggleDensity}
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  {density === 'comfortable' ? (
                    <Maximize2Icon className="h-4 w-4" />
                  ) : (
                    <MinimizeIcon className="h-4 w-4" />
                  )}
                  {density === 'comfortable' ? 'Comfortable' : 'Compact'}
                </span>
                <Badge variant="secondary">Actif</Badge>
              </Button>
            </div>

            {/* Color Scheme */}
            <div>
              <label className="text-sm font-medium mb-2 block">Palette</label>
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <div
                  className="h-6 w-6 rounded-full border-2"
                  style={{
                    backgroundColor: colorSchemes.find(s => s.value === colorScheme)?.color
                  }}
                />
                <span className="font-medium capitalize">
                  {colorSchemes.find(s => s.value === colorScheme)?.label}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Schemes Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="h-5 w-5" />
            Palettes de Couleurs
          </CardTitle>
          <CardDescription>
            Cliquez sur une palette pour la tester
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.value}
                onClick={() => setColorScheme(scheme.value)}
                className={`relative p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                  colorScheme === scheme.value
                    ? 'border-current shadow-lg'
                    : 'border-transparent hover:border-gray-300'
                }`}
                style={{
                  borderColor: colorScheme === scheme.value ? scheme.color : undefined,
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="h-16 w-16 rounded-full border-4 border-current shadow-md"
                    style={{ backgroundColor: scheme.color }}
                  />
                  <div className="text-center">
                    <div className="font-semibold">{scheme.label}</div>
                    <div className="text-xs text-muted-foreground">{scheme.desc}</div>
                  </div>
                  {colorScheme === scheme.value && (
                    <Badge
                      variant="default"
                      className="absolute top-2 right-2"
                      style={{ backgroundColor: scheme.color }}
                    >
                      <CheckCircle2Icon className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visual Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buttons Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Boutons</CardTitle>
            <CardDescription>
              Voir l'impact du density sur les boutons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full">Bouton Primary</Button>
            <Button variant="secondary" className="w-full">
              Bouton Secondary
            </Button>
            <Button variant="outline" className="w-full">
              Bouton Outline
            </Button>
            <div className="flex gap-2">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Badges & Tags</CardTitle>
            <CardDescription>
              Badges avec différents variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge className="bg-green-500">Success</Badge>
              <Badge className="bg-blue-500">Info</Badge>
              <Badge className="bg-yellow-500">Warning</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Tableau de Données</CardTitle>
          <CardDescription>
            Observez la différence de hauteur des lignes selon le density
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono">{row.id}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === 'Terminé'
                          ? 'default'
                          : row.status === 'En cours'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{row.progress}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Color Variables Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Variables CSS Actives</CardTitle>
          <CardDescription>
            Couleurs de la palette {colorSchemes.find(s => s.value === colorScheme)?.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div
                className="h-20 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: 'var(--chart-accent-1)' }}
              />
              <div className="text-sm font-medium">Chart Accent 1</div>
              <code className="text-xs text-muted-foreground">var(--chart-accent-1)</code>
            </div>

            <div className="space-y-2">
              <div
                className="h-20 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: 'var(--chart-accent-2)' }}
              />
              <div className="text-sm font-medium">Chart Accent 2</div>
              <code className="text-xs text-muted-foreground">var(--chart-accent-2)</code>
            </div>

            <div className="space-y-2">
              <div
                className="h-20 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: 'var(--chart-accent-3)' }}
              />
              <div className="text-sm font-medium">Chart Accent 3</div>
              <code className="text-xs text-muted-foreground">var(--chart-accent-3)</code>
            </div>

            <div className="space-y-2">
              <div
                className="h-20 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: 'var(--chart-1)' }}
              />
              <div className="text-sm font-medium">Chart 1</div>
              <code className="text-xs text-muted-foreground">var(--chart-1)</code>
            </div>

            <div className="space-y-2">
              <div
                className="h-20 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: 'var(--chart-2)' }}
              />
              <div className="text-sm font-medium">Chart 2</div>
              <code className="text-xs text-muted-foreground">var(--chart-2)</code>
            </div>

            <div className="space-y-2">
              <div
                className="h-20 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: 'var(--chart-3)' }}
              />
              <div className="text-sm font-medium">Chart 3</div>
              <code className="text-xs text-muted-foreground">var(--chart-3)</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Density Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Différence Density</CardTitle>
          <CardDescription>
            Mode actuel: <strong className="capitalize">{density}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold mb-2">Comfortable</div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Table rows: 56px</li>
                  <li>• Card padding: 32px</li>
                  <li>• Buttons: 44px</li>
                  <li>• Font base: 17px</li>
                  <li>• Spacing: Large</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold mb-2">Compact</div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Table rows: 32px (-43%)</li>
                  <li>• Card padding: 12px (-62%)</li>
                  <li>• Buttons: 32px (-27%)</li>
                  <li>• Font base: 14px (-18%)</li>
                  <li>• Spacing: Reduced</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>💡 Astuce:</strong> Le mode Compact affiche jusqu'à <strong>40% plus de contenu</strong> à l'écran,
                parfait pour les grands tableaux de données. Le mode Comfortable est plus agréable pour la lecture prolongée.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>
            Testez les différentes combinaisons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setColorScheme('blue');
                toggleDensity();
              }}
            >
              Blue + Toggle
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setColorScheme('purple');
                toggleTheme();
              }}
            >
              Purple + Theme
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setColorScheme('green');
              }}
            >
              Green
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setColorScheme('default');
              }}
            >
              Reset Colors
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
