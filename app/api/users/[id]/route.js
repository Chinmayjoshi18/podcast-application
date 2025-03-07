import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/users/[id] - Get a user profile
export async function GET(request, { params }) {
  const { id } = params;
  
  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            podcasts: true,
            followers: true,
            following: true,
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if the current user is following this user
    let isFollowing = false;
    const session = await getServerSession(authOptions);
    if (session?.user && session.user.id !== id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: id,
          },
        },
      });
      isFollowing = !!follow;
    }
    
    // Get recent podcasts
    const recentPodcasts = await prisma.podcast.findMany({
      where: { 
        userId: id,
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        coverImage: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    return NextResponse.json({
      ...user,
      isFollowing,
      recentPodcasts,
    });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update a user profile
export async function PATCH(request, { params }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  
  // Check if user is authenticated and is updating their own profile
  if (!session?.user || session.user.id !== id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { name, image } = body;
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(image && { image }),
      },
      select: {
        id: true,
        name: true,
        image: true,
        email: true,
      },
    });
    
    return NextResponse.json(updatedUser);
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
} 