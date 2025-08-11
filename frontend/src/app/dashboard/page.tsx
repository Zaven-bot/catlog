'use client';

import React, { useEffect, useState } from 'react';
import { useUserAnimeList } from '../../hooks/useUserAnimeList';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import StatsChart from '../../components/StatsChart';
import VirtualCat from '../../components/VirtualCat';
import EditRatingModal from '../../components/EditRatingModal';
import { UserAnime } from '../../../../shared/types';

const DashboardPage = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { userAnimeList, getUserAnimeStats, updateAnimeInList, loading, error } = useUserAnimeList();
    const [stats, setStats] = useState<any>(null);
    const [selectedAnime, setSelectedAnime] = useState<UserAnime | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
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
        if (userAnimeList.length > 0) {
            loadStats();
        }
    }, [userAnimeList, getUserAnimeStats]);

    const handleEditRating = (animeId: number) => {
        const anime = userAnimeList.find((a) => a.id === animeId);
        if (anime) {
            setSelectedAnime(anime);
        }
        setIsModalOpen(true);
    };

    const handleSaveRating = async (rating: number, notes: string) => {
        if (!selectedAnime) return;
        
        await updateAnimeInList(selectedAnime.id, { 
            personalRating: rating, 
            notes 
        });
        setIsModalOpen(false);
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <div className="text-lg text-gray-600">Loading your dashboard...</div>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 mb-4">❌ Error loading dashboard: {error}</div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="btn-primary"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back, {user.username}! 👋
                </h1>
                <p className="text-gray-600">Your anime journey awaits with your virtual cat companion</p>
            </div>

            {/* Stats and Charts */}
            <StatsChart />

            {/* Ratings Section */}
            <div className="mt-12">
                <h2 className="text-xl font-semibold mb-6">⭐ Your Ratings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userAnimeList.map((anime) => (
                        <div key={anime.id} className="card p-4 bg-white shadow-md rounded-lg">
                            <h3 className="text-lg font-bold">{anime.anime.title}</h3>
                            <p className="text-gray-600 text-sm">Rating: {anime.personalRating || 'N/A'}/10</p>
                            <p className="text-gray-600 text-sm">Notes: {anime.notes || 'No notes added'}</p>
                            <button
                                onClick={() => handleEditRating(anime.id)}
                                className="mt-2 text-blue-500 hover:underline"
                            >
                                Edit
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {isModalOpen && (
                <EditRatingModal
                    anime={selectedAnime?.anime}
                    userAnime={selectedAnime}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveRating}
                />
            )}
        </div>
    );
};

export default DashboardPage;