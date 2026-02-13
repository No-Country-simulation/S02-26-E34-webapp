import { API_BASE_URL } from './api';

type StoredUser = {
  access_token?: string;
};

export type CookiePreferences = {
  necessary: boolean;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  updated_at?: string | null;
};

const getAuthToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem('user');
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as StoredUser;
    return parsed.access_token || null;
  } catch {
    return null;
  }
};

export const fetchCookiePreferences = async () => {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/cookie-preferences`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as CookiePreferences;
};

export const saveCookiePreferences = async (prefs: CookiePreferences) => {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/auth/cookie-preferences`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(prefs)
  });

  return response.ok;
};
