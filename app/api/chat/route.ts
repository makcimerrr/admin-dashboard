import { NextResponse } from 'next/server';
import { analyzeMessage } from '@/lib/chatbot/intent-analyzer';
import { generateResponse } from '@/lib/chatbot/response-generator';
import {
  createConversation,
  addMessage,
  addConversationContext,
  getConversationContextForQuery,
} from '@/lib/db/services/conversations';

export async function POST(req: Request) {
  try {
    const { message, conversationId, userId } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message invalide' },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID requis' },
        { status: 400 }
      );
    }

    // Get or create conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      // Create a new conversation with a title based on the first message
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      const conversation = await createConversation(userId, title);
      currentConversationId = conversation.id;
    }

    // Get RAG context from previous conversations
    const ragContext = await getConversationContextForQuery(
      userId,
      message,
      currentConversationId
    );

    // Analyser l'intention du message
    const analysis = analyzeMessage(message);

    // Save user message
    const userMessage = await addMessage(
      currentConversationId,
      'user',
      message
    );

    // Add context for RAG
    await addConversationContext(
      currentConversationId,
      userMessage.id,
      message,
      analysis.entities.studentName ? [analysis.entities.studentName] : undefined,
      analysis.entities.studentId ? [analysis.entities.studentId] : undefined,
      [analysis.intent]
    );

    // Générer la réponse (with RAG context if available)
    const response = await generateResponse(analysis, message);

    // Save assistant message
    const assistantMessage = await addMessage(
      currentConversationId,
      'assistant',
      response.text,
      response.studentIds,
      response.suggestions,
      analysis.intent,
      analysis.entities
    );

    // Add context for the assistant message
    await addConversationContext(
      currentConversationId,
      assistantMessage.id,
      response.text,
      undefined, // No student names in assistant message
      response.studentIds,
      [analysis.intent]
    );

    return NextResponse.json({
      success: true,
      response,
      conversationId: currentConversationId,
      messageId: assistantMessage.id,
      debug: {
        intent: analysis.intent,
        confidence: analysis.confidence,
        entities: analysis.entities,
        ragContext: ragContext ? 'Used' : 'None',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement du message' },
      { status: 500 }
    );
  }
}
