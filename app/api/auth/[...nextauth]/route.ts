import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Create the handler using NextAuth with the imported auth options
const handler = NextAuth(authOptions);

// Export the GET and POST handlers for the route
export { handler as GET, handler as POST };