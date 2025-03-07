import ProfileClient from './ProfileClient';

// Minimal server component with no type annotations
export default function ProfilePage(props) {
  // Simply extract the ID and pass it to the client component
  const userId = props.params?.id;
  
  return <ProfileClient userId={userId} />;
}