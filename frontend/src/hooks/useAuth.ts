'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/api'; // Updated import

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
  console.log('[AUTH] Notifying subscribers. State:', { 
    user: globalUser ? `${globalUser.username} (id: ${globalUser.id})` : 'null', 
    loading: globalLoading, 
    error: globalError,
    hasInitialized: globalHasInitialized 
  });
  authSubscribers.forEach(callback => callback());
};

// API call function with timeout
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  let token = null;
  
  try {
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token');
      console.log('[AUTH] localStorage access successful, token exists:', !!token);
    } else {
      console.log('[AUTH] localStorage not available (server-side)');
    }
  } catch (error) {
    console.error('[AUTH] Error accessing localStorage:', error);
  }
  
  console.log('[AUTH] Making API call to:', `${process.env.NEXT_PUBLIC_API_URL}/auth${endpoint}`);
  console.log('[AUTH] Environment API URL:', process.env.NEXT_PUBLIC_API_URL);
  
  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[AUTH] API call timeout triggered after 5 seconds');
    controller.abort();
  }, 5000); // 5 second timeout
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    const data = await response.json();
    console.log('[AUTH] API Response:', { status: response.status, data });

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[AUTH] API call failed:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - backend server may not be running');
    }
    throw error;
  }
};

// Initialize auth state - only run once globally
const initializeAuth = async () => {
  if (globalHasInitialized) {
    console.log('[AUTH] Already initialized, skipping');
    return;
  }
  
  console.log('[AUTH] Starting initialization...');
  globalHasInitialized = true; // Set this immediately to prevent multiple calls
  
  try {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      console.log('[AUTH] Server-side rendering detected, skipping token check');
      globalUser = null;
      globalLoading = false;
      notifySubscribers();
      return;
    }

    let token = null;
    try {
      token = localStorage.getItem('token');
      console.log('[AUTH] Initial auth check - token exists:', !!token);
    } catch (error) {
      console.error('[AUTH] Error accessing localStorage:', error);
      token = null;
    }
    
    if (token) {
      console.log('[AUTH] Token found, validating with backend...');
      const response = await apiCall('/me');
      console.log('[AUTH] User fetched successfully:', response.user);
      globalUser = response.user;
    } else {
      console.log('[AUTH] No token found, user not logged in');
      globalUser = null;
    }
  } catch (error) {
    console.error('[AUTH] Error fetching user during initial load:', error);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    } catch (e) {
      console.error('[AUTH] Error removing token from localStorage:', e);
    }
    globalUser = null;
  } finally {
    globalLoading = false;
    console.log('[AUTH] Auth initialization complete, loading set to false');
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
  const [renderTrigger, setRenderTrigger] = useState(0);
  const router = useRouter();

  // Force component to re-render when global state changes
  useEffect(() => {
    console.log('[AUTH HOOK] Setting up subscription for component');
    
    const unsubscribe = subscribeToAuth(() => {
      console.log('[AUTH HOOK] Received state update, forcing re-render. Global state:', {
        user: globalUser ? `${globalUser.username} (${globalUser.id})` : 'null',
        loading: globalLoading,
        error: globalError,
        hasInitialized: globalHasInitialized
      });
      setRenderTrigger(prev => prev + 1); // More reliable than forceUpdate({})
    });

    // Initialize auth on first hook usage
    if (!globalHasInitialized) {
      console.log('[AUTH HOOK] Triggering initialization');
      initializeAuth();
      
      // Safety fallback - if initialization takes too long, stop loading
      setTimeout(() => {
        if (globalLoading && !globalUser) {
          console.warn('[AUTH HOOK] Auth initialization timeout - forcing loading to false');
          globalLoading = false;
          globalHasInitialized = true;
          notifySubscribers();
        }
      }, 10000); // 10 second maximum wait
    } else {
      console.log('[AUTH HOOK] Auth already initialized, current state:', {
        user: globalUser ? `${globalUser.username} (${globalUser.id})` : 'null',
        loading: globalLoading,
        error: globalError
      });
    }

    return unsubscribe;
  }, []);

  // Ensure we're always returning the current global state
  const currentState = {
    user: globalUser,
    loading: globalLoading,
    error: globalError,
    hasInitialized: globalHasInitialized,
    renderTrigger
  };

  // Debug log current state on every render
  console.log('[AUTH HOOK] Current state:', currentState);

  return {
    user: currentState.user,
    loading: currentState.loading,
    error: currentState.error,
    login,
    register,
    logout,
    clearError
  };
};

export { useAuth };