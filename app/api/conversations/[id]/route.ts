import { NextResponse } from 'next/server';
import {
  getConversationWithMessages,
  deleteConversation,
  updateConversationTitle,
} from '@/lib/db/services/conversations';

// GET /api/conversations/[id] - Get a specific conversation with messages
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = parseInt(params.id);

    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: 'ID de conversation invalide' },
        { status: 400 }
      );
    }

    const result = await getConversationWithMessages(conversationId);

    if (!result.conversation) {
      return NextResponse.json(
        { error: 'Conversation non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: result.conversation,
      messages: result.messages,
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update conversation title
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = parseInt(params.id);
    const { title } = await req.json();

    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: 'ID de conversation invalide' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Titre invalide' },
        { status: 400 }
      );
    }

    await updateConversationTitle(conversationId, title);

    return NextResponse.json({
      success: true,
      message: 'Titre mis à jour',
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la conversation' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = parseInt(params.id);

    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: 'ID de conversation invalide' },
        { status: 400 }
      );
    }

    await deleteConversation(conversationId);

    return NextResponse.json({
      success: true,
      message: 'Conversation supprimée',
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la conversation' },
      { status: 500 }
    );
  }
}
