import { useEffect, useCallback, useRef, useState } from 'react';

export function useRealtimeWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [url]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const on = useCallback(
    (event: string, handler: (data: any) => void) => {
      if (!wsRef.current) return;
      wsRef.current.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === event) {
          handler(data);
        }
      };
    },
    []
  );

  return { isConnected, error, send, on, ws: wsRef.current };
}

export function useRAG() {
  const [files, setFiles] = useState<Array<{ name: string; size: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/rag/files');
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/rag/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        await listFiles();
        return await res.json();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setError(msg);
        throw err;
      }
    },
    [listFiles]
  );

  const deleteFile = useCallback(
    async (fileName: string) => {
      try {
        const res = await fetch(`/api/rag/files/${fileName}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        await listFiles();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Delete failed';
        setError(msg);
        throw err;
      }
    },
    [listFiles]
  );

  return { files, isLoading, error, listFiles, uploadFile, deleteFile };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      setStoredValue(value);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [key]);

  return [storedValue, setValue];
}
