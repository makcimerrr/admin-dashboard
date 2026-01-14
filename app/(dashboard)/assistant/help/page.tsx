'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NovaLogo } from '@/components/assistant/nova-logo';
import {
  HelpCircle,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';

type Conversation = {
  id: number;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export default function HelpPage() {
  const user = useUser();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  const userId = user?.primaryEmail || 'anonymous';

  useEffect(() => {
    if (userId && userId !== 'anonymous') {
      loadConversations();
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
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
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
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const exampleQuestions = [
    {
      category: "Statistiques",
      icon: TrendingUp,
      questions: [
        "Combien d'étudiants sont en formation ?",
        "Donne-moi les statistiques globales",
        "Quel est le taux de réussite ?",
      ],
    },
    {
      category: "Recherche",
      icon: Search,
      questions: [
        "Recherche l'étudiant Jean Dupont",
        "Trouve l'étudiant avec l'ID 42",
        "Qui est en promo normandie-1 ?",
      ],
    },
    {
      category: "Progression",
      icon: Users,
      questions: [
        "Quelle est la progression de l'étudiant #42 ?",
        "Montre-moi les étudiants en retard",
        "Liste les étudiants validés",
      ],
    },
  ];

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
              <h1 className="text-3xl font-bold">Aide & Documentation</h1>
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-muted-foreground">
              Apprenez à utiliser Nova pour le suivi des étudiants
            </p>
          </div>

          {/* Quick Start */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Démarrage rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Posez votre question</p>
                  <p className="text-sm text-muted-foreground">
                    Tapez votre question en langage naturel dans la zone de texte
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div className="space-y-1">
                  <p className="font-medium">L'assistant analyse votre question</p>
                  <p className="text-sm text-muted-foreground">
                    Le système détecte automatiquement votre intention et extrait les informations clés
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Recevez une réponse contextuelle</p>
                  <p className="text-sm text-muted-foreground">
                    L'assistant interroge la base de données et utilise le RAG pour une réponse pertinente
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Example Questions */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Exemples de questions</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {exampleQuestions.map((category) => {
                const Icon = category.icon;
                return (
                  <Card key={category.category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {category.questions.map((q, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{q}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Fonctionnalités
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">100% Gratuit</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    Aucune clé API nécessaire, tout fonctionne localement
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Système RAG</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    Utilise vos conversations passées pour des réponses contextuelles
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Recherche sémantique</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    Trouve automatiquement les informations pertinentes dans l'historique
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Historique sauvegardé</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    Toutes vos conversations sont automatiquement enregistrées
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Liens rapides</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    Accédez directement aux profils étudiants depuis les réponses
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Suggestions</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    Questions de suivi suggérées après chaque réponse
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Conseils d'utilisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">Astuce</Badge>
                <p className="text-muted-foreground">
                  Soyez précis dans vos questions pour obtenir des réponses plus pertinentes
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">Astuce</Badge>
                <p className="text-muted-foreground">
                  Utilisez les suggestions de questions pour découvrir toutes les capacités
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">Astuce</Badge>
                <p className="text-muted-foreground">
                  Le RAG s'améliore au fil de vos conversations, plus vous l'utilisez, meilleur il devient
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
