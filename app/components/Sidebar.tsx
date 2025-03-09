'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FaHome, 
  FaCompass, 
  FaUser, 
  FaMicrophone, 
  FaSignOutAlt, 
  FaInbox, 
  FaBell,
  FaBookmark, 
  FaHashtag,
  FaCog,
  FaPlus 
} from 'react-icons/fa';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useSupabase();
  
  const handleSignOut = async () => {
    await signOut();
    toast.success('Successfully signed out');
  };
  
  const navigationItems = [
    { name: 'Home', href: '/dashboard', icon: FaHome },
    { name: 'Explore', href: '/explore', icon: FaCompass },
    { name: 'Notifications', href: '/notifications', icon: FaBell },
    { name: 'Messages', href: '/messages', icon: FaInbox },
    { name: 'Topics', href: '/topics', icon: FaHashtag },
    { name: 'Saved', href: '/saved', icon: FaBookmark },
    { name: 'Profile', href: '/profile', icon: FaUser },
  ];
  
  const bottomItems = [
    { name: 'Settings', href: '/settings', icon: FaCog },
  ];
  
  return (
    <div className="h-screen flex flex-col py-4 px-3">
      {/* Logo */}
      <div className="px-3 mb-6">
        <Link href="/dashboard" className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <FaMicrophone className="h-6 w-6 text-white" />
          </div>
        </Link>
      </div>
      
      {/* Main navigation */}
      <nav className="flex-1 mb-6">
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center px-4 py-3 text-xl rounded-full hover:bg-gray-800 transition-colors ${
                  pathname === item.href ? 'font-bold' : 'font-normal text-gray-300'
                }`}
              >
                <item.icon className="h-6 w-6 mr-4" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Record button */}
      <div className="px-3 mb-6">
        <Link
          href="/record"
          className="flex items-center justify-center bg-primary hover:bg-primary/90 transition-colors rounded-full py-3 px-6 w-full"
        >
          <FaPlus className="h-5 w-5 mr-2" />
          <span className="font-bold">Record</span>
        </Link>
      </div>
      
      {/* Bottom navigation */}
      <nav className="mb-6">
        <ul className="space-y-2">
          {bottomItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center px-4 py-3 text-xl rounded-full hover:bg-gray-800 transition-colors ${
                  pathname === item.href ? 'font-bold' : 'font-normal text-gray-300'
                }`}
              >
                <item.icon className="h-6 w-6 mr-4" />
                {item.name}
              </Link>
            </li>
          ))}
          <li>
            <button
              onClick={handleSignOut}
              className="flex items-center px-4 py-3 text-xl rounded-full hover:bg-gray-800 transition-colors text-gray-300 w-full text-left"
            >
              <FaSignOutAlt className="h-6 w-6 mr-4" />
              Sign Out
            </button>
          </li>
        </ul>
      </nav>
      
      {/* User profile */}
      {user && (
        <div className="mt-auto px-3">
          <div className="flex items-center p-3 rounded-full hover:bg-gray-800 transition-colors">
            <Image
              src={user.user_metadata?.avatar_url || '/default-avatar.png'}
              alt={user.user_metadata?.full_name || 'User'}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full mr-3"
            />
            <div className="hidden lg:block">
              <p className="font-bold truncate max-w-[120px]">{user.user_metadata?.full_name || 'User'}</p>
              <p className="text-gray-500 text-sm truncate max-w-[120px]">@{user.user_metadata?.username || user.email?.split('@')[0]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 