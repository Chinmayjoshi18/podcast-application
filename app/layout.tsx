import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import AuthProvider from '@/app/providers/AuthProvider';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/AppLayout';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export const metadata: Metadata = {
  title: 'PodcastApp - Create and Listen to Podcasts',
  description: 'A platform to create, share, and listen to podcasts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.variable} font-dm bg-black text-white`}>
        <AuthProvider>
          <ToastProvider>
            <AppLayout>
              {children}
            </AppLayout>
            <Toaster 
              position="top-center"
              toastOptions={{
                style: {
                  background: '#1e2732',
                  color: '#fff',
                },
                success: {
                  iconTheme: {
                    primary: '#1d9bf0',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#f44336',
                    secondary: '#fff',
                  },
                },
              }} 
            />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}