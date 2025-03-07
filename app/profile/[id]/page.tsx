import ProfileClient from './ProfileClient';

// This becomes a server component (no 'use client' directive)
export default function ProfilePage({ params }: { params: { id: string } }) {
  return <ProfileClient userId={params.id} />;
}