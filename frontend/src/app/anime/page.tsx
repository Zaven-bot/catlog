'use client';

import React, { useState, useEffect } from 'react';
import { useAnime } from '../../hooks/useAnime';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import AnimeCard from '../../components/AnimeCard';

interface AnimeSection {
    data: any[];
    title: string;
}

const AnimePage = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { animeList, loading, error, getTopAnime, getSeasonalAnime } = useAnime();
    const [currentView, setCurrentView] = useState<'trending' | 'seasonal' | 'allTimeFavorites'>('trending');
    const [trendingAnime, setTrendingAnime] = useState<any[]>([]);
    const [seasonalAnime, setSeasonalAnime] = useState<any[]>([]);
    const [allTimeFavoritesAnime, setAllTimeFavoritesAnime] = useState<any[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadingTabs, setLoadingTabs] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        loadTrendingAnime();
    }, []);

    const loadTrendingAnime = async () => {
        try {
            setIsLoading(true);
            setLoadError(null);
            
            // Trending should show a mix of popular anime from recent years (2020+)
            // We'll get top anime and filter for recent ones to simulate "trending"
            const topAnime = await getTopAnime(1); // Fixed: only pass page parameter
            const recentYear = new Date().getFullYear() - 5; // Last 5 years
            
            const trendingFiltered = topAnime.filter(anime => 
                anime.year && anime.year >= recentYear
            ).slice(0, 20);
            
            // If we don't have enough recent anime, supplement with top-rated
            if (trendingFiltered.length < 15) {
                const supplemental = topAnime.filter(anime => 
                    !trendingFiltered.find(t => t.malId === anime.malId)
                ).slice(0, 20 - trendingFiltered.length);
                
                setTrendingAnime([...trendingFiltered, ...supplemental]);
            } else {
                setTrendingAnime(trendingFiltered);
            }
        } catch (error) {
            console.error('Error loading trending anime:', error);
            setLoadError(error instanceof Error ? error.message : 'Failed to load trending anime');
        } finally {
            setIsLoading(false);
        }
    };

    const loadSeasonalAnime = async () => {
        if (seasonalAnime.length > 0) return; // Already loaded
        
        try {
            setLoadingTabs(prev => ({ ...prev, seasonal: true }));
            const seasonal = await getSeasonalAnime();
            setSeasonalAnime(seasonal.slice(0, 20));
        } catch (error) {
            console.error('Error loading seasonal anime:', error);
            setLoadError('Failed to load seasonal anime');
        } finally {
            setLoadingTabs(prev => ({ ...prev, seasonal: false }));
        }
    };

    const loadAllTimeFavorites = async () => {
        if (allTimeFavoritesAnime.length > 0) return; // Already loaded
        
        try {
            setLoadingTabs(prev => ({ ...prev, allTimeFavorites: true }));
            // All Time Favorites should show the highest rated anime of all time
            const favorites = await getTopAnime(1);
            setAllTimeFavoritesAnime(favorites.slice(0, 20));
        } catch (error) {
            console.error('Error loading all-time favorites:', error);
            setLoadError('Failed to load all-time favorites');
        } finally {
            setLoadingTabs(prev => ({ ...prev, allTimeFavorites: false }));
        }
    };

    const handleTabClick = async (tab: 'trending' | 'seasonal' | 'allTimeFavorites') => {
        setCurrentView(tab);
        setLoadError(null);
        
        // Lazy load data when tab is clicked
        if (tab === 'seasonal') {
            await loadSeasonalAnime();
        } else if (tab === 'allTimeFavorites') {
            await loadAllTimeFavorites();
        }
    };

    const getCurrentAnimeList = () => {
        switch (currentView) {
            case 'trending':
                return trendingAnime;
            case 'seasonal':
                return seasonalAnime;
            case 'allTimeFavorites':
                return allTimeFavoritesAnime;
            default:
                return trendingAnime;
        }
    };

    const getCurrentTabLoading = () => {
        return loadingTabs[currentView] || false;
    };

    const getRandomAnime = async () => {
        try {
            // Get a random page between 1-10 for variety
            const randomPage = Math.floor(Math.random() * 10) + 1;
            const randomAnime = await getTopAnime(randomPage);
            // Pick a random anime from that page
            const randomIndex = Math.floor(Math.random() * randomAnime.length);
            const selectedAnime = randomAnime[randomIndex];
            
            if (selectedAnime) {
                // Navigate to the anime detail page
                window.location.href = `/anime/${selectedAnime.malId}`;
            }
        } catch (error) {
            console.error('Error getting random anime:', error);
        }
    };

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
    }, [user, authLoading, router]);

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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
                    <div className="text-lg text-gray-600">Loading anime catalog...</div>
                </div>
            </div>
        );
    }

    if (loadError && currentView === 'trending') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 mb-4">❌ Error loading anime: {loadError}</div>
                    <button 
                        onClick={loadTrendingAnime}
                        className="btn-primary"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const currentAnimeList = getCurrentAnimeList();
    const isCurrentTabLoading = getCurrentTabLoading();

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Anime</h1>
                <p className="text-gray-600">Discover new anime series and movies to add to your collection</p>
            </div>

            {/* Discovery Actions */}
            <div className="mb-8 bg-white rounded-lg p-6 shadow">
                <h2 className="text-xl font-semibold mb-4">Quick Discovery</h2>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={getRandomAnime}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105"
                    >
                        🎲 Surprise Me!
                    </button>
                    <button
                        onClick={() => window.location.href = '/search'}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        🔍 Advanced Search
                    </button>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2 border-b border-gray-200">
                    <button
                        onClick={() => handleTabClick('trending')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                            currentView === 'trending'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        🔥 Trending
                    </button>
                    <button
                        onClick={() => handleTabClick('seasonal')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                            currentView === 'seasonal'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        🌸 This Season {loadingTabs.seasonal && <span className="ml-1">⏳</span>}
                    </button>
                    <button
                        onClick={() => handleTabClick('allTimeFavorites')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                            currentView === 'allTimeFavorites'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        ⭐ All Time Favorites {loadingTabs.allTimeFavorites && <span className="ml-1">⏳</span>}
                    </button>
                </div>
            </div>

            {/* Loading state for current tab */}
            {isCurrentTabLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Skeleton loading cards that match the actual anime card dimensions */}
                    {Array.from({ length: 12 }).map((_, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                            {/* Image skeleton */}
                            <div className="w-full h-64 bg-gray-200"></div>
                            {/* Content skeleton */}
                            <div className="p-4">
                                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error state for current tab */}
            {loadError && currentView !== 'trending' && !isCurrentTabLoading && (
                <div className="text-center py-12">
                    <div className="text-red-500 mb-4">❌ {loadError}</div>
                    <button 
                        onClick={() => handleTabClick(currentView)}
                        className="btn-primary"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Anime Grid */}
            {!isCurrentTabLoading && !loadError && (
                <>
                    {currentAnimeList.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📺</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No anime found</h3>
                            <p className="text-gray-600 mb-6">Try refreshing or switch to a different category.</p>
                            <button
                                onClick={() => handleTabClick(currentView)}
                                className="btn-primary"
                            >
                                Refresh
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {currentAnimeList.map((anime) => (
                                <AnimeCard key={anime.malId} anime={anime} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Load More */}
            {!isCurrentTabLoading && currentAnimeList.length > 0 && (
                <div className="text-center mt-8">
                    <button
                        onClick={() => window.location.href = '/search'}
                        className="btn-secondary"
                    >
                        🔍 Search for More Anime
                    </button>
                </div>
            )}
        </div>
    );
};

export default AnimePage;