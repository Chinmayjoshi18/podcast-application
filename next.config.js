// Load environment variable sanitizer early
require('./lib/env-sanitizer');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tell Next.js to ignore TypeScript errors during build
  typescript: {
    // Do not fail the build on type errors
    ignoreBuildErrors: true,
  },
  // Tell ESLint to ignore errors during build
  eslint: {
    // Do not fail the build on ESLint errors
    ignoreDuringBuilds: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: '**vtratyhbuhkflbagbyyu.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      }
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    // Add native Node.js modules support
    config.externals.push('bcrypt');
    return config;
  }
};

module.exports = nextConfig;