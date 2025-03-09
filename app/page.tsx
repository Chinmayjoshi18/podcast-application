'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { getPublicPodcasts, getPublicPodcastsSync, Podcast, updatePodcast } from '@/lib/storage';
import PodcastPost from './components/PodcastPost';
import { FaHeart, FaMicrophone, FaHeadphones, FaUserFriends } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useToast } from './context/ToastContext';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// Generate sample podcast data
const generateSamplePodcasts = (count: number): Podcast[] => {
  const topics = [
    'Technology', 'Science', 'Business', 'Health', 'Arts', 
    'Comedy', 'Education', 'Fiction', 'Music', 'News', 
    'Politics', 'Society', 'Sports', 'True Crime'
  ];
  
  const titles = [
    'The Future of AI', 'Climate Change Solutions', 'Modern Business Strategies',
    'Health & Wellness Tips', 'Art in the Digital Age', 'Comedy Hour',
    'Education Revolution', 'Fiction Storytelling', 'Music Exploration',
    'Breaking News Analysis', 'Political Discourse', 'Society & Culture',
    'Sports Commentary', 'True Crime Stories', 'Tech Talk', 
    'Science Explained', 'Entrepreneurship Today', 'Mental Health Matters',
    'Creative Minds', 'Stand-up Special', 'Learning Journeys',
    'Fictional Universe', 'Musical Journey', 'Current Events',
    'Policy Debates', 'Cultural Perspectives', 'Sports Highlights',
    'Mystery Cases', 'Digital Transformation', 'Scientific Discoveries'
  ];
  
  const users = [
    { id: 'user1', name: 'Alex Johnson', email: 'alex@example.com', image: 'https://placehold.co/400x400/5f33e1/ffffff?text=A' },
    { id: 'user2', name: 'Maya Rodriguez', email: 'maya@example.com', image: 'https://placehold.co/400x400/5f33e1/ffffff?text=M' },
    { id: 'user3', name: 'Sameer Khan', email: 'sameer@example.com', image: 'https://placehold.co/400x400/5f33e1/ffffff?text=S' },
    { id: 'user4', name: 'Olivia Chen', email: 'olivia@example.com', image: 'https://placehold.co/400x400/5f33e1/ffffff?text=O' },
    { id: 'user5', name: 'Noah Williams', email: 'noah@example.com', image: 'https://placehold.co/400x400/5f33e1/ffffff?text=N' },
  ];

  const descriptions = [
    'Exploring the cutting-edge developments in this fascinating field.',
    'A deep dive into the latest research and findings.',
    'Conversations with industry leaders and innovators.',
    'Practical advice and insights from experts.',
    'Interviews with the most creative minds of our generation.',
    'Laugh-out-loud discussions that will brighten your day.',
    'Transforming how we think about learning in the modern world.',
    'Immersive storytelling that transports you to another world.',
    'Celebrating artists and their contributions to culture.',
    'Breaking down complex events with expert analysis.',
    'Thoughtful discussions on policies that shape our world.',
    'Understanding the forces that drive human behavior and communities.',
    'Behind-the-scenes insights from the world of athletics.',
    'Investigating puzzling cases with forensic precision.'
  ];

  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i % 30); // Posts from last 30 days
    
    const userIndex = i % users.length;
    const titleIndex = i % titles.length;
    const descIndex = i % descriptions.length;
    const topicIndex = i % topics.length;
    
    return {
      id: `sample_podcast_${i + 1}`,
      title: titles[titleIndex],
      description: descriptions[descIndex],
      audioUrl: 'https://example.com/sample-audio.mp3',
      coverImage: `https://placehold.co/500x500/${(i % 5) + 1}f33e1/ffffff?text=${i + 1}`,
      duration: 600 + (i * 30), // Between 10 and 25 minutes
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
      isPublic: true,
      user: users[userIndex],
      userId: users[userIndex].id,
      listens: 50 + Math.floor(Math.random() * 950), // Between 50 and 1000
      likes: 10 + Math.floor(Math.random() * 190), // Between 10 and 200
      categories: [topics[topicIndex]]
    };
  });
};

const Home = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useSupabase();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [likedPodcasts, setLikedPodcasts] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    // Load the podcasts from the database
    const loadPodcasts = async () => {
      try {
        // Get podcasts from the API
        const publicPodcasts = await getPublicPodcasts();
        
        // Sort by newest first
        publicPodcasts.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        setPodcasts(publicPodcasts);
        
        // Use the real comment counts from the API
        const initialCommentCounts: Record<string, number> = {};
        publicPodcasts.forEach(podcast => {
          initialCommentCounts[podcast.id] = podcast.comments || 0;
        });
        setCommentCounts(initialCommentCounts);
      } catch (error) {
        console.error("Error loading podcasts:", error);
        showToast("Failed to load podcasts", "error");
        setPodcasts([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPodcasts();
    
    // Load liked podcasts from localStorage if user is logged in
    if (user) {
      const userId = user.id;
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
  }, [authLoading, user, showToast]);

  // Save liked podcasts to localStorage when they change
  useEffect(() => {
    if (user) {
      const userId = user.id;
      if (userId) {
        localStorage.setItem(`likes_${userId}`, JSON.stringify(Array.from(likedPodcasts)));
      }
    }
  }, [likedPodcasts, authLoading, user]);

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
    if (!user) {
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary-600">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-primary-500">Loading podcasts...</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {podcasts.length > 0 ? (
        podcasts.map((podcast) => (
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
        <div className="p-6 text-center text-gray-500">
          <p>No podcasts available yet.</p>
          <p className="mt-2">
            <Link href="/record" className="text-primary-500 hover:underline">
              Create your first podcast
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

export default Home;