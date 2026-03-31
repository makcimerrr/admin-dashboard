import { createMistral } from '@ai-sdk/mistral';
import { generateText, stepCountIs } from 'ai';
import { novaTools } from '@/lib/chatbot/ai-tools';
import {
  createConversation,
  addMessage,
  getConversationWithMessages,
  updateConversationTitle
} from '@/lib/db/services/conversations';

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || '',
});

const SYSTEM_PROMPT = `Tu es Nova, l'assistant IA du dashboard de gestion des étudiants de Zone01 Rouen.

## Identité
Tu es un assistant professionnel, concis et proactif. Tu aides les administrateurs et formateurs à piloter les promotions, suivre les étudiants et prendre des décisions basées sur les données.

## Capacités
Tu disposes d'outils pour interroger la base de données en temps réel :
- **Étudiants** : recherche, détails complets, progression, projets par filière
- **Promotions** : liste, statistiques, comparaisons
- **Filières** : Golang, JavaScript, Rust, Java — complétion, projets en cours
- **Statuts** : en retard, bien, en avance, Validé, Non Validé, spécialité
- **Perdition** : étudiants ayant abandonné, raisons, dates
- **Alternants** : étudiants en entreprise, contrats, tuteurs
- **Audits** : code-reviews réalisées, groupes en attente, priorités
- **Groupes** : groupes en attente d'audit avec créneaux réservés

## Mémoire conversationnelle
Tu as accès à l'INTÉGRALITÉ de l'historique de cette conversation. C'est fondamental :
- Quand l'utilisateur dit "lui", "elle", "cet étudiant", "les mêmes" → retrouve dans l'historique de QUI on parle
- Quand il dit "et son projet ?", "combien parmi eux ?" → c'est une question de suivi
- Quand il revient sur un sujet abordé plus tôt → utilise les données déjà récupérées si elles sont encore pertinentes
- Ne redemande JAMAIS une info déjà donnée dans la conversation
- Si l'utilisateur change de sujet puis revient, rappelle le contexte brièvement

## Raisonnement
Avant de répondre à une question complexe :
1. Identifie ce qui est demandé précisément
2. Détermine quels outils utiliser et dans quel ordre
3. Croise les données si nécessaire (ex: comparer un étudiant à la moyenne de sa promo)
4. Fournis une analyse, pas juste des données brutes

## Style de réponse
- Français, professionnel mais naturel
- Concis : va droit au but, pas de blabla
- Structure les réponses longues avec des titres et listes
- Utilise les emojis avec parcimonie (✅ ⚠️ ❌ 📊 📈)
- Pour les listes > 10 items, résume et propose "Veux-tu voir la liste complète ?"
- Propose toujours 1-2 questions de suivi pertinentes

## Règles strictes
- TOUJOURS utiliser les outils pour obtenir des données — ne jamais inventer
- Si tu ne trouves pas l'info, dis-le clairement et suggère des alternatives
- Tu peux répondre à des questions générales (salutations, aide) sans outil
- Pour tout ce qui touche aux données étudiants/projets/promos, utilise SYSTÉMATIQUEMENT les outils
`;

async function generateConversationTitle(message: string): Promise<string> {
  try {
    const result = await generateText({
      model: mistral('mistral-small-latest'),
      prompt: `Génère un titre très court (3-5 mots max) pour cette question. Réponds UNIQUEMENT avec le titre, sans guillemets.\n\nQuestion: "${message}"\n\nTitre:`,
      maxOutputTokens: 30,
    });
    let title = result.text.trim().replace(/^["']|["']$/g, '').replace(/\n.*/s, '');
    if (title.length > 50) title = title.slice(0, 50).trim();
    return title || message.slice(0, 50);
  } catch {
    return message.split(' ').slice(0, 5).join(' ').slice(0, 50);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let userMessage: string;
    let conversationId: number | undefined;
    let userId: string;

    if (body.messages && Array.isArray(body.messages)) {
      const lastMessage = body.messages[body.messages.length - 1];
      userMessage = lastMessage?.content || '';
      conversationId = body.conversationId;
      userId = body.userId || 'anonymous';
    } else {
      userMessage = body.message;
      conversationId = body.conversationId;
      userId = body.userId;
    }

    if (!userMessage || typeof userMessage !== 'string') {
      return new Response(JSON.stringify({ error: 'Message invalide' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID requis' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    let currentConversationId = conversationId;
    let isNewConversation = false;

    if (!currentConversationId) {
      isNewConversation = true;
      const conversation = await createConversation(userId, 'Nouvelle conversation');
      currentConversationId = conversation.id;
    }

    await addMessage(currentConversationId, 'user', userMessage);

    // Load conversation history for context
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    try {
      const existing = await getConversationWithMessages(currentConversationId);
      if (existing?.messages) {
        conversationHistory = existing.messages
          .slice(-30)
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      }
    } catch {
      // Ignore
    }

    const fullHistory = conversationHistory.length > 0
      ? conversationHistory.slice(0, -1).concat([{ role: 'user' as const, content: userMessage }])
      : [{ role: 'user' as const, content: userMessage }];

    // Generate response with tool calling support
    const result = await generateText({
      model: mistral('magistral-medium-latest'),
      system: SYSTEM_PROMPT,
      messages: fullHistory,
      tools: novaTools,
      stopWhen: stepCountIs(8),
    });

    const responseText = result.text || "Désolé, je n'ai pas pu générer de réponse.";

    // Save assistant response
    await addMessage(currentConversationId, 'assistant', responseText);

    // Generate title in background for new conversations
    if (isNewConversation) {
      generateConversationTitle(userMessage).then(async (title) => {
        try { await updateConversationTitle(currentConversationId!, title); } catch {}
      });
    }

    return new Response(JSON.stringify({
      response: responseText,
      conversationId: currentConversationId,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Conversation-Id': String(currentConversationId),
      }
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur lors du traitement', details: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
