'use client';

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useUserAnimeList } from '../hooks/useUserAnimeList';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StatsChart: React.FC = () => {
    const { userAnimeList, getUserAnimeStats } = useUserAnimeList();
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

    const data = {
        labels: ['Plan to Watch', 'Watching', 'Completed', 'On Hold', 'Dropped'],
        datasets: [
            {
                label: 'Number of Anime',
                data: stats ? [
                    stats.plannedAnime || 0,
                    stats.watchingAnime || 0,
                    stats.completedAnime || 0,
                    stats.onHoldAnime || 0,
                    stats.droppedAnime || 0
                ] : [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',  // Blue for Plan to Watch
                    'rgba(34, 197, 94, 0.6)',   // Green for Watching
                    'rgba(168, 85, 247, 0.6)',  // Purple for Completed
                    'rgba(234, 179, 8, 0.6)',   // Yellow for On Hold
                    'rgba(239, 68, 68, 0.6)',   // Red for Dropped
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(234, 179, 8, 1)',
                    'rgba(239, 68, 68, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Your Anime Watching Statistics',
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

    if (!stats || userAnimeList.length === 0) {
        return (
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Your Anime Stats</h2>
                <p className="text-gray-500">No anime data yet. Start logging some anime to see your stats! 📊</p>
            </div>
        );
    }

    return (
        <div className="card">
            <h2 className="text-xl font-bold mb-4">Your Anime Stats</h2>
            <Bar data={data} options={options} />
        </div>
    );
};

export default StatsChart;