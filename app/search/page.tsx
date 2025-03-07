'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaSearch, FaPodcast, FaUser, FaHashtag, FaPlay } from 'react-icons/fa';

// Mock search results
const mockPodcasts = [
  {
    id: '1',
    title: 'The Creative Mind',
    description: 'Exploring creativity and innovation in various fields.',
    coverImage: 'https://via.placeholder.com/300',
    user: {
      id: 'user1',
      name: 'Alex Johnson',
      image: 'https://via.placeholder.com/40',
    },
    listens: 1245,
  },
  {
    id: '2',
    title: 'Tech Today',
    description: 'The latest news and trends in technology.',
    coverImage: 'https://via.placeholder.com/300',
    user: {
      id: 'user2',
      name: 'Jamie Smith',
      image: 'https://via.placeholder.com/40',
    },
    listens: 876,
  },
  {
    id: '3',
    title: 'Mindful Living',
    description: 'Practices for a more mindful and intentional life.',
    coverImage: 'https://via.placeholder.com/300',
    user: {
      id: 'user4',
      name: 'Taylor Green',
      image: 'https://via.placeholder.com/40',
    },
    listens: 987,
  },
];

const mockUsers = [
  {
    id: 'user1',
    name: 'Alex Johnson',
    image: 'https://via.placeholder.com/100',
    bio: 'Podcast creator and audio storyteller.',
    followers: 257,
    podcastCount: 12,
  },
  {
    id: 'user2',
    name: 'Jamie Smith',
    image: 'https://via.placeholder.com/100',
    bio: 'Tech enthusiast and podcaster.',
    followers: 189,
    podcastCount: 8,
  },
  {
    id: 'user3',
    name: 'Morgan Lee',
    image: 'https://via.placeholder.com/100',
    bio: 'History buff and storyteller.',
    followers: 321,
    podcastCount: 15,
  },
];

const mockTags = [
  { id: 'tag1', name: 'Technology', podcastCount: 235 },
  { id: 'tag2', name: 'Business', podcastCount: 189 },
  { id: 'tag3', name: 'Health', podcastCount: 156 },
  { id: 'tag4', name: 'Education', podcastCount: 142 },
  { id: 'tag5', name: 'Entertainment', podcastCount: 213 },
];

const SearchPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'podcasts' | 'users' | 'tags'>('podcasts');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState({
    podcasts: [] as any[],
    users: [] as any[],
    tags: [] as any[],
  });
  const [hasSearched, setHasSearched] = useState(false);

  // Perform search when query parameter changes
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      // In a real app, you would call your API with the search query
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Filter mock data based on search query
      const filteredPodcasts = mockPodcasts.filter(podcast => 
        podcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        podcast.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        podcast.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      const filteredUsers = mockUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.bio.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      const filteredTags = mockTags.filter(tag => 
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setResults({
        podcasts: filteredPodcasts,
        users: filteredUsers,
        tags: filteredTags,
      });
      
      // Update active tab to the one with results (prioritize podcasts)
      if (filteredPodcasts.length > 0) {
        setActiveTab('podcasts');
      } else if (filteredUsers.length > 0) {
        setActiveTab('users');
      } else if (filteredTags.length > 0) {
        setActiveTab('tags');
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    // Update URL with search query
    router.push(`/search?q=${encodeURIComponent(query)}`);
    performSearch(query);
  };

  const totalResults = results.podcasts.length + results.users.length + results.tags.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Search</h1>
        
        {/* Search form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              className="input pl-10 py-3 text-lg"
              placeholder="Search podcasts, users, or topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 px-4 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              disabled={isSearching}
            >
              {isSearching ? (
                <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>
        
        {hasSearched && (
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-400">
              {isSearching ? (
                'Searching...'
              ) : totalResults > 0 ? (
                `Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${initialQuery}"`
              ) : (
                `No results found for "${initialQuery}"`
              )}
            </p>
          </div>
        )}
        
        {hasSearched && !isSearching && totalResults > 0 && (
          <>
            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('podcasts')}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'podcasts'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={results.podcasts.length === 0}
                >
                  <FaPodcast className="mr-2" />
                  Podcasts ({results.podcasts.length})
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={results.users.length === 0}
                >
                  <FaUser className="mr-2" />
                  Users ({results.users.length})
                </button>
                <button
                  onClick={() => setActiveTab('tags')}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'tags'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={results.tags.length === 0}
                >
                  <FaHashtag className="mr-2" />
                  Topics ({results.tags.length})
                </button>
              </nav>
            </div>
            
            {/* Results */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {activeTab === 'podcasts' && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.podcasts.map((podcast) => (
                    <Link
                      key={podcast.id}
                      href={`/podcasts/${podcast.id}`}
                      className="block hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div className="p-4 flex">
                        <div className="flex-shrink-0 w-16 h-16 mr-4 relative">
                          <Image
                            src={podcast.coverImage}
                            alt={podcast.title}
                            layout="fill"
                            objectFit="cover"
                            className="rounded-md"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
                            <FaPlay className="text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-1">{podcast.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                            by {podcast.user.name} • {podcast.listens} listens
                          </p>
                          <p className="text-gray-500 dark:text-gray-500 text-sm">
                            {podcast.description.length > 100
                              ? `${podcast.description.substring(0, 100)}...`
                              : podcast.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {activeTab === 'users' && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.users.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.id}`}
                      className="block hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div className="p-4 flex items-center">
                        <div className="flex-shrink-0 mr-4">
                          <div className="relative h-12 w-12 rounded-full overflow-hidden">
                            <Image
                              src={user.image}
                              alt={user.name}
                              layout="fill"
                              objectFit="cover"
                            />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold">{user.name}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {user.followers} followers • {user.podcastCount} podcasts
                          </p>
                          <p className="text-gray-500 dark:text-gray-500 text-sm">
                            {user.bio}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {activeTab === 'tags' && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/explore?tag=${encodeURIComponent(tag.name)}`}
                      className="block hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div className="p-4 flex items-center">
                        <div className="flex-shrink-0 mr-4 w-12 h-12 flex items-center justify-center bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full">
                          <FaHashtag className="text-xl" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{tag.name}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {tag.podcastCount} podcast{tag.podcastCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        
        {hasSearched && !isSearching && totalResults === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <FaSearch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No results found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              We couldn't find any podcasts, users, or topics matching "{initialQuery}".
              Try using different keywords or checking for typos.
            </p>
          </div>
        )}
        
        {!hasSearched && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <FaSearch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Search for podcasts, users, or topics
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Enter keywords in the search box above to find content you're interested in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;