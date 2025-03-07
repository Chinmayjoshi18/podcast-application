'use client';

import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  // For non-authenticated users, render children directly without the three-column structure
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // For authenticated users, render the three-column structure
  return (
    <div className="min-h-screen flex justify-center">
      <div className="flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar - fixed width like Twitter */}
        <div className="w-[275px] min-w-[275px]">
          <Sidebar />
        </div>
        
        {/* Main Content - 600px fixed width like Twitter */}
        <main className="w-[600px] min-w-[600px] min-h-screen border-l border-r border-gray-800">
          {children}
        </main>
        
        {/* Right Sidebar - fixed width like Twitter */}
        <div className="w-[350px] min-w-[350px]">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
} 