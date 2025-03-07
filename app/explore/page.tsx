'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getPublicPodcasts, updatePodcast, Podcast } from '@/lib/storage';
import PodcastPost from '../components/PodcastPost';
import { FaSearch, FaHashtag, FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ExplorePage = () => {
  const { data: session, status } = useSession();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [likedPodcasts, setLikedPodcasts] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Categories for filtering
  const categories = [
    'All',
    'Technology',
    'Business',
    'Science',
    'Health',
    'Arts',
    'Education',
    'Entertainment',
    'News',
    'Sports',
  ];

  useEffect(() => {
    // Load public podcasts from storage
    const loadPodcasts = () => {
      const publicPodcasts = getPublicPodcasts();
      setPodcasts(publicPodcasts);
      
      // Initialize comment counts (in a real app, this would come from the API)
      const initialCommentCounts: Record<string, number> = {};
      publicPodcasts.forEach(podcast => {
        initialCommentCounts[podcast.id] = Math.floor(Math.random() * 5); // Mock comment counts
      });
      setCommentCounts(initialCommentCounts);
      
      setIsLoading(false);
    };
    
    loadPodcasts();
    
    // Load liked podcasts from localStorage if user is logged in
    if (status === 'authenticated' && session?.user) {
      const userId = (session.user as any)?.id;
      if (userId) {
        const likedPodcastsString = localStorage.getItem(`likes_${userId}`);
        if (likedPodcastsString) {
          try {
            const likedPodcastsArray = JSON.parse(likedPodcastsString);
            setLikedPodcasts(new Set(likedPodcastsArray));
          } catch (error) {
            console.error("Error parsing liked podcasts:", error);
          }
        }
      }
    }
  }, [status, session]);

  // Save liked podcasts to localStorage when they change
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const userId = (session.user as any)?.id;
      if (userId) {
        localStorage.setItem(`likes_${userId}`, JSON.stringify(Array.from(likedPodcasts)));
      }
    }
  }, [likedPodcasts, status, session]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // In a real app, this would filter podcasts by category
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const togglePlay = (podcastId: string) => {
    try {
      const podcast = podcasts.find(p => p.id === podcastId);
      
      if (!podcast) {
        toast.error("Podcast not found");
        return;
      }
      
      if (currentlyPlaying === podcastId) {
        // Same podcast - toggle play/pause
        if (audioRef.current?.paused) {
          audioRef.current.play()
            .catch(error => {
              console.error("Error playing audio:", error);
              toast.error("Failed to play audio");
            });
        } else {
          audioRef.current?.pause();
          setCurrentlyPlaying(null);
        }
      } else {
        // Different podcast - load and play new audio
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(podcast.audioUrl);
        
        // Check if audioUrl is valid
        if (!podcast.audioUrl || podcast.audioUrl === 'null' || podcast.audioUrl === '') {
          toast.error("This podcast doesn't have a valid audio file");
          return;
        }
        
        audioRef.current.play()
          .then(() => {
            setCurrentlyPlaying(podcastId);
            
            // Increment listens count
            const updatedPodcast = { ...podcast, listens: (podcast.listens || 0) + 1 };
            updatePodcast(podcast.id, { listens: updatedPodcast.listens });
            
            // Update the podcasts state
            setPodcasts(prev => 
              prev.map(p => p.id === podcast.id ? updatedPodcast : p)
            );
          })
          .catch(error => {
            console.error("Error playing audio:", error);
            toast.error("Failed to play audio. The file might be invalid or inaccessible.");
          });
      }
    } catch (error) {
      console.error("Error in togglePlay:", error);
      toast.error("An error occurred while playing the podcast");
    }
  };

  const toggleLike = (podcastId: string) => {
    if (status !== 'authenticated') {
      toast.error('Please sign in to like podcasts', {
        icon: '🔒',
      });
      return;
    }
    
    const podcast = podcasts.find(p => p.id === podcastId);
    if (!podcast) return;
    
    setLikedPodcasts((prev) => {
      const newLiked = new Set(prev);
      const wasLiked = newLiked.has(podcastId);
      
      if (wasLiked) {
        newLiked.delete(podcastId);
        toast.success('Removed from your likes');
        
        // Update likes count in storage and state
        const updatedLikes = Math.max(0, (podcast.likes || 0) - 1);
        updatePodcast(podcastId, { likes: updatedLikes });
        
        // Update podcasts state
        setPodcasts(prev => 
          prev.map(p => p.id === podcastId ? { ...p, likes: updatedLikes } : p)
        );
      } else {
        newLiked.add(podcastId);
        toast.success('Added to your likes', {
          icon: <FaHeart className="text-red-500" />,
        });
        
        // Update likes count in storage and state
        const updatedLikes = (podcast.likes || 0) + 1;
        updatePodcast(podcastId, { likes: updatedLikes });
        
        // Update podcasts state
        setPodcasts(prev => 
          prev.map(p => p.id === podcastId ? { ...p, likes: updatedLikes } : p)
        );
      }
      
      return newLiked;
    });
  };

  const getCommentCount = (podcastId: string): number => {
    return commentCounts[podcastId] || 0;
  };

  // Filter podcasts based on search query
  const filteredPodcasts = podcasts.filter((podcast) =>
    podcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    podcast.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    podcast.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-primary-600">Loading podcasts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Fixed header with search */}
      <div className="py-4 px-4 border-b border-gray-800 sticky top-0 bg-gray-950/80 backdrop-blur-sm z-10">
        <h1 className="text-xl font-bold mb-3">Explore</h1>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-500" />
          </div>
          <input
            type="text"
            className="bg-gray-800 border-none rounded-full py-2 pl-10 pr-4 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Search podcasts, creators, or topics..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex space-x-2 pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center">
                {category !== 'All' && <FaHashtag className="mr-1 text-xs" />}
                {category}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Podcasts feed */}
      <div className="divide-y divide-gray-800">
        {filteredPodcasts.length > 0 ? (
          filteredPodcasts.map((podcast) => (
            <PodcastPost
              key={podcast.id}
              podcast={podcast}
              isPlaying={currentlyPlaying === podcast.id}
              onPlayToggle={togglePlay}
              onLikeToggle={toggleLike}
              isLiked={likedPodcasts.has(podcast.id)}
              commentCount={getCommentCount(podcast.id)}
            />
          ))
        ) : (
          <div className="py-20 text-center text-gray-500">
            <p className="mb-2">No podcasts found</p>
            <p className="text-gray-400 text-sm">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search term.`
                : "There are no public podcasts available yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;