'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaSearch, FaUserPlus } from 'react-icons/fa';
import { getPublicPodcasts, getPublicPodcastsSync, Podcast } from '@/lib/storage';
import { useToast } from '@/app/context/ToastContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// User interface
interface User {
  id: string;
  name: string | null;
  username?: string;
  email: string | null;
  image: string | null;
  followers?: number;
  isFollowing?: boolean;
}

const RightSidebar = () => {
  const { data: session } = useSession();
  const [trendingPodcasts, setTrendingPodcasts] = useState<Podcast[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const router = useRouter();

  // Fetch suggested users from the database
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        if (!session?.user?.id) return;
        
        const response = await fetch(`/api/users/suggestions?limit=3`);
        if (response.ok) {
          const users = await response.json();
          setSuggestedUsers(users);
        } else {
          console.error('Failed to fetch suggested users');
        }
      } catch (error) {
        console.error('Error fetching suggested users:', error);
      }
    };
    
    fetchSuggestedUsers();
  }, [session?.user?.id]);

  useEffect(() => {
    // Try to use the async API first, with a fallback to sync
    const fetchTrendingPodcasts = async () => {
      try {
        // Load podcasts and filter for trending (most listens)
        const publicPodcasts = await getPublicPodcasts();
        if (publicPodcasts && Array.isArray(publicPodcasts)) {
          const sortedPodcasts = [...publicPodcasts].sort((a, b) => (b.listens || 0) - (a.listens || 0));
          setTrendingPodcasts(sortedPodcasts.slice(0, 5)); // Top 5 most listened
        } else {
          // Fallback to sync method if the async one fails or returns invalid data
          const syncPodcasts = getPublicPodcastsSync();
          if (syncPodcasts && Array.isArray(syncPodcasts)) {
            const sortedPodcasts = [...syncPodcasts].sort((a, b) => (b.listens || 0) - (a.listens || 0));
            setTrendingPodcasts(sortedPodcasts.slice(0, 5));
          } else {
            // If both methods fail, set an empty array
            setTrendingPodcasts([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trending podcasts:', error);
        showToast('Failed to load trending podcasts', 'error');
        setTrendingPodcasts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingPodcasts();
  }, [showToast]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results page
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Function to follow a user
  const handleFollow = async (userId: string) => {
    if (!session?.user) {
      showToast('Please sign in to follow users', 'error');
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Update the local state
        setSuggestedUsers(suggestedUsers.map(user => 
          user.id === userId 
            ? { ...user, isFollowing: true, followers: (user.followers || 0) + 1 } 
            : user
        ));
        
        showToast('You are now following this user', 'success');
      } else {
        showToast('Failed to follow user', 'error');
      }
    } catch (error) {
      console.error('Error following user:', error);
      showToast('Failed to follow user', 'error');
    }
  };

  return (
    <div className="h-screen sticky top-0 overflow-y-auto py-2 pl-8">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-gray-800 rounded-full py-3 pl-10 pr-4 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Search podcasts"
          />
        </div>
      </form>

      {/* Trending podcasts */}
      <div className="mb-6 bg-gray-800 rounded-xl p-4">
        <h3 className="text-xl font-bold mb-4">Trending Podcasts</h3>
        {isLoading ? (
          <div className="animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start py-3">
                <div className="w-12 h-12 bg-gray-700 rounded-lg mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : trendingPodcasts.length > 0 ? (
          <div>
            {trendingPodcasts.map((podcast) => (
              <Link key={podcast.id} href={`/podcasts/${podcast.id}`}>
                <div className="flex items-start py-3 hover:bg-gray-700 rounded-lg px-2 transition-colors cursor-pointer">
                  <div className="w-12 h-12 relative rounded-lg overflow-hidden mr-3">
                    <Image
                      src={podcast.coverImage || `https://placehold.co/100/5f33e1/ffffff?text=${podcast.title[0]}`}
                      alt={podcast.title}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white line-clamp-1">{podcast.title}</h4>
                    <p className="text-gray-400 text-sm">
                      {formatNumber(podcast.listens || 0)} listens • {podcast.user?.name || 'Unknown creator'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            <Link href="/explore" className="block text-primary-500 text-sm font-medium mt-2 hover:underline">
              Show more
            </Link>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-4">No trending podcasts yet</div>
        )}
      </div>

      {/* Who to follow */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-xl font-bold mb-4">Who to follow</h3>
        <div>
          {suggestedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between py-3 hover:bg-gray-700 rounded-lg px-2 transition-colors">
              <div className="flex items-center">
                <div className="w-10 h-10 relative rounded-full overflow-hidden mr-3">
                  <Image
                    src={user.image || 'https://placehold.co/100/5f33e1/ffffff?text=U'}
                    alt={user.name || 'User'}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-medium text-white">{user.name || 'Unknown User'}</h4>
                  <p className="text-gray-400 text-sm">@{user.username}</p>
                </div>
              </div>
              <button
                className={`bg-white text-black rounded-full px-3 py-1 text-sm font-bold hover:bg-gray-200 transition-colors ${user.isFollowing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => user.isFollowing ? null : handleFollow(user.id)}
                disabled={user.isFollowing}
              >
                {user.isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
          <Link href="/explore/users" className="block text-primary-500 text-sm font-medium mt-2 hover:underline">
            Show more
          </Link>
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-6 text-gray-500 text-xs">
        <div className="flex flex-wrap">
          <Link href="/terms" className="mr-2 hover:underline">Terms</Link>
          <Link href="/privacy" className="mr-2 hover:underline">Privacy</Link>
          <Link href="/help" className="mr-2 hover:underline">Help</Link>
          <Link href="/about" className="hover:underline">About</Link>
        </div>
        <p className="mt-2">© 2024 PodcastApp</p>
      </div>
    </div>
  );
};

export default RightSidebar; 