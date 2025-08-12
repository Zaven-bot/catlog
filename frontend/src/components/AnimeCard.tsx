'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCat } from '../hooks/useCat';
import { useUserAnimeList} from '../hooks/useUserAnimeList';
import { useAuth } from '../hooks/useAuth';
import { AnimeStatus, UserAnime } from '../../../shared/types';
import EditRatingModal from './EditRatingModal';

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
}

interface AnimeCardProps {
  anime: Anime;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logActivity } = useCat();
  const { user } = useAuth();
  const { addAnimeToList, removeAnimeFromList, isAnimeInList, getAnimeStatus, updateAnimeInList, loading } = useUserAnimeList();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get fresh values on each render to ensure they reflect the current state
  const userAnimeEntry = isAnimeInList(anime.malId);
  const isInList = !!userAnimeEntry;
  const currentStatus = getAnimeStatus(anime.malId);
  const isOnMyListPage = pathname === '/my-list';

  const handleClick = () => {
    logActivity('view');
    router.push(`/anime/${anime.malId}`);
  };

  const handleToggleList = async (e: React.MouseEvent, status: AnimeStatus) => {
    e.stopPropagation(); // Prevent card click when clicking button
    
    if (!user) {
      router.push('/login');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Get fresh values at the time of the action
      const currentUserAnimeEntry = isAnimeInList(anime.malId);
      const currentIsInList = !!currentUserAnimeEntry;
      const currentAnimeStatus = getAnimeStatus(anime.malId);

      if (isOnMyListPage) {
        // Special behavior for my-list page
        if (currentIsInList && currentAnimeStatus === status) {
          // Toggle off the current status = remove from list entirely
          const success = await removeAnimeFromList(anime.malId);
          if (success) {
            logActivity('log');
            console.log(`Removed "${anime.title}" from your list!`);
          }
        } else if (currentIsInList && currentAnimeStatus !== status) {
          // Switch to a different status = update the existing entry
          if (currentUserAnimeEntry) {
            const success = await updateAnimeInList(currentUserAnimeEntry.id, { status });
            if (success) {
              logActivity('log');
              console.log(`Updated "${anime.title}" to ${status.toLowerCase().replace('_', ' ')} status!`);
            }
          }
        } else {
          // Not in list, add it with the selected status
          const success = await addAnimeToList(anime.malId, status);
          if (success) {
            logActivity('log');
            console.log(`Added "${anime.title}" to ${status.toLowerCase().replace('_', ' ')} list!`);
          }
        }
      } else {
        // Original behavior for other pages
        if (currentIsInList && currentAnimeStatus === status) {
          // Remove from list if same status
          const success = await removeAnimeFromList(anime.malId);
          if (success) {
            logActivity('log');
            console.log(`Removed "${anime.title}" from your list!`);
          }
        } else if (currentIsInList && currentAnimeStatus !== status) {
          // Update to new status if different status
          if (currentUserAnimeEntry) {
            const success = await updateAnimeInList(currentUserAnimeEntry.id, { status });
            if (success) {
              logActivity('log');
              console.log(`Updated "${anime.title}" to ${status.toLowerCase().replace('_', ' ')} status!`);
            }
          }
        } else {
          // Add to list with new status
          const success = await addAnimeToList(anime.malId, status);
          if (success) {
            logActivity('log');
            console.log(`Added "${anime.title}" to ${status.toLowerCase().replace('_', ' ')} list!`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update anime list:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRateAndReview = () => {
    setIsModalOpen(true);
  };

  const handleSaveRating = async (personalRating: number, notes: string) => {
    if (!userAnimeEntry) return;
    
    try {
      const success = await updateAnimeInList(userAnimeEntry.id, { 
        personalRating, 
        notes 
      });
      if (success) {
        console.log(`Updated rating and notes for "${anime.title}"`);
      }
    } catch (error) {
      console.error('Failed to save rating:', error);
    }
  };

  const getStatusButtonText = (status: AnimeStatus) => {
    if (isProcessing) return 'Loading...';
    
    const isCurrentStatus = isInList && currentStatus === status;
    
    if (isOnMyListPage) {
      // Special text for my-list page
      switch (status) {
        case 'PLAN_TO_WATCH': 
          return isCurrentStatus ? '✓ Planned' : 'Planned';
        case 'WATCHING': 
          return isCurrentStatus ? '✓ Watching' : 'Watching';
        case 'COMPLETED': 
          return isCurrentStatus ? '✓ Completed' : 'Completed';
        default: 
          return isCurrentStatus ? `✓ ${status}` : status;
      }
    } else {
      // Original text for other pages
      switch (status) {
        case 'PLAN_TO_WATCH': 
          return isCurrentStatus ? '✓ Planned' : '+ Planned';
        case 'WATCHING': 
          return isCurrentStatus ? '✓ Watching' : '+ Watching';
        case 'COMPLETED': 
          return isCurrentStatus ? '✓ Completed' : 'Mark Complete';
        case 'DROPPED':
          return isCurrentStatus ? '✓ Dropped' : '+ Dropped';
        default: return isCurrentStatus ? `✓ ${status}` : `+ ${status}`;
      }
    }
  };

  const getStatusButtonColor = (status: AnimeStatus) => {
    const isCurrentStatus = isInList && currentStatus === status;
    
    if (isCurrentStatus) {
      switch (status) {
        case 'PLAN_TO_WATCH': return 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200';
        case 'WATCHING': return 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200';
        case 'COMPLETED': return 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200';
        default: return 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200';
      }
    }
    
    switch (status) {
      case 'PLAN_TO_WATCH': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'WATCHING': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'COMPLETED': return 'bg-purple-500 hover:bg-purple-600 text-white';
      default: return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  return (
    <div className="card cursor-pointer hover:shadow-lg transition-all duration-200 group">
      <div onClick={handleClick} className="relative">
        <div className="aspect-w-3 aspect-h-4 mb-4">
          <img 
            className="w-full h-64 object-cover rounded-lg" 
            src={anime.imageUrl || 'https://via.placeholder.com/300x400'} 
            alt={anime.title} 
          />
          
          {/* Status badge if anime is in user's list */}
          {isInList && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {currentStatus === 'PLAN_TO_WATCH' ? 'Planned' : currentStatus?.replace('_', ' ')}
            </div>
          )}
          
          {/* Hover overlay with quick action buttons */}
          {user && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <button
                  onClick={(e) => handleToggleList(e, AnimeStatus.PLAN_TO_WATCH)}
                  disabled={isProcessing || loading}
                  className={`${getStatusButtonColor(AnimeStatus.PLAN_TO_WATCH)} px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-50`}
                >
                  {getStatusButtonText(AnimeStatus.PLAN_TO_WATCH)}
                </button>
                <button
                  onClick={(e) => handleToggleList(e, AnimeStatus.WATCHING)}
                  disabled={isProcessing || loading}
                  className={`${getStatusButtonColor(AnimeStatus.WATCHING)} px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-50`}
                >
                  {getStatusButtonText(AnimeStatus.WATCHING)}
                </button>
                <button
                  onClick={(e) => handleToggleList(e, AnimeStatus.DROPPED)}
                  disabled={isProcessing || loading}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {getStatusButtonText(AnimeStatus.DROPPED)}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-2">{anime.title}</h3>
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{anime.year || 'Unknown'}</span>
            <span>{anime.episodes ? `${anime.episodes} eps` : 'Movie'}</span>
          </div>
          
          {anime.score && (
            <div className="flex items-center">
              <span className="text-yellow-500">⭐</span>
              <span className="ml-1 text-sm font-medium">{anime.score}</span>
            </div>
          )}
          
          <div className="flex flex-wrap gap-1">
            {anime.genres.slice(0, 3).map((genre, index) => (
              <span
                key={index}
                className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs"
              >
                {genre}
              </span>
            ))}
            {anime.genres.length > 3 && (
              <span className="text-gray-400 text-xs px-2 py-1">
                +{anime.genres.length - 3} more
              </span>
            )}
          </div>
          
          {anime.description && (
            <p className="text-gray-600 text-sm line-clamp-2">
              {anime.description}
            </p>
          )}
        </div>
      </div>
      
      {/* Quick action buttons at bottom */}
      <div className="mt-3 flex gap-2">
        {user ? (
          <>
            <button
              onClick={(e) => handleToggleList(e, AnimeStatus.COMPLETED)}
              disabled={isProcessing || loading}
              className={`flex-1 ${getStatusButtonColor(AnimeStatus.COMPLETED)} px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50`}
            >
              {getStatusButtonText(AnimeStatus.COMPLETED)}
            </button>
            <button
              onClick={handleRateAndReview}
              className="flex-1 btn-secondary text-xs"
            >
              Rate & Review
            </button>
          </>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); router.push('/login'); }}
            className="flex-1 btn-secondary text-xs"
          >
            Login to Add
          </button>
        )}
        
        <button
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          className="flex-1 btn-primary text-xs"
        >
          View Details
        </button>
      </div>

      {isModalOpen && (
        <EditRatingModal
          anime={anime}
          userAnime={userAnimeEntry}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRating}
        />
      )}

      {/* Show ratings and notes if anime is in list */}
      {isInList && userAnimeEntry && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <img 
              src={anime.imageUrl || 'https://via.placeholder.com/50x70'} 
              alt={anime.title} 
              className="w-12 h-16 object-cover rounded" 
            />
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{anime.title}</h4>
              <p className="text-xs text-gray-600">
                Rating: {userAnimeEntry.personalRating ? `${userAnimeEntry.personalRating}/10` : 'Not rated'}
              </p>
              <p className="text-xs text-gray-600">
                Notes: {userAnimeEntry.notes || 'No notes'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimeCard;