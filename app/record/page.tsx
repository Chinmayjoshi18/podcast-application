'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FaMicrophone, FaUpload, FaStop, FaPlay, FaPause, FaTrash, FaSave, FaGlobe, FaLock, FaArrowLeft, FaImage, FaExclamationTriangle } from 'react-icons/fa';
import { addPodcast } from '@/lib/storage';
import { uploadAudioFile, getUploadProgress } from '@/lib/cloudStorage';
import Link from 'next/link';

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
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPublic: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const MAX_CHARS = 280; // Twitter-like character limit
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'error'>('idle');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);

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

  // Handle cover image upload
  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    setCoverImage(file);
    
    // Create a preview
    const url = URL.createObjectURL(file);
    setCoverImagePreview(url);
    
    toast.success('Cover image uploaded!');
  };
  
  // Remove cover image
  const handleRemoveCoverImage = () => {
    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview);
    }
    setCoverImage(null);
    setCoverImagePreview(null);
    
    // Reset the file input
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = '';
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

  const handlePublish = async () => {
    if (!audioBlob && !selectedFile) {
      toast.error('Please record or upload audio first');
      return;
    }

    if (!formData.title) {
      toast.error('Please provide a title');
      return;
    }

    if (!session?.user) {
      toast.error('You must be logged in to publish a podcast');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Get the audio file (either recorded or uploaded)
      const audioFile = selectedFile || new File([audioBlob!], `podcast_${Date.now()}.wav`, { 
        type: audioBlob!.type 
      });
      
      console.log('Audio file to upload:', { 
        name: audioFile.name, 
        size: `${Math.round(audioFile.size / 1024)}KB`, 
        type: audioFile.type 
      });
      
      // Start processing the cover image if it exists
      let coverImageUrl = '';
      let coverImageUploadPromise = Promise.resolve('');
      
      if (coverImage) {
        console.log('Cover image to upload:', { 
          name: coverImage.name, 
          size: `${Math.round(coverImage.size / 1024)}KB`, 
          type: coverImage.type 
        });
        
        // Upload cover image and get URL
        // Note: We're not showing detailed progress for image upload as it's generally smaller
        coverImageUploadPromise = uploadAudioFile(
          coverImage, 
          'cover-images', 
          `cover_${Date.now()}_${coverImage.name}`,
          (progress) => console.log(`Cover image upload progress: ${progress}%`)
        );
      }
      
      // Upload the audio file with progress tracking
      console.log('Starting audio file upload...');
      const audioFileUploadPromise = uploadAudioFile(
        audioFile,
        'podcast-audio',
        `podcast_${Date.now()}_${audioFile.name}`,
        (progress) => {
          setUploadProgress(progress);
          console.log(`Audio upload progress: ${progress}%`);
        }
      );
      
      // Wait for both uploads to complete
      const [audioUrl, coverImageResult] = await Promise.all([
        audioFileUploadPromise.catch(err => {
          console.error('Audio upload failed:', err);
          throw new Error(`Audio upload failed: ${err.message || 'Unknown error'}`);
        }),
        coverImageUploadPromise.catch(err => {
          console.error('Cover image upload failed:', err);
          // Don't fail the whole process if just the cover image fails
          return '';
        })
      ]);
      
      console.log('Upload completed with URLs:', { audioUrl, coverImageUrl: coverImageResult });
      
      if (coverImageResult) {
        coverImageUrl = coverImageResult;
      } else {
        // Use a placeholder image based on the first letter of the title
        coverImageUrl = `https://placehold.co/400x400/5f33e1/ffffff?text=${encodeURIComponent(formData.title.substring(0, 1).toUpperCase())}`;
      }
      
      // Create podcast object with the URLs
      const newPodcast = {
        title: formData.title,
        description: formData.description,
        audioUrl: audioUrl,
        coverImage: coverImageUrl,
        duration: audioRef.current?.duration || 0,
        isPublic: formData.isPublic,
        userId: (session.user as any).id || session.user.email || 'anonymous',
        user: {
          id: (session.user as any).id || session.user.email || 'anonymous',
          name: session.user.name || 'Anonymous',
          image: session.user.image || `https://placehold.co/100/5f33e1/ffffff?text=${(session.user.name || 'A')[0].toUpperCase()}`
        }
      };
      
      console.log('Saving podcast metadata to database:', newPodcast);
      
      // Save the podcast metadata to the database
      const savedPodcast = await addPodcast(newPodcast);
      
      console.log('Podcast saved successfully:', savedPodcast);
      toast.success('Podcast published successfully!');
      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error uploading podcast:', error);
      toast.error(`Failed to publish podcast: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
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
    <div className="container mx-auto px-4 py-8">
      {/* Header and navigation */}
      <div className="mb-6 flex items-center">
        <Link href="/dashboard" className="text-gray-400 hover:text-white mr-4">
          <FaArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Record a Podcast</h1>
      </div>
      
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {/* Form content */}
        <div className="p-4">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handlePublish();
            }} 
            className="max-w-2xl mx-auto"
          >
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

            {/* After the description field, add the cover image upload section */}
            <div className="mb-6">
              <label className="block text-white mb-2 font-medium">Cover Image (Optional)</label>
              <div className="flex items-start space-x-4">
                {/* Cover image preview */}
                <div className="relative w-32 h-32 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                  {coverImagePreview ? (
                    <Image
                      src={coverImagePreview}
                      alt="Cover Preview"
                      layout="fill"
                      objectFit="cover"
                      className="w-full h-full"
                    />
                  ) : (
                    <FaImage className="text-gray-600 text-3xl" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="mb-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverImageChange}
                      ref={coverImageInputRef}
                    />
                    <button
                      type="button"
                      onClick={() => coverImageInputRef.current?.click()}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg mr-2"
                    >
                      {coverImage ? 'Change Image' : 'Upload Image'}
                    </button>
                    
                    {coverImage && (
                      <button
                        type="button"
                        onClick={handleRemoveCoverImage}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    Recommended: Square image (1:1 ratio), minimum 400x400 pixels.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Privacy settings */}
            <div className="mb-6">
              <label className="block text-white mb-2 font-medium">Privacy</label>
              <div className="flex space-x-4">
                <label className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer ${formData.isPublic ? 'bg-gray-700 border-2 border-primary-600' : 'bg-gray-800 border-2 border-transparent'}`}>
                  <input
                    type="radio"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                    className="hidden"
                  />
                  <FaGlobe className={formData.isPublic ? 'text-primary-500' : 'text-gray-400'} />
                  <div>
                    <p className="font-medium">Public</p>
                    <p className="text-gray-400 text-sm">Anyone can listen</p>
                  </div>
                </label>
                
                <label className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer ${!formData.isPublic ? 'bg-gray-700 border-2 border-primary-600' : 'bg-gray-800 border-2 border-transparent'}`}>
                  <input
                    type="radio"
                    name="isPublic"
                    checked={!formData.isPublic}
                    onChange={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                    className="hidden"
                  />
                  <FaLock className={!formData.isPublic ? 'text-primary-500' : 'text-gray-400'} />
                  <div>
                    <p className="font-medium">Private</p>
                    <p className="text-gray-400 text-sm">Only you can listen</p>
                  </div>
                </label>
              </div>
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

            {/* Upload progress */}
            {isSubmitting && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-white">
                    {uploadStatus === 'processing' ? 'Processing...' : 'Uploading...'}
                  </span>
                  <span className="text-sm font-medium text-white">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={isSubmitting || (!audioBlob && !selectedFile) || !formData.title}
                className={`w-full rounded-lg py-3 px-4 font-medium flex items-center justify-center space-x-2 ${
                  isSubmitting || (!audioBlob && !selectedFile) || !formData.title
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>
                      {uploadStatus === 'processing' 
                        ? 'Processing podcast...' 
                        : `Uploading... ${Math.round(uploadProgress)}%`
                      }
                    </span>
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
        
        {/* Audio element for playback */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}
      </div>
    </div>
  );
};

export default RecordPage;