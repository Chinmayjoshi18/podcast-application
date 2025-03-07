// Type declaration for Next.js config
declare module 'next/config' {
  export default function(): {
    serverRuntimeConfig: Record<string, any>;
    publicRuntimeConfig: Record<string, any>;
  };
} 