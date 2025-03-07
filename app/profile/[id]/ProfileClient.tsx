'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { FaUserPlus, FaUserCheck, FaPodcast, FaHeart, FaPlay, FaUsers } from 'react-icons/fa';
import toast from 'react-hot-toast';

// Mock user data
const mockUserData = {
  id: 'user1',
  name: 'Alex Johnson',
  image: 'https://via.placeholder.com/150',
  bio: 'Podcast creator and audio storyteller. Passionate about sharing interesting stories and ideas through podcasts.',
  followers: 257,
  following: 134,
  createdAt: '2023-01-15T10:00:00Z',
};

// Mock podcasts data
const mockPodcasts = [
  {
    id: '1',
    title: 'The Creative Mind',
    description: 'Exploring creativity and innovation in various fields.',
    audioUrl: 'https://example.com/audio1.mp3',
    coverImage: 'https://via.placeholder.com/300',
    duration: 1800, // 30 minutes in seconds
    createdAt: '2023-07-15T10:00:00Z',
    listens: 1245,
    likes: 89,
  },
  {
    id: '2',
    title: 'Tech Today',
    description: 'The latest news and trends in technology.',
    audioUrl: 'https://example.com/audio2.mp3',
    coverImage: 'https://via.placeholder.com/300',
    duration: 2400, // 40 minutes in seconds
    createdAt: '2023-07-01T14:30:00Z',
    listens: 876,
    likes: 56,
  },
  {
    id: '3',
    title: 'Mindful Living',
    description: 'Practices for a more mindful and intentional life.',
    audioUrl: 'https://example.com/audio3.mp3',
    coverImage: 'https://via.placeholder.com/300',
    duration: 1500, // 25 minutes in seconds
    createdAt: '2023-06-15T16:45:00Z',
    listens: 987,
    likes: 78,
  },
];

// Client component props
interface ProfileClientProps {
  userId: string;
}

const ProfileClient = ({ userId }: ProfileClientProps) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('podcasts');
  const [stats, setStats] = useState({
    totalPodcasts: 0,
    totalListens: 0,
    totalLikes: 0,
  });

  // Fetch user data
  useEffect(() => {
    // In a real app, you would fetch data from an API based on the user ID
    setTimeout(() => {
      setUser(mockUserData);
      setPodcasts(mockPodcasts);
      
      // Calculate stats
      const totalListens = mockPodcasts.reduce((sum, podcast) => sum + podcast.listens, 0);
      const totalLikes = mockPodcasts.reduce((sum, podcast) => sum + podcast.likes, 0);
      
      setStats({
        totalPodcasts: mockPodcasts.length,
        totalListens,
        totalLikes,
      });
      
      setIsLoading(false);
    }, 1000);
  }, [userId]);

  const toggleFollow = () => {
    if (!session) {
      toast.error('Please log in to follow users');
      return;
    }

    setIsFollowing(!isFollowing);
    
    // In a real app, you would send this to the API
    toast.success(isFollowing ? 'Unfollowed user' : 'Now following user');
  };

  const togglePlay = (podcastId: string) => {
    if (currentlyPlaying === podcastId) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(podcastId);
    }
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
    }).format(date);
  };

  // Format time in mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <p className="mb-6">The user you're looking for doesn't exist or has been removed.</p>
          <Link href="/explore" className="btn btn-primary">
            Explore podcasts
          </Link>
        </div>
      </div>
    );
  }

  // Proper type checking for user ID
  const isOwnProfile = session?.user && (session.user as any).id === user.id;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Profile header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-8">
          <div className="md:flex p-6">
            <div className="md:w-1/4 flex justify-center md:justify-start mb-6 md:mb-0">
              <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg">
                <Image
                  src={user.image}
                  alt={user.name}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
            </div>
            <div className="md:w-3/4 md:pl-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-1">{user.name}</h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Joined {formatDate(user.createdAt)}
                  </p>
                </div>
                
                {!isOwnProfile && (
                  <button
                    onClick={toggleFollow}
                    className={`btn ${
                      isFollowing ? 'btn-outline' : 'btn-primary'
                    } flex items-center space-x-2 self-start`}
                  >
                    {isFollowing ? (
                      <>
                        <FaUserCheck />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <FaUserPlus />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
                
                {isOwnProfile && (
                  <Link href="/settings/profile" className="btn btn-outline self-start">
                    Edit Profile
                  </Link>
                )}
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                {user.bio}
              </p>
              
              <div className="flex space-x-6">
                <div className="flex items-center">
                  <FaPodcast className="mr-2 text-primary-600" />
                  <div>
                    <div className="font-bold">{stats.totalPodcasts}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Podcasts</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <FaUsers className="mr-2 text-blue-600" />
                  <div>
                    <div className="font-bold">{user.followers}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Followers</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <FaUsers className="mr-2 text-green-600" />
                  <div>
                    <div className="font-bold">{user.following}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Following</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <FaHeart className="mr-2 text-red-600" />
                  <div>
                    <div className="font-bold">{stats.totalLikes}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Likes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('podcasts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'podcasts'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Podcasts
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'about'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              About
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {activeTab === 'podcasts' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Podcasts by {user.name}</h2>
              
              {podcasts.length > 0 ? (
                <div className="space-y-6">
                  {podcasts.map((podcast) => (
                    <div
                      key={podcast.id}
                      className="flex flex-col md:flex-row border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div className="md:w-1/4">
                        <div className="relative aspect-square">
                          <Image
                            src={podcast.coverImage}
                            alt={podcast.title}
                            layout="fill"
                            objectFit="cover"
                          />
                          <button
                            onClick={() => togglePlay(podcast.id)}
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-opacity"
                          >
                            <FaPlay className="text-white text-3xl" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 md:w-3/4">
                        <Link href={`/podcasts/${podcast.id}`}>
                          <h3 className="text-lg font-semibold mb-2 hover:text-primary-600 transition-colors">
                            {podcast.title}
                          </h3>
                        </Link>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {podcast.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Duration: {formatDuration(podcast.duration)}</span>
                          <span>Listens: {podcast.listens}</span>
                          <span>Likes: {podcast.likes}</span>
                          <span>Published: {formatDate(podcast.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaPodcast className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No podcasts yet</h3>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">
                    {isOwnProfile
                      ? 'Get started by creating your first podcast.'
                      : `${user.name} hasn't published any podcasts yet.`}
                  </p>
                  {isOwnProfile && (
                    <div className="mt-6">
                      <Link href="/record" className="btn btn-primary">
                        Create Podcast
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'about' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">About {user.name}</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Bio</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {user.bio || 'No bio provided.'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Stats</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalPodcasts}</div>
                      <div className="text-gray-600 dark:text-gray-400">Podcasts created</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalListens}</div>
                      <div className="text-gray-600 dark:text-gray-400">Total listens</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      <div className="text-2xl font-bold">{formatDate(user.createdAt)}</div>
                      <div className="text-gray-600 dark:text-gray-400">Joined</div>
                    </div>
                  </div>
                </div>
                
                {isOwnProfile && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href="/settings/profile" className="btn btn-primary">
                      Edit Profile
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileClient; 