'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function MessageNotificationBadge() {
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Fetch unread message count
  useEffect(() => {
    if (status === 'authenticated') {
      const fetchUnreadCount = async () => {
        try {
          const response = await fetch('/api/messages/unread');
          if (response.ok) {
            const data = await response.json();
            setUnreadCount(data.count);
          }
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };
      
      // Fetch immediately
      fetchUnreadCount();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      
      return () => clearInterval(interval);
    }
  }, [status]);
  
  if (unreadCount === 0) return null;
  
  return (
    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </div>
  );
} 