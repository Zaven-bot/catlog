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
import { UserAnime, AnimeStatus } from '@/types/api'; // Fixed import

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
            
            // Filter by AnimeStatus enum values (not string literals)
            const completedAnime = userAnimeList.filter((anime) => anime.status === AnimeStatus.COMPLETED);
            const droppedAnime = userAnimeList.filter((anime) => anime.status === AnimeStatus.DROPPED);
            const watchingAnime = userAnimeList.filter((anime) => anime.status === AnimeStatus.WATCHING);
            const planToWatchAnime = userAnimeList.filter((anime) => anime.status === AnimeStatus.PLAN_TO_WATCH);
            const onHoldAnime = userAnimeList.filter((anime) => anime.status === AnimeStatus.ON_HOLD);
            
            const totalEpisodesWatched = completedAnime.reduce((sum, anime) => sum + (anime.anime.episodes || 0), 0);
            const totalAnime = userAnimeList.length;
            const completionRate = totalAnime > 0 ? Math.round((completedAnime.length / totalAnime) * 100) : 0;
            
            // Calculate total watch time (assuming 24 minutes per episode)
            const totalMinutesWatched = totalEpisodesWatched * 24;
            const totalHoursWatched = Math.round(totalMinutesWatched / 60);
            const totalDaysWatched = Math.round(totalHoursWatched / 24 * 10) / 10; // 1 decimal place

            setStats({
                ...statsData,
                totalAnime,
                completedAnime: completedAnime.length,
                droppedAnime: droppedAnime.length,
                watchingAnime: watchingAnime.length,
                plannedAnime: planToWatchAnime.length,
                onHoldAnime: onHoldAnime.length,
                totalEpisodesWatched,
                totalHoursWatched,
                totalDaysWatched,
                completionRate,
            });
        };
        
        if (userAnimeList.length > 0) {
            loadStats();
        }
    }, [userAnimeList, getUserAnimeStats]);

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

    // Status Distribution Chart - using AnimeStatus enum
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

    // Top Genres Chart - using proper AnimeStatus filtering
    const genresData = (() => {
        const genreCounts: Record<string, number> = {};
        userAnimeList
            .filter((anime) => [AnimeStatus.WATCHING, AnimeStatus.COMPLETED, AnimeStatus.PLAN_TO_WATCH].includes(anime.status))
            .flatMap((anime) => anime.anime.genres)
            .forEach((genre) => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
        
        // Get top 8 genres
        const sortedGenres = Object.entries(genreCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8);
            
        return {
            labels: sortedGenres.map(([genre]) => genre),
            datasets: [
                {
                    label: 'Anime Count',
                    data: sortedGenres.map(([,count]) => count),
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

    // Rating Distribution Chart - using correct UserAnime structure
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

    // Calculate additional stats for display
    const averageRating = userAnimeList
        .filter(anime => anime.personalRating)
        .reduce((sum, anime) => sum + (anime.personalRating || 0), 0) / 
        userAnimeList.filter(anime => anime.personalRating).length || 0;

    const dropRate = stats.totalAnime > 0 ? Math.round((stats.droppedAnime / stats.totalAnime) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Key Metrics Cards - Top Row (3 cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalAnime || 0}</div>
                    <div className="text-gray-600 text-sm">Total Anime</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.totalEpisodesWatched || 0}</div>
                    <div className="text-gray-600 text-sm">Episodes Watched</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.droppedAnime || 0}</div>
                    <div className="text-gray-600 text-sm">Animes Dropped</div>
                </div>
                <div className="card text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.completionRate || 0}%</div>
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

            {/* Bottom Row: Rating Insights + Watch Time Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rating Insights */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">⭐ Rating Insights</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Your Average Rating:</span>
                            <span className="font-semibold text-purple-600">
                                {averageRating > 0 ? `${averageRating.toFixed(1)}/10` : 'No ratings yet'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Drop Rate:</span>
                            <span className="font-semibold text-red-600">{dropRate}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Dropped Anime:</span>
                            <span className="font-semibold text-red-600">{stats.droppedAnime || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Watch Time Stats */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">⏰ Watch Time Stats</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">{stats.totalDaysWatched || 0}</div>
                            <div className="text-gray-600 text-xs">Days Watched</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-green-600">{stats.totalHoursWatched || 0}</div>
                            <div className="text-gray-600 text-xs">Hours Watched</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-indigo-600">{(stats.totalHoursWatched || 0) * 60}</div>
                            <div className="text-gray-600 text-xs">Minutes Watched</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsChart;