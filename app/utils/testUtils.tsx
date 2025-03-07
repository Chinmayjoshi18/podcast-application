import React, { ReactElement } from 'react';
import { ToastProvider } from '../context/ToastContext';

// Simple mock function implementation
type MockFn<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): ReturnType<T>;
  calls: Array<Parameters<T>>;
  mockImplementation: (fn: T) => MockFn<T>;
  mockReset: () => void;
};

function createMockFn<T extends (...args: any[]) => any>(implementation?: T): MockFn<T> {
  const calls: Array<Parameters<T>> = [];
  
  const mockFn = ((...args: Parameters<T>): ReturnType<T> => {
    calls.push(args);
    return implementation?.(...args) as ReturnType<T>;
  }) as MockFn<T>;
  
  mockFn.calls = calls;
  mockFn.mockImplementation = (newImpl: T) => {
    implementation = newImpl;
    return mockFn;
  };
  mockFn.mockReset = () => {
    calls.length = 0;
  };
  
  return mockFn;
}

// Mock fetch API for testing
export function mockFetch(mockData: any, status = 200) {
  const originalFetch = global.fetch;
  
  const mockFetchImpl = () => Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(mockData),
    text: () => Promise.resolve(JSON.stringify(mockData)),
  } as Response);
  
  // @ts-ignore - Type safety is compromised for testing purposes
  global.fetch = createMockFn(mockFetchImpl);
  
  return () => {
    global.fetch = originalFetch;
  };
}

// Mock localStorage for testing
export function mockLocalStorage() {
  const originalLocalStorage = global.localStorage;
  const store: Record<string, string> = {};
  
  const mockImplementation = {
    getItem: createMockFn((key: string) => store[key] || null),
    setItem: createMockFn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: createMockFn((key: string) => {
      delete store[key];
    }),
    clear: createMockFn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: createMockFn((index: number) => Object.keys(store)[index] || null),
    length: 0,
  };
  
  Object.defineProperty(mockImplementation, 'length', {
    get: () => Object.keys(store).length
  });
  
  // @ts-ignore
  global.localStorage = mockImplementation;
  
  return () => {
    global.localStorage = originalLocalStorage;
  };
}

// Wrapper component for testing context providers
interface TestProvidersProps {
  children: React.ReactNode;
}

export function TestProviders({ children }: TestProvidersProps) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}

// Helper to render with all providers
export function renderWithProviders(ui: ReactElement) {
  return <TestProviders>{ui}</TestProviders>;
}

// Mock Next.js router
export function mockRouter(overrides = {}) {
  // Default mock implementation
  return {
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    push: createMockFn(async () => true),
    replace: createMockFn(async () => true),
    reload: createMockFn(() => null),
    back: createMockFn(() => null),
    prefetch: createMockFn(async () => undefined),
    beforePopState: createMockFn(() => null),
    isFallback: false,
    events: {
      on: createMockFn(() => null),
      off: createMockFn(() => null),
      emit: createMockFn(() => null),
    },
    ...overrides,
  };
} 