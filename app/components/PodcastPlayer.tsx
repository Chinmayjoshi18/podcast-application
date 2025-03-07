'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaStepBackward,
  FaStepForward,
  FaRedo,
} from 'react-icons/fa';
import toast from 'react-hot-toast';

interface PodcastPlayerProps {
  title: string;
  artist: string;
  coverImage: string;
  audioUrl: string;
  onEnded?: () => void;
}

const PodcastPlayer: React.FC<PodcastPlayerProps> = ({
  title,
  artist,
  coverImage,
  audioUrl,
  onEnded,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [prevVolume, setPrevVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Check if the audio URL is valid
    const isBase64 = audioUrl?.startsWith('data:audio');
    
    // Set the audio source based on the URL type
    if (isBase64) {
      audio.src = audioUrl;
    } else {
      audio.src = audioUrl;
    }

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
      setError(null);
    };

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleAudioError = () => {
      setError("Unable to load audio. The file might be corrupted or inaccessible.");
      toast.error("Error loading audio");
      console.error("Audio error:", audio.error);
    };

    // Events
    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnd);
    audio.addEventListener('error', handleAudioError);

    // Cleanup
    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnd);
      audio.removeEventListener('error', handleAudioError);
    };
  }, [audioUrl]);

  const handleEnd = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (error) {
      toast.error("Can't play audio: " + error);
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play()
        .catch(err => {
          console.error("Play error:", err);
          toast.error("Failed to play audio");
          setError("Playback failed. Please try again later.");
        });
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = prevVolume;
      setVolume(prevVolume);
    } else {
      setPrevVolume(volume);
      audio.volume = 0;
      setVolume(0);
    }
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressBarRef.current;
    if (!audio || !progressBar || error) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const handlePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Cycle through playback rates: 1 -> 1.5 -> 2 -> 0.75 -> 1
    let newRate;
    if (playbackRate === 1) newRate = 1.5;
    else if (playbackRate === 1.5) newRate = 2;
    else if (playbackRate === 2) newRate = 0.75;
    else newRate = 1;

    audio.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || error) return;

    audio.currentTime += seconds;
  };

  // Format time in mm:ss
  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <audio ref={audioRef} preload="metadata" />
      
      <div className="flex flex-col md:flex-row items-center mb-4">
        <div className="relative w-24 h-24 md:mr-4 mb-4 md:mb-0">
          <Image
            src={coverImage}
            alt={title}
            layout="fill"
            objectFit="cover"
            className="rounded-lg"
          />
        </div>
        <div className="text-center md:text-left">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-gray-600 dark:text-gray-400">{artist}</p>
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      </div>
      
      <div 
        ref={progressBarRef}
        className={`h-2 bg-gray-200 dark:bg-gray-700 rounded-full ${error ? 'opacity-50' : 'cursor-pointer'} mb-2`}
        onClick={error ? undefined : handleProgress}
      >
        <div 
          className="h-2 bg-primary-500 rounded-full" 
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-4">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => skip(-10)}
          className={`p-2 text-gray-700 dark:text-gray-300 ${!error ? 'hover:text-primary-600 dark:hover:text-primary-400' : 'opacity-50 cursor-not-allowed'} focus:outline-none`}
          disabled={!!error}
        >
          <FaStepBackward />
        </button>
        
        <button
          onClick={togglePlay}
          className={`p-3 ${!error ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-400 cursor-not-allowed'} rounded-full text-white focus:outline-none`}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        
        <button
          onClick={() => skip(10)}
          className={`p-2 text-gray-700 dark:text-gray-300 ${!error ? 'hover:text-primary-600 dark:hover:text-primary-400' : 'opacity-50 cursor-not-allowed'} focus:outline-none`}
          disabled={!!error}
        >
          <FaStepForward />
        </button>
      </div>
      
      <div className="flex items-center mt-4 space-x-2">
        <button
          onClick={toggleMute}
          className={`text-gray-700 dark:text-gray-300 ${!error ? 'hover:text-primary-600 dark:hover:text-primary-400' : 'opacity-50 cursor-not-allowed'} focus:outline-none`}
          disabled={!!error}
        >
          {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className={`w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none ${!error ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          disabled={!!error}
        />
        
        <button
          onClick={handlePlaybackRate}
          className={`ml-auto px-2 py-1 text-xs font-medium rounded ${!error ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600' : 'bg-gray-300 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed'} focus:outline-none flex items-center`}
          disabled={!!error}
        >
          <FaRedo className="mr-1" />
          {playbackRate}x
        </button>
      </div>
    </div>
  );
};

export default PodcastPlayer;