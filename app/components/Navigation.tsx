'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHome, FaCompass, FaMicrophone, FaSearch, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import { toast } from 'react-hot-toast';

const Navigation = () => {
  const pathname = usePathname();
  const { user, signOut } = useSupabase();
  
  const handleSignOut = async () => {
    await signOut();
    toast.success('Logged out successfully');
  };
  
  const navItems = [
    { name: 'Home', href: '/', icon: <FaHome size={20} /> },
    { name: 'Explore', href: '/explore', icon: <FaCompass size={20} /> },
    { name: 'Record', href: '/record', icon: <FaMicrophone size={20} /> },
    { name: 'Search', href: '/search', icon: <FaSearch size={20} /> },
    { name: 'Settings', href: '/settings', icon: <FaCog size={20} /> },
  ];
  
  return (
    <nav className="bg-gray-800 p-4 h-full">
      <div className="flex flex-col h-full">
        <div className="space-y-6 flex-1">
          {navItems.map(item => (
            <Link 
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                pathname === item.href ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
        
        {user && (
          <button 
            onClick={handleSignOut}
            className="flex items-center space-x-3 p-2 text-red-400 hover:bg-gray-700 hover:text-red-300 rounded-lg transition-colors mt-auto"
          >
            <FaSignOutAlt size={20} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navigation;