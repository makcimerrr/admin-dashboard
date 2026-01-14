import { NextResponse } from 'next/server';
import {
  getUserConversations,
  createConversation,
  getUserConversationStats,
} from '@/lib/db/services/conversations';

// GET /api/conversations - Get all conversations for a user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID requis' },
        { status: 400 }
      );
    }

    const conversations = await getUserConversations(userId);
    const stats = await getUserConversationStats(userId);

    return NextResponse.json({
      success: true,
      conversations,
      stats,
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: Request) {
  try {
    const { userId, title } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID requis' },
        { status: 400 }
      );
    }

    const conversationTitle = title || 'Nouvelle conversation';
    const conversation = await createConversation(userId, conversationTitle);

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la conversation' },
      { status: 500 }
    );
  }
}
