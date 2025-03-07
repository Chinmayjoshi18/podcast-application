import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/notifications - Get user notifications
export async function GET(request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const searchParams = new URL(request.url).searchParams;
  const limit = parseInt(searchParams.get('limit') || '20');
  const page = parseInt(searchParams.get('page') || '1');
  const skip = (page - 1) * limit;
  
  try {
    // Get total notification count
    const totalCount = await prisma.notification.count({
      where: { userId: session.user.id },
    });
    
    // Get notifications with pagination
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      include: {
        sender: {
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
    
    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: { 
        userId: session.user.id,
        isRead: false
      },
    });
    
    return NextResponse.json({
      notifications,
      meta: {
        totalCount,
        unreadCount,
        page,
        limit,
        pageCount: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { ids, all } = body;
    
    if (all) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: { userId: session.user.id },
        data: { isRead: true },
      });
      
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    } else if (ids && ids.length > 0) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: { 
          id: { in: ids },
          userId: session.user.id, // Ensure user can only update their own notifications
        },
        data: { isRead: true },
      });
      
      return NextResponse.json({ success: true, message: 'Notifications marked as read' });
    } else {
      return NextResponse.json(
        { error: 'No notifications specified' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',');
    const all = searchParams.get('all') === 'true';
    
    if (all) {
      // Delete all notifications
      await prisma.notification.deleteMany({
        where: { userId: session.user.id },
      });
      
      return NextResponse.json({ success: true, message: 'All notifications deleted' });
    } else if (ids && ids.length > 0) {
      // Delete specific notifications
      await prisma.notification.deleteMany({
        where: { 
          id: { in: ids },
          userId: session.user.id, // Ensure user can only delete their own notifications
        },
      });
      
      return NextResponse.json({ success: true, message: 'Notifications deleted' });
    } else {
      return NextResponse.json(
        { error: 'No notifications specified' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
} 