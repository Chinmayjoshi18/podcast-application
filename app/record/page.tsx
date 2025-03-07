'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { FaMicrophone, FaUpload, FaStop, FaPlay, FaPause, FaTrash, FaSave, FaGlobe, FaLock, FaArrowLeft } from 'react-icons/fa';
import { addPodcast } from '@/lib/storage';

// Import AudioRecorder dynamically with SSR disabled
const ClientAudioRecorder = dynamic(
  () => import('react-audio-voice-recorder').then((mod) => {
    // Create a wrapper component to fix TypeScript issue
    const AudioRecorderComponent = (props: any) => {
      const { AudioRecorder } = mod;
      return <AudioRecorder {...props} />;
    };
    return AudioRecorderComponent;
  }),
  { ssr: false }
);

const RecordPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recordingMode, setRecordingMode] = useState<'record' | 'upload'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPublic: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const MAX_CHARS = 280; // Twitter-like character limit

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleRecordingComplete = async (blob: Blob) => {
    setAudioBlob(blob);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    
    try {
      // Convert to base64 for storage
      const base64 = await blobToBase64(blob);
      setAudioBase64(base64);
      toast.success('Recording completed!');
    } catch (error) {
      console.error('Error converting blob to base64:', error);
      toast.error('Error processing the recording');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if the file is an audio file
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    
    try {
      // Convert to base64 for storage
      const base64 = await blobToBase64(file);
      setAudioBase64(base64);
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Error converting file to base64:', error);
      toast.error('Error processing the file');
    }
  };

  const handleDiscardAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioBase64(null);
    setSelectedFile(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement & { type: string };
    
    // Handle checkbox inputs specially (for boolean values)
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checkbox.checked }));
    } else {
      // For all other inputs (text, textarea, select)
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      // Update character count for description
      if (name === 'description') {
        setCharCount(value.length);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if ((!audioBlob && !selectedFile) || !audioBase64) {
      toast.error('Please record or upload an audio file');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please provide a title');
      return;
    }

    if (!session?.user) {
      toast.error('You must be logged in to publish a podcast');
      return;
    }

    setIsSubmitting(true);

    try {
      // Store the base64 data instead of the blob URL
      // Use base64 for persistent storage across page refreshes
      
      // Create a new podcast object
      const newPodcast = {
        id: `podcast_${Date.now()}`,
        title: formData.title,
        description: formData.description,
        audioUrl: audioBase64 as string,
        coverImage: `https://placehold.co/400x400/5f33e1/ffffff?text=${encodeURIComponent(formData.title.substring(0, 1).toUpperCase())}`,
        duration: audioRef.current?.duration || 0,
        createdAt: new Date().toISOString(),
        listens: 0,
        likes: 0,
        isPublic: formData.isPublic,
        userId: (session.user as any).id || session.user.email || 'anonymous',
        user: {
          id: (session.user as any).id || session.user.email || 'anonymous',
          name: session.user.name || 'Anonymous',
          image: session.user.image || `https://placehold.co/100/5f33e1/ffffff?text=${(session.user.name || 'A')[0].toUpperCase()}`
        }
      };
      
      // Save the podcast to storage
      addPodcast(newPodcast);
      
      // Simulate server delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Podcast published successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error uploading podcast:', error);
      toast.error('Failed to publish podcast');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Fixed header */}
      <div className="py-4 px-4 border-b border-gray-800 sticky top-0 bg-gray-950/80 backdrop-blur-sm z-10 flex items-center">
        <button 
          onClick={() => router.back()}
          className="mr-4 p-2 rounded-full hover:bg-gray-800"
          aria-label="Go back"
        >
          <FaArrowLeft />
        </button>
        <h1 className="text-xl font-bold">Create Podcast</h1>
      </div>
      
      {/* Form content */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          {/* Recording mode tabs */}
          <div className="flex mb-6 bg-gray-800 rounded-full p-1">
            <button
              type="button"
              onClick={() => setRecordingMode('record')}
              className={`flex-1 py-2 px-4 rounded-full flex items-center justify-center space-x-2 ${
                recordingMode === 'record'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FaMicrophone className="mr-2" />
              <span>Record</span>
            </button>
            <button
              type="button"
              onClick={() => setRecordingMode('upload')}
              className={`flex-1 py-2 px-4 rounded-full flex items-center justify-center space-x-2 ${
                recordingMode === 'upload'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FaUpload className="mr-2" />
              <span>Upload</span>
            </button>
          </div>

          {/* Title input */}
          <div className="mb-4">
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Podcast title"
              className="w-full py-3 px-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-xl"
              required
            />
          </div>

          {/* Description input */}
          <div className="mb-4 relative">
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="What's this podcast about?"
              className="w-full min-h-[120px] py-3 px-4 bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none"
              maxLength={MAX_CHARS}
            />
            <div className={`text-right text-sm ${charCount > MAX_CHARS * 0.8 ? (charCount > MAX_CHARS ? 'text-red-500' : 'text-yellow-500') : 'text-gray-500'}`}>
              {charCount}/{MAX_CHARS}
            </div>
          </div>

          {/* Privacy options */}
          <div className="mb-4 flex space-x-4">
            <label className={`flex-1 p-3 rounded-lg border ${formData.isPublic ? 'border-primary-600 bg-primary-600/10' : 'border-gray-700'} cursor-pointer`}>
              <input
                type="radio"
                name="isPublic"
                checked={formData.isPublic}
                onChange={() => setFormData((prev) => ({ ...prev, isPublic: true }))}
                className="sr-only"
              />
              <div className="flex items-center">
                <FaGlobe className="mr-2 text-green-500" />
                <div>
                  <p className="font-medium">Public</p>
                  <p className="text-xs text-gray-400">Anyone can see and listen</p>
                </div>
              </div>
            </label>
            <label className={`flex-1 p-3 rounded-lg border ${!formData.isPublic ? 'border-primary-600 bg-primary-600/10' : 'border-gray-700'} cursor-pointer`}>
              <input
                type="radio"
                name="isPublic"
                checked={!formData.isPublic}
                onChange={() => setFormData((prev) => ({ ...prev, isPublic: false }))}
                className="sr-only"
              />
              <div className="flex items-center">
                <FaLock className="mr-2 text-amber-500" />
                <div>
                  <p className="font-medium">Private</p>
                  <p className="text-xs text-gray-400">Only you and people with the link</p>
                </div>
              </div>
            </label>
          </div>

          {/* Audio capture section */}
          <div className="mb-6 bg-gray-800 rounded-lg p-4">
            {recordingMode === 'record' ? (
              <div className="flex flex-col items-center p-4">
                <div className="mb-4">
                  <ClientAudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    audioTrackConstraints={{
                      noiseSuppression: true,
                      echoCancellation: true,
                    }}
                    showVisualizer={true}
                  />
                </div>
                <p className="text-sm text-gray-400">
                  Click the microphone to start recording
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center p-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white flex items-center"
                >
                  <FaUpload className="mr-2" />
                  <span>Select audio file</span>
                </button>
                {selectedFile && (
                  <p className="text-sm text-gray-400">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            )}

            {/* Audio preview */}
            {audioUrl && (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Preview</h3>
                  <button
                    type="button"
                    onClick={handleDiscardAudio}
                    className="text-red-500 hover:text-red-400 text-sm flex items-center"
                  >
                    <FaTrash className="mr-1" />
                    <span>Discard</span>
                  </button>
                </div>
                <audio ref={audioRef} src={audioUrl} className="w-full mb-2" onEnded={() => setIsPlaying(false)} />
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-3 bg-primary-600 hover:bg-primary-700 rounded-full text-white"
                  >
                    {isPlaying ? <FaPause /> : <FaPlay />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit button */}
          <div className="mb-4">
            <button
              type="submit"
              className={`w-full py-3 rounded-full flex items-center justify-center ${
                (!audioBlob && !selectedFile) || isSubmitting
                  ? 'bg-primary-600/50 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              } text-white font-bold`}
              disabled={(!audioBlob && !selectedFile) || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  <span>Publish Podcast</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPage;