'use client';

import { useState, useEffect } from 'react';
import { UserAnime, AnimeStatus } from '@/types/api'; // Updated import
import { useAuth } from './useAuth';

interface UseUserAnimeListReturn {
  userAnimeList: UserAnime[];
  loading: boolean;
  error: string | null;
  addAnimeToList: (malId: number, status: AnimeStatus) => Promise<boolean>;
  updateAnimeInList: (id: number, updates: Partial<UserAnime>) => Promise<boolean>;
  updateAnimeByMalId: (malId: number, updates: Partial<UserAnime>) => Promise<boolean>;
  removeAnimeFromList: (malId: number) => Promise<boolean>;
  getUserAnimeStats: () => Promise<any>;
  isAnimeInList: (malId: number) => UserAnime | null;
  getAnimeStatus: (malId: number) => AnimeStatus | null;
  refreshList: () => Promise<void>;
}

const useUserAnimeList = (): UseUserAnimeListReturn => {
  const [userAnimeList, setUserAnimeList] = useState<UserAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now()); // Add timestamp to force re-renders
  const { user } = useAuth();

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/anime-list${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const addAnimeToList = async (malId: number, status: AnimeStatus): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall('', {
        method: 'POST',
        body: JSON.stringify({ malId, status }),
      });

      // Check if this was an update (anime already existed) or a new addition
      const existingIndex = userAnimeList.findIndex(item => item.anime.malId === malId);
      
      if (existingIndex >= 0) {
        // Update existing entry in local state
        setUserAnimeList(prev => 
          prev.map((item, index) => index === existingIndex ? response.userAnime : item)
        );
      } else {
        // Add new entry to local state
        setUserAnimeList(prev => [...prev, response.userAnime]);
      }
      
      // Force re-render
      setLastUpdated(Date.now());
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add anime to list';
      setError(errorMessage);
      console.error('Add anime error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateAnimeInList = async (id: number, updates: Partial<UserAnime>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall(`/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      // Update local state immediately with the returned data
      setUserAnimeList(prev => {
        const newList = prev.map(item => item.id === id ? response.userAnime : item);
        console.log('Updated anime list:', newList); // Debug log
        return newList;
      });

      // Force re-render by updating timestamp
      setLastUpdated(Date.now());

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update anime';
      setError(errorMessage);
      console.error('Update anime error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to update anime by malId
  const updateAnimeByMalId = async (malId: number, updates: Partial<UserAnime>): Promise<boolean> => {
    const userAnime = userAnimeList.find(item => item.anime.malId === malId);
    if (!userAnime) {
      console.error('Anime not found in your list');
      return false;
    }
    return updateAnimeInList(userAnime.id, updates);
  };

  const removeAnimeFromList = async (malId: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Find the userAnime entry by malId first
      const userAnime = userAnimeList.find(item => item.anime.malId === malId);
      if (!userAnime) {
        throw new Error('Anime not found in your list');
      }

      await apiCall(`/${userAnime.id}`, {
        method: 'DELETE',
      });

      // Remove from local state immediately
      setUserAnimeList(prev => prev.filter(item => item.anime.malId !== malId));

      // Force re-render
      setLastUpdated(Date.now());

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove anime';
      setError(errorMessage);
      console.error('Remove anime error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getUserAnimeStats = async () => {
    try {
      setError(null);
      return await apiCall('/stats');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get stats';
      setError(errorMessage);
      console.error('Get stats error:', err);
      return null;
    }
  };

  const refreshList = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiCall('');
      setUserAnimeList(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load anime list';
      setError(errorMessage);
      console.error('Refresh list error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAnimeInList = (malId: number): UserAnime | null => {
    return userAnimeList.find(item => item.anime.malId === malId) || null;
  };

  const getAnimeStatus = (malId: number): AnimeStatus | null => {
    const anime = userAnimeList.find(item => item.anime.malId === malId);
    return anime ? anime.status : null;
  };

  // Load user's anime list on mount
  useEffect(() => {
    if (user) {
      refreshList();
    }
  }, [user]);

  return {
    userAnimeList,
    loading,
    error,
    addAnimeToList,
    updateAnimeInList,
    updateAnimeByMalId,
    removeAnimeFromList,
    getUserAnimeStats,
    isAnimeInList,
    getAnimeStatus,
    refreshList,
  };
};

export { useUserAnimeList };