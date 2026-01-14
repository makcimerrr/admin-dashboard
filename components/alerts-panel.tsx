'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bell,
  BellRing,
  X,
  ChevronRight,
  Users,
  Loader2,
} from 'lucide-react';
import { Alert } from '@/app/api/alerts/route';

interface AlertsPanelProps {
  promoFilter?: string;
  compact?: boolean;
  maxAlerts?: number;
}

export default function AlertsPanel({ promoFilter, compact = false, maxAlerts }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0 });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAlerts();
    // Mettre à jour les alertes toutes les 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [promoFilter]);

  const fetchAlerts = async () => {
    try {
      const url = promoFilter
        ? `/api/alerts?promo=${encodeURIComponent(promoFilter)}`
        : '/api/alerts';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts);
        setSummary(data.summary);

        // Jouer un son si des alertes critiques existent
        if (data.summary.critical > 0 && !sessionStorage.getItem('alerts-notified')) {
          playNotificationSound();
          sessionStorage.setItem('alerts-notified', 'true');
        }
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const playNotificationSound = () => {
    // Créer un son de notification simple
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getAlertBadgeVariant = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissed((prev) => new Set(prev).add(alertId));
  };

  const visibleAlerts = alerts
    .filter((alert) => !dismissed.has(alert.id))
    .slice(0, maxAlerts);

  const hasCriticalAlerts = summary.critical > 0 || summary.high > 0;

  if (loading) {
    return (
      <Card className="border-2">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={`border-2 ${hasCriticalAlerts ? 'border-red-500/50 shadow-lg shadow-red-500/20' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasCriticalAlerts ? (
                <BellRing className="h-5 w-5 text-red-600 animate-pulse" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle className="text-lg">Alertes</CardTitle>
            </div>
            {summary.total > 0 && (
              <Badge variant={hasCriticalAlerts ? 'destructive' : 'secondary'} className="animate-pulse">
                {summary.total}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleAlerts.length > 0 ? (
            <>
              {visibleAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="pt-0.5">{getAlertIcon(alert.type)}</div>
                  {alert.studentId ? (
                    <Link href={`/student?id=${alert.studentId}`} className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate hover:text-primary">{alert.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                    </Link>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {alerts.length > (maxAlerts || 0) && (
                <Button asChild variant="link" className="w-full text-xs">
                  <Link href="/reports">
                    Voir toutes les alertes ({alerts.length - (maxAlerts || 0)} de plus)
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <div className="text-center p-4 text-sm text-muted-foreground">
              Aucune alerte pour le moment
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${hasCriticalAlerts ? 'border-red-500/50 shadow-xl shadow-red-500/20' : ''}`}>
      <CardHeader className="bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              {hasCriticalAlerts ? (
                <BellRing className="h-6 w-6 text-red-600 animate-pulse" />
              ) : (
                <Bell className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl">Alertes et Surveillance</CardTitle>
              <CardDescription>
                {summary.total > 0
                  ? `${summary.total} alerte(s) nécessitant votre attention`
                  : 'Tout est en ordre'}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {summary.critical > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {summary.critical} Critique{summary.critical > 1 ? 's' : ''}
              </Badge>
            )}
            {summary.high > 0 && (
              <Badge variant="default">{summary.high} Haute{summary.high > 1 ? 's' : ''}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {visibleAlerts.length > 0 ? (
          <div className="space-y-3">
            {visibleAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                    : alert.severity === 'high'
                    ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900'
                    : 'bg-muted/30 border-border'
                } group hover:shadow-md transition-all`}
              >
                <div className="pt-0.5">{getAlertIcon(alert.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                    </div>
                    <Badge variant={getAlertBadgeVariant(alert.severity)} className="shrink-0">
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {alert.promoKey && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {alert.promoKey}
                      </span>
                    )}
                    {alert.count && <span>• {alert.count} concerné(s)</span>}
                  </div>
                  {alert.action && (
                    <div className="flex items-center gap-2 mt-2">
                      {alert.studentId ? (
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                          <Link href={`/student?id=${alert.studentId}`}>
                            {alert.action}
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            // Fallback pour les alertes sans studentId
                            window.location.href = alert.action.includes('Voir')
                              ? '/students'
                              : '/promos/status';
                          }}
                        >
                          {alert.action}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        Ignorer
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-12">
            <Bell className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium">Aucune alerte !</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tous les étudiants progressent normalement
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
