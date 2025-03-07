'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaMicrophone, FaPodcast, FaUserFriends, FaChartLine, FaPlus, FaGlobe, FaLock, FaLink, FaCalendarAlt, FaEdit, FaUsers, FaHeart, FaArrowLeft, FaHeadphones } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { getUserPodcasts, updatePodcast, deletePodcast, Podcast } from '@/lib/storage';

// Dashboard stat card
interface StatCardProps {
  label: string;
  count: number;
  icon: JSX.Element;
}

const StatCard = ({ label, count, icon }: StatCardProps) => (
  <div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-4">
    <div className="bg-primary-600 p-3 rounded-md">
      {icon}
    </div>
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPodcasts: 0,
    totalListens: 0,
    totalFollowers: 0,
    totalLikes: 0,
  });
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  // Mock bio for the demo
  const [userBio, setUserBio] = useState('Podcast creator and audio storyteller. Passionate about sharing interesting stories and ideas through podcasts.');
  // Mock date for the demo
  const joinedDate = 'January 2023';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Load podcasts when session is available
    if (status === 'authenticated' && session?.user) {
      const userId = (session.user as any).id || session.user.email || 'anonymous';
      
      // Load user's podcasts from storage
      const loadPodcasts = async () => {
        try {
          setIsLoading(true);
          const userPodcasts = await getUserPodcasts(userId);
          
          // Set state with real metrics
          setPodcasts(userPodcasts);
          
          // Calculate real metrics from podcast data
          setStats({
            totalPodcasts: userPodcasts.length,
            totalListens: userPodcasts.reduce((sum, podcast) => sum + (podcast.listens || 0), 0),
            totalLikes: userPodcasts.reduce((sum, podcast) => sum + (podcast.likes || 0), 0),
            totalFollowers: 0, // This will be updated with real data when we fetch followers
          });
          
          // Fetch follower count from API (in a real implementation)
          const fetchFollowerCount = async () => {
            try {
              const response = await fetch(`/api/users/${userId}/followers/count`);
              if (response.ok) {
                const data = await response.json();
                setStats(prev => ({
                  ...prev,
                  totalFollowers: data.count
                }));
              }
            } catch (error) {
              console.error('Failed to fetch follower count:', error);
            }
          };
          
          fetchFollowerCount();
        } catch (error) {
          console.error('Failed to load podcasts:', error);
          toast.error('Failed to load podcasts. Please try again later.');
          setPodcasts([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadPodcasts();
    }
  }, [status, session]);

  // Add a function to handle toggling the privacy setting
  const togglePrivacy = async (podcastId: string) => {
    const podcast = podcasts.find(p => p.id === podcastId);
    if (!podcast) return;

    try {
      // Update the podcast privacy setting
      const updatedPodcast = await updatePodcast(podcastId, { 
        isPublic: !podcast.isPublic 
      });

      if (updatedPodcast) {
        // Update local state
        setPodcasts(current => current.map(p => 
          p.id === podcastId ? updatedPodcast : p
        ));

        toast.success(`Podcast is now ${updatedPodcast.isPublic ? 'public' : 'private'}`);
      }
    } catch (error) {
      console.error('Failed to update podcast privacy:', error);
      toast.error('Failed to update podcast privacy. Please try again.');
    }
  };

  // Add function to handle podcast deletion
  const handleDeletePodcast = async (podcastId: string) => {
    if (window.confirm('Are you sure you want to delete this podcast? This action cannot be undone.')) {
      try {
        const deleted = await deletePodcast(podcastId);
        
        if (deleted) {
          // Update local state
          setPodcasts(current => current.filter(p => p.id !== podcastId));
          
          // Update stats
          setStats(prev => ({
            ...prev,
            totalPodcasts: prev.totalPodcasts - 1,
          }));
          
          toast.success('Podcast deleted successfully');
        }
      } catch (error) {
        console.error('Failed to delete podcast:', error);
        toast.error('Failed to delete podcast. Please try again.');
      }
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary-600">Loading...</div>
      </div>
    );
  }

  // Format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const username = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Middle Content */}
        <div className="w-full md:flex-1 max-w-3xl min-h-screen">
          {/* Sticky top bar */}
          <div className="sticky top-0 z-10 p-4 backdrop-blur-sm bg-black/60 border-b border-gray-700 flex items-center">
            <Link href="/" className="mr-4">
              <FaArrowLeft className="text-white" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{username}</h1>
              <p className="text-gray-400 text-sm">{podcasts.length} Podcasts</p>
            </div>
            <Link href="/record" className="ml-auto">
              <button className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1 rounded-full text-sm">
                New
              </button>
            </Link>
          </div>

          {/* Cover photo */}
          <div className="relative w-full h-60 bg-gray-800 mt-2">
            <Image
              src={'https://placehold.co/1500x500/3f33e1/ffffff?text=Cover Photo'}
              alt="Cover"
              layout="fill"
              objectFit="cover"
              className="w-full h-full object-cover"
            />
            
            {/* Edit Profile button positioned on the right side below cover */}
            <div className="absolute right-4 -bottom-4">
              <Link href="/settings">
                <button className="bg-transparent text-white border border-gray-500 hover:border-white px-4 py-2 rounded-full text-sm">
                  Edit profile
                </button>
              </Link>
            </div>
          </div>

          {/* Profile picture */}
          <div className="px-4 relative">
            <div className="relative -mt-16 mb-6">
              <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden relative">
                <Image
                  src={session?.user?.image || 'https://placehold.co/400x400/5f33e1/ffffff?text=H'}
                  alt={username}
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* User info - now left-aligned */}
            <div className="text-left mb-3">
              <h1 className="text-2xl font-bold">{username}</h1>
              <p className="text-gray-400">@{userEmail.split('@')[0]}</p>
              <p className="text-gray-400 text-sm mt-1">Joined {joinedDate}</p>
              
              <div className="mt-3 max-w-md">
                <p className="text-gray-300">
                  {userBio}
                </p>
              </div>
            </div>

            {/* Stats section - left-aligned, kept in a row */}
            <div className="flex space-x-6 text-sm text-gray-400 mb-4">
              <div className="flex items-center space-x-1">
                <FaMicrophone className="text-primary-500" />
                <span className="ml-1">
                  <span className="text-white">{podcasts.length}</span> Podcasts
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <FaUserFriends className="text-green-500" />
                <span className="ml-1">
                  <span className="text-white">{stats.totalFollowers}</span> Followers
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <FaHeart className="text-red-500" />
                <span className="ml-1">
                  <span className="text-white">{stats.totalLikes}</span> Likes
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <FaHeadphones className="text-blue-500" />
                <span className="ml-1">
                  <span className="text-white">{stats.totalListens}</span> Listens
                </span>
              </div>
            </div>
          </div>
          
          {/* Rest of the dashboard content */}
          <div className="border-t border-gray-700 mt-4">
            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('podcasts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'podcasts'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Podcasts
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'analytics'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Analytics
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                  {podcasts.length > 0 ? (
                    <div className="space-y-4">
                      {podcasts.slice(0, 3).map((podcast) => (
                        <div
                          key={podcast.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col md:flex-row"
                        >
                          <div className="flex-shrink-0 w-full md:w-48 h-32 mb-4 md:mb-0 md:mr-4">
                            <div className="relative w-full h-full rounded-md overflow-hidden">
                              <Image
                                src={podcast.coverImage || "https://placehold.co/300"}
                                alt={podcast.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-lg font-semibold mb-2">{podcast.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-2">{podcast.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                              {podcast.duration && typeof podcast.duration === 'number' && (
                                <span>Duration: {formatDuration(podcast.duration)}</span>
                              )}
                              <span>Listens: {podcast.listens}</span>
                              <span>Likes: {podcast.likes}</span>
                              <span>Published: {formatDate(podcast.createdAt)}</span>
                              <span className={`flex items-center ${podcast.isPublic ? 'text-green-500' : 'text-amber-500'}`}>
                                {podcast.isPublic ? (
                                  <>
                                    <FaGlobe className="mr-1" /> Public
                                  </>
                                ) : (
                                  <>
                                    <FaLock className="mr-1" /> Private
                                  </>
                                )}
                              </span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <Link
                                href={`/podcasts/${podcast.id}`}
                                className="text-primary-600 hover:text-primary-800 dark:hover:text-primary-400 font-medium"
                              >
                                View
                              </Link>
                              <button 
                                onClick={() => togglePrivacy(podcast.id)}
                                className="text-primary-600 hover:text-primary-800 dark:hover:text-primary-400 font-medium"
                              >
                                {podcast.isPublic ? 'Make Private' : 'Make Public'}
                              </button>
                              <button 
                                onClick={() => handleDeletePodcast(podcast.id)}
                                className="text-red-600 hover:text-red-800 dark:hover:text-red-400 font-medium"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/podcasts/${podcast.id}`);
                                  toast.success('Link copied to clipboard');
                                }}
                                className="text-gray-600 hover:text-gray-800 dark:hover:text-gray-400 font-medium flex items-center"
                              >
                                <FaLink className="mr-1" />
                                Share
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <FaMicrophone className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No podcasts yet</h3>
                      <p className="mt-1 text-gray-500 dark:text-gray-400">Get started by creating your first podcast.</p>
                      <div className="mt-6">
                        <Link href="/record" className="btn btn-primary">
                          Create Podcast
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'podcasts' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">My Podcasts</h2>
                  </div>
                  
                  {podcasts.length > 0 ? (
                    <div className="space-y-4">
                      {podcasts.map((podcast) => (
                        <div
                          key={podcast.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col md:flex-row"
                        >
                          <div className="flex-shrink-0 w-full md:w-48 h-32 mb-4 md:mb-0 md:mr-4">
                            <div className="relative w-full h-full rounded-md overflow-hidden">
                              <Image
                                src={podcast.coverImage || "https://placehold.co/300"}
                                alt={podcast.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-lg font-semibold mb-2">{podcast.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-2">{podcast.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                              {podcast.duration && typeof podcast.duration === 'number' && (
                                <span>Duration: {formatDuration(podcast.duration)}</span>
                              )}
                              <span>Listens: {podcast.listens}</span>
                              <span>Likes: {podcast.likes}</span>
                              <span>Published: {formatDate(podcast.createdAt)}</span>
                              <span className={`flex items-center ${podcast.isPublic ? 'text-green-500' : 'text-amber-500'}`}>
                                {podcast.isPublic ? (
                                  <>
                                    <FaGlobe className="mr-1" /> Public
                                  </>
                                ) : (
                                  <>
                                    <FaLock className="mr-1" /> Private
                                  </>
                                )}
                              </span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <Link
                                href={`/podcasts/${podcast.id}`}
                                className="text-primary-600 hover:text-primary-800 dark:hover:text-primary-400 font-medium"
                              >
                                View
                              </Link>
                              <button 
                                onClick={() => togglePrivacy(podcast.id)}
                                className="text-primary-600 hover:text-primary-800 dark:hover:text-primary-400 font-medium"
                              >
                                {podcast.isPublic ? 'Make Private' : 'Make Public'}
                              </button>
                              <button 
                                onClick={() => handleDeletePodcast(podcast.id)}
                                className="text-red-600 hover:text-red-800 dark:hover:text-red-400 font-medium"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/podcasts/${podcast.id}`);
                                  toast.success('Link copied to clipboard');
                                }}
                                className="text-gray-600 hover:text-gray-800 dark:hover:text-gray-400 font-medium flex items-center"
                              >
                                <FaLink className="mr-1" />
                                Share
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <FaMicrophone className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No podcasts yet</h3>
                      <p className="mt-1 text-gray-500 dark:text-gray-400">Get started by creating your first podcast.</p>
                      <div className="mt-6">
                        <Link href="/record" className="btn btn-primary">
                          Create Podcast
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Analytics</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Detailed analytics about your podcasts will appear here.
                  </p>
                  {/* Analytics content would go here in a real app */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-8 rounded-lg text-center mt-6">
                    <p className="text-gray-500 dark:text-gray-400">
                      Coming soon: Detailed metrics and insights about your podcast performance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// We're keeping the StatsCard component but no longer using it since stats are now displayed directly in the profile header
const StatsCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="p-3 rounded-full bg-primary-50 dark:bg-primary-900/20">
          {icon}
        </div>
        <div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;