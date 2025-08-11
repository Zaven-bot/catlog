'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
}

interface LoginCredentials {
  login: string; // Can be username or email
  password: string;
}

interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  };

  // Check if user is logged in on app start
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await apiCall('/me');
          setUser(response.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // Clear invalid token
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      localStorage.setItem('token', response.token);
      setUser(response.user);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      console.error('Login error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall('/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      localStorage.setItem('token', response.token);
      setUser(response.user);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      console.error('Registration error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiCall('/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      router.push('/');
    }
  };

  const clearError = () => {
    setError(null);
  };

  return { user, loading, error, login, register, logout, clearError };
};

export { useAuth };