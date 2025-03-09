'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import Image from 'next/image';
import Link from 'next/link';
import { FaPlay, FaPause, FaHeart, FaRegHeart, FaComment, FaShareAlt, FaArrowLeft, FaPaperPlane, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { Podcast, getAllPodcasts, updatePodcast } from '@/lib/storage';

const PodcastDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useSupabase();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Array<{id: string, user: {name: string, image?: string}, text: string, createdAt: string}>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: ''
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const podcastId = params.id as string;
    
    // Get podcast from storage
    const fetchPodcast = async () => {
      try {
        setIsLoading(true);
        const allPodcasts = await getAllPodcasts();
        const foundPodcast = allPodcasts.find(p => p.id === podcastId);
        
        if (foundPodcast) {
          setPodcast(foundPodcast);
          // Initialize edit form with current values
          setEditForm({
            title: foundPodcast.title,
            description: foundPodcast.description
          });
          
          // Check if user has liked this podcast
          if (user && user.id) {
            const likedPodcastsString = localStorage.getItem(`likes_${user.id}`);
            if (likedPodcastsString) {
              try {
                const likedPodcasts = JSON.parse(likedPodcastsString);
                setIsLiked(likedPodcasts.includes(podcastId));
              } catch (error) {
                console.error("Error parsing liked podcasts:", error);
              }
            }
          }
          
          // Fetch comments
          fetchComments(podcastId);
        } else {
          toast.error("Podcast not found");
          router.push('/');
        }
      } catch (error) {
        console.error("Error loading podcast:", error);
        toast.error("Failed to load podcast");
      } finally {
        setIsLoading(false);
      }
    };
    
    // Fetch comments for the podcast
    const fetchComments = async (podcastId: string) => {
      try {
        const response = await fetch(`/api/podcasts/${podcastId}/comments`);
        if (response.ok) {
          const data = await response.json();
          setComments(data);
        } else {
          // If API fails, use empty comments array
          setComments([]);
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
        // Use empty array as fallback
        setComments([]);
      }
    };
    
    fetchPodcast();
  }, [params.id, router, user]);

  // Handle input change for edit form
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm({
      ...editForm,
      [name]: value
    });
  };

  // Save podcast edits
  const handleSaveEdit = async () => {
    if (!podcast) return;
    
    try {
      // Validate inputs
      if (!editForm.title.trim()) {
        toast.error("Title cannot be empty");
        return;
      }
      
      // Update podcast in the database
      const updatedPodcast = await updatePodcast(podcast.id, {
        title: editForm.title,
        description: editForm.description
      });
      
      // Update local state
      setPodcast({
        ...podcast,
        title: editForm.title,
        description: editForm.description
      });
      
      // Exit editing mode
      setIsEditing(false);
      toast.success("Podcast updated successfully");
    } catch (error) {
      console.error("Error updating podcast:", error);
      toast.error("Failed to update podcast");
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (podcast) {
      // Reset form to original values
      setEditForm({
        title: podcast.title,
        description: podcast.description
      });
    }
    setIsEditing(false);
  };

  // Check if current user is the podcast owner
  const isOwner = () => {
    if (!podcast || !user) return false;
    
    return user.id === podcast.userId;
  };

  const togglePlay = () => {
    if (!podcast) return;
    
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(podcast.audioUrl);
        
        // Check if audioUrl is valid
        if (!podcast.audioUrl || podcast.audioUrl === 'null' || podcast.audioUrl === '') {
          toast.error("This podcast doesn't have a valid audio file");
          return;
        }
        
        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false);
        });
      }
      
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            
            // Increment listens count
            if (podcast) {
              const updatedPodcast = { ...podcast, listens: (podcast.listens || 0) + 1 };
              updatePodcast(podcast.id, { listens: updatedPodcast.listens });
              setPodcast(updatedPodcast);
            }
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

  const toggleLike = () => {
    if (!podcast) return;
    
    if (!user) {
      toast.error('Please sign in to like podcasts', {
        icon: '🔒',
      });
      return;
    }
    
    // Get current liked podcasts
    let likedPodcasts: string[] = [];
    const likedPodcastsString = localStorage.getItem(`likes_${user.id}`);
    if (likedPodcastsString) {
      try {
        likedPodcasts = JSON.parse(likedPodcastsString);
      } catch (error) {
        console.error("Error parsing liked podcasts:", error);
      }
    }
    
    // Toggle like
    if (isLiked) {
      // Remove from liked podcasts
      likedPodcasts = likedPodcasts.filter(id => id !== podcast.id);
      setIsLiked(false);
      
      // Update likes count
      const updatedPodcast = { ...podcast, likes: Math.max(0, (podcast.likes || 0) - 1) };
      updatePodcast(podcast.id, { likes: updatedPodcast.likes });
      setPodcast(updatedPodcast);
      
      toast.success('Removed from your likes');
    } else {
      // Add to liked podcasts
      likedPodcasts.push(podcast.id);
      setIsLiked(true);
      
      // Update likes count
      const updatedPodcast = { ...podcast, likes: (podcast.likes || 0) + 1 };
      updatePodcast(podcast.id, { likes: updatedPodcast.likes });
      setPodcast(updatedPodcast);
      
      toast.success('Added to your likes', {
        icon: <FaHeart className="text-red-500" />,
      });
    }
    
    // Save updated liked podcasts
    localStorage.setItem(`likes_${user.id}`, JSON.stringify(likedPodcasts));
  };

  const handleShare = () => {
    if (!podcast) return;
    
    if (navigator.share) {
      navigator.share({
        title: podcast.title,
        text: `Check out this podcast: ${podcast.title}`,
        url: `${window.location.origin}/podcasts/${podcast.id}`,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`${window.location.origin}/podcasts/${podcast.id}`)
        .then(() => toast.success('Link copied to clipboard'))
        .catch(() => toast.error('Failed to copy link'));
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }
    
    if (!comment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    // In a real app, this would save to a database
    const newComment = {
      id: Date.now().toString(),
      user: {
        name: user.user_metadata?.full_name || 'Anonymous',
        image: user.user_metadata?.avatar_url || `https://placehold.co/100/5f33e1/ffffff?text=${user.user_metadata?.full_name?.[0] || 'A'}`
      },
      text: comment,
      createdAt: new Date().toISOString()
    };
    
    setComments([newComment, ...comments]);
    setComment('');
    toast.success('Comment added!');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || typeof seconds !== 'number') return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary-600">Loading...</div>
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Podcast not found</h1>
        <p className="text-gray-400 mb-8">The podcast you're looking for doesn't exist or has been removed.</p>
        <Link href="/" className="text-primary-600 hover:underline">
          Return to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header with back button */}
      <div className="sticky top-0 bg-gray-950/80 backdrop-blur-sm z-10 border-b border-gray-800">
        <div className="flex items-center p-4">
          <button
            onClick={() => router.back()}
            className="mr-4 text-gray-400 hover:text-white"
            aria-label="Go back"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-xl font-bold">Podcast</h1>
        </div>
      </div>
      
      <div className="max-w-3xl mx-auto px-4">
        {/* Podcast header with cover image */}
        <div className="mt-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Cover image */}
          <div className="w-64 h-64 relative rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={podcast.coverImage || `https://placehold.co/500/5f33e1/ffffff?text=${podcast.title[0]}`}
              alt={podcast.title}
              width={256}
              height={256}
              className="object-cover"
            />
          </div>
          
          {/* Podcast details */}
          <div className="flex-1">
            {isEditing ? (
              <div className="border border-gray-600 rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-2">Edit Podcast</h3>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                    placeholder="Podcast title"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white h-24"
                    placeholder="Podcast description"
                  />
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleSaveEdit}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center"
                  >
                    <FaSave className="mr-2" /> Save
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
                  >
                    <FaTimes className="mr-2" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{podcast.title}</h2>
                  <p className="text-gray-400 text-sm">{podcast.description}</p>
                </div>
                {isOwner() && (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full"
                    aria-label="Edit podcast"
                  >
                    <FaEdit />
                  </button>
                )}
              </div>
            )}
            
            <Link href={`/profile/${podcast.user.id}`} className="text-gray-300 hover:underline inline-flex items-center gap-2 mb-4">
              <div className="w-5 h-5 relative rounded-full overflow-hidden">
                <Image
                  src={podcast.user.image || `https://placehold.co/40/5f33e1/ffffff?text=${podcast.user.name[0]}`}
                  alt={podcast.user.name}
                  width={20}
                  height={20}
                  className="object-cover"
                />
              </div>
              {podcast.user.name}
            </Link>
            
            <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
              <span>{formatDate(podcast.createdAt)}</span>
              <span>•</span>
              <span>{formatDuration(podcast.duration)} duration</span>
              <span>•</span>
              <span>{podcast.listens || 0} listens</span>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={togglePlay}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full flex items-center space-x-2 transition-colors"
          >
            {isPlaying ? (
              <>
                <FaPause className="mr-2" /> Pause
              </>
            ) : (
              <>
                <FaPlay className="mr-2" /> Play
              </>
            )}
          </button>
          
          <button
            onClick={toggleLike}
            className={`${isLiked ? 'text-primary-600' : 'text-gray-400'} hover:text-primary-600 px-3 py-2 rounded-full flex items-center transition-colors`}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            {isLiked ? <FaHeart className="mr-2" /> : <FaRegHeart className="mr-2" />}
            <span>{podcast.likes || 0}</span>
          </button>
          
          <button
            onClick={handleShare}
            className="text-gray-400 hover:text-primary-600 px-3 py-2 rounded-full flex items-center transition-colors"
            aria-label="Share"
          >
            <FaShareAlt className="mr-2" />
            <span>Share</span>
          </button>
        </div>
        
        {/* Comments section */}
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-6 flex items-center">
            <FaComment className="mr-2" />
            Comments ({comments.length})
          </h3>
          
          {/* Comment form */}
          <form onSubmit={handleCommentSubmit} className="mb-8">
            <div className="flex space-x-3">
              {/* User avatar */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden relative">
                  <Image
                    src={user?.user_metadata?.avatar_url || `https://placehold.co/100x100`}
                    alt={user?.user_metadata?.full_name || 'User'}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
              </div>
              
              {/* Comment input */}
              <div className="flex-1">
                <textarea
                  className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
                  placeholder="Add your comment..."
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  maxLength={280}
                />
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {comment.length}/280
                  </span>
                  <button 
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!comment.trim() || !user}
                  >
                    <FaPaperPlane size={14} className="mr-2" />
                    <span>Comment</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
          
          {/* Comments list */}
          <div className="space-y-6">
            {comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="flex space-x-3">
                  {/* User avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden relative">
                      <Image
                        src={comment.user.image || `https://placehold.co/100x100`}
                        alt={comment.user.name}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Comment content */}
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-bold">{comment.user.name}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-300">{comment.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <FaComment className="mx-auto mb-3 text-2xl" />
                <p>No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastDetailPage;