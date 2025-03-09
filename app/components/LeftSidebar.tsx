'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabaseAuth } from '../providers/SupabaseAuthProvider';
import { FaHome, FaSearch, FaBell, FaEnvelope, FaBookmark, FaUser, FaMicrophone, FaSignOutAlt } from 'react-icons/fa';
import Image from 'next/image';

export default function LeftSidebar() {
  const { user, signOut } = useSupabaseAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Navigation links
  const navItems = [
    { label: 'Home', href: '/dashboard', icon: <FaHome className="w-6 h-6" /> },
    { label: 'Explore', href: '/explore', icon: <FaSearch className="w-6 h-6" /> },
    { label: 'Notifications', href: '/notifications', icon: <FaBell className="w-6 h-6" /> },
    { label: 'Messages', href: '/messages', icon: <FaEnvelope className="w-6 h-6" /> },
    { label: 'Bookmarks', href: '/bookmarks', icon: <FaBookmark className="w-6 h-6" /> },
    { label: 'Profile', href: '/profile', icon: <FaUser className="w-6 h-6" /> },
  ];

  return (
    <div className="w-64 p-4 h-screen sticky top-0">
      <div className="flex flex-col h-full justify-between">
        <div className="space-y-6">
          {/* App Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <FaMicrophone className="text-white" />
            </div>
            <span className="text-xl font-bold">PodcastApp</span>
          </Link>

          {/* Navigation */}
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-4 p-3 rounded-full hover:bg-gray-800 transition ${
                  pathname === item.href ? 'font-bold bg-gray-800' : ''
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Record Button */}
          <Link
            href="/record"
            className="flex items-center justify-center w-full p-3 bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 transition mt-6"
          >
            Record Podcast
          </Link>
        </div>

        {/* User Profile Section */}
        {user && (
          <div className="flex items-center justify-between mt-auto p-3 hover:bg-gray-800 rounded-full cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700">
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.name || 'User'}
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FaUser />
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold">{user.user_metadata?.name || 'User'}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>
            <button onClick={handleSignOut} className="text-gray-400 hover:text-white">
              <FaSignOutAlt />
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 