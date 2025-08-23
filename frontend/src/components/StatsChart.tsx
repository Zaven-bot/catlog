'use client';

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useUserAnimeList } from '../hooks/useUserAnimeList';
import { UserAnime, AnimeStatus } from '@shared/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const StatsChart: React.FC = () => {
    const { userAnimeList, getUserAnimeStats } = useUserAnimeList();
    const [stats, setStats] = useState<any>(null);
    const [activeChart, setActiveChart] = useState<'status' | 'genres' | 'activity' | 'ratings'>('status');

    useEffect(() => {
        const loadStats = async () => {
            const statsData = await getUserAnimeStats();
            const completedAnime = userAnimeList.filter((anime) => anime.status === 'COMPLETED');
            const droppedAnime = userAnimeList.filter((anime) => anime.status === 'DROPPED');
            const totalEpisodesWatched = completedAnime.reduce((sum, anime) => sum + (anime.anime.episodes || 0), 0);
            const completionRate = Math.round((completedAnime.length / (completedAnime.length + droppedAnime.length + userAnimeList.filter((anime) => ['WATCHING', 'PLAN_TO_WATCH'].includes(anime.status)).length)) * 100);

            setStats({
                ...statsData,
                totalEpisodesWatched,
                totalDropped: droppedAnime.length,
                completionRate,
            });
        };
        if (userAnimeList.length > 0) {
            loadStats();
        }
    }, [userAnimeList]);

    if (!stats || userAnimeList.length === 0) {
        return (
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Your Anime Statistics</h2>
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-gray-500 mb-4">No anime data yet!</p>
                    <p className="text-gray-400 text-sm">Start logging some anime to see detailed statistics and charts.</p>
                </div>
            </div>
        );
    }

    // Status Distribution Chart
    const statusData = {
        labels: ['Plan to Watch', 'Watching', 'Completed', 'On Hold', 'Dropped'],
        datasets: [
            {
                label: 'Number of Anime',
                data: [
                    stats.plannedAnime || 0,
                    stats.watchingAnime || 0,
                    stats.completedAnime || 0,
                    stats.onHoldAnime || 0,
                    stats.droppedAnime || 0
                ],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',   // Blue
                    'rgba(34, 197, 94, 0.8)',    // Green
                    'rgba(168, 85, 247, 0.8)',   // Purple
                    'rgba(234, 179, 8, 0.8)',    // Yellow
                    'rgba(239, 68, 68, 0.8)',    // Red
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(234, 179, 8, 1)',
                    'rgba(239, 68, 68, 1)',
                ],
                borderWidth: 2,
            },
        ],
    };

    // Top Genres Chart
    const genresData = (() => {
        const genreCounts: Record<string, number> = {};
        userAnimeList
            .filter((anime) => ['WATCHING', 'COMPLETED', 'PLAN_TO_WATCH'].includes(anime.status))
            .flatMap((anime) => anime.anime.genres)
            .forEach((genre) => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
        return {
            labels: Object.keys(genreCounts),
            datasets: [
                {
                    label: 'Anime Count',
                    data: Object.values(genreCounts),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(199, 199, 199, 0.8)',
                        'rgba(83, 102, 255, 0.8)',
                    ],
                    borderWidth: 2,
                },
            ],
        };
    })();

    // Rating Distribution Chart
    const ratingsData = {
        labels: ['Excellent (9-10)', 'Great (7-8)', 'Good (5-6)', 'Poor (1-4)', 'Unrated'],
        datasets: [
            {
                data: [
                    userAnimeList.filter((entry: UserAnime) => entry.personalRating !== undefined && entry.personalRating >= 9).length,
                    userAnimeList.filter((entry: UserAnime) => entry.personalRating !== undefined && entry.personalRating >= 7 && entry.personalRating < 9).length,
                    userAnimeList.filter((entry: UserAnime) => entry.personalRating !== undefined && entry.personalRating >= 5 && entry.personalRating < 7).length,
                    userAnimeList.filter((entry: UserAnime) => entry.personalRating !== undefined && entry.personalRating > 0 && entry.personalRating < 5).length,
                    userAnimeList.filter((entry: UserAnime) => entry.personalRating === undefined || entry.personalRating === null).length,
                ],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',    // Green for excellent
                    'rgba(59, 130, 246, 0.8)',   // Blue for great
                    'rgba(234, 179, 8, 0.8)',    // Yellow for good
                    'rgba(239, 68, 68, 0.8)',    // Red for poor
                    'rgba(156, 163, 175, 0.8)',  // Gray for unrated
                ],
                borderWidth: 2,
            },
        ],
    };

    // Monthly Activity Chart
    const activityData = {
        labels: stats.monthlyActivity?.map((m: any) => m.month) || [],
        datasets: [
            {
                label: 'Anime Added/Updated',
                data: stats.monthlyActivity?.map((m: any) => m.count) || [],
                borderColor: 'rgba(168, 85, 247, 1)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
            },
        },
    };

    const getChartComponent = () => {
        switch (activeChart) {
            case 'status':
                return <Bar data={statusData} options={chartOptions} />;
            case 'genres':
                return <Bar data={genresData} options={chartOptions} />;
            case 'ratings':
                return <Doughnut data={ratingsData} options={doughnutOptions} />;
            case 'activity':
                return <Line data={activityData} options={chartOptions} />;
            default:
                return <Bar data={statusData} options={chartOptions} />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats?.totalAnime || 0}</div>
                    <div className="text-gray-600 text-sm">Total Anime</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats?.totalEpisodesWatched || 0}</div>
                    <div className="text-gray-600 text-sm">Episodes Watched</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-red-600">{stats?.totalDropped || 0}</div>
                    <div className="text-gray-600 text-sm">Animes Dropped</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats?.completionRate || 0}%</div>
                    <div className="text-gray-600 text-sm">Completion Rate</div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="card">
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setActiveChart('status')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeChart === 'status' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        📊 Status Breakdown
                    </button>
                    <button
                        onClick={() => setActiveChart('genres')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeChart === 'genres' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        🎭 Top Genres
                    </button>
                    <button
                        onClick={() => setActiveChart('ratings')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeChart === 'ratings' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        ⭐ Your Ratings
                    </button>
                    <button
                        onClick={() => setActiveChart('activity')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeChart === 'activity' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        📈 Activity Trend
                    </button>
                </div>

                <div className="h-80">
                    {getChartComponent()}
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Studios */}
                {stats.topStudios && stats.topStudios.length > 0 && (
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4">🏢 Favorite Studios</h3>
                        <div className="space-y-2">
                            {stats.topStudios.slice(0, 5).map((studio: any, index: number) => (
                                <div key={studio.studio} className="flex justify-between items-center">
                                    <span className="text-gray-700">{studio.studio}</span>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                        {studio.count} anime
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rating Insights */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">⭐ Rating Insights</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Your Average Rating:</span>
                            <span className="font-semibold text-purple-600">
                                {stats.personalAverageRating > 0 ? `${stats.personalAverageRating}/10` : 'No ratings yet'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Drop Rate:</span>
                            <span className="font-semibold text-red-600">{stats.dropRate}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Watch Time Breakdown */}
            <div className="card">
                <h3 className="text-lg font-semibold mb-4">⏱️ Watch Time Summary</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats?.totalWatchTimeMinutes || 0}m</div>
                    <div className="text-gray-600 text-sm">Total Minutes</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats?.totalWatchTimeHours || 0}h</div>
                    <div className="text-gray-600 text-sm">Total Hours</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats?.totalWatchTimeDays || 0}d</div>
                    <div className="text-gray-600 text-sm">Total Days</div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default StatsChart;