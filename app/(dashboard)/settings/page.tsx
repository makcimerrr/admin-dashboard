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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const themeOptions = [
  { value: 'light', label: 'Clair', icon: Sun, description: 'Thème lumineux' },
  { value: 'dark', label: 'Sombre', icon: Moon, description: 'Thème sombre' },
  { value: 'system', label: 'Système', icon: Monitor, description: 'Suit les préférences OS' },
] as const;

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'profile';
  const { theme, setTheme } = useTheme();
  const user = useUser();
  const [mounted, setMounted] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | null>(null);

  // Load notification preferences from Stack Auth client metadata
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

  // Persist notification preferences to Stack Auth client metadata
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

  // Extract user role and planning permission
  const userRole = (user?.clientReadOnlyMetadata as Record<string, unknown>)?.role as string || 'user';
  const planningPermission = (user?.clientReadOnlyMetadata as Record<string, unknown>)?.planningPermission as string || 'reader';

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
          <Settings2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Gérez votre profil, apparence et notifications
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
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
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          {/* Role & Permissions Card */}
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

          {/* Stack Auth Account Settings */}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Thème
              </CardTitle>
              <CardDescription>
                Choisissez le thème de l'interface
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
              {/* Email notifications */}
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

              {/* Browser notifications */}
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

          {/* Info Card */}
          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
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
      </Tabs>
    </div>
  );
}
