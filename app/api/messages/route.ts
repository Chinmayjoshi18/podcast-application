import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/messages - Get all messages from all conversations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    
    // If conversationId is provided, get messages for that conversation
    if (conversationId) {
      // First, verify that the user is a participant in the conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              id: userId
            }
          }
        },
        include: {
          participants: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });
      
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
      }
      
      // Get messages for the conversation
      const messages = await prisma.message.findMany({
        where: {
          conversationId
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      // Mark unread messages as read
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: {
            not: userId
          },
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      });
      
      return NextResponse.json({
        conversation,
        messages
      });
    }
    
    // Get all conversations with latest message for the user
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            id: userId
          }
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    });
    
    // Count unread messages for each conversation
    const conversationsWithUnreadCount = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: {
              not: userId
            },
            readAt: null
          }
        });
        
        return {
          ...conversation,
          unreadCount
        };
      })
    );
    
    return NextResponse.json(conversationsWithUnreadCount);
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

/**
 * POST /api/messages - Send a new message
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { content, conversationId, recipientId } = body;
    
    if (!content || (!conversationId && !recipientId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // If sending to an existing conversation
    if (conversationId) {
      // Verify the user is part of this conversation
      const conversationExists = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              id: userId
            }
          }
        }
      });
      
      if (!conversationExists) {
        return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
      }
      
      // Create the message
      const message = await prisma.message.create({
        data: {
          content,
          senderId: userId,
          conversationId
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });
      
      // Update the conversation's lastMessageAt
      await prisma.conversation.update({
        where: {
          id: conversationId
        },
        data: {
          lastMessageAt: new Date()
        }
      });
      
      return NextResponse.json(message);
    }
    
    // If starting a new conversation
    if (recipientId) {
      // Check if the recipient exists
      const recipient = await prisma.user.findUnique({
        where: {
          id: recipientId
        }
      });
      
      if (!recipient) {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
      }
      
      // Check if a conversation already exists between these users
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          AND: [
            {
              participants: {
                some: {
                  id: userId
                }
              }
            },
            {
              participants: {
                some: {
                  id: recipientId
                }
              }
            }
          ]
        },
        include: {
          participants: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });
      
      if (existingConversation) {
        // Create a message in the existing conversation
        const message = await prisma.message.create({
          data: {
            content,
            senderId: userId,
            conversationId: existingConversation.id
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        });
        
        // Update the conversation's lastMessageAt
        await prisma.conversation.update({
          where: {
            id: existingConversation.id
          },
          data: {
            lastMessageAt: new Date()
          }
        });
        
        // Return the existing conversation with the new message
        return NextResponse.json({
          ...existingConversation,
          messages: [message]
        });
      }
      
      // Create a new conversation
      const newConversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: userId }, { id: recipientId }]
          },
          lastMessageAt: new Date(),
          messages: {
            create: {
              content,
              senderId: userId
            }
          }
        },
        include: {
          participants: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          }
        }
      });
      
      return NextResponse.json(newConversation);
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
} 