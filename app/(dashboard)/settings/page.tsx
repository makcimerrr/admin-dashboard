'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useUser } from '@stackframe/stack';
import { AccountSettings } from '@stackframe/stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Settings2,
  User,
  Palette,
  Bell,
  Sun,
  Moon,
  Monitor,
  Shield,
  CalendarClock,
  Mail,
  BellRing,
  Info,
  LayoutGrid,
  Rows3,
  BrainCircuit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIPreferences, type Density } from '@/contexts/ui-preferences-context';
import { PageHeader } from '@/components/page-header';
import { NovaSettingsTab } from '@/components/settings/nova-settings-tab';

const themeOptions = [
  { value: 'light', label: 'Clair', icon: Sun, description: 'Thème lumineux' },
  { value: 'dark', label: 'Sombre', icon: Moon, description: 'Thème sombre' },
  { value: 'system', label: 'Système', icon: Monitor, description: 'Suit les préférences OS' },
] as const;

const densityOptions: { value: Density; label: string; icon: typeof LayoutGrid; description: string }[] = [
  { value: 'comfort', label: 'Confort', icon: LayoutGrid, description: 'Espacement standard, lisibilité maximale' },
  { value: 'compact', label: 'Dense', icon: Rows3, description: 'Plus de contenu visible à l\'écran' },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  // Reflect `?tab=` directly so navigation to /settings?tab=nova from
  // anywhere in the app switches the active tab (not just on first mount).
  const tabFromUrl = searchParams.get('tab') ?? 'profile';
  const { theme, setTheme } = useTheme();
  const user = useUser();
  const { density, setDensity } = useUIPreferences();
  const [mounted, setMounted] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
    if (user?.clientMetadata) {
      const meta = user.clientMetadata as Record<string, unknown>;
      if (typeof meta.emailNotifications === 'boolean') {
        setEmailNotifications(meta.emailNotifications);
      }
      if (typeof meta.browserNotifications === 'boolean') {
        setBrowserNotifications(meta.browserNotifications);
      }
    }
  }, [user]);

  const updateNotificationPref = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      const currentMeta = (user.clientMetadata ?? {}) as Record<string, unknown>;
      await user.update({
        clientMetadata: {
          ...currentMeta,
          [key]: value,
        } as any,
      });
    } catch (error) {
      console.error('Failed to update notification preference:', error);
    }
  };

  const handleEmailToggle = (checked: boolean) => {
    setEmailNotifications(checked);
    updateNotificationPref('emailNotifications', checked);
  };

  const handleBrowserToggle = async (checked: boolean) => {
    if (checked && typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission !== 'granted') {
        return;
      }
    }
    setBrowserNotifications(checked);
    updateNotificationPref('browserNotifications', checked);
  };

  const userRole = (user?.clientReadOnlyMetadata as Record<string, unknown>)?.role as string || 'user';
  const planningPermission = (user?.clientReadOnlyMetadata as Record<string, unknown>)?.planningPermission as string || 'reader';

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
      <PageHeader icon={Settings2} title="Paramètres" description="Préférences utilisateur" />

      {/* Tabs */}
      <Tabs key={tabFromUrl} defaultValue={tabFromUrl} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[640px]">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apparence</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="nova" className="gap-2">
            <BrainCircuit className="h-4 w-4" />
            <span className="hidden sm:inline">Nova</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Rôle & Permissions
              </CardTitle>
              <CardDescription>
                Vos permissions sont gérées par un administrateur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Rôle</span>
                  </div>
                  <Badge variant={userRole === 'Admin' || userRole === 'Super Admin' ? 'default' : 'secondary'}>
                    {userRole}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Planning</span>
                  </div>
                  <Badge variant={planningPermission === 'editor' ? 'default' : 'secondary'}>
                    {planningPermission}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Compte
              </CardTitle>
              <CardDescription>
                Gérez vos informations personnelles, email et sécurité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountSettings fullPage={false} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="mt-6 space-y-6">
          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Thème
              </CardTitle>
              <CardDescription>
                Choisissez le thème de l&apos;interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {mounted && themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all',
                        'hover:border-primary/50 hover:bg-accent/50',
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border'
                      )}
                    >
                      <div className={cn(
                        'p-3 rounded-full',
                        isActive ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        <Icon className={cn(
                          'h-6 w-6',
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          'font-medium',
                          isActive ? 'text-primary' : 'text-foreground'
                        )}>
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Density */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rows3 className="h-5 w-5 text-primary" />
                Densité d&apos;affichage
              </CardTitle>
              <CardDescription>
                Ajustez l&apos;espacement des éléments de l&apos;interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {densityOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = density === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setDensity(option.value)}
                      className={cn(
                        'flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all',
                        'hover:border-primary/50 hover:bg-accent/50',
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border'
                      )}
                    >
                      <div className={cn(
                        'p-3 rounded-full',
                        isActive ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        <Icon className={cn(
                          'h-6 w-6',
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          'font-medium',
                          isActive ? 'text-primary' : 'text-foreground'
                        )}>
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Préférences de notifications
              </CardTitle>
              <CardDescription>
                Configurez comment vous souhaitez recevoir les notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <Label htmlFor="email-notifs" className="text-sm font-medium">
                      Notifications par email
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Recevez les alertes et résumés par email
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-notifs"
                  checked={emailNotifications}
                  onCheckedChange={handleEmailToggle}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <BellRing className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <Label htmlFor="browser-notifs" className="text-sm font-medium">
                      Notifications navigateur
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Recevez des notifications push dans votre navigateur
                    </p>
                    {browserPermission === 'denied' && (
                      <p className="text-xs text-destructive mt-1">
                        Les notifications sont bloquées dans votre navigateur. Modifiez les paramètres de votre navigateur pour les activer.
                      </p>
                    )}
                  </div>
                </div>
                <Switch
                  id="browser-notifs"
                  checked={browserNotifications}
                  onCheckedChange={handleBrowserToggle}
                  disabled={browserPermission === 'denied'}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30 bg-blue-500/10">
            <CardContent className="flex items-start gap-3 pt-6">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  À propos des notifications
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Les notifications vous informent des nouvelles revues de code, des mises à jour de planning
                  et des événements importants. Vous pouvez modifier ces préférences à tout moment.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nova Tab */}
        <TabsContent value="nova" className="mt-6">
          <NovaSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
