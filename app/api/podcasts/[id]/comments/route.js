import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/podcasts/[id]/comments - Get comments for a podcast
export async function GET(request, { params }) {
  const { id } = params;
  const searchParams = new URL(request.url).searchParams;
  const limit = parseInt(searchParams.get('limit') || '20');
  const page = parseInt(searchParams.get('page') || '1');
  const skip = (page - 1) * limit;
  
  try {
    // Check if podcast exists
    const podcast = await prisma.podcast.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }
    
    // Get total comment count
    const totalCount = await prisma.comment.count({
      where: { podcastId: id },
    });
    
    // Get comments with pagination
    const comments = await prisma.comment.findMany({
      where: { podcastId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });
    
    return NextResponse.json({
      comments,
      meta: {
        totalCount,
        page,
        limit,
        pageCount: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST /api/podcasts/[id]/comments - Add a comment to a podcast
export async function POST(request, { params }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Check if podcast exists
    const podcast = await prisma.podcast.findUnique({
      where: { id },
      select: { 
        id: true,
        userId: true,
        title: true
      },
    });
    
    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { text } = body;
    
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }
    
    // Create comment
    const comment = await prisma.comment.create({
      data: {
        text,
        userId: session.user.id,
        podcastId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
    
    // Create notification for podcast owner (if not the same user)
    if (podcast.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          type: 'comment',
          content: `${session.user.name || 'Someone'} commented on your podcast "${podcast.title}"`,
          userId: podcast.userId,
          senderId: session.user.id,
        },
      });
    }
    
    return NextResponse.json(comment, { status: 201 });
    
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
} 