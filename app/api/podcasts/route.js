import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/podcasts - Get podcasts with optional filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get('isPublic');
    const tagId = searchParams.get('tagId');
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    // Build the where clause for the query
    const where = {};
    
    // Filter by public/private
    if (isPublic === 'true') {
      where.isPublic = true;
    }
    
    // Filter by tag
    if (tagId) {
      where.tags = {
        some: {
          id: tagId,
        },
      };
    }
    
    // Filter by search query (title or description)
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }
    
    // Get podcasts with pagination
    const podcasts = await prisma.podcast.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        likes: {
          select: { id: true },
        },
        _count: {
          select: {
            comments: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Format the response
    const formattedPodcasts = podcasts.map(podcast => ({
      ...podcast,
      likes: podcast.likes.length,
      comments: podcast._count.comments,
      createdAt: podcast.createdAt.toISOString(),
      updatedAt: podcast.updatedAt.toISOString(),
    }));
    
    return NextResponse.json(formattedPodcasts);
  } catch (error) {
    console.error('Error getting podcasts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/podcasts - Create a new podcast
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { title, description, audioUrl, coverImage, duration, isPublic = true, tags = [] } = await request.json();
    
    // Validate required fields
    if (!title || !audioUrl) {
      return NextResponse.json(
        { error: 'Title and audio URL are required' },
        { status: 400 }
      );
    }
    
    // Create the podcast
    const podcast = await prisma.podcast.create({
      data: {
        title,
        description,
        audioUrl,
        coverImage,
        duration,
        isPublic,
        userId,
        tags: {
          connectOrCreate: tags.map(tag => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        tags: true,
      },
    });
    
    return NextResponse.json({
      ...podcast,
      likes: 0,
      comments: 0,
      createdAt: podcast.createdAt.toISOString(),
      updatedAt: podcast.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating podcast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 