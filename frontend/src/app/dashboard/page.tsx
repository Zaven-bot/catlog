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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">⭐ Your Ratings & Notes</h2>
                
                {userAnimeList.filter(item => item.personalRating || item.notes).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <div className="text-6xl mb-4">📝</div>
                        <p className="text-gray-600 mb-4">No ratings or notes yet!</p>
                        <p className="text-sm text-gray-500">
                            Add ratings and notes to your anime from your <a href="/my-list" className="text-purple-600 hover:text-purple-700">My List</a> page.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userAnimeList
                            .filter(item => item.personalRating || item.notes)
                            .map((anime) => (
                            <div key={anime.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Anime Image */}
                                <div className="aspect-[3/4] bg-gray-200 relative overflow-hidden">
                                    {anime.anime.imageUrl ? (
                                        <img
                                            src={anime.anime.imageUrl}
                                            alt={anime.anime.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = '/placeholder-anime.jpg';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                                            <div className="text-4xl">📺</div>
                                        </div>
                                    )}
                                    
                                    {/* Rating Badge */}
                                    {anime.personalRating && (
                                        <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-sm font-bold shadow-lg">
                                            ⭐ {anime.personalRating}/10
                                        </div>
                                    )}
                                </div>
                                
                                {/* Content */}
                                <div className="p-4">
                                    {/* Title */}
                                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                                        {anime.anime.title}
                                    </h3>
                                    
                                    {/* Status Badge */}
                                    <div className="mb-3">
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                            anime.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                            anime.status === 'WATCHING' ? 'bg-blue-100 text-blue-800' :
                                            anime.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                                            anime.status === 'DROPPED' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {anime.status.replace('_', ' ').toLowerCase()}
                                        </span>
                                    </div>
                                    
                                    {/* Rating */}
                                    {anime.personalRating && (
                                        <div className="mb-3">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Your Rating:</span> 
                                                <span className="ml-1 text-yellow-600 font-bold">{anime.personalRating}/10</span>
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Notes */}
                                    {anime.notes && (
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600 mb-1 font-medium">Notes:</p>
                                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded italic line-clamp-3">
                                                "{anime.notes}"
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => handleEditRating(anime.id)}
                                            className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-700 transition-colors"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <a
                                            href={`/anime/${anime.anime.malId}`}
                                            className="flex-1 text-center bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                                        >
                                            👁️ View
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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