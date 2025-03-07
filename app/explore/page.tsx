'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getPublicPodcasts, updatePodcast, Podcast } from '@/lib/storage';
import { FaFire, FaStar, FaClock, FaFilter } from 'react-icons/fa';
import PodcastCard from '@/app/components/PodcastCard';
import toast from 'react-hot-toast';

// Filter categories
const categories = [
  { key: 'trending', label: 'Trending', icon: <FaFire className="mr-2" /> },
  { key: 'popular', label: 'Popular', icon: <FaStar className="mr-2" /> },
  { key: 'recent', label: 'Recent', icon: <FaClock className="mr-2" /> }
];

const ExplorePage = () => {
  const { data: session, status } = useSession();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('trending');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likedPodcasts, setLikedPodcasts] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    // Load public podcasts from storage
    const loadPodcasts = async () => {
      try {
        setIsLoading(true);
        const publicPodcasts = await getPublicPodcasts();
        setPodcasts(publicPodcasts);
        
        // Use real comment counts from the API
        const initialCommentCounts: Record<string, number> = {};
        publicPodcasts.forEach(podcast => {
          initialCommentCounts[podcast.id] = podcast.comments || 0;
        });
        setCommentCounts(initialCommentCounts);
      } catch (error) {
        console.error("Error loading podcasts:", error);
        toast.error("Failed to load podcasts. Please try again later.");
        setPodcasts([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPodcasts();
    
    // Load liked podcasts from localStorage if user is logged in
    if (status === 'authenticated' && session?.user) {
      const savedLikes = localStorage.getItem(`likes_${session.user.email}`);
      if (savedLikes) {
        try {
          setLikedPodcasts(new Set(JSON.parse(savedLikes)));
        } catch (e) {
          console.error("Error parsing liked podcasts:", e);
        }
      }
    }
  }, [status, session]);
  
  // Handle podcast like
  const handleLike = async (podcastId: string) => {
    if (!session?.user) {
      toast.error("Please sign in to like podcasts");
      return;
    }
    
    const userId = session.user.email || session.user.id;
    
    const newLikedPodcasts = new Set(likedPodcasts);
    
    if (newLikedPodcasts.has(podcastId)) {
      newLikedPodcasts.delete(podcastId);
    } else {
      newLikedPodcasts.add(podcastId);
    }
    
    setLikedPodcasts(newLikedPodcasts);
    
    // Save likes to localStorage
    localStorage.setItem(`likes_${userId}`, JSON.stringify([...newLikedPodcasts]));
    
    // Update the podcast like count on the server
    try {
      const podcast = podcasts.find(p => p.id === podcastId);
      if (!podcast) return;
      
      const currentLikes = podcast.likes || 0;
      const newLikes = newLikedPodcasts.has(podcastId) ? currentLikes + 1 : currentLikes - 1;
      
      await updatePodcast(podcastId, { likes: Math.max(0, newLikes) });
      
      // Update local state
      setPodcasts(podcasts.map(p => 
        p.id === podcastId ? { ...p, likes: Math.max(0, newLikes) } : p
      ));
      
      toast.success(newLikedPodcasts.has(podcastId) ? "Podcast liked!" : "Like removed");
    } catch (error) {
      console.error("Error updating podcast like:", error);
      toast.error("Failed to update podcast like");
    }
  };
  
  // Filter podcasts based on active category
  const getFilteredPodcasts = () => {
    const sortedPodcasts = [...podcasts];
    
    switch (activeCategory) {
      case 'trending':
        // Sort by most commented
        return sortedPodcasts.sort((a, b) => (b.comments || 0) - (a.comments || 0));
      case 'popular':
        // Sort by most likes
        return sortedPodcasts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case 'recent':
        // Sort by newest
        return sortedPodcasts.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      default:
        return sortedPodcasts;
    }
  };
  
  const filteredPodcasts = getFilteredPodcasts();
  
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
      {/* Rest of the component remains the same */}
    </div>
  );
};

export default ExplorePage;