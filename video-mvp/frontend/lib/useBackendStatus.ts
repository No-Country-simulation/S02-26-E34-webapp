// lib/useBackendStatus.ts
import { useState, useEffect } from 'react';
import { HEALTH_URL } from './api';

const useBackendStatus = (healthUrl: string = HEALTH_URL) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null means unknown
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkBackendStatus = async () => {
    setIsLoading(true);
    try {
      // Check the health endpoint
      const response = await fetch(healthUrl);
      
      if (response.ok) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch (error) {
      console.error('Backend status check failed:', error);
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