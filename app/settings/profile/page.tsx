'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaCamera, FaCheck, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';

// Mock user data
const mockUserData = {
  id: 'user1',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  image: 'https://via.placeholder.com/150',
  bio: 'Podcast creator and audio storyteller. Passionate about sharing interesting stories and ideas through podcasts.',
};

const ProfileSettings = () => {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    image: '',
  });
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // In a real app, you would fetch user data from the API
    if (status === 'authenticated') {
      setTimeout(() => {
        const userData = {
          ...mockUserData,
          // Override with session data if available
          name: session?.user?.name || mockUserData.name,
          email: session?.user?.email || mockUserData.email,
          image: session?.user?.image || mockUserData.image,
        };
        
        setProfileData(userData);
        setIsLoading(false);
      }, 1000);
    }
  }, [status, session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setNewImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // In a real app, you would send the updated data to the API
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate updating the session
      if (session) {
        await update({
          ...session,
          user: {
            ...session.user,
            name: profileData.name,
          },
        });
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Profile Image */}
              <div className="mb-8 flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <Image
                      src={imagePreview || profileData.image}
                      alt={profileData.name}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <label
                    htmlFor="profileImage"
                    className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-primary-700 transition-colors"
                  >
                    <FaCamera />
                    <input
                      type="file"
                      id="profileImage"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click the camera icon to change your profile picture
                </p>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label htmlFor="name" className="label">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              {/* Email */}
              <div className="mb-6">
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleChange}
                  className="input"
                  disabled
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Email cannot be changed
                </p>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <label htmlFor="bio" className="label">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={profileData.bio}
                  onChange={handleChange}
                  className="input min-h-[120px]"
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Settings Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Account Settings</h2>

            <div className="space-y-6">
              {/* Password Change */}
              <div>
                <h3 className="text-lg font-medium mb-2">Password</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Change your password to keep your account secure
                </p>
                <button className="btn btn-outline">
                  Change Password
                </button>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium mb-2">Notification Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      id="email-notifications"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      defaultChecked
                    />
                    <label htmlFor="email-notifications" className="ml-2 block text-gray-700 dark:text-gray-300">
                      Email notifications
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="new-followers"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      defaultChecked
                    />
                    <label htmlFor="new-followers" className="ml-2 block text-gray-700 dark:text-gray-300">
                      New followers
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="podcast-interactions"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      defaultChecked
                    />
                    <label htmlFor="podcast-interactions" className="ml-2 block text-gray-700 dark:text-gray-300">
                      Podcast likes and comments
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="new-podcasts"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      defaultChecked
                    />
                    <label htmlFor="new-podcasts" className="ml-2 block text-gray-700 dark:text-gray-300">
                      New podcasts from followed creators
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium mb-2 text-red-600">Danger Zone</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Permanent actions that cannot be undone
                </p>
                <div className="space-y-3">
                  <button className="btn bg-red-600 text-white hover:bg-red-700">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;