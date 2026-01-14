'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NovaLogo } from '@/components/assistant/nova-logo';
import {
  Settings as SettingsIcon,
  Database,
  Sparkles,
  Trash2,
  Download,
} from 'lucide-react';

type Conversation = {
  id: number;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export default function SettingsPage() {
  const user = useUser();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [stats, setStats] = useState({ totalConversations: 0, totalMessages: 0 });

  const userId = user?.primaryEmail || 'anonymous';

  useEffect(() => {
    if (userId && userId !== 'anonymous') {
      loadConversations();
      loadStats();
    } else {
      setIsLoadingConversations(false);
    }
  }, [userId]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleNewChat = () => {
    router.push('/assistant');
  };

  const handleDeleteConversation = async (conversationId: number) => {
    if (!confirm('Supprimer cette conversation ?')) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConversations(conversations.filter((c) => c.id !== conversationId));
        loadStats();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleDeleteAllConversations = async () => {
    if (!confirm('Supprimer TOUTES les conversations ? Cette action est irréversible.')) return;

    try {
      await Promise.all(
        conversations.map((conv) =>
          fetch(`/api/conversations/${conv.id}`, { method: 'DELETE' })
        )
      );
      setConversations([]);
      setStats({ totalConversations: 0, totalMessages: 0 });
    } catch (error) {
      console.error('Error deleting all conversations:', error);
    }
  };

  return (
    <div className="flex h-full w-full bg-background">
      <ChatSidebar
        conversations={conversations}
        isLoading={isLoadingConversations}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />

      <div className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <NovaLogo className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Paramètres Nova</h1>
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-muted-foreground">
              Gérez vos préférences et vos données
            </p>
          </div>

          <Separator />

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Statistiques d'utilisation
              </CardTitle>
              <CardDescription>
                Aperçu de votre activité sur l'assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border border-border/40 rounded-lg">
                <div className="text-2xl font-bold">{stats.totalConversations}</div>
                <div className="text-sm text-muted-foreground">Conversations</div>
              </div>
              <div className="p-4 border border-border/40 rounded-lg">
                <div className="text-2xl font-bold">{stats.totalMessages}</div>
                <div className="text-sm text-muted-foreground">Messages échangés</div>
              </div>
            </CardContent>
          </Card>

          {/* RAG Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Système RAG
              </CardTitle>
              <CardDescription>
                Retrieval-Augmented Generation pour des réponses contextuelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>RAG activé</Label>
                  <p className="text-sm text-muted-foreground">
                    Utilise vos conversations précédentes pour améliorer les réponses
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Actif
                </Badge>
              </div>
              <Separator />
              <div className="text-sm text-muted-foreground">
                Le système RAG analyse automatiquement vos conversations pour fournir des
                réponses plus pertinentes basées sur votre historique.
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Gestion des données
              </CardTitle>
              <CardDescription>
                Exportez ou supprimez vos conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exporter les conversations</Label>
                  <p className="text-sm text-muted-foreground">
                    Téléchargez toutes vos conversations au format JSON
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-destructive">Supprimer toutes les conversations</Label>
                  <p className="text-sm text-muted-foreground">
                    Cette action est irréversible
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAllConversations}
                  disabled={conversations.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Tout supprimer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NovaLogo className="h-5 w-5" />
                À propos de Nova
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Nova utilise un système de pattern matching et RAG (Retrieval-Augmented
                Generation) pour répondre à vos questions sur le suivi des étudiants.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>100% gratuit - Aucune clé API requise</li>
                <li>Données stockées localement dans votre base de données</li>
                <li>Système RAG pour des réponses contextuelles</li>
                <li>Recherche sémantique dans l'historique</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
