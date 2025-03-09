import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/AppLayout';
import { SupabaseProvider } from './providers/SupabaseProvider';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export const metadata: Metadata = {
  title: 'Podcast App',
  description: 'A modern podcast sharing platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.variable} font-dm bg-black text-white`}>
        <SupabaseProvider>
          <ToastProvider>
            <AppLayout>
              {children}
            </AppLayout>
            <Toaster 
              position="bottom-right" 
              toastOptions={{ 
                style: { 
                  background: '#1e293b', 
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '16px',
                } 
              }} 
            />
          </ToastProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}