'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaMicrophone, FaPodcast, FaUserFriends, FaChartLine, FaPlus, FaGlobe, FaLock, FaLink, FaCalendarAlt, FaEdit, FaUsers, FaHeart, FaArrowLeft, FaHeadphones, FaPlay, FaMusic, FaCog, FaTrash, FaPlusCircle, FaCamera, FaTimes, FaSave } from 'react-icons/fa';
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

// Profile Edit Modal Component
interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditProfileFormData) => void;
  initialData: {
    name: string;
    username: string;
    bio: string;
    website: string;
    profileImage: string;
    coverImage: string;
  };
}

interface EditProfileFormData {
  name: string;
  username: string;
  bio: string;
  website: string;
  profileImage: string | File;
  coverImage: string | File;
}

const EditProfileModal = ({ isOpen, onClose, onSave, initialData }: EditProfileModalProps) => {
  const [formData, setFormData] = useState<EditProfileFormData>({
    name: initialData.name,
    username: initialData.username,
    bio: initialData.bio,
    website: initialData.website,
    profileImage: initialData.profileImage,
    coverImage: initialData.coverImage
  });
  
  const [profileImagePreview, setProfileImagePreview] = useState<string>(initialData.profileImage);
  const [coverImagePreview, setCoverImagePreview] = useState<string>(initialData.coverImage);
  const [isSaving, setIsSaving] = useState(false);
  
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const imageUrl = URL.createObjectURL(file);
    setProfileImagePreview(imageUrl);
    setFormData({
      ...formData,
      profileImage: file
    });
  };
  
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const imageUrl = URL.createObjectURL(file);
    setCoverImagePreview(imageUrl);
    setFormData({
      ...formData,
      coverImage: file
    });
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // In a real app, you would upload the images here
      // and get back the URLs
      
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Clean up object URLs on unmount or when previews change
  useEffect(() => {
    // Store the current URLs for cleanup
    const currentProfilePreview = profileImagePreview; 
    const currentCoverPreview = coverImagePreview;
    
    return () => {
      // Only clean blob URLs that we've created (they'll start with "blob:")
      if (typeof currentProfilePreview === 'string' && currentProfilePreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentProfilePreview);
      }
      if (typeof currentCoverPreview === 'string' && currentCoverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentCoverPreview);
      }
    };
  }, [profileImagePreview, coverImagePreview]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800">
            <FaTimes />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Cover Image */}
          <div>
            <label className="block text-gray-400 mb-2">Cover Image</label>
            <div className="relative w-full h-32 bg-gray-800 rounded-lg overflow-hidden mb-2">
              <Image
                src={coverImagePreview}
                alt="Cover"
                layout="fill"
                objectFit="cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => coverImageInputRef.current?.click()}
                  className="bg-gray-900 bg-opacity-70 p-2 rounded-full"
                >
                  <FaCamera className="text-white" />
                </button>
              </div>
            </div>
            <input 
              type="file"
              accept="image/*"
              className="hidden"
              ref={coverImageInputRef}
              onChange={handleCoverImageChange}
            />
            <p className="text-sm text-gray-500">Recommended: 1500 x 500 pixels</p>
          </div>
          
          {/* Profile Image */}
          <div>
            <label className="block text-gray-400 mb-2">Profile Image</label>
            <div className="flex items-center space-x-4">
              <div className="relative w-20 h-20 bg-gray-800 rounded-full overflow-hidden">
                <Image
                  src={profileImagePreview}
                  alt="Profile"
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => profileImageInputRef.current?.click()}
                    className="bg-gray-900 bg-opacity-70 p-2 rounded-full"
                  >
                    <FaCamera className="text-white text-sm" />
                  </button>
                </div>
              </div>
              <div>
                <button 
                  onClick={() => profileImageInputRef.current?.click()}
                  className="text-primary-600 hover:text-primary-500 text-sm"
                >
                  Change profile photo
                </button>
                <p className="text-sm text-gray-500">Recommended: Square image</p>
              </div>
            </div>
            <input 
              type="file"
              accept="image/*"
              className="hidden"
              ref={profileImageInputRef}
              onChange={handleProfileImageChange}
            />
          </div>
          
          {/* Name */}
          <div>
            <label className="block text-gray-400 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
              placeholder="Your name"
            />
          </div>
          
          {/* Username */}
          <div>
            <label className="block text-gray-400 mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
              placeholder="username"
            />
          </div>
          
          {/* Bio */}
          <div>
            <label className="block text-gray-400 mb-2">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white h-24"
              placeholder="Tell us about yourself"
            />
          </div>
          
          {/* Website */}
          <div>
            <label className="block text-gray-400 mb-2">Website</label>
            <div className="flex items-center">
              <div className="bg-gray-700 p-2 rounded-l-lg">
                <FaLink className="text-gray-400" />
              </div>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="flex-1 bg-gray-800 border border-gray-700 border-l-0 rounded-r-lg p-2 text-white"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="p-4 border-t border-gray-800 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Saving...
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalPodcasts: 0,
    totalListens: 0,
    totalFollowers: 0,
    totalLikes: 0,
  });
  
  const [profile, setProfile] = useState({
    name: '',
    username: '',
    bio: 'Podcast creator and audio enthusiast.',
    website: '',
    profileImage: '',
    coverImage: 'https://placehold.co/1500x500/3f33e1/ffffff?text=Cover Photo'
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session.user) {
      const userId = session.user.id;
      
      // Initialize profile data only once when session is available
      if (!profile.name && session.user.name) {
        setProfile({
          ...profile,
          name: session.user.name || 'User',
          username: (session.user.email || 'user@example.com').split('@')[0],
          profileImage: session.user.image || 'https://placehold.co/400x400/5f33e1/ffffff?text=U'
        });
      }
      
      // Load podcasts if we haven't fetched data before
      const loadPodcasts = async () => {
        try {
          if (!dataFetched) {
            setIsLoading(true);
          }
          
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
          setDataFetched(true);
        } catch (error) {
          console.error('Failed to load podcasts:', error);
          if (!dataFetched) {
            // Only show error toast on first load
            toast.error('Failed to load podcasts. Please try again later.');
          }
          setPodcasts([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadPodcasts();
    }
  }, [status, session, router, dataFetched, profile.name]);

  // Handle profile save
  const handleSaveProfile = async (data: EditProfileFormData) => {
    try {
      // In a real app, you would upload the images and update the user profile in the database
      
      // Process new image files if they've changed
      const newProfileImage = typeof data.profileImage === 'string' 
        ? data.profileImage 
        : URL.createObjectURL(data.profileImage as File);
        
      const newCoverImage = typeof data.coverImage === 'string'
        ? data.coverImage
        : URL.createObjectURL(data.coverImage as File);
      
      // Store updated profile data
      const updatedProfile = {
        name: data.name,
        username: data.username,
        bio: data.bio,
        website: data.website,
        profileImage: newProfileImage,
        coverImage: newCoverImage
      };
      
      // Update session first
      await update({
        ...session,
        user: {
          ...session?.user,
          name: data.name,
          image: newProfileImage
        }
      });
      
      // Then update local state once session update is complete
      setProfile(updatedProfile);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

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
              <h1 className="text-xl font-bold">{profile.name}</h1>
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
              src={profile.coverImage}
              alt="Cover"
              layout="fill"
              objectFit="cover"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Profile picture */}
          <div className="px-4 relative">
            <div className="relative -mt-16 mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden relative">
                <Image
                  src={profile.profileImage}
                  alt={profile.name}
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* User info - now left-aligned */}
            <div className="text-left mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  <p className="text-gray-400">@{profile.username}</p>
                  <p className="text-gray-400 text-sm mt-1">Joined {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                </div>
                
                {/* Edit Profile button - moved to the right of the profile info */}
                <button 
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="bg-transparent text-white border border-gray-500 hover:border-white px-4 py-2 rounded-full text-sm"
                >
                  Edit profile
                </button>
              </div>
              
              <div className="mt-3 max-w-md">
                <p className="text-gray-300">
                  {profile.bio}
                </p>
                
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline mt-2 inline-flex items-center">
                    <FaLink className="mr-1" />
                    {profile.website.replace(/(^\w+:|^)\/\//, '')}
                  </a>
                )}
              </div>
            </div>

            {/* Stats section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
              <StatCard
                label="Podcasts"
                count={stats.totalPodcasts}
                icon={<FaPodcast className="text-white" />}
              />
              <StatCard
                label="Followers"
                count={stats.totalFollowers}
                icon={<FaUserFriends className="text-white" />}
              />
              <StatCard
                label="Likes"
                count={stats.totalLikes}
                icon={<FaHeart className="text-white" />}
              />
              <StatCard
                label="Listens"
                count={stats.totalListens}
                icon={<FaPlay className="text-white" />}
              />
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        onSave={handleSaveProfile}
        initialData={profile}
      />
    </div>
  );
};

export default Dashboard;