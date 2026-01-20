import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { novaTools } from '@/lib/chatbot/ai-tools';
import {
  createConversation,
  addMessage,
  getConversationWithMessages,
} from '@/lib/db/services/conversations';

// Permettre le streaming jusqu'à 60 secondes
export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es Nova, l'assistant IA intelligent de Zone01 Normandie, un centre de formation en informatique.

**Ton rôle :**
- Aider les administrateurs à suivre la progression des étudiants
- Répondre aux questions sur les données des étudiants
- Fournir des statistiques et analyses

**Tes capacités :**
Tu as accès à des outils pour interroger la base de données :
- Rechercher des étudiants par nom, prénom ou login
- Voir les détails complets d'un étudiant (progression, projets, troncs)
- Obtenir les statistiques globales
- Lister les étudiants par statut (en retard, validés, en avance)
- Lister les étudiants par promotion ou spécialité
- Comparer des étudiants entre eux

**Instructions :**
1. Utilise TOUJOURS les outils disponibles pour obtenir des données à jour
2. Réponds en français avec un ton professionnel mais amical
3. Structure tes réponses de manière claire avec des listes ou tableaux si pertinent
4. Si tu ne trouves pas l'information, dis-le clairement
5. Propose des suggestions de questions de suivi quand c'est pertinent

**Format de réponse :**
- Utilise du markdown pour formater (gras, listes, tableaux)
- Ajoute des emojis pertinents pour rendre les réponses plus lisibles
- Termine par des suggestions si l'utilisateur pourrait vouloir plus d'infos

**Contexte sur Zone01 :**
- Les étudiants suivent des "troncs" techniques : Golang, JavaScript, Rust ou Java
- Les statuts possibles sont : "bien" (bonne progression), "en retard", "en avance", "Validé", "spécialité"
- Les étudiants sont organisés en "promotions" (cohortes)`;

type CoreMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, conversationId, userId } = body;

    // Validation
    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'User ID requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Support pour l'ancien format (message unique) et le nouveau (tableau de messages)
    let chatMessages = messages;
    if (!Array.isArray(messages)) {
      const { message } = body;
      if (!message || typeof message !== 'string') {
        return new Response(JSON.stringify({ error: 'Message invalide' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      chatMessages = [{ role: 'user', content: message }];
    }

    // Get or create conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const firstMessage = chatMessages[chatMessages.length - 1]?.content || 'Nouvelle conversation';
      const title = typeof firstMessage === 'string'
        ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
        : 'Nouvelle conversation';
      const conversation = await createConversation(userId, title);
      currentConversationId = conversation.id;
    }

    // Récupérer l'historique des messages si conversation existante
    let fullHistory: CoreMessage[] = chatMessages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

    if (conversationId) {
      try {
        const { messages: dbMessages } = await getConversationWithMessages(conversationId);
        if (dbMessages && dbMessages.length > 0) {
          fullHistory = dbMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
          // Ajouter le nouveau message s'il n'est pas déjà dans l'historique
          const lastUserMsg = chatMessages[chatMessages.length - 1];
          if (lastUserMsg && lastUserMsg.role === 'user') {
            const lastContent = typeof lastUserMsg.content === 'string' ? lastUserMsg.content : '';
            const alreadyExists = fullHistory.some(m =>
              m.role === 'user' && m.content === lastContent
            );
            if (!alreadyExists) {
              fullHistory.push({
                role: 'user',
                content: lastContent,
              });
            }
          }
        }
      } catch (e) {
        console.log('Could not load conversation history:', e);
      }
    }

    // Sauvegarder le message utilisateur
    const lastUserMessage = chatMessages[chatMessages.length - 1];
    if (lastUserMessage?.role === 'user') {
      await addMessage(
        currentConversationId,
        'user',
        typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content)
      );
    }

    // Appeler l'IA avec streaming et tools
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      messages: fullHistory,
      tools: novaTools,
      maxToolRoundtrips: 5,
      onFinish: async ({ text }) => {
        if (text) {
          await addMessage(
            currentConversationId,
            'assistant',
            text,
            undefined,
            undefined,
            'ai_response',
            {}
          );
        }
      },
    });

    // Retourner le stream avec les headers appropriés
    return result.toAIStreamResponse({
      headers: {
        'X-Conversation-Id': String(currentConversationId),
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur lors du traitement du message', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
