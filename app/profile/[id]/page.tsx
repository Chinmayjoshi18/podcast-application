import { Suspense } from 'react';
import ProfileClient from './ProfileClient';

interface ProfilePageParams {
  params: {
    id: string;
  };
}

// Add type declaration explicitly - no promises required
export default function ProfilePage({ params }: ProfilePageParams) {
  return (
    <Suspense fallback={<div>Loading profile...</div>}>
      <ProfileClient userId={params.id} />
    </Suspense>
  );
}