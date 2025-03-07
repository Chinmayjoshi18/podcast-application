import { renderHook, act } from '@testing-library/react';
import { useFetch } from './useFetch';

// Mock fetch globally
const mockFetchResponse = (data: any, ok = true, status = 200) => {
  global.fetch = jest.fn().mockImplementation(() => 
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(data),
    } as Response)
  );
};

describe('useFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => 
      useFetch({ url: 'https://api.example.com/data' })
    );

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch data when immediate is true', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetchResponse(mockData);

    const { result, waitForNextUpdate } = renderHook(() => 
      useFetch({ 
        url: 'https://api.example.com/data',
        immediate: true 
      })
    );

    // Initially loading should be true
    expect(result.current.loading).toBe(true);
    
    await waitForNextUpdate();
    
    // After fetch completes
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should fetch data when fetchData is called', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetchResponse(mockData);

    const { result, waitForNextUpdate } = renderHook(() => 
      useFetch({ url: 'https://api.example.com/data' })
    );

    // Call fetchData manually
    act(() => {
      result.current.fetchData();
    });

    // Should be loading
    expect(result.current.loading).toBe(true);
    
    await waitForNextUpdate();
    
    // After fetch completes
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    // Mock a failed response
    mockFetchResponse({ error: 'Not found' }, false, 404);

    const { result, waitForNextUpdate } = renderHook(() => 
      useFetch({ url: 'https://api.example.com/data' })
    );

    // Call fetchData manually
    act(() => {
      result.current.fetchData().catch(() => {});
    });
    
    await waitForNextUpdate();
    
    // After fetch fails
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('Request failed with status 404');
  });

  it('should call onSuccess callback when fetch succeeds', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetchResponse(mockData);
    const onSuccess = jest.fn();

    const { result, waitForNextUpdate } = renderHook(() => 
      useFetch({ 
        url: 'https://api.example.com/data',
        onSuccess
      })
    );

    act(() => {
      result.current.fetchData();
    });
    
    await waitForNextUpdate();
    
    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  it('should call onError callback when fetch fails', async () => {
    mockFetchResponse({ error: 'Not found' }, false, 404);
    const onError = jest.fn();

    const { result, waitForNextUpdate } = renderHook(() => 
      useFetch({ 
        url: 'https://api.example.com/data',
        onError
      })
    );

    act(() => {
      result.current.fetchData().catch(() => {});
    });
    
    await waitForNextUpdate();
    
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });
}); 