'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
}

interface LoginCredentials {
  login: string;
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

// Global state - shared across all components
let globalUser: User | null = null;
let globalLoading: boolean = true;
let globalError: string | null = null;
let globalHasInitialized: boolean = false;

// Subscribers for state changes
let authSubscribers: Array<() => void> = [];

// Helper function to notify all subscribers
const notifySubscribers = () => {
  authSubscribers.forEach(callback => callback());
};

// API call function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  console.log('Making API call to:', `${process.env.NEXT_PUBLIC_API_URL}/auth${endpoint}`);
  console.log('Token exists:', !!token);
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json();
  console.log('API Response:', { status: response.status, data });

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
};

// Initialize auth state - only run once globally
const initializeAuth = async () => {
  if (globalHasInitialized) return;
  
  try {
    const token = localStorage.getItem('token');
    console.log('Initial auth check - token exists:', !!token);
    if (token) {
      const response = await apiCall('/me');
      console.log('User fetched successfully:', response.user);
      globalUser = response.user;
    }
  } catch (error) {
    console.error('Error fetching user during initial load:', error);
    localStorage.removeItem('token');
    globalUser = null;
  } finally {
    globalLoading = false;
    globalHasInitialized = true;
    notifySubscribers();
  }
};

// Login function
const login = async (credentials: LoginCredentials): Promise<boolean> => {
  try {
    globalLoading = true;
    globalError = null;
    notifySubscribers();
    
    console.log('Attempting login with:', { login: credentials.login });

    const response = await apiCall('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    console.log('Login successful, storing token and user:', response);
    localStorage.setItem('token', response.token);
    globalUser = response.user;
    
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Login failed';
    console.error('Login failed:', err);
    globalError = errorMessage;
    return false;
  } finally {
    globalLoading = false;
    notifySubscribers();
  }
};

// Register function
const register = async (credentials: RegisterCredentials): Promise<boolean> => {
  try {
    globalLoading = true;
    globalError = null;
    notifySubscribers();

    const response = await apiCall('/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    localStorage.setItem('token', response.token);
    globalUser = response.user;
    
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Registration failed';
    globalError = errorMessage;
    console.error('Registration error:', err);
    return false;
  } finally {
    globalLoading = false;
    notifySubscribers();
  }
};

// Logout function
const logout = async (): Promise<void> => {
  try {
    await apiCall('/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('token');
    globalUser = null;
    notifySubscribers();
    // Use window.location for full page refresh
    window.location.href = '/login';
  }
};

// Clear error function
const clearError = () => {
  globalError = null;
  notifySubscribers();
};

// Subscribe function
export const subscribeToAuth = (callback: () => void) => {
  authSubscribers.push(callback);
  
  // Return unsubscribe function
  return () => {
    authSubscribers = authSubscribers.filter(cb => cb !== callback);
  };
};

// Hook that uses global state
const useAuth = (): UseAuthReturn => {
  const [, forceUpdate] = useState({});
  const router = useRouter();

  // Force component to re-render when global state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuth(() => {
      forceUpdate({});
    });

    // Initialize auth on first hook usage
    if (!globalHasInitialized) {
      initializeAuth();
    }

    return unsubscribe;
  }, []);

  return {
    user: globalUser,
    loading: globalLoading,
    error: globalError,
    login,
    register,
    logout,
    clearError
  };
};

export { useAuth };