import { useState, useCallback, useEffect } from 'react';

interface UseFetchOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFetch<T = any>({
  url,
  method = 'GET',
  body,
  headers,
  immediate = false,
  onSuccess,
  onError
}: UseFetchOptions<T>) {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async (overrideBody?: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const requestBody = overrideBody || body;
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(requestBody && method !== 'GET' ? { body: JSON.stringify(requestBody) } : {}),
      };

      const response = await fetch(url, requestOptions);
      
      // Handle non-2xx responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      setState({ data, loading: false, error: null });
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      return data;
    } catch (error) {
      const errorObject = error instanceof Error ? error : new Error(String(error));
      
      setState({ data: null, loading: false, error: errorObject });
      
      if (onError) {
        onError(errorObject);
      }
      
      throw errorObject;
    }
  }, [url, method, body, headers, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData]);

  return {
    ...state,
    fetchData,
    // Helper methods
    reload: () => fetchData(),
    update: (newData: T) => setState(prev => ({ ...prev, data: newData })),
  };
} 