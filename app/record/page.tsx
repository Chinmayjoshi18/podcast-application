'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '../providers/SupabaseAuthProvider';
import toast from 'react-hot-toast';
import { FaMicrophone, FaUpload, FaStop, FaPlay, FaPause, FaTrash, FaSave, FaGlobe, FaLock, FaArrowLeft, FaImage, FaExclamationTriangle } from 'react-icons/fa';
import { addPodcast } from '@/lib/storage';
import { uploadAudioFile, getUploadProgress, startFileUpload, isFileUploading, isFileUploaded, getUploadedFileUrl } from '@/lib/fileStorage';
import Link from 'next/link';
import { MdMic, MdStop, MdPlayArrow, MdPause, MdFileUpload, MdImage } from 'react-icons/md';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';

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

const UploadProgressBar = ({ progress }: { progress: number }) => {
  // Ensure progress is always a valid number
  const displayProgress = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  
  return (
    <div className="my-4">
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium">Uploading...</span>
        <span className="text-base font-medium">{displayProgress}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
          style={{ 
            width: `${displayProgress}%`,
            minWidth: displayProgress > 0 ? '5px' : '0'
          }}
        ></div>
      </div>
    </div>
  );
};

const RecordPage = () => {
  const { user, isLoading } = useSupabaseAuth();
  const router = useRouter();
  const [recordingMode, setRecordingMode] = useState<'record' | 'upload'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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
    
    // Start uploading the file immediately in the background
    toast.success('Starting file upload in the background...');
    setUploadStatus('uploading');
    setUploadProgress(1); // Show initial progress
    
    try {
      // Start the background upload process
      const fileId = `${file.name}_${file.size}_${file.lastModified}`;
      
      // Only start the upload if it's not already uploading or uploaded
      if (!isFileUploading(fileId) && !isFileUploaded(fileId)) {
        startFileUpload(file, 'podcast-audio', (progress) => {
          console.log(`Background upload progress: ${progress}%`);
          // Update UI to show progress
          setUploadProgress(progress);
        }).then((cloudinaryUrl) => {
          console.log('Background upload complete:', cloudinaryUrl);
          toast.success('File upload completed in the background!');
          // Store the URL for later use when publishing
          setUploadedFileUrl(cloudinaryUrl);
          setUploadStatus('complete');
          setUploadProgress(100);
        }).catch((error) => {
          console.error('Background upload failed:', error);
          toast.error(`Background upload failed: ${error.message}`);
          setUploadStatus('error');
        });
      } else if (isFileUploaded(fileId)) {
        // If already uploaded, get the URL
        const url = getUploadedFileUrl(fileId);
        if (url) {
          console.log('File already uploaded, using cached URL:', url);
          toast.success('Using already uploaded file!');
          setUploadedFileUrl(url);
          setUploadStatus('complete');
          setUploadProgress(100);
        }
      } else {
        // If already uploading, just track the progress
        console.log('File already uploading, tracking progress');
        toast.success('File is already uploading, tracking progress...');
        
        // Start a progress tracking interval
        const progressInterval = setInterval(() => {
          const progress = getUploadProgress(fileId);
          setUploadProgress(progress);
          console.log(`Tracking upload progress: ${progress}%`);
          
          if (progress >= 100) {
            clearInterval(progressInterval);
            setUploadStatus('complete');
          }
        }, 500);
      }
      
      // Convert to base64 for storage (only for preview purposes)
      const base64 = await blobToBase64(file);
      setAudioBase64(base64);
    } catch (error) {
      console.error('Error handling file change:', error);
      toast.error('Error processing the file');
      setUploadStatus('error');
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

  /**
   * Publish the podcast with comprehensive error handling
   * and proper upload tracking
   */
  const handlePublish = async () => {
    if (isSubmitting) {
      toast.error('Already processing a submission, please wait...');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadStatus('processing');
      
      // First check NextAuth session
      if (!user) {
        toast.error('You must be logged in to publish a podcast.');
        setUploadStatus('idle');
        setIsSubmitting(false);
        return;
      }
      
      // Get the Supabase user ID (critical for storage policies)
      const supabaseUserId = await getCurrentUserId();
      
      // If no Supabase user is found, we need to use the NextAuth ID but show a warning
      const userId = supabaseUserId || user.id;
      
      // Log diagnostic information
      console.log('==== AUTH DIAGNOSTICS ====');
      console.log('NextAuth User ID:', user.id);
      console.log('Supabase User ID:', supabaseUserId);
      console.log('Using User ID:', userId);
      
      // Check current Supabase auth status
      const { data: authData } = await supabase.auth.getSession();
      console.log('Supabase session:', authData.session ? 'Active' : 'None');
      if (authData.session) {
        console.log('Supabase session user:', authData.session.user.id);
      }
      console.log('========================');
      
      // If we don't have a Supabase session, show a clear error
      if (!authData.session) {
        toast.error('Not authenticated with Supabase. Please try logging out and back in.');
        setUploadStatus('error');
        setIsSubmitting(false);
        return;
      }
      
      // Validate form data
      if (!formData.title.trim()) {
        toast.error('Please add a title for your podcast');
        setUploadStatus('idle');
        return;
      }
      
      if (!selectedFile && !audioBlob) {
        toast.error('Please record or upload an audio file');
        setUploadStatus('idle');
        return;
      }
      
      // Create tracking object for full upload process
      let publishTracker = {
        audioUploadComplete: false,
        audioUrl: '',
        coverImageComplete: coverImage ? false : true, // True if no cover image selected
        coverImageUrl: '',
        metadataComplete: false,
        podcast: null,
        error: null
      };
      
      // Show toast notification for long process
      const publishToastId = toast.loading('Publishing your podcast...');

      // Upload cover image if selected
      let coverImageUploadPromise: Promise<string> = Promise.resolve('');
      if (coverImage) {
        console.log('Starting cover image upload...');
        toast.loading('Uploading cover image...', { id: publishToastId });
        
        try {
          coverImageUploadPromise = startFileUpload(
            coverImage, 
            'images',
            (progress) => {
              console.log(`Cover image upload progress: ${progress}%`);
            },
            userId // Pass userId for RLS policy compliance
          ).then(url => {
            console.log('Cover image upload complete:', url);
            publishTracker.coverImageComplete = true;
            publishTracker.coverImageUrl = url;
            return url;
          });
        } catch (error) {
          console.error('Error starting cover image upload:', error);
          toast.error('Failed to upload cover image', { id: publishToastId });
          publishTracker.error = 'Cover image upload failed';
          throw new Error('Cover image upload failed: ' + error.message);
        }
      }
      
      // Upload audio file
      let audioFileUrl = '';
      const audioFile = selectedFile || new File([audioBlob!], `recording-${Date.now()}.webm`, { 
        type: 'audio/webm' 
      });
      
      const fileId = `${audioFile.name}_${audioFile.size}_${audioFile.lastModified}`;
      
      try {
        // Check if the file is already uploaded in the background
        if (isFileUploaded(fileId)) {
          const cachedUrl = getUploadedFileUrl(fileId);
          if (cachedUrl) {
            console.log('Using cached audio file URL:', cachedUrl);
            audioFileUrl = cachedUrl;
            publishTracker.audioUploadComplete = true;
            publishTracker.audioUrl = cachedUrl;
            toast.loading('Using already uploaded audio...', { id: publishToastId });
          } else {
            // This should rarely happen - cached but no URL
            throw new Error('Cached file URL not found');
          }
        } else if (isFileUploading(fileId)) {
          // If file is currently uploading, wait for it to complete
          console.log('File is currently uploading, waiting for completion...');
          toast.loading('Waiting for audio upload to complete...', { id: publishToastId });
          
          // Wait for completion with timeout
          const startTime = Date.now();
          const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutes
          
          while (isFileUploading(fileId)) {
            // Check for timeout
            if (Date.now() - startTime > MAX_WAIT_TIME) {
              throw new Error('Upload wait timeout exceeded');
            }
            
            // Wait and update progress
            await new Promise(resolve => setTimeout(resolve, 500));
            const progress = getUploadProgress(fileId);
            setUploadProgress(progress);
            
            // Update toast with progress
            toast.loading(`Audio upload: ${progress}%...`, { id: publishToastId });
          }
          
          // Once complete, get the URL
          const cachedUrl = getUploadedFileUrl(fileId);
          if (cachedUrl) {
            audioFileUrl = cachedUrl;
            publishTracker.audioUploadComplete = true;
            publishTracker.audioUrl = cachedUrl;
            toast.loading('Audio upload complete!', { id: publishToastId });
          } else {
            // Something went wrong with the upload
            throw new Error('Upload completed but no URL available');
          }
        } else {
          // Start a new upload if not already uploading or uploaded
          console.log('Starting audio file upload for publish...');
          toast.loading('Uploading audio file...', { id: publishToastId });
          
          audioFileUrl = await uploadAudioFile(
            audioFile,
            'podcast-audio',
            `podcast_${Date.now()}_${audioFile.name}`,
            (progress) => {
              setUploadProgress(progress);
              console.log(`Audio upload progress: ${progress}%`);
              toast.loading(`Audio upload: ${progress}%...`, { id: publishToastId });
            },
            userId // Pass userId for RLS policy compliance
          );
          
          publishTracker.audioUploadComplete = true;
          publishTracker.audioUrl = audioFileUrl;
        }
      } catch (error) {
        console.error('Error uploading audio file:', error);
        toast.error(`Audio upload failed: ${error.message}`, { id: publishToastId });
        publishTracker.error = 'Audio upload failed';
        throw error;
      }
      
      // Wait for cover image upload if applicable
      let coverImageUrl = '';
      if (coverImage) {
        try {
          toast.loading('Finalizing cover image...', { id: publishToastId });
          coverImageUrl = await coverImageUploadPromise;
        } catch (error) {
          console.error('Error with cover image upload:', error);
          toast.error('Cover image upload failed, continuing with default', { id: publishToastId });
          // We'll continue without the cover image rather than failing the whole process
        }
      }
      
      // All uploads are complete, create podcast in database
      console.log('All uploads complete. Publishing podcast...');
      toast.loading('Saving podcast to database...', { id: publishToastId });
      
      try {
        const podcastData = {
          userId: userId,
          title: formData.title.trim(),
          description: formData.description.trim() || '',
          audioUrl: audioFileUrl,
          coverImage: coverImageUrl || '',
          isPublic: formData.isPublic,
          user: {
            id: userId,
            name: user?.name || '',
            image: user?.image || '',
          },
        };
        
        const newPodcast = await addPodcast(podcastData);
        
        publishTracker.metadataComplete = true;
        publishTracker.podcast = newPodcast;
        
        console.log('Podcast published successfully:', newPodcast);
        toast.success('Podcast published successfully!', { id: publishToastId });
        
        // Reset form after successful submission
        setUploadStatus('complete');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (error) {
        console.error('Error saving podcast to database:', error);
        toast.error(`Failed to save podcast: ${error.message}`, { id: publishToastId });
        
        // Special error handling for database errors
        if (audioFileUrl) {
          toast.error('Note: Your audio file was uploaded successfully and can be reused');
        }
        
        publishTracker.error = 'Database save failed';
        throw error;
      }
    } catch (error) {
      console.error('Error in publish process:', error);
      setUploadStatus('error');
      
      // Provide detailed error message based on what stage failed
      let errorMessage = 'Publication failed. Please try again.';
      
      if (error.message?.includes('upload')) {
        errorMessage = `File upload error: ${error.message}`;
      } else if (error.message?.includes('network') || error.message?.includes('internet')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'The operation timed out. Please try again with a better connection.';
      } else if (error.message?.includes('database') || error.message?.includes('save')) {
        errorMessage = 'Failed to save podcast details. Your files were uploaded successfully.';
      } else if (error.message?.includes('security policy') || error.message?.includes('violates row-level')) {
        errorMessage = 'Security policy violation. Please try logging out and back in again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 flex flex-col">
      <div className="container max-w-4xl mx-auto px-4 flex-grow">
        <div className="mb-6 flex items-center">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center">
            <FaArrowLeft className="mr-2" /> Back to Dashboard
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-6">Create New Podcast</h1>
        
        {/* Upload status indicator */}
        {uploadStatus !== 'idle' && (
          <div className="mb-6 bg-white shadow rounded-lg p-4">
            <div className="mb-2 flex justify-between items-center">
              <h3 className="font-medium text-gray-700">
                {uploadStatus === 'uploading' && 'Uploading podcast...'}
                {uploadStatus === 'processing' && 'Processing podcast...'}
                {uploadStatus === 'complete' && 'Upload complete!'}
                {uploadStatus === 'error' && 'Upload failed'}
              </h3>
              <span className="text-sm font-medium text-gray-500">
                {uploadStatus === 'uploading' && `${uploadProgress}%`}
                {uploadStatus === 'complete' && '100%'}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${
                  uploadStatus === 'error' ? 'bg-red-500' : 
                  uploadStatus === 'complete' ? 'bg-green-500' : 
                  'bg-blue-500'
                }`}
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            
            {uploadStatus === 'uploading' && (
              <p className="mt-2 text-sm text-gray-500">
                Uploading your podcast file in the background. You can continue filling out the details below.
              </p>
            )}
            {uploadStatus === 'error' && (
              <p className="mt-2 text-sm text-red-500 flex items-center">
                <FaExclamationTriangle className="mr-1" /> 
                There was an error uploading your file. Please try again.
              </p>
            )}
          </div>
        )}
  
        {/* Mode selection tabs */}
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
    </div>
  );
};

export default RecordPage;