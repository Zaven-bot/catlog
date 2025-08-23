'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAnimeList } from '../../hooks/useUserAnimeList';
import { useAuth } from '../../hooks/useAuth';
import { AnimeStatus } from '@shared/types';
import AnimeCard from '../../components/AnimeCard';

const statusOptions: { value: AnimeStatus | 'ALL'; label: string; color: string }[] = [
  { value: 'ALL', label: 'All Anime', color: 'bg-gray-500' },
  { value: AnimeStatus.WATCHING, label: 'Currently Watching', color: 'bg-green-500' },
  { value: AnimeStatus.COMPLETED, label: 'Completed', color: 'bg-purple-500' },
  { value: AnimeStatus.PLAN_TO_WATCH, label: 'Planned', color: 'bg-blue-500' },
  { value: AnimeStatus.ON_HOLD, label: 'On Hold', color: 'bg-yellow-500' },
  { value: AnimeStatus.DROPPED, label: 'Dropped', color: 'bg-red-500' },
];

const MyAnimeListPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { userAnimeList, loading, error, refreshList, getUserAnimeStats } = useUserAnimeList();
  const [selectedStatus, setSelectedStatus] = useState<AnimeStatus | 'ALL'>('ALL');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Only redirect if we're done loading and there's no user
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const loadStats = async () => {
      const statsData = await getUserAnimeStats();
      setStats(statsData);
    };

    if (user && !authLoading) {
      loadStats();
    }
  }, [user, authLoading, getUserAnimeStats]);

  // Calculate stats from local state instead of making API calls
  const calculateLocalStats = () => {
    const totalAnime = userAnimeList.length;
    const completedAnime = userAnimeList.filter(item => item.status === 'COMPLETED').length;
    const watchingAnime = userAnimeList.filter(item => item.status === 'WATCHING').length;
    const plannedAnime = userAnimeList.filter(item => item.status === 'PLAN_TO_WATCH').length;
    const droppedAnime = userAnimeList.filter(item => item.status === 'DROPPED').length;
    const onHoldAnime = userAnimeList.filter(item => item.status === 'ON_HOLD').length;
    
    // Calculate total episodes watched from completed anime
    const totalEpisodesWatched = userAnimeList
      .filter(item => item.status === 'COMPLETED')
      .reduce((total, item) => total + (item.anime.episodes || 0), 0);
    
    return {
      totalAnime,
      completedAnime,
      watchingAnime,
      plannedAnime,
      droppedAnime,
      onHoldAnime,
      totalEpisodesWatched
    };
  };

  // Use local stats calculation instead of API stats
  const currentStats = userAnimeList.length > 0 ? calculateLocalStats() : stats;

  const filteredAnime = selectedStatus === 'ALL' 
    ? userAnimeList 
    : userAnimeList.filter(item => item.status === selectedStatus);

  const getStatusCount = (status: AnimeStatus | 'ALL') => {
    if (status === 'ALL') return userAnimeList.length;
    return userAnimeList.filter(item => item.status === status).length;
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  if (loading && userAnimeList.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading your anime list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Anime List</h1>
        <p className="text-gray-600">Track and manage your anime watching journey</p>
      </div>

      {/* Statistics Cards */}
      {currentStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-gray-900">{currentStats.totalAnime}</div>
            <div className="text-sm text-gray-600">Total Anime</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-green-600">{currentStats.completedAnime}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-blue-600">{currentStats.watchingAnime}</div>
            <div className="text-sm text-gray-600">Watching</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-purple-600">{currentStats.plannedAnime}</div>
            <div className="text-sm text-gray-600">Planned</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-yellow-600">{currentStats.onHoldAnime}</div>
            <div className="text-sm text-gray-600">On Hold</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-indigo-600">{currentStats.totalEpisodesWatched}</div>
            <div className="text-sm text-gray-600">Episodes</div>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedStatus === option.value
                  ? `${option.color} text-white`
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {option.label} ({getStatusCount(option.value)})
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button 
            onClick={refreshList}
            className="ml-4 text-sm underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredAnime.length === 0 && !loading && (
        <div className="text-center py-12">
          {selectedStatus === 'ALL' ? (
            <>
              <div className="text-6xl mb-4">📺</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your anime list is empty</h3>
              <p className="text-gray-600 mb-6">Start building your collection by searching for anime and adding them to your list!</p>
              <button
                onClick={() => router.push('/search')}
                className="btn-primary"
              >
                Search for Anime
              </button>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No anime with status "{statusOptions.find(opt => opt.value === selectedStatus)?.label}"
              </h3>
              <p className="text-gray-600">Try selecting a different status or add more anime to your list.</p>
            </>
          )}
        </div>
      )}

      {/* Anime Grid */}
      {filteredAnime.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAnime.map((userAnime) => (
            <div key={userAnime.id} className="relative">
              <AnimeCard anime={userAnime.anime} />
            </div>
          ))}
        </div>
      )}

      {/* Loading more indicator */}
      {loading && userAnimeList.length > 0 && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default MyAnimeListPage;