'use client';

import React, { useEffect, useState } from 'react';
import { useUserAnimeList } from '../../hooks/useUserAnimeList';
import StatsChart from '../../components/StatsChart';
import VirtualCat from '../../components/VirtualCat';

const DashboardPage = () => {
    const { userAnimeList, getUserAnimeStats, loading, error } = useUserAnimeList();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const loadStats = async () => {
            const statsData = await getUserAnimeStats();
            setStats(statsData);
        };
        if (userAnimeList.length > 0) {
            loadStats();
        }
    }, [userAnimeList, getUserAnimeStats]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading your dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Error loading dashboard: {error}</div>
            </div>
        );
    }

    const completedAnime = userAnimeList.filter(item => item.status === 'COMPLETED');
    const totalEpisodes = userAnimeList.reduce((total, item) => total + (item.episodesWatched || item.anime.episodes || 0), 0);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Anime Dashboard</h1>
                <p className="text-gray-600">Track your anime journey with your virtual cat companion</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Virtual Cat Section */}
                <div className="lg:col-span-1">
                    <h2 className="text-xl font-semibold mb-4">Your Cat Companion</h2>
                    <VirtualCat />
                </div>

                {/* Stats Section */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Your Anime Statistics</h2>
                    <StatsChart />
                </div>
            </div>

            {/* Recent Anime Section */}
            <div className="mt-12">
                <h2 className="text-xl font-semibold mb-4">Recent Anime</h2>
                {userAnimeList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {userAnimeList.slice(0, 4).map(item => (
                            <div key={item.id} className="card">
                                <img 
                                    src={item.anime.imageUrl || 'https://via.placeholder.com/300x400'} 
                                    alt={item.anime.title}
                                    className="w-full h-32 object-cover rounded-lg mb-3"
                                />
                                <h3 className="font-semibold text-sm">{item.anime.title}</h3>
                                <p className="text-xs text-gray-500">{item.anime.year}</p>
                                <p className="text-xs text-blue-600">{item.status.replace('_', ' ')}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card text-center py-8">
                        <p className="text-gray-500">No anime in your collection yet</p>
                        <p className="text-gray-400 text-sm mt-2">Start by adding some anime to see them here!</p>
                    </div>
                )}
            </div>

            {/* Quick Stats Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card text-center">
                    <div className="text-2xl font-bold text-primary-600">{userAnimeList.length}</div>
                    <div className="text-gray-600">Total Anime</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-secondary-600">
                        {completedAnime.length}
                    </div>
                    <div className="text-gray-600">Completed</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-green-600">
                        {userAnimeList.filter(item => item.status === 'WATCHING').length}
                    </div>
                    <div className="text-gray-600">Currently Watching</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-purple-600">
                        {totalEpisodes}
                    </div>
                    <div className="text-gray-600">Total Episodes</div>
                </div>
            </div>

            {/* Status Breakdown */}
            {stats && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Status Breakdown</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="card text-center">
                            <div className="text-lg font-bold text-blue-600">{stats.plannedAnime || 0}</div>
                            <div className="text-gray-600 text-sm">Plan to Watch</div>
                        </div>
                        <div className="card text-center">
                            <div className="text-lg font-bold text-green-600">{stats.watchingAnime || 0}</div>
                            <div className="text-gray-600 text-sm">Watching</div>
                        </div>
                        <div className="card text-center">
                            <div className="text-lg font-bold text-purple-600">{stats.completedAnime || 0}</div>
                            <div className="text-gray-600 text-sm">Completed</div>
                        </div>
                        <div className="card text-center">
                            <div className="text-lg font-bold text-yellow-600">{stats.onHoldAnime || 0}</div>
                            <div className="text-gray-600 text-sm">On Hold</div>
                        </div>
                        <div className="card text-center">
                            <div className="text-lg font-bold text-red-600">{stats.droppedAnime || 0}</div>
                            <div className="text-gray-600 text-sm">Dropped</div>
                        </div>
                        <div className="card text-center">
                            <div className="text-lg font-bold text-indigo-600">{stats.totalEpisodesWatched || 0}</div>
                            <div className="text-gray-600 text-sm">Episodes Watched</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;