// lib/useBackendStatus.ts
import { useState, useEffect } from 'react';
import { HEALTH_URL } from './api';

const useBackendStatus = (healthUrl: string = HEALTH_URL) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null means unknown
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkBackendStatus = async () => {
    if (!healthUrl) {
      setIsOnline(null);
      setIsLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isLocalUrl = healthUrl.startsWith('http://localhost') || healthUrl.startsWith('http://127.0.0.1');

      if (!isLocalHost && isLocalUrl) {
        setIsOnline(null);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Check the health endpoint
      const response = await fetch(healthUrl, {
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch (error) {
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';

      if (!isNetworkError && !isAbortError) {
        console.error('Backend status check failed:', error);
      }
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check status immediately on mount
    checkBackendStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);

    return () => clearInterval(interval);
  }, [healthUrl]);

  return { isOnline, isLoading, checkBackendStatus };
};

export default useBackendStatus;