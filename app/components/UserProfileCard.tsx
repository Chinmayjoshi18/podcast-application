'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaCalendarAlt, FaMapMarkerAlt, FaLink, FaCog } from 'react-icons/fa';
import { useSupabase } from '@/app/providers/SupabaseProvider';

// Define the props interface
interface UserProfileCardProps {
  userId?: string;
  name?: string;
  username?: string;
  bio?: string;
  followers?: number;
  following?: number;
  profileImage?: string;
  isFollowing?: boolean;
  isCurrentUser?: boolean;
  onFollowToggle?: () => void;
}

export default function UserProfileCard({
  userId,
  name,
  username,
  bio,
  followers = 0,
  following = 0,
  profileImage,
  isFollowing = false,
  isCurrentUser,
  onFollowToggle
}: UserProfileCardProps) {
  const { user } = useSupabase();
  
  // If no user ID is provided, use the current user's profile
  const isOwnProfile = isCurrentUser || (!userId && user);
  
  // If no props are provided but we have a current user, use their data
  const displayName = name || user?.user_metadata?.full_name || 'User';
  const displayUsername = username || user?.user_metadata?.username || 'user';
  const displayBio = bio || user?.user_metadata?.bio || 'No bio provided';
  const displayImage = profileImage || user?.user_metadata?.avatar_url || 'https://placehold.co/400/5f33e1/ffffff?text=U';

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-md">
      {/* Cover photo */}
      <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-800"></div>
      
      {/* Profile info */}
      <div className="px-4 py-3 relative">
        {/* Profile picture */}
        <div className="absolute -top-16 left-4 rounded-full border-4 border-gray-800 overflow-hidden">
          <Image
            src={displayImage}
            alt={displayName}
            width={80}
            height={80}
            className="h-20 w-20 object-cover"
          />
        </div>
        
        {/* Follow button or edit profile button */}
        <div className="flex justify-end">
          {isOwnProfile ? (
            <Link 
              href="/settings/profile" 
              className="px-4 py-2 rounded-full border border-gray-600 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <FaCog className="inline mr-2" />
              Edit Profile
            </Link>
          ) : (
            <button 
              onClick={onFollowToggle}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isFollowing 
                  ? 'bg-white text-black hover:bg-gray-200' 
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        
        {/* Name and username */}
        <div className="mt-10">
          <h2 className="text-xl font-bold">{displayName}</h2>
          <p className="text-gray-400">@{displayUsername}</p>
        </div>
        
        {/* Bio */}
        <p className="mt-2 text-sm">{displayBio}</p>
        
        {/* Stats */}
        <div className="flex mt-4 text-sm">
          <div className="mr-4">
            <span className="font-bold">{following}</span>
            <span className="text-gray-400 ml-1">Following</span>
          </div>
          <div>
            <span className="font-bold">{followers}</span>
            <span className="text-gray-400 ml-1">Followers</span>
          </div>
        </div>
      </div>
    </div>
  );
} 