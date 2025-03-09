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
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useSupabase();
  
  // Check if current path should use dashboard layout
  const isDashboardRoute = dashboardRoutes.some(route => pathname?.startsWith(route));
  
  // Don't show sidebars if not logged in or not on a dashboard route
  const showSidebars = !isLoading && user && isDashboardRoute;

  return (
    <div className="min-h-screen">
      <div className="flex">
        {showSidebars && <Sidebar />}
        <main className={`flex-1 ${showSidebars ? 'max-w-[600px] mx-auto' : 'w-full'}`}>
          {children}
        </main>
        {showSidebars && <RightSidebar />}
      </div>
    </div>
  );
} 