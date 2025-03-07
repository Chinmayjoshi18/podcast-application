import { Metadata, ResolvingMetadata } from 'next';
import ProfileClient from './ProfileClient';

// Define the params type directly in the function signature
type Props = {
  params: { id: string };
};

// Generate metadata
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  return {
    title: `Profile - ${params.id}`,
    description: `View the profile and podcasts for ${params.id}`,
  };
}

// Simpler server component that doesn't explicitly annotate return type
export default function ProfilePage(props: Props) {
  const { id } = props.params;
  
  // Send only the ID to the client component
  return <ProfileClient userId={id} />;
}