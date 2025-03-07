import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Count unread messages across all conversations
    const unreadCount = await prisma.message.count({
      where: {
        conversation: {
          participants: {
            some: {
              id: userId,
            },
          },
        },
        senderId: {
          not: userId,
        },
        readAt: null,
      },
    });

    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error('GET /api/messages/unread error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
} 