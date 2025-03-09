'use client';

import React from 'react';
import { FaSearch } from 'react-icons/fa';

export default function RightSidebar() {
  return (
    <div className="w-64 p-4 h-screen sticky top-0 overflow-y-auto">
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search podcasts..."
            className="w-full p-3 pl-10 bg-gray-800 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>

        {/* Trending Topics */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h2 className="text-xl font-bold mb-4">Trending Now</h2>
          <div className="space-y-4">
            {['Technology', 'Business', 'Health & Wellness', 'Entertainment', 'Education'].map((topic) => (
              <div key={topic} className="cursor-pointer hover:bg-gray-700 p-2 rounded-lg transition">
                <h3 className="font-medium">{topic}</h3>
                <p className="text-sm text-gray-400">Trending in Podcasts</p>
              </div>
            ))}
          </div>
        </div>

        {/* Who to Follow */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h2 className="text-xl font-bold mb-4">Who to Follow</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
                  <div>
                    <p className="font-medium">Podcaster {i}</p>
                    <p className="text-sm text-gray-400">@podcaster{i}</p>
                  </div>
                </div>
                <button className="bg-white text-black px-4 py-1 rounded-full text-sm font-bold hover:bg-opacity-90 transition">
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 