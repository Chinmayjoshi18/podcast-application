'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  FaMicrophone, 
  FaHome, 
  FaCompass, 
  FaUser, 
  FaSignOutAlt, 
  FaHashtag, 
  FaBell, 
  FaEnvelope,
  FaBookmark,
  FaCog,
  FaPlus,
  FaSearch,
  FaHeadphones
} from 'react-icons/fa';
import Image from 'next/image';
import toast from 'react-hot-toast';
import MessageNotificationBadge from './MessageNotificationBadge';

const Sidebar = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch notification count (this would be replaced with real API call)
  useEffect(() => {
    if (session) {
      // Simulating API call for notifications
      setNotificationCount(3);
    }
  }, [session]);

  const isLoggedIn = status === 'authenticated';

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
    toast.success('Logged out successfully');
  };

  const sidebarLinks = [
    { name: 'Home', href: '/', icon: <FaHome className="h-6 w-6" /> },
    { name: 'Messages', href: '/messages', icon: <FaEnvelope className="h-6 w-6" /> },
    { name: 'Explore', href: '/explore', icon: <FaCompass className="h-6 w-6" /> },
    { name: 'Saved', href: '/saved', icon: <FaBookmark className="h-6 w-6" /> },
    ...(isLoggedIn
      ? [
          { name: 'Notifications', href: '/notifications', icon: <FaBell className="h-6 w-6" />, count: notificationCount },
          { name: 'Topics', href: '/topics', icon: <FaHashtag className="h-6 w-6" /> },
          { name: 'Dashboard', href: '/dashboard', icon: <FaUser className="h-6 w-6" /> },
          { name: 'Settings', href: '/settings', icon: <FaCog className="h-6 w-6" /> },
        ]
      : []),
  ];

  return (
    <div className="h-screen sticky top-0 text-white py-2 flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Logo */}
        <div className="px-3 mb-6">
          <Link href="/" className="flex items-center justify-center rounded-full p-3 hover:bg-gray-800 w-fit">
            <FaMicrophone className="h-7 w-7 text-white" />
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="mb-6">
          <ul className="space-y-1">
            {sidebarLinks.map((link) => (
              <li key={link.name} className="mb-2">
                <Link
                  href={link.href}
                  className={`flex items-center p-3 rounded-lg ${
                    pathname === link.href
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  } transition-colors`}
                >
                  <div className="relative">
                    {link.icon}
                    {link.name === 'Messages' && <MessageNotificationBadge />}
                    {link.count && link.count > 0 && link.name !== 'Messages' && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {link.count > 9 ? '9+' : link.count}
                      </span>
                    )}
                  </div>
                  <span className="ml-4">{link.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* User Profile Section */}
      {isLoggedIn ? (
        <div className="px-3 py-3 mt-auto">
          <button 
            onClick={handleSignOut}
            className="flex items-center text-left w-full rounded-full hover:bg-gray-800 p-3"
          >
            <div className="flex-shrink-0">
              {session?.user?.image ? (
                <Image
                  className="h-10 w-10 rounded-full"
                  src={session.user.image}
                  alt="User avatar"
                  width={40}
                  height={40}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3 hidden xl:block">
              <p className="font-bold">{session?.user?.name || 'User'}</p>
              <p className="text-gray-400 text-sm">@{session?.user?.name?.replace(/\s+/g, '').toLowerCase() || 'user'}</p>
            </div>
            <FaSignOutAlt className="ml-auto h-5 w-5 hidden xl:block text-gray-400" />
          </button>
        </div>
      ) : (
        <div className="px-3 py-3 mt-auto">
          <Link
            href="/login"
            className="flex items-center justify-center bg-transparent border border-primary-500 text-primary-500 hover:bg-primary-500/10 font-bold rounded-full px-4 py-2 w-full transition-colors mb-2"
          >
            <span className="hidden xl:block">Log in</span>
            <FaUser className="h-5 w-5 xl:hidden" />
          </Link>
          <Link
            href="/signup"
            className="flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-full px-4 py-2 w-full transition-colors"
          >
            <span className="hidden xl:block">Sign up</span>
            <FaPlus className="h-5 w-5 xl:hidden" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 