'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useUserAnimeList } from '@/hooks/useUserAnimeList';
import EditRatingModal from '@/components/EditRatingModal';
import { Anime, AnimeStatus } from '@/types/api'; // Updated import

export default function AnimeDetailPage() {
  const params = useParams();
  const animeId = params.id as string;
  
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { 
    userAnimeList, 
    isAnimeInList, 
    addAnimeToList, 
    updateAnimeByMalId, 
    removeAnimeFromList 
  } = useUserAnimeList();

  useEffect(() => {
    const fetchAnime = async () => {
      if (!animeId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/anime/${animeId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch anime details');
        }
        
        const data = await response.json();
        setAnime(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnime();
  }, [animeId]);

  const handleAddToList = async (status: AnimeStatus) => {
    if (!anime) return;
    
    const success = await addAnimeToList(anime.malId, status);
    if (success) {
      // Show success feedback
      console.log(`Added ${anime.title} to ${status}`);
    }
  };

  const handleStatusChange = async (newStatus: AnimeStatus) => {
    if (!anime) return;
    
    const success = await updateAnimeByMalId(anime.malId, { status: newStatus });
    if (success) {
      console.log(`Updated ${anime.title} status to ${newStatus}`);
    }
  };

  const handleRemoveFromList = async () => {
    if (!anime) return;
    
    const success = await removeAnimeFromList(anime.malId);
    if (success) {
      console.log(`Removed ${anime.title} from list`);
    }
  };

  // Fix: Handle modal save with proper parameters to match EditRatingModal interface
  const handleModalSave = async (personalRating: number, notes: string) => {
    if (!anime) return;
    
    const success = await updateAnimeByMalId(anime.malId, { personalRating, notes });
    if (success) {
      setShowEditModal(false);
      console.log(`Updated ${anime.title}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading anime details...</p>
        </div>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😿</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {error || 'Anime not found'}
          </h1>
          <a
            href="/search"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Search
          </a>
        </div>
      </div>
    );
  }

  const userAnime = isAnimeInList(anime.malId);
  const isInList = !!userAnime;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back
        </button>

        {/* Anime Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="md:flex">
            {/* Anime Image */}
            <div className="md:w-1/3 lg:w-1/4">
              <img
                src={anime.imageUrl || '/placeholder-anime.png'}
                alt={anime.title}
                className="w-full h-96 md:h-full object-cover"
              />
            </div>
            
            {/* Anime Info */}
            <div className="md:w-2/3 lg:w-3/4 p-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {anime.title}
              </h1>
              
              {anime.titleEnglish && anime.titleEnglish !== anime.title && (
                <p className="text-xl text-gray-600 mb-4">
                  {anime.titleEnglish}
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="font-semibold text-gray-700">Episodes:</span>
                  <span className="ml-2 text-gray-600">
                    {anime.episodes || 'Unknown'}
                  </span>
                </div>
                
                <div>
                  <span className="font-semibold text-gray-700">Status:</span>
                  <span className="ml-2 text-gray-600 capitalize">
                    {anime.status || 'Unknown'}
                  </span>
                </div>
                
                {anime.score && (
                  <div>
                    <span className="font-semibold text-gray-700">Score:</span>
                    <span className="ml-2 text-gray-600">
                      {anime.score}/10
                    </span>
                  </div>
                )}
                
                {anime.year && (
                  <div>
                    <span className="font-semibold text-gray-700">Year:</span>
                    <span className="ml-2 text-gray-600">
                      {anime.year}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Genres */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="mb-6">
                  <span className="font-semibold text-gray-700 block mb-2">Genres:</span>
                  <div className="flex flex-wrap gap-2">
                    {anime.genres.map((genre, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* User Status & Actions */}
              <div className="border-t pt-6">
                {isInList ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-700">Your Status:</span>
                        <span className="ml-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {userAnime.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {userAnime.personalRating && (
                        <div>
                          <span className="font-semibold text-gray-700">Your Rating:</span>
                          <span className="ml-2 text-lg font-bold text-yellow-600">
                            {userAnime.personalRating}/10
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      
                      <button
                        onClick={handleRemoveFromList}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        🗑️ Remove
                      </button>
                      
                      {/* Quick Status Changes */}
                      {userAnime.status !== AnimeStatus.WATCHING && (
                        <button
                          onClick={() => handleStatusChange(AnimeStatus.WATCHING)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                          📺 Start Watching
                        </button>
                      )}
                      
                      {userAnime.status !== AnimeStatus.COMPLETED && (
                        <button
                          onClick={() => handleStatusChange(AnimeStatus.COMPLETED)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                        >
                          ✅ Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">Add this anime to your list:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAddToList(AnimeStatus.PLAN_TO_WATCH)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        📋 Plan to Watch
                      </button>
                      
                      <button
                        onClick={() => handleAddToList(AnimeStatus.WATCHING)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        📺 Currently Watching
                      </button>
                      
                      <button
                        onClick={() => handleAddToList(AnimeStatus.COMPLETED)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                      >
                        ✅ Completed
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Synopsis */}
        {anime.synopsis && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Synopsis</h2>
            <p className="text-gray-700 leading-relaxed">
              {anime.synopsis}
            </p>
          </div>
        )}

        {/* Additional Info */}
        {(anime.studios && anime.studios.length > 0) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Production</h2>
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-gray-700">Studios:</span>
                <span className="ml-2 text-gray-600">
                  {anime.studios.join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Edit Modal */}
      {showEditModal && userAnime && (
        <EditRatingModal
          anime={anime}
          userAnime={userAnime}
          onClose={() => setShowEditModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}