'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHome, FaCompass, FaUser, FaMicrophone, FaCog, FaSignOutAlt, FaInbox, FaBell } from 'react-icons/fa';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import Image from 'next/image';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: FaHome },
  { name: 'Explore', href: '/explore', icon: FaCompass },
  { name: 'Profile', href: '/profile', icon: FaUser },
  { name: 'Record', href: '/record', icon: FaMicrophone },
  { name: 'Messages', href: '/messages', icon: FaInbox },
  { name: 'Notifications', href: '/notifications', icon: FaBell },
  { name: 'Settings', href: '/settings', icon: FaCog },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useSupabase();
  
  return (
    <div className="h-screen sticky top-0 w-64 bg-gray-900 border-r border-gray-800 py-4 flex flex-col">
      <div className="px-4 mb-6">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Podcast App Logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full"
          />
          <span className="ml-2 text-xl font-bold">PodcastApp</span>
        </Link>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-1 px-2">
          {navigationItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm rounded-lg hover:bg-gray-800 transition-colors ${
                  pathname === item.href ? 'bg-gray-800 text-white font-medium' : 'text-gray-400'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="px-4 mt-6 mb-4">
        <button
          onClick={() => signOut()}
          className="flex items-center px-4 py-3 text-sm text-gray-400 rounded-lg hover:bg-gray-800 transition-colors w-full"
        >
          <FaSignOutAlt className="h-5 w-5 mr-3" />
          Sign Out
        </button>
      </div>
      
      {user && (
        <div className="px-4 py-3 border-t border-gray-800 mt-auto">
          <div className="flex items-center">
            <Image
              src={user.user_metadata?.avatar_url || '/default-avatar.png'}
              alt={user.user_metadata?.full_name || 'User'}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full"
            />
            <div className="ml-2">
              <p className="text-sm font-medium">{user.user_metadata?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 