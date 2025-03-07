'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FaHeart, 
  FaComment, 
  FaUserPlus, 
  FaPodcast, 
  FaBell, 
  FaCheck, 
  FaEllipsisH, 
  FaTrash
} from 'react-icons/fa';
import toast from 'react-hot-toast';

// Mock notifications data
const mockNotifications = [
  {
    id: 'n1',
    type: 'new_follower',
    content: 'started following you',
    isRead: false,
    createdAt: '2023-07-18T10:30:00Z',
    sender: {
      id: 'user2',
      name: 'Jamie Smith',
      image: 'https://via.placeholder.com/40',
    },
  },
  {
    id: 'n2',
    type: 'like',
    content: 'liked your podcast "The Creative Mind"',
    isRead: false,
    createdAt: '2023-07-17T15:45:00Z',
    sender: {
      id: 'user3',
      name: 'Taylor Green',
      image: 'https://via.placeholder.com/40',
    },
    podcast: {
      id: '1',
      title: 'The Creative Mind',
    },
  },
  {
    id: 'n3',
    type: 'comment',
    content: 'commented on your podcast "Tech Today"',
    isRead: true,
    createdAt: '2023-07-16T09:15:00Z',
    sender: {
      id: 'user4',
      name: 'Morgan Lee',
      image: 'https://via.placeholder.com/40',
    },
    podcast: {
      id: '2',
      title: 'Tech Today',
    },
  },
  {
    id: 'n4',
    type: 'new_podcast',
    content: 'published a new podcast "The Science of Sleep"',
    isRead: true,
    createdAt: '2023-07-15T14:20:00Z',
    sender: {
      id: 'user5',
      name: 'Riley Johnson',
      image: 'https://via.placeholder.com/40',
    },
    podcast: {
      id: '5',
      title: 'The Science of Sleep',
    },
  },
  {
    id: 'n5',
    type: 'new_follower',
    content: 'started following you',
    isRead: true,
    createdAt: '2023-07-14T11:10:00Z',
    sender: {
      id: 'user6',
      name: 'Casey Brown',
      image: 'https://via.placeholder.com/40',
    },
  },
];

const NotificationsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // In a real app, you would fetch notifications from the API
    if (status === 'authenticated') {
      setTimeout(() => {
        setNotifications(mockNotifications);
        setIsLoading(false);
      }, 1000);
    }
  }, [status]);

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true } 
          : notification
      )
    );
    
    // In a real app, you would send this to the API
    toast.success('Marked as read');
    setMenuOpen(null);
  };

  const handleDeleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
    
    // In a real app, you would send this to the API
    toast.success('Notification removed');
    setMenuOpen(null);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
    
    // In a real app, you would send this to the API
    toast.success('All notifications marked as read');
  };

  // Filter notifications based on active filter
  const filteredNotifications = (() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter(n => !n.isRead);
    if (activeFilter === 'followers') return notifications.filter(n => n.type === 'new_follower');
    if (activeFilter === 'podcasts') return notifications.filter(n => n.type === 'new_podcast');
    if (activeFilter === 'interactions') {
      return notifications.filter(n => n.type === 'like' || n.type === 'comment');
    }
    return notifications;
  })();

  // Format date to relative time (e.g., "2 hours ago")
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
    }
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  };

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_follower':
        return <FaUserPlus className="text-blue-500" />;
      case 'like':
        return <FaHeart className="text-red-500" />;
      case 'comment':
        return <FaComment className="text-green-500" />;
      case 'new_podcast':
        return <FaPodcast className="text-purple-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center text-primary-600 hover:text-primary-800"
            >
              <FaCheck className="mr-1" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
        
        {/* Filters */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex space-x-3 pb-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeFilter === 'unread'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setActiveFilter('followers')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeFilter === 'followers'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Followers
            </button>
            <button
              onClick={() => setActiveFilter('podcasts')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeFilter === 'podcasts'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Podcasts
            </button>
            <button
              onClick={() => setActiveFilter('interactions')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeFilter === 'interactions'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Interactions
            </button>
          </div>
        </div>
        
        {/* Notifications list */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 flex relative ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className="flex-shrink-0 mr-4">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden">
                      <Image
                        src={notification.sender.image}
                        alt={notification.sender.name}
                        layout="fill"
                        objectFit="cover"
                      />
                    </div>
                  </div>
                  <div className="flex-grow pr-10">
                    <div className="flex items-center mb-1">
                      <div className="mr-2">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <Link
                        href={`/profile/${notification.sender.id}`}
                        className="font-semibold hover:text-primary-600 transition-colors"
                      >
                        {notification.sender.name}
                      </Link>
                      <span className="ml-1">{notification.content}</span>
                    </div>
                    
                    {notification.podcast && (
                      <Link
                        href={`/podcasts/${notification.podcast.id}`}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        View podcast
                      </Link>
                    )}
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatRelativeTime(notification.createdAt)}
                    </div>
                  </div>
                  
                  <div className="absolute right-4 top-4">
                    <button
                      onClick={() => setMenuOpen(menuOpen === notification.id ? null : notification.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                    >
                      <FaEllipsisH />
                    </button>
                    
                    {menuOpen === notification.id && (
                      <div className="absolute right-0 mt-2 w-48 py-1 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                          >
                            <FaCheck className="mr-2" />
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                          <FaTrash className="mr-2" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <FaBell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {activeFilter === 'all' ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No notifications</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    You don't have any notifications yet.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No matching notifications</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No notifications match your current filter.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;