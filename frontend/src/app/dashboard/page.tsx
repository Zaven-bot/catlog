'use client';

import React, { useEffect, useState } from 'react';
import { useUserAnimeList } from '../../hooks/useUserAnimeList';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import StatsChart from '../../components/StatsChart';
import VirtualCat from '../../components/VirtualCat';
import EditRatingModal from '../../components/EditRatingModal';
import { UserAnime } from '@/types/api';

const DashboardPage = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { userAnimeList, getUserAnimeStats, updateAnimeInList, loading, error } = useUserAnimeList();
    const [stats, setStats] = useState<any>(null);
    const [selectedAnime, setSelectedAnime] = useState<UserAnime | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Helper function to get rating badge color based on score
    const getRatingBadgeColor = (rating: number | null | undefined) => {
        if (!rating) {
            return 'bg-gray-500'; // Gray for no rating
        }
        
        if (rating >= 8) {
            return 'bg-green-500'; // Green for excellent (8-10)
        } else if (rating >= 6) {
            return 'bg-yellow-500'; // Yellow for good (6-7)
        } else if (rating >= 4) {
            return 'bg-orange-500'; // Orange for okay (4-5)
        } else {
            return 'bg-red-500'; // Red for poor (1-3)
        }
    };

    // Helper function to get consistent status display
    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'PLAN_TO_WATCH':
                return 'Planned';
            case 'WATCHING':
                return 'Watching';
            case 'COMPLETED':
                return 'Completed';
            case 'ON_HOLD':
                return 'On Hold';
            case 'DROPPED':
                return 'Dropped';
            default:
                return status;
        }
    };

    // Helper function to get status colors
    const getStatusColors = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return { bg: 'bg-green-100', text: 'text-green-800', badge: 'bg-green-500' };
            case 'WATCHING':
                return { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'bg-blue-500' };
            case 'ON_HOLD':
                return { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-500' };
            case 'DROPPED':
                return { bg: 'bg-red-100', text: 'text-red-800', badge: 'bg-red-500' };
            case 'PLAN_TO_WATCH':
                return { bg: 'bg-gray-100', text: 'text-gray-800', badge: 'bg-gray-500' };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-800', badge: 'bg-gray-500' };
        }
    };

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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">⭐ Your Anime Collection</h2>
                
                {userAnimeList.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <div className="text-6xl mb-4">📺</div>
                        <p className="text-gray-600 mb-4">No anime in your list yet!</p>
                        <p className="text-sm text-gray-500">
                            Start adding anime from the <a href="/search" className="text-purple-600 hover:text-purple-700">Search</a> page.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userAnimeList.map((anime) => {
                            const statusColors = getStatusColors(anime.status);
                            const ratingBadgeColor = getRatingBadgeColor(anime.personalRating);
                            
                            return (
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
                                        
                                        {/* Rating Badge - color matches status */}
                                        {anime.personalRating ? (
                                            <div className={`absolute top-2 right-2 ${ratingBadgeColor} text-white px-2 py-1 rounded-full text-sm font-bold shadow-lg`}>
                                                ⭐ {anime.personalRating}/10
                                            </div>
                                        ) : (
                                            <div className={`absolute top-2 right-2 ${ratingBadgeColor} text-white px-2 py-1 rounded-full text-sm font-bold shadow-lg`}>
                                                N/A
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
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                                                {getStatusDisplay(anime.status)}
                                            </span>
                                        </div>
                                        
                                        {/* Rating */}
                                        <div className="mb-3">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Your Rating:</span> 
                                                {anime.personalRating ? (
                                                    <span className="ml-1 text-yellow-600 font-bold">{anime.personalRating}/10</span>
                                                ) : (
                                                    <span className="ml-1 text-gray-500 italic">Not rated yet - Add your rating!</span>
                                                )}
                                            </p>
                                        </div>
                                        
                                        {/* Notes */}
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600 mb-1 font-medium">Notes:</p>
                                            {anime.notes ? (
                                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded italic line-clamp-3">
                                                    "{anime.notes}"
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded italic">
                                                    No notes yet - Add your thoughts!
                                                </p>
                                            )}
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => handleEditRating(anime.id)}
                                                className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-700 transition-colors"
                                            >
                                                ✏️ {anime.personalRating || anime.notes ? 'Edit' : 'Rate'}
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
                            );
                        })}
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