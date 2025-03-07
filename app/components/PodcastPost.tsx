'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaPlay, FaPause, FaHeart, FaRegHeart, FaComment, FaShareAlt, FaEllipsisH } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { Podcast } from '@/lib/storage';
import CommentModal from './CommentModal';

interface PodcastPostProps {
  podcast: Podcast;
  isPlaying: boolean;
  onPlayToggle: (podcastId: string) => void;
  onLikeToggle: (podcastId: string) => void;
  isLiked: boolean;
  commentCount?: number;
}

const PodcastPost = ({ podcast, isPlaying, onPlayToggle, onLikeToggle, isLiked, commentCount = 0 }: PodcastPostProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [likeCount, setLikeCount] = useState(podcast.likes || 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || typeof seconds !== 'number') return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
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

  const handleMenuToggle = () => {
    setShowMenu(!showMenu);
  };

  const handleReport = () => {
    toast.success('Report submitted');
    setShowMenu(false);
  };

  const handleLikeToggle = () => {
    // Update the local like count when the user likes/unlikes
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    onLikeToggle(podcast.id);
  };

  const handleOpenComments = () => {
    setShowCommentModal(true);
  };

  return (
    <div className="border-b border-gray-800 p-4 hover:bg-gray-900/50 transition-colors">
      <div className="flex">
        {/* User avatar */}
        <div className="mr-3 flex-shrink-0">
          <Link href={`/profile/${podcast.user.id}`}>
            <div className="w-12 h-12 rounded-full overflow-hidden relative">
              <Image
                src={podcast.user.image || `https://placehold.co/100/5f33e1/ffffff?text=${podcast.user.name[0]}`}
                alt={podcast.user.name}
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
          </Link>
        </div>

        {/* Post content */}
        <div className="flex-1 min-w-0">
          {/* Post header */}
          <div className="flex items-center">
            <Link href={`/profile/${podcast.user.id}`} className="font-bold hover:underline">
              {podcast.user.name}
            </Link>
            <span className="text-gray-500 mx-1">·</span>
            <span className="text-gray-500 text-sm">{formatDate(podcast.createdAt)}</span>
            <div className="ml-auto relative">
              <button 
                onClick={handleMenuToggle}
                aria-label="More options"
                className="text-gray-500 hover:text-primary-500 p-2"
              >
                <FaEllipsisH />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-10">
                  <button
                    onClick={handleReport}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Report podcast
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Not interested
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Podcast title and description */}
          <Link href={`/podcasts/${podcast.id}`}>
            <h3 className="font-bold text-lg mb-1 hover:underline">{podcast.title}</h3>
            <p className="text-gray-300 mb-3 line-clamp-2">{podcast.description}</p>
          </Link>

          {/* Podcast player card */}
          <div className="bg-gray-800 rounded-xl overflow-hidden mb-3">
            <div className="flex items-center">
              {/* Podcast cover image */}
              <div className="w-16 h-16 relative">
                <Image
                  src={podcast.coverImage || `https://placehold.co/100/5f33e1/ffffff?text=${podcast.title[0]}`}
                  alt={podcast.title}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </div>
              
              {/* Player info */}
              <div className="flex-1 px-3 py-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400">PODCAST</p>
                    <p className="text-sm line-clamp-1">{formatDuration(podcast.duration)} duration</p>
                  </div>
                  <button
                    onClick={() => onPlayToggle(podcast.id)}
                    className="bg-primary-500 hover:bg-primary-600 text-white rounded-full p-2 transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <FaPause /> : <FaPlay />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Post actions */}
          <div className="flex justify-between max-w-md">
            <button 
              className="text-gray-500 hover:text-primary-500 flex items-center space-x-1 group"
              onClick={handleLikeToggle}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <div className="p-2 rounded-full group-hover:bg-primary-500/20 transition-colors">
                {isLiked ? <FaHeart className="text-primary-500" /> : <FaRegHeart />}
              </div>
              <span className={isLiked ? 'text-primary-500' : ''}>{likeCount}</span>
            </button>
            
            <button 
              className="text-gray-500 hover:text-primary-500 flex items-center space-x-1 group"
              onClick={handleOpenComments}
              aria-label="Comment"
            >
              <div className="p-2 rounded-full group-hover:bg-primary-500/20 transition-colors">
                <FaComment />
              </div>
              <span>{commentCount}</span>
            </button>
            
            <button 
              className="text-gray-500 hover:text-primary-500 flex items-center space-x-1 group"
              onClick={handleShare}
              aria-label="Share"
            >
              <div className="p-2 rounded-full group-hover:bg-primary-500/20 transition-colors">
                <FaShareAlt />
              </div>
              <span>{podcast.listens}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        podcastId={podcast.id}
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
      />
    </div>
  );
};

export default PodcastPost; 