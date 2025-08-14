'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface LivePopularityUpdate {
  malId: number;
  title: string;
  currentScore?: number;
  liveMembers?: number;
  trendingRank?: number;
  popularityChange?: number;
  lastUpdate: string;
  eventType: 'SCORE_UPDATE' | 'MEMBER_UPDATE' | 'TRENDING_CHANGE';
}

interface TrendingAnime {
  malId: number;
  title: string;
  trendingRank?: number;
  popularityChange?: number;
  lastUpdate: string;
}

interface PopularityData {
  latest: LivePopularityUpdate[];
  trending: TrendingAnime[];
  timestamp: string;
}

export function LivePopularityWidget() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestUpdates, setLatestUpdates] = useState<LivePopularityUpdate[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<TrendingAnime[]>([]);
  const [connectionCount, setConnectionCount] = useState(0);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001', {
      transports: ['websocket']
    });

    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('🔗 Connected to live updates');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('📴 Disconnected from live updates');
      setIsConnected(false);
    });

    // Listen for popularity updates
    newSocket.on('popularity-updates', (data: PopularityData) => {
      setLatestUpdates(data.latest);
      setTrendingAnime(data.trending);
    });

    // Listen for individual new updates
    newSocket.on('new-popularity-update', (update: LivePopularityUpdate) => {
      setLatestUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep latest 10
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const formatEventType = (eventType: string) => {
    switch (eventType) {
      case 'SCORE_UPDATE':
        return '⭐ Score';
      case 'MEMBER_UPDATE':
        return '👥 Members';
      case 'TRENDING_CHANGE':
        return '📈 Trending';
      default:
        return eventType;
    }
  };

  const formatPopularityChange = (change?: number) => {
    if (!change) return '';
    const sign = change > 0 ? '+' : '';
    const color = change > 0 ? 'text-green-500' : 'text-red-500';
    return <span className={color}>{sign}{change}%</span>;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now.getTime() - updateTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          📡 Live Updates
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Trending Anime Section */}
      {trendingAnime.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">🔥 Trending Now</h4>
          <div className="space-y-2">
            {trendingAnime.slice(0, 3).map((anime) => (
              <div key={`trending-${anime.malId}`} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{anime.title}</p>
                  <p className="text-xs text-gray-500">
                    Rank #{anime.trendingRank} {formatPopularityChange(anime.popularityChange)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Updates Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">⚡ Recent Activity</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {latestUpdates.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              Waiting for live updates...
            </p>
          ) : (
            latestUpdates.map((update, index) => (
              <div key={`${update.malId}-${index}`} className="p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {update.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {formatEventType(update.eventType)}
                      </span>
                      {update.currentScore && (
                        <span className="text-xs text-gray-600">
                          Score: {update.currentScore}
                        </span>
                      )}
                      {update.liveMembers && (
                        <span className="text-xs text-gray-600">
                          {(update.liveMembers / 1000).toFixed(0)}k members
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(update.lastUpdate)}
                      </span>
                      {formatPopularityChange(update.popularityChange)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Connection Stats */}
      {isConnected && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Real-time updates via WebSocket
          </p>
        </div>
      )}
    </div>
  );
}