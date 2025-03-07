// Type declarations for Next.js App Router

import { ReactNode } from 'react';

// For dynamic route segments
export interface PageProps<Params = {}> {
  params: Params;
  searchParams?: Record<string, string | string[] | undefined>;
}

// For layout components
export interface LayoutProps<Params = {}> {
  children: ReactNode;
  params: Params;
} 