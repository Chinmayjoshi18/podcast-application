import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import bcrypt from "bcrypt";
import prisma from "./prismadb";
import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Session, DefaultSession } from "next-auth";
import { Adapter } from "next-auth/adapters";

// Extend the next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      username?: string;
    } & DefaultSession["user"];
  }
}

// Function to generate a random username
const generateRandomUsername = (name: string | null | undefined) => {
  const baseUsername = name ? name.replace(/\s+/g, '').toLowerCase() : 'user';
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${baseUsername}_${randomStr}`;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only process for OAuth providers (Google, GitHub)
      if (account && account.provider && ['google', 'github'].includes(account.provider)) {
        try {
          // Check if this user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });
          
          if (!existingUser) {
            // This is a new user, set up their account
            const username = generateRandomUsername(user.name);
            
            // Note: The actual user creation is handled by the adapter
            // But we can update the user with additional info
            await prisma.user.update({
              where: { email: user.email! },
              data: {
                // You could store username in the name field or add a username field to your schema
                name: user.name || username
              }
            });
          }
        } catch (error) {
          console.error("Error in sign in callback:", error);
          // Continue the sign in process even if our customization fails
        }
      }
      
      // Always return true to allow sign in
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        
        // Fetch additional user data if needed
        const userData = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { 
            name: true,
            image: true,
            email: true,
          },
        });
        
        if (userData) {
          if (userData.name) session.user.name = userData.name;
          if (userData.image) session.user.image = userData.image;
          if (userData.email) session.user.email = userData.email;
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          sub: user.id,
        };
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      // This triggers after a user is created by the adapter
      // Check if this is an OAuth sign-up by checking prisma directly
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { hashedPassword: true, name: true }
        });
        
        // If no hashed password, it's an OAuth user
        if (dbUser && !dbUser.hashedPassword) {
          const username = generateRandomUsername(dbUser.name);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              name: dbUser.name || username
            }
          });
        }
      } catch (error) {
        console.error("Error in createUser event:", error);
      }
    }
  },
  pages: {
    signIn: "/login",
  },
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;