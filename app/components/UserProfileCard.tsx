'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaUserPlus, FaUserCheck, FaEnvelope } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

interface UserProfileCardProps {
  user: {
    id: string;
    name: string;
    image: string;
    isFollowing?: boolean;
  };
  hideFollowButton?: boolean;
}

export default function UserProfileCard({ user, hideFollowButton = false }: UserProfileCardProps) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const isCurrentUser = session?.user?.id === user.id;

  const handleFollowToggle = async () => {
    if (!session?.user) {
      toast.error('You must be logged in to follow users');
      return;
    }
    
    setIsLoading(true);
    try {
      const endpoint = isFollowing ? '/api/follow/unfollow' : '/api/follow';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }
      
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? 'Unfollowed successfully' : 'Followed successfully');
    } catch (error) {
      console.error('Follow toggle error:', error);
      toast.error('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!session?.user) {
      toast.error('You must be logged in to send messages');
      return;
    }
    
    if (isCurrentUser) {
      router.push('/messages');
      return;
    }
    
    try {
      // Start a new conversation or navigate to existing one
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: user.id,
          content: 'Hello! I wanted to connect with you.'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }
      
      const data = await response.json();
      router.push(`/messages?conversation=${data.id}`);
    } catch (error) {
      console.error('Start conversation error:', error);
      toast.error('Failed to start conversation');
    }
  };

  return (
    <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
      <div className="relative h-12 w-12">
        <Image
          src={user.image || 'https://placehold.co/100/5f33e1/ffffff?text=U'}
          alt={user.name}
          fill
          className="rounded-full object-cover"
        />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">{user.name}</h3>
      </div>
      <div className="flex space-x-2">
        {!hideFollowButton && !isCurrentUser && (
          <button
            onClick={handleFollowToggle}
            disabled={isLoading}
            className={`p-2 rounded-full text-white ${
              isFollowing 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-primary-600 hover:bg-primary-700'
            } transition-colors`}
            aria-label={isFollowing ? 'Unfollow' : 'Follow'}
          >
            {isFollowing ? <FaUserCheck /> : <FaUserPlus />}
          </button>
        )}
        <button
          onClick={handleMessage}
          className="p-2 rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          aria-label="Message"
        >
          <FaEnvelope />
        </button>
      </div>
    </div>
  );
} 