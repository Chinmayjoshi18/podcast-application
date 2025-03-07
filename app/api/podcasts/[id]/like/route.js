import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// POST /api/podcasts/[id]/like - Like a podcast
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
    
    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_podcastId: {
          userId: session.user.id,
          podcastId: id,
        },
      },
    });
    
    if (existingLike) {
      return NextResponse.json(
        { error: 'You have already liked this podcast' },
        { status: 400 }
      );
    }
    
    // Create like
    await prisma.like.create({
      data: {
        userId: session.user.id,
        podcastId: id,
      },
    });
    
    // Create notification for podcast owner (if not the same user)
    if (podcast.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          type: 'like',
          content: `${session.user.name || 'Someone'} liked your podcast "${podcast.title}"`,
          userId: podcast.userId,
          senderId: session.user.id,
        },
      });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error liking podcast:', error);
    return NextResponse.json(
      { error: 'Failed to like podcast' },
      { status: 500 }
    );
  }
}

// DELETE /api/podcasts/[id]/like - Unlike a podcast
export async function DELETE(request, { params }) {
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
      select: { id: true },
    });
    
    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }
    
    // Check if liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_podcastId: {
          userId: session.user.id,
          podcastId: id,
        },
      },
    });
    
    if (!existingLike) {
      return NextResponse.json(
        { error: 'You have not liked this podcast' },
        { status: 400 }
      );
    }
    
    // Delete like
    await prisma.like.delete({
      where: {
        userId_podcastId: {
          userId: session.user.id,
          podcastId: id,
        },
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error unliking podcast:', error);
    return NextResponse.json(
      { error: 'Failed to unlike podcast' },
      { status: 500 }
    );
  }
} 