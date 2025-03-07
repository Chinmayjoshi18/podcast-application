'use client';

import { useState } from 'react';
import { FaRegComment, FaTimes, FaPaperPlane } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface CommentModalProps {
  podcastId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CommentModal = ({ podcastId, isOpen, onClose }: CommentModalProps) => {
  const { data: session } = useSession();
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error('Please sign in to comment');
      return;
    }
    
    if (!comment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    // In a real app, this would save to a database
    // For now, we'll just show a success message
    toast.success('Comment added!');
    setComment('');
    
    // In a real implementation, you would save the comment and then:
    // 1. Update a comments state in the parent component
    // 2. Optionally close the modal after successful comment
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close on escape key
    if (e.key === 'Escape') onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      {/* Modal content */}
      <div 
        className="bg-gray-900 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <h3 className="font-bold text-lg">Add Comment</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Comment form */}
        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto">
          <div className="flex space-x-3">
            {/* User avatar */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden relative">
                <Image
                  src={session?.user?.image || `https://placehold.co/100x100`}
                  alt={session?.user?.name || 'User'}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            </div>
            
            {/* Comment input */}
            <div className="flex-1">
              <textarea
                className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
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
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-full flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!comment.trim()}
                >
                  <FaPaperPlane size={14} />
                  <span>Comment</span>
                </button>
              </div>
            </div>
          </div>
        </form>
        
        {/* Optional: Show existing comments here */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center justify-center text-gray-500">
            <FaRegComment className="mr-2" />
            <span>No comments yet. Be the first to comment!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentModal; 