'use client';

import { useCallback, useState } from 'react';
import { refreshStoredSession } from './authSession';

type StoredUser = {
  access_token?: string;
};

export const useSessionRefresh = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSession = useCallback(async (): Promise<StoredUser | null> => {
    setIsRefreshing(true);
    try {
      return await refreshStoredSession();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    isRefreshing,
    refreshSession,
  };
};
