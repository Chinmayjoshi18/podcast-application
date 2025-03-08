'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { FaMicrophone, FaUserCircle, FaBell, FaSearch, FaBars, FaTimes } from 'react-icons/fa';
import Image from 'next/image';

const Navigation = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Fetch notification count (this would be replaced with real API call)
  useEffect(() => {
    if (session) {
      // Simulating API call for notifications
      setNotificationCount(3);
    }
  }, [session]);

  const isLoggedIn = status === 'authenticated';

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Explore', href: '/explore' },
    ...(isLoggedIn
      ? [
          { name: 'Dashboard', href: '/dashboard' },
        ]
      : []),
  ];

  const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled
      ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md'
      : 'bg-transparent'
  }`;

  return (
    <nav className={navClasses}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between h-16">
          {/* Logo & brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <FaMicrophone className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold">PodcastApp</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === link.href
                      ? 'text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* User section */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center space-x-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/notifications"
                    className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    <FaBell className="h-5 w-5" />
                    {notificationCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                        {notificationCount}
                      </span>
                    )}
                  </Link>
                  <div className="relative group">
                    <button className="flex items-center text-sm rounded-full focus:outline-none">
                      {session?.user?.image ? (
                        <Image
                          className="h-8 w-8 rounded-full"
                          src={session.user.image}
                          alt="User avatar"
                          width={32}
                          height={32}
                        />
                      ) : (
                        <FaUserCircle className="h-8 w-8 text-gray-500" />
                      )}
                    </button>
                    <div className="absolute right-0 mt-2 w-48 py-2 bg-white dark:bg-gray-800 rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        {session?.user?.name || 'User'}
                      </div>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            >
              {isMenuOpen ? (
                <FaTimes className="h-6 w-6" />
              ) : (
                <FaBars className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-900 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname === link.href
                  ? 'text-primary-600 dark:text-primary-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {isLoggedIn ? (
            <>
              <Link
                href="/notifications"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              >
                Notifications {notificationCount > 0 && `(${notificationCount})`}
              </Link>
              <Link
                href="/settings"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              >
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <FaUserCircle className="h-8 w-8 text-gray-500" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                    Guest
                  </div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="block px-3 py-2 rounded-md text-base font-medium bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;