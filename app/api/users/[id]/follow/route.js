import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// POST /api/users/[id]/follow - Follow a user
export async function POST(request, { params }) {
  const { id } = params; // ID of the user to follow
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Cannot follow yourself
  if (session.user.id === id) {
    return NextResponse.json(
      { error: 'You cannot follow yourself' },
      { status: 400 }
    );
  }
  
  try {
    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { id },
      select: { 
        id: true,
        name: true
      },
    });
    
    if (!userToFollow) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: id,
        },
      },
    });
    
    if (existingFollow) {
      return NextResponse.json(
        { error: 'You are already following this user' },
        { status: 400 }
      );
    }
    
    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId: session.user.id,
        followingId: id,
      },
    });
    
    // Create notification for the followed user
    await prisma.notification.create({
      data: {
        type: 'follow',
        content: `${session.user.name || 'Someone'} started following you`,
        userId: id,
        senderId: session.user.id,
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error following user:', error);
    return NextResponse.json(
      { error: 'Failed to follow user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/follow - Unfollow a user
export async function DELETE(request, { params }) {
  const { id } = params; // ID of the user to unfollow
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Check if user exists
    const userToUnfollow = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!userToUnfollow) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: id,
        },
      },
    });
    
    if (!existingFollow) {
      return NextResponse.json(
        { error: 'You are not following this user' },
        { status: 400 }
      );
    }
    
    // Delete follow relationship
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: id,
        },
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 }
    );
  }
} 