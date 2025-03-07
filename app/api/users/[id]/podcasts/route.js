import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    // Ensure we're treating params as resolved
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if we're using an email address as ID
    const isEmail = id.includes('@');
    
    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: isEmail ? { email: id } : { id },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get podcasts for the user
    const podcasts = await prisma.podcast.findMany({
      where: { userId: userExists.id },
      orderBy: { createdAt: 'desc' },
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
    console.error('Error getting user podcasts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 