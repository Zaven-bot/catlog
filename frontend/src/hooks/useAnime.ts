'use client';

import { useEffect, useState } from 'react';

interface Anime {
  id: number;
  malId: number;
  title: string;
  description?: string;
  imageUrl?: string;
  genres: string[];
  episodes?: number;
  status: string;
  score?: number;
  year?: number;
  rating?: string;
  studios?: string[];
}

interface AnimeStats {
  labels: string[];
  data: number[];
}

interface UseAnimeReturn {
  animeList: Anime[];
  animeStats: AnimeStats;
  loading: boolean;
  error: string | null;
  searchAnime: (query: string) => Promise<Anime[]>;
  getAnimeDetails: (malId: number) => Promise<Anime | null>;
  getTopAnime: (page?: number) => Promise<Anime[]>;
  getSeasonalAnime: (year?: number, season?: string) => Promise<Anime[]>;
}

const useAnime = (): UseAnimeReturn => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = async (endpoint: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/anime${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  const searchAnime = async (query: string): Promise<Anime[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall(`/search?q=${encodeURIComponent(query)}`);
      return response.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search anime';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getAnimeDetails = async (malId: number): Promise<Anime | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const anime = await apiCall(`/${malId}`);
      return anime;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch anime details';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getTopAnime = async (page: number = 1): Promise<Anime[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall(`/top?page=${page}&limit=20`);
      return response.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch top anime';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getSeasonalAnime = async (year?: number, season?: string): Promise<Anime[]> => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint = '/seasonal';
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (season) params.append('season', season);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const response = await apiCall(endpoint);
      return response.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch seasonal anime';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load top anime on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      const topAnime = await getTopAnime(1);
      setAnimeList(topAnime.slice(0, 10)); // Show top 10 for initial load
    };

    loadInitialData();
  }, []);

  // Generate stats based on current anime list
  const animeStats: AnimeStats = {
    labels: ['Action', 'Drama', 'Comedy', 'Romance', 'Fantasy', 'Sci-Fi'],
    data: [
      animeList.filter(anime => anime.genres.includes('Action')).length,
      animeList.filter(anime => anime.genres.includes('Drama')).length,
      animeList.filter(anime => anime.genres.includes('Comedy')).length,
      animeList.filter(anime => anime.genres.includes('Romance')).length,
      animeList.filter(anime => anime.genres.includes('Fantasy')).length,
      animeList.filter(anime => anime.genres.includes('Sci-Fi')).length,
    ]
  };

  return {
    animeList,
    animeStats,
    loading,
    error,
    searchAnime,
    getAnimeDetails,
    getTopAnime,
    getSeasonalAnime,
  };
};

export { useAnime };