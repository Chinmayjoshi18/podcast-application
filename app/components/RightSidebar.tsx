'use client';

import { useState } from 'react'
import { FaSearch, FaUser, FaPlus } from 'react-icons/fa'
import Image from 'next/image'
import Link from 'next/link'

export default function RightSidebar() {
  const [searchQuery, setSearchQuery] = useState('')

  // Mock trending topics
  const trendingTopics = [
    { id: 1, name: 'Technology', count: '2,543 podcasts' },
    { id: 2, name: 'Business', count: '1,876 podcasts' },
    { id: 3, name: 'Health & Wellness', count: '1,432 podcasts' },
    { id: 4, name: 'Entertainment', count: '1,298 podcasts' },
    { id: 5, name: 'Education', count: '987 podcasts' },
  ]

  // Mock users to follow
  const suggestedUsers = [
    { 
      id: 1, 
      name: 'Alex Johnson', 
      username: 'alexjohnson', 
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      bio: 'Tech podcaster & software engineer'
    },
    { 
      id: 2, 
      name: 'Sarah Williams', 
      username: 'sarahpodcasts', 
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      bio: 'Business & entrepreneurship podcaster'
    },
    { 
      id: 3, 
      name: 'Michael Chen', 
      username: 'miketalks', 
      avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
      bio: 'Health & wellness podcast host'
    },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle search logic here
    console.log('Searching for:', searchQuery)
  }

  return (
    <div className="h-screen py-4 px-6 overflow-y-auto">
      {/* Search bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search podcasts"
              className="w-full bg-gray-800 border-none rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
          </div>
        </form>
      </div>

      {/* Trending topics */}
      <div className="bg-gray-800 rounded-xl mb-6">
        <h2 className="text-xl font-bold px-4 pt-4 pb-2">Trending Topics</h2>
        <div className="divide-y divide-gray-700">
          {trendingTopics.map((topic) => (
            <Link 
              key={topic.id} 
              href={`/topics/${topic.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="block px-4 py-3 hover:bg-gray-700 transition-colors"
            >
              <p className="font-bold">{topic.name}</p>
              <p className="text-sm text-gray-400">{topic.count}</p>
            </Link>
          ))}
        </div>
        <Link 
          href="/topics" 
          className="block px-4 py-3 text-primary hover:bg-gray-700 transition-colors rounded-b-xl"
        >
          Show more
        </Link>
      </div>

      {/* Who to follow */}
      <div className="bg-gray-800 rounded-xl">
        <h2 className="text-xl font-bold px-4 pt-4 pb-2">Who to Follow</h2>
        <div className="divide-y divide-gray-700">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="px-4 py-3 hover:bg-gray-700 transition-colors">
              <div className="flex items-start">
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={48}
                  height={48}
                  className="rounded-full h-12 w-12 object-cover mr-3"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <p className="font-bold truncate">{user.name}</p>
                      <p className="text-gray-400 text-sm truncate">@{user.username}</p>
                    </div>
                    <button className="ml-2 flex-shrink-0 bg-white text-black font-bold rounded-full px-4 py-1.5 hover:bg-gray-200 transition-colors">
                      Follow
                    </button>
                  </div>
                  <p className="text-sm mt-1 line-clamp-2">{user.bio}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Link 
          href="/explore/people" 
          className="block px-4 py-3 text-primary hover:bg-gray-700 transition-colors rounded-b-xl"
        >
          Show more
        </Link>
      </div>
    </div>
  )
} 