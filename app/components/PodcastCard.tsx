'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FaPlay, FaHeart, FaComment, FaShare, FaLock, FaGlobe } from 'react-icons/fa'
import { formatDistanceToNow } from 'date-fns'

interface Podcast {
  id: string
  title: string
  description: string
  coverImage?: string
  audioUrl: string
  duration?: number
  createdAt: string
  user?: {
    id: string
    name?: string
    image?: string
  }
  listens?: number
  likes?: number
  comments?: number
  isPublic?: boolean
}

interface PodcastCardProps {
  podcast: Podcast
}

export default function PodcastCard({ podcast }: PodcastCardProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 w-full">
        <Image
          src={podcast.coverImage || '/default-podcast-cover.jpg'}
          alt={podcast.title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <button className="absolute bottom-4 left-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 transition-colors">
          <FaPlay />
        </button>
        <div className="absolute bottom-4 right-4 text-white text-sm">
          {formatDuration(podcast.duration)}
        </div>
        {podcast.isPublic !== undefined && (
          <div className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2">
            {podcast.isPublic ? <FaGlobe /> : <FaLock />}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <Link href={`/podcasts/${podcast.id}`}>
          <h3 className="text-lg font-semibold mb-1 hover:text-indigo-400 transition-colors">
            {podcast.title}
          </h3>
        </Link>
        
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
          {podcast.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {podcast.user && (
              <>
                <Image
                  src={podcast.user.image || '/default-avatar.png'}
                  alt={podcast.user.name || 'User'}
                  width={24}
                  height={24}
                  className="rounded-full mr-2"
                />
                <span className="text-sm text-gray-300">{podcast.user.name || 'User'}</span>
              </>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(podcast.createdAt), { addSuffix: true })}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
          <div className="flex items-center space-x-4">
            <button className="flex items-center text-gray-400 hover:text-indigo-400 transition-colors">
              <FaPlay className="mr-1" />
              <span className="text-xs">{podcast.listens || 0}</span>
            </button>
            <button className="flex items-center text-gray-400 hover:text-red-400 transition-colors">
              <FaHeart className="mr-1" />
              <span className="text-xs">{podcast.likes || 0}</span>
            </button>
            <button className="flex items-center text-gray-400 hover:text-blue-400 transition-colors">
              <FaComment className="mr-1" />
              <span className="text-xs">{podcast.comments || 0}</span>
            </button>
          </div>
          <button className="text-gray-400 hover:text-white transition-colors">
            <FaShare />
          </button>
        </div>
      </div>
    </div>
  )
} 