import { createGroq } from '@ai-sdk/groq';
import { streamText, generateText } from 'ai';
import { novaTools } from '@/lib/chatbot/ai-tools';
import {
  createConversation,
  addMessage,
  getConversationWithMessages,
  updateConversationTitle
} from '@/lib/db/services/conversations';

// Initialiser Groq (gratuit et rapide)
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Prompt système détaillé pour Nova
const SYSTEM_PROMPT = `Tu es Nova, l'assistant IA intelligent du dashboard de gestion des étudiants de Zone01 Rouen.

## Ton rôle
Tu aides les administrateurs et formateurs à obtenir des informations sur les étudiants, leurs projets et leur progression. Tu peux accéder à toutes les données de la base de données via les outils à ta disposition.

## Contexte de conversation
Tu as accès à l'historique de la conversation. Utilise-le pour :
- Comprendre les références comme "lui", "elle", "cet étudiant", "le même", etc.
- Répondre à des questions de suivi ("et son projet ?", "combien parmi eux ?")
- Éviter de redemander des informations déjà données
- Faire des comparaisons avec des données précédemment mentionnées

## Données disponibles
- **Étudiants**: nom, prénom, login, promotion, date de disponibilité
- **Projets**: projet actuel, statut de progression, niveau de retard (en retard, bien, en avance, Validé, Non Validé, spécialité)
- **Filières**: Golang, JavaScript, Rust, Java - avec projet actuel et statut de complétion pour chaque
- **Promotions**: liste des promos avec leurs étudiants

## Niveaux de retard
- "en retard" = l'étudiant est en retard sur ses projets
- "bien" = l'étudiant est à jour, progresse normalement
- "en avance" = l'étudiant est en avance sur le programme
- "Validé" = l'étudiant a validé son parcours
- "Non Validé" = l'étudiant n'a pas validé
- "spécialité" = l'étudiant est en phase de spécialité

## Comment répondre

1. **Questions sur un étudiant spécifique** ("Est-ce que X est à jour ?", "Infos sur Y"):
   - Utilise d'abord \`checkStudentProgress\` ou \`getStudentByName\` avec le nom complet
   - Donne une réponse claire et synthétique

2. **Questions de suivi** ("Et son projet Golang ?", "Il est dans quelle promo ?"):
   - Utilise le contexte de la conversation pour identifier l'étudiant mentionné
   - Pas besoin de redemander qui est concerné

3. **Listes d'étudiants** ("Qui est en retard ?", "Liste des validés"):
   - Utilise \`listStudentsByStatus\`, \`listStudentsByPromo\`, etc.
   - Formate la liste de manière lisible

4. **Statistiques** ("Combien d'étudiants ?", "Taux de réussite"):
   - Utilise \`getStats\` ou \`getTrackStats\`
   - Présente les chiffres de manière claire

5. **Recherches** ("Cherche Pierre", "Trouve les Dubois"):
   - Utilise \`searchStudents\`
   - Montre les résultats pertinents

## Style de réponse
- Réponds en français, de manière professionnelle mais amicale
- Sois concis mais complet
- Si tu trouves plusieurs résultats, liste-les clairement
- Si tu ne trouves rien, dis-le clairement et suggère des alternatives
- Utilise des emojis avec parcimonie pour améliorer la lisibilité (✅ ⚠️ ❌ 📊)
- Formate les listes avec des tirets ou numéros

## Important
- TOUJOURS utiliser les outils pour obtenir des données réelles
- Ne jamais inventer de données
- Utiliser le contexte de la conversation pour les références implicites
- Si une question n'est pas liée aux étudiants/projets, réponds poliment que tu ne peux aider que pour ces sujets
`;

// Génère un titre court pour la conversation
async function generateConversationTitle(message: string): Promise<string> {
  try {
    const result = await generateText({
      model: groq('llama-3.1-8b-instant'), // Modèle rapide pour le titre
      prompt: `Génère un titre très court (3-5 mots max) pour résumer cette question.
Réponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation.

Question: "${message}"

Titre:`,
      maxTokens: 20,
    });

    // Nettoyer le titre
    let title = result.text.trim();
    // Enlever les guillemets si présents
    title = title.replace(/^["']|["']$/g, '');
    // Limiter à 30 caractères
    if (title.length > 30) {
      title = title.slice(0, 30).trim();
    }
    return title || message.slice(0, 30);
  } catch (error) {
    console.error('Error generating title:', error);
    // Fallback: premiers mots du message
    const words = message.split(' ').slice(0, 4).join(' ');
    return words.length > 30 ? words.slice(0, 30) : words;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support both formats: single message or messages array
    let userMessage: string;
    let conversationId: number | undefined;
    let userId: string;

    if (body.messages && Array.isArray(body.messages)) {
      // Format useChat: { messages: [...], conversationId, userId }
      const lastMessage = body.messages[body.messages.length - 1];
      userMessage = lastMessage?.content || '';
      conversationId = body.conversationId;
      userId = body.userId || 'anonymous';
    } else {
      // Format legacy: { message, conversationId, userId }
      userMessage = body.message;
      conversationId = body.conversationId;
      userId = body.userId;
    }

    if (!userMessage || typeof userMessage !== 'string') {
      return new Response(JSON.stringify({ error: 'Message invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get or create conversation
    let currentConversationId = conversationId;
    let isNewConversation = false;

    if (!currentConversationId) {
      isNewConversation = true;
      // Créer avec un titre temporaire
      const tempTitle = "Nouvelle conversation";
      const conversation = await createConversation(userId, tempTitle);
      currentConversationId = conversation.id;
    }

    // Save user message
    await addMessage(currentConversationId, 'user', userMessage);

    // Get conversation history for context (more messages for better context)
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    try {
      const existingConversation = await getConversationWithMessages(currentConversationId);
      if (existingConversation?.messages) {
        // Prendre les 20 derniers messages pour un meilleur contexte
        conversationHistory = existingConversation.messages
          .slice(-20)
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }));
      }
    } catch (e) {
      // Ignore if conversation doesn't exist yet
    }

    // Build full message history (exclude the message we just saved to avoid duplication)
    const fullHistory = conversationHistory.length > 0
      ? conversationHistory.slice(0, -1).concat([{ role: 'user' as const, content: userMessage }])
      : [{ role: 'user' as const, content: userMessage }];

    // Generate title for new conversations (in background)
    if (isNewConversation) {
      generateConversationTitle(userMessage).then(async (title) => {
        try {
          await updateConversationTitle(currentConversationId!, title);
        } catch (e) {
          console.error('Error updating conversation title:', e);
        }
      });
    }

    // Stream response using Groq (free tier)
    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: SYSTEM_PROMPT,
      messages: fullHistory,
      tools: novaTools,
      maxToolRoundtrips: 5,
      onFinish: async ({ text }) => {
        // Save assistant response to database
        if (text && currentConversationId) {
          try {
            await addMessage(currentConversationId, 'assistant', text);
          } catch (e) {
            console.error('Error saving assistant message:', e);
          }
        }
      }
    });

    // Return streaming response with conversation ID header
    return result.toAIStreamResponse({
      headers: {
        'X-Conversation-Id': String(currentConversationId)
      }
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur lors du traitement du message',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
