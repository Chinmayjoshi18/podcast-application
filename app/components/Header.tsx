'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { FaSearch, FaBell, FaEnvelope, FaUser } from 'react-icons/fa';
import Image from 'next/image';
import MessageNotificationBadge from './MessageNotificationBadge';

const Header = () => {
  const { user } = useSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search logic here
    console.log('Search for:', searchQuery);
  };

  return (
    <header className="sticky top-0 z-20 bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-white">
            PodcastApp
          </Link>
        </div>
        
        {/* User menu or login button */}
        <div>
          {user ? (
            <div className="flex items-center">
              <Link href="/profile" className="flex items-center">
                <div className="w-8 h-8 relative rounded-full overflow-hidden">
                  <Image 
                    src={user.user_metadata?.avatar_url || "/default-avatar.png"} 
                    alt={user.user_metadata?.full_name || "User"}
                    fill
                    className="object-cover"
                  />
                </div>
              </Link>
            </div>
          ) : (
            <Link href="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full">
              Log in
            </Link>
          )}
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gray-900 border-t border-gray-800 lg:hidden">
        <div className="flex justify-around">
          <Link href="/" className="py-3 flex flex-col items-center text-xs text-gray-400">
            <FaHome className="h-6 w-6 mb-1" />
            <span>Home</span>
          </Link>
          <Link href="/search" className="py-3 flex flex-col items-center text-xs text-gray-400">
            <FaSearch className="h-6 w-6 mb-1" />
            <span>Search</span>
          </Link>
          <Link href="/messages" className="py-3 flex flex-col items-center text-xs text-gray-400">
            <div className="relative">
              <FaEnvelope className="h-6 w-6 mb-1" />
              <MessageNotificationBadge />
            </div>
            <span>Messages</span>
          </Link>
          <Link href="/notifications" className="py-3 flex flex-col items-center text-xs text-gray-400">
            <div className="relative">
              <FaBell className="h-6 w-6 mb-1" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header; 