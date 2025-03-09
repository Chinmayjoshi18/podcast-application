'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/providers/SupabaseProvider';

export default function MessageNotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useSupabase();

  useEffect(() => {
    // Only fetch unread messages if user is authenticated
    if (user) {
      // In a real application, you would fetch this from your API
      // For now, just simulate with a random number
      const count = Math.floor(Math.random() * 5);
      setUnreadCount(count);
    }
  }, [user]);

  if (!user || unreadCount === 0) {
    return null;
  }

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
} 