'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@stackframe/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BrainCircuit, Database, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type ConversationStats = {
  totalConversations: number;
  totalMessages: number;
};

/**
 * Nova-specific user settings, mounted as a tab on /settings. Extracted
 * from the standalone /assistant/settings page so users don't need a
 * dedicated route for this sparse config.
 */
export function NovaSettingsTab() {
  const user = useUser();
  const userId = user?.primaryEmail || 'anonymous';
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = async () => {
    if (!userId || userId === 'anonymous') {
      setStats({ totalConversations: 0, totalMessages: 0 });
      return;
    }
    try {
      const res = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data?.success && data.stats) setStats(data.stats);
      else setStats({ totalConversations: 0, totalMessages: 0 });
    } catch {
      setStats({ totalConversations: 0, totalMessages: 0 });
    }
  };

  useEffect(() => {
    refresh();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      const conversations = data?.success ? data.conversations ?? [] : [];
      await Promise.all(
        conversations.map((c: { id: number }) =>
          fetch(`/api/conversations/${c.id}`, { method: 'DELETE' }),
        ),
      );
      setStats({ totalConversations: 0, totalMessages: 0 });
      toast.success('Conversations supprimées');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Statistiques d&apos;utilisation
          </CardTitle>
          <CardDescription>Votre activité sur l&apos;assistant Nova.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-lg">
            {stats === null ? (
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold tabular-nums">
                {stats.totalConversations}
              </div>
            )}
            <div className="text-sm text-muted-foreground mt-1">Conversations</div>
          </div>
          <div className="p-4 border rounded-lg">
            {stats === null ? (
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold tabular-nums">{stats.totalMessages}</div>
            )}
            <div className="text-sm text-muted-foreground mt-1">Messages échangés</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Système RAG
          </CardTitle>
          <CardDescription>
            Retrieval-Augmented Generation pour des réponses contextuelles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>RAG activé</Label>
              <p className="text-sm text-muted-foreground">
                Nova utilise vos conversations précédentes pour améliorer ses réponses.
              </p>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3 w-3" />
              Actif
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gestion des données
          </CardTitle>
          <CardDescription>Supprimer toutes vos conversations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-destructive">Tout supprimer</Label>
              <p className="text-sm text-muted-foreground">
                Cette action est irréversible.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting || !stats || stats.totalConversations === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Tout supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer toutes les conversations ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Toutes vos conversations avec Nova seront définitivement supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            À propos de Nova
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Nova combine pattern-matching et RAG pour répondre aux questions sur le
            suivi pédagogique. Aucune clé API externe n&apos;est nécessaire — vos
            données restent dans la base.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Recherche sémantique dans l&apos;historique</li>
            <li>Réponses contextuelles via RAG</li>
            <li>Suggestions de follow-up</li>
          </ul>
          <Separator className="my-3" />
          <p className="text-xs">
            Pour démarrer une conversation, ouvre l&apos;assistant depuis la sidebar
            ou la bulle flottante en bas à droite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
