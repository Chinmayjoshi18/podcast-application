'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import { useSupabase } from '../providers/SupabaseProvider';

// Routes that should use the dashboard layout (with sidebars)
const dashboardRoutes = [
  '/dashboard',
  '/explore',
  '/profile',
  '/messages',
  '/notifications',
  '/settings',
  '/record',
  '/podcasts',
  '/topics',
  '/saved',
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useSupabase();
  
  // Check if current path should use dashboard layout
  const isDashboardRoute = dashboardRoutes.some(route => pathname?.startsWith(route));
  
  // Don't show sidebars if not logged in or not on a dashboard route
  const showSidebars = !isLoading && user && isDashboardRoute;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto flex">
        {showSidebars && (
          <div className="w-64 lg:w-72 sticky top-0 h-screen overflow-y-auto border-r border-gray-800">
            <Sidebar />
          </div>
        )}
        
        <main className={`min-h-screen ${showSidebars ? 'flex-1 max-w-[600px] border-r border-gray-800' : 'w-full'}`}>
          <div className={`${showSidebars ? 'max-w-[600px]' : ''} w-full`}>
            {children}
          </div>
        </main>
        
        {showSidebars && (
          <div className="hidden lg:block w-80 sticky top-0 h-screen overflow-y-auto">
            <RightSidebar />
          </div>
        )}
      </div>
    </div>
  );
} 