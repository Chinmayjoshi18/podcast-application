import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/podcasts/[id] - Get a single podcast by ID
export async function GET(request, { params }) {
  const { id } = params;
  
  try {
    const podcast = await prisma.podcast.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        comments: {
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
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        tags: true,
      },
    });
    
    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }
    
    // Check if the current user has liked this podcast
    let userLiked = false;
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const like = await prisma.like.findUnique({
        where: {
          userId_podcastId: {
            userId: session.user.id,
            podcastId: id,
          },
        },
      });
      userLiked = !!like;
    }
    
    return NextResponse.json({ ...podcast, userLiked });
    
  } catch (error) {
    console.error('Error fetching podcast:', error);
    return NextResponse.json(
      { error: 'Failed to fetch podcast' },
      { status: 500 }
    );
  }
}

// PATCH /api/podcasts/[id] - Update a podcast
export async function PATCH(request, { params }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // First check if the podcast exists and belongs to the user
    const podcast = await prisma.podcast.findUnique({
      where: { id },
      select: { userId: true },
    });
    
    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }
    
    // Check ownership
    if (podcast.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this podcast' },
        { status: 403 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { title, description, coverImage, isPublic, tags } = body;
    
    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    
    // Handle tags update if provided
    if (tags) {
      // First disconnect all existing tags
      await prisma.podcast.update({
        where: { id },
        data: {
          tags: { set: [] }
        }
      });
      
      // Then connect or create the new tags
      updateData.tags = {
        connectOrCreate: tags.map(tag => ({
          where: { name: tag },
          create: { name: tag }
        }))
      };
    }
    
    // Update the podcast
    const updatedPodcast = await prisma.podcast.update({
      where: { id },
      data: updateData,
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
    
    return NextResponse.json(updatedPodcast);
    
  } catch (error) {
    console.error('Error updating podcast:', error);
    return NextResponse.json(
      { error: 'Failed to update podcast' },
      { status: 500 }
    );
  }
}

// DELETE /api/podcasts/[id] - Delete a podcast
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
    // First check if the podcast exists and belongs to the user
    const podcast = await prisma.podcast.findUnique({
      where: { id },
      select: { userId: true },
    });
    
    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }
    
    // Check ownership
    if (podcast.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this podcast' },
        { status: 403 }
      );
    }
    
    // Delete the podcast
    await prisma.podcast.delete({
      where: { id },
    });
    
    return NextResponse.json({ message: 'Podcast deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting podcast:', error);
    return NextResponse.json(
      { error: 'Failed to delete podcast' },
      { status: 500 }
    );
  }
} 