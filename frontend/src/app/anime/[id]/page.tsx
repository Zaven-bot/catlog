'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useUserAnimeList } from '../../../hooks/useUserAnimeList';
import { AnimeStatus } from '@shared/types';


interface Anime {
  id: number;
  malId: number;
  title: string;
  description?: string;
  imageUrl?: string;
  genres: string[];
  episodes?: number;
  status: string;
  score?: number;
  year?: number;
  type?: string;
  source?: string;
  duration?: string;
  rating?: string;
  studios?: string[];
  aired?: {
    from?: string;
    to?: string;
  };
}

const AnimeDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addAnimeToList, removeAnimeFromList, isAnimeInList, getAnimeStatus } = useUserAnimeList();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToList, setAddingToList] = useState(false);

  useEffect(() => {
    const fetchAnime = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/anime/${params.id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch anime: ${response.status}`);
        }

        const animeData = await response.json();
        setAnime(animeData);
      } catch (err) {
        console.error('Error fetching anime details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch anime details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAnime();
    }
  }, [params.id]);

  const handleAddToList = async (status: AnimeStatus) => {
    if (!user || !anime) {
      router.push('/login');
      return;
    }

    try {
      setAddingToList(true);
      await addAnimeToList(anime.malId, status);
    } catch (error) {
      console.error('Error adding anime to list:', error);
    } finally {
      setAddingToList(false);
    }
  };

  const handleRemoveFromList = async () => {
    if (!user || !anime) return;

    try {
      setAddingToList(true);
      await removeAnimeFromList(anime.malId);
    } catch (error) {
      console.error('Error removing anime from list:', error);
    } finally {
      setAddingToList(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
          <div className="text-lg text-gray-600">Loading anime details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">❌ {error}</div>
          <button 
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Anime not found</div>
          <button 
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isInList = user ? isAnimeInList(anime.malId) : false;
  const currentStatus = user ? getAnimeStatus(anime.malId) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="card max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Anime Image */}
          <div className="lg:w-1/3">
            <img
              src={anime.imageUrl || 'https://via.placeholder.com/300x400'}
              alt={anime.title}
              className="w-full rounded-lg shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400';
              }}
            />
          </div>
          
          {/* Anime Info */}
          <div className="lg:w-2/3">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{anime.title}</h1>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-600">Type:</span>
                <div className="text-lg font-medium">{anime.type || 'Unknown'}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-600">Episodes:</span>
                <div className="text-lg font-medium">{anime.episodes || 'Unknown'}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-600">Status:</span>
                <div className="text-lg font-medium">{anime.status}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-600">Score:</span>
                <div className="text-lg font-medium">
                  {anime.score ? `⭐ ${anime.score}/10` : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-600">Year:</span>
                <div className="text-lg font-medium">{anime.year || 'Unknown'}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-600">Duration:</span>
                <div className="text-lg font-medium">{anime.duration || 'Unknown'}</div>
              </div>
            </div>
            
            {/* Genres */}
            {anime.genres && anime.genres.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-lg">Genres:</h3>
                <div className="flex flex-wrap gap-2">
                  {anime.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Studios */}
            {anime.studios && anime.studios.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Studios:</h3>
                <div className="text-gray-700">
                  {anime.studios.join(', ')}
                </div>
              </div>
            )}
            
            {/* Description */}
            {anime.description && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-lg">Synopsis:</h3>
                <p className="text-gray-700 leading-relaxed">{anime.description}</p>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-8">
              {user ? (
                <>
                  {isInList ? (
                    <div className="flex flex-wrap gap-3">
                      <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                        ✓ In Your List ({currentStatus === 'PLAN_TO_WATCH' ? 'Planned' : currentStatus?.replace('_', ' ')})
                      </div>
                      <button
                        onClick={handleRemoveFromList}
                        disabled={addingToList}
                        className="btn-secondary disabled:opacity-50"
                      >
                        {addingToList ? 'Removing...' : 'Remove from List'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAddToList(AnimeStatus.WATCHING)}
                        disabled={addingToList}
                        className="btn-primary disabled:opacity-50"
                      >
                        {addingToList ? 'Adding...' : '🎬 Currently Watching'}
                      </button>
                      <button
                        onClick={() => handleAddToList(AnimeStatus.PLAN_TO_WATCH)}
                        disabled={addingToList}
                        className="btn-secondary disabled:opacity-50"
                      >
                        {addingToList ? 'Adding...' : '📝 Planned'}
                      </button>
                      <button
                        onClick={() => handleAddToList(AnimeStatus.COMPLETED)}
                        disabled={addingToList}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {addingToList ? 'Adding...' : '✅ Completed'}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="btn-primary"
                >
                  Login to Add to List
                </button>
              )}
              
              <button
                onClick={() => router.back()}
                className="btn-secondary"
              >
                ← Go Back
              </button>
            </div>
            
            {/* Additional Info */}
            {(anime.source || anime.rating || anime.aired) && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold mb-3 text-lg">Additional Information:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  {anime.source && (
                    <div>
                      <span className="font-medium">Source:</span> {anime.source}
                    </div>
                  )}
                  {anime.rating && (
                    <div>
                      <span className="font-medium">Rating:</span> {anime.rating}
                    </div>
                  )}
                  {anime.aired?.from && (
                    <div>
                      <span className="font-medium">Aired:</span> {' '}
                      {new Date(anime.aired.from).toLocaleDateString()}
                      {anime.aired.to && ` to ${new Date(anime.aired.to).toLocaleDateString()}`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeDetailPage;