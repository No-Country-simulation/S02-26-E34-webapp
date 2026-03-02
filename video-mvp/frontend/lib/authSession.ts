import { API_BASE_URL } from './api';

type StoredUser = {
  access_token?: string;
};

const emitUserStateChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-state-change'));
  }
};

const clearStoredUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    emitUserStateChange();
  }
};

export const refreshStoredSession = async (): Promise<StoredUser | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedUserRaw = localStorage.getItem('user');
  if (!storedUserRaw) {
    return null;
  }

  try {
    const storedUser = JSON.parse(storedUserRaw) as StoredUser;
    const token = storedUser?.access_token;

    if (!token) {
      clearStoredUser();
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const refreshedUser = (await response.json()) as StoredUser;
      localStorage.setItem('user', JSON.stringify(refreshedUser));
      emitUserStateChange();
      return refreshedUser;
    }

    if (response.status === 401 || response.status === 404) {
      clearStoredUser();
      return null;
    }

    return null;
  } catch (error) {
    console.error('Session refresh failed:', error);
    return null;
  }
};