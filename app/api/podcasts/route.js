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
    // Parse the request body
    const body = await request.json().catch(e => {
      console.error('Error parsing request body:', e);
      return null;
    });
    
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { title, description, audioUrl, coverImage, duration, isPublic = true, tags = [] } = body;
    
    console.log('Creating podcast with data:', {
      title,
      description: description?.substring(0, 30) + (description?.length > 30 ? '...' : ''),
      audioUrl: audioUrl?.substring(0, 30) + (audioUrl?.length > 30 ? '...' : ''),
      coverImage: coverImage?.substring(0, 30) + (coverImage?.length > 30 ? '...' : ''),
      duration,
      isPublic,
      userId,
      tagsCount: tags?.length || 0
    });
    
    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    if (!audioUrl) {
      return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 });
    }
    
    if (!audioUrl.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid audio URL format. Must be a valid URL.' },
        { status: 400 }
      );
    }
    
    // Create the podcast
    const podcast = await prisma.podcast.create({
      data: {
        title,
        description: description || '',
        audioUrl,
        coverImage: coverImage || null,
        duration: duration ? Number(duration) : null,
        isPublic: Boolean(isPublic),
        userId,
        tags: Array.isArray(tags) && tags.length > 0 ? {
          connectOrCreate: tags.map(tag => ({
            where: { name: String(tag) },
            create: { name: String(tag) },
          })),
        } : undefined,
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
    
    console.log('Podcast created successfully with ID:', podcast.id);
    
    return NextResponse.json({
      ...podcast,
      likes: 0,
      comments: 0,
      createdAt: podcast.createdAt.toISOString(),
      updatedAt: podcast.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating podcast:', error);
    return NextResponse.json({ 
      error: 'Failed to create podcast',
      details: error.message
    }, { status: 500 });
  }
} 