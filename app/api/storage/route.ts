import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { action, path, bucket } = body;

    // Validate required parameters
    if (!action || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get admin Supabase client with service role
    const serviceSupabase = getServiceSupabase();
    if (!serviceSupabase) {
      return NextResponse.json(
        { error: 'Storage service unavailable' },
        { status: 500 }
      );
    }

    // Determine the bucket to use
    const bucketName = bucket || 
      (path.startsWith('podcast-audio') ? 'podcasts' : 'images');

    // Handle different actions
    switch (action) {
      case 'getSignedUrl': {
        // Get a signed URL for a file (for private files)
        const { data, error } = await serviceSupabase.storage
          .from(bucketName)
          .createSignedUrl(path, 60 * 60); // 1 hour expiry
        
        if (error) {
          console.error('Error creating signed URL:', error);
          return NextResponse.json(
            { error: `Failed to create signed URL: ${error.message}` },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ url: data.signedUrl });
      }
      
      case 'delete': {
        // Delete a file
        const { error } = await serviceSupabase.storage
          .from(bucketName)
          .remove([path]);
        
        if (error) {
          console.error('Error deleting file:', error);
          return NextResponse.json(
            { error: `Failed to delete file: ${error.message}` },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ success: true });
      }
      
      default:
        return NextResponse.json(
          { error: `Unsupported action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing storage request:', error);
    return NextResponse.json(
      { error: 'Failed to process storage request' },
      { status: 500 }
    );
  }
} 