'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAnime } from '../../hooks/useAnime';
import AnimeCard from '../../components/AnimeCard';

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

interface AdvancedFilters {
  genres: string[];
  yearStart: string;
  yearEnd: string;
  statuses: string[];
  minScore: string;
  maxScore: string;
  types: string[];
}

const SearchPage = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { searchAnime, getTopAnime } = useAnime();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextApiStartPage, setNextApiStartPage] = useState(1); // Track which API page to start from next

  // Search throttling
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const SEARCH_COOLDOWN = 2000; // 2 seconds between searches

  const [searchTerm, setSearchTerm] = useState(query || '');
  const [filters, setFilters] = useState<AdvancedFilters>({
    genres: [],
    yearStart: '',
    yearEnd: '',
    statuses: [],
    minScore: '',
    maxScore: '',
    types: []
  });

  const popularGenres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 
    'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
  ];

  const availableGenres = [
    'Action', 'Adventure', 'Avant Garde', 'Award Winning', 'Boys Love', 'Comedy', 
    'Drama', 'Fantasy', 'Girls Love', 'Gourmet', 'Horror', 'Mystery', 'Romance', 
    'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Suspense', 'Ecchi',
    'Erotica', 'Hentai', 'Adult Cast', 'Anthropomorphic', 'CGDCT', 'Childcare',
    'Combat Sports', 'Crossdressing', 'Delinquents', 'Detective', 'Educational',
    'Gag Humor', 'Gore', 'Harem', 'High Stakes Game', 'Historical', 'Idols (Female)',
    'Idols (Male)', 'Isekai', 'Iyashikei', 'Love Polygon', 'Magical Sex Shift',
    'Mahou Shoujo', 'Martial Arts', 'Mecha', 'Medical', 'Military', 'Music',
    'Mythology', 'Organized Crime', 'Otaku Culture', 'Parody', 'Performing Arts',
    'Pets', 'Psychological', 'Racing', 'Reincarnation', 'Reverse Harem', 'Romantic Subtext',
    'Samurai', 'School', 'Showbiz', 'Space', 'Strategy Game', 'Super Power', 'Survival',
    'Team Sports', 'Time Travel', 'Vampire', 'Video Game', 'Visual Arts', 'Workplace'
  ];

  const availableStatuses = [
    'Finished Airing',
    'Currently Airing', 
    'Not yet aired'
  ];

  const availableTypes = [
    'TV',
    'Movie', 
    'OVA',
    'Special',
    'ONA',
    'Music'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTimer > 0) {
      const timer = setTimeout(() => {
        setCooldownTimer(cooldownTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTimer]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (query) {
      performSearch(true); // Fixed: pass boolean parameter
      // Add to recent searches
      addToRecentSearches(query);
    }
  }, [query]);

  const addToRecentSearches = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const canSearch = () => {
    const now = Date.now();
    return now - lastSearchTime >= SEARCH_COOLDOWN;
  };

  const startCooldown = () => {
    const now = Date.now();
    setLastSearchTime(now);
    setCooldownTimer(Math.ceil(SEARCH_COOLDOWN / 1000));
  };

  // Store the last search parameters to use for load more
  const [lastSearchParams, setLastSearchParams] = useState<{
    searchTerm: string;
    filters: AdvancedFilters;
  }>({
    searchTerm: '',
    filters: {
      genres: [],
      yearStart: '',
      yearEnd: '',
      statuses: [],
      minScore: '',
      maxScore: '',
      types: []
    }
  });

  const performSearch = async (resetResults = true) => {
    // Check if we're in cooldown
    if (!canSearch()) {
      return;
    }

    // Check if we have any search criteria
    const hasSearchTerm = searchTerm.trim().length > 0;
    const hasFilters = getActiveFiltersCount() > 0;
    
    if (!hasSearchTerm && !hasFilters) {
      setError('Please enter a search term or select at least one filter');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    startCooldown();
    
    if (resetResults) {
      setCurrentPage(1);
      setSearchResults([]);
    }
    
    try {
      if (hasFilters && !hasSearchTerm) {
        // Use the new advanced search endpoint for filter-only searches
        console.log('Using advanced search endpoint for filter-only search...');
        
        const queryParams = new URLSearchParams();
        
        if (filters.genres.length > 0) {
          queryParams.append('genres', filters.genres.join(','));
        }
        if (filters.yearStart) {
          queryParams.append('year_start', filters.yearStart);
        }
        if (filters.yearEnd) {
          queryParams.append('year_end', filters.yearEnd);
        }
        if (filters.statuses.length > 0) {
          queryParams.append('status', filters.statuses.join(','));
        }
        if (filters.minScore) {
          queryParams.append('min_score', filters.minScore);
        }
        if (filters.maxScore) {
          queryParams.append('max_score', filters.maxScore);
        }
        queryParams.append('limit', '25');
        queryParams.append('page', resetResults ? '1' : String(currentPage));
        
        // Store search parameters for load more
        if (resetResults) {
          setLastSearchParams({ searchTerm, filters });
        }
        
        // Fix URL construction to avoid double /api/ path
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${baseUrl}/anime/search/advanced?${queryParams}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 429) {
            throw new Error(errorData.error || 'Too many requests. Please wait a moment and try again.');
          } else if (response.status === 400) {
            throw new Error(errorData.error || 'Invalid search parameters. Please adjust your filters.');
          } else {
            throw new Error(errorData.error || 'Advanced search failed');
          }
        }
        
        const data = await response.json();
        console.log(`Advanced search returned ${data.data.length} results, has next page: ${data.pagination.has_next_page}`);
        
        setSearchResults(resetResults ? data.data : [...searchResults, ...data.data]);
        setHasNextPage(data.pagination.has_next_page);
        setTotalResults(data.pagination.total_results);
        setCurrentPage(data.pagination.current_page);
        
        // Update the next API start page if provided
        if (data.pagination.next_api_start_page) {
          setNextApiStartPage(data.pagination.next_api_start_page);
        }
        
        // Reset to page 1 for new searches
        if (resetResults) {
          setNextApiStartPage(data.pagination.next_api_start_page || 5); // Default to 5 (after first 4 pages)
        }
      } else if (hasSearchTerm) {
        // For search with term, use the advanced endpoint if filters are applied
        if (hasFilters) {
          console.log('Using advanced search endpoint with search term and filters...');
          
          const queryParams = new URLSearchParams();
          queryParams.append('q', searchTerm.trim());
          
          if (filters.genres.length > 0) {
            queryParams.append('genres', filters.genres.join(','));
          }
          if (filters.yearStart) {
            queryParams.append('year_start', filters.yearStart);
          }
          if (filters.yearEnd) {
            queryParams.append('year_end', filters.yearEnd);
          }
          if (filters.statuses.length > 0) {
            queryParams.append('status', filters.statuses.join(','));
          }
          if (filters.minScore) {
            queryParams.append('min_score', filters.minScore);
          }
          if (filters.maxScore) {
            queryParams.append('max_score', filters.maxScore);
          }
          queryParams.append('limit', '25');
          queryParams.append('page', resetResults ? '1' : String(currentPage));
          
          // Store search parameters for load more
          if (resetResults) {
            setLastSearchParams({ searchTerm, filters });
          }
          
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${baseUrl}/anime/search/advanced?${queryParams}`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Search failed');
          }
          
          const data = await response.json();
          console.log(`Search with filters returned ${data.data.length} results, has next page: ${data.pagination.has_next_page}`);
          
          setSearchResults(resetResults ? data.data : [...searchResults, ...data.data]);
          setHasNextPage(data.pagination.has_next_page);
          setTotalResults(data.pagination.total_results);
          setCurrentPage(data.pagination.current_page);
        } else {
          // If we have a search term but no filters, use regular search
          const results = await searchAnime(searchTerm.trim());
          addToRecentSearches(searchTerm.trim());
          
          console.log(`Search for "${searchTerm}" returned ${results.length} results`);
          
          // Store search parameters for load more (though regular search doesn't support pagination)
          if (resetResults) {
            setLastSearchParams({ searchTerm, filters });
          }
          
          setSearchResults(results);
          setHasNextPage(false); // Regular search doesn't support pagination
          setTotalResults(results.length);
          setCurrentPage(1);
        }
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search anime. Please try again.');
      
      // If it's a rate limiting error, extend the cooldown
      if (err.message?.includes('Too many requests') || err.message?.includes('Rate limited')) {
        setCooldownTimer(10); // 10 second cooldown for rate limiting
        setLastSearchTime(Date.now());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const applyAdvancedFilters = (results: Anime[]) => {
    let filtered = [...results];

    // Genre filtering (must include ALL selected genres)
    if (filters.genres.length > 0) {
      console.log(`Filtering by genres: ${filters.genres.join(', ')}`);
      filtered = filtered.filter(anime => 
        filters.genres.every(selectedGenre =>
          anime.genres.some(animeGenre => 
            animeGenre.toLowerCase().includes(selectedGenre.toLowerCase())
          )
        )
      );
      console.log(`After genre filter: ${filtered.length} results`);
    }

    // Year range filtering
    if (filters.yearStart) {
      filtered = filtered.filter(anime => 
        anime.year && anime.year >= parseInt(filters.yearStart)
      );
      console.log(`After yearStart filter (${filters.yearStart}): ${filtered.length} results`);
    }
    if (filters.yearEnd) {
      filtered = filtered.filter(anime => 
        anime.year && anime.year <= parseInt(filters.yearEnd)
      );
      console.log(`After yearEnd filter (${filters.yearEnd}): ${filtered.length} results`);
    }

    // Status filtering (OR logic - any of the selected statuses)
    if (filters.statuses.length > 0) {
      console.log(`Filtering by statuses: ${filters.statuses.join(', ')}`);
      filtered = filtered.filter(anime => 
        filters.statuses.some(status => 
          anime.status.toLowerCase().includes(status.toLowerCase())
        )
      );
      console.log(`After status filter: ${filtered.length} results`);
    }

    // Type filtering (OR logic - any of the selected types)
    if (filters.types.length > 0) {
      console.log(`Filtering by types: ${filters.types.join(', ')}`);
      // Note: This would require the anime data to have a 'type' field
      // For now, we'll skip this filter since the current API doesn't provide type info
      console.log('Type filtering skipped - not available in current API response');
    }

    // Score range filtering
    if (filters.minScore) {
      filtered = filtered.filter(anime => 
        anime.score && anime.score >= parseFloat(filters.minScore)
      );
      console.log(`After minScore filter (${filters.minScore}): ${filtered.length} results`);
    }
    if (filters.maxScore) {
      filtered = filtered.filter(anime => 
        anime.score && anime.score <= parseFloat(filters.maxScore)
      );
      console.log(`After maxScore filter (${filters.maxScore}): ${filtered.length} results`);
    }

    return filtered;
  };

  const handleGenreToggle = (genre: string) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  const handleTypeToggle = (type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      genres: [],
      yearStart: '',
      yearEnd: '',
      statuses: [],
      minScore: '',
      maxScore: '',
      types: []
    });
    setSearchTerm('');
    setError(null);
  };

  const getActiveFiltersCount = () => {
    return filters.genres.length + 
           filters.statuses.length + 
           filters.types.length +
           (filters.yearStart ? 1 : 0) +
           (filters.yearEnd ? 1 : 0) +
           (filters.minScore ? 1 : 0) +
           (filters.maxScore ? 1 : 0);
  };

  const getSearchButtonText = () => {
    if (isLoading) return 'Searching...';
    if (cooldownTimer > 0) return `Wait ${cooldownTimer}s`;
    
    const hasSearchTerm = searchTerm.trim().length > 0;
    const hasFilters = getActiveFiltersCount() > 0;
    
    if (hasSearchTerm && hasFilters) return 'Search & Filter';
    if (hasSearchTerm) return 'Search';
    if (hasFilters) return 'Apply Filters';
    return 'Search';
  };

  const isSearchDisabled = () => {
    return isLoading || cooldownTimer > 0 || (!searchTerm.trim() && getActiveFiltersCount() === 0);
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Advanced Anime Search</h1>
        <p className="text-gray-600">Combine search terms with powerful filters to find exactly what you're looking for</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search anime titles (optional)..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && !isSearchDisabled() && performSearch()}
          />
          <button
            onClick={() => performSearch(true)} // Fixed: wrap in arrow function
            disabled={isSearchDisabled()}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              isSearchDisabled()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {getSearchButtonText()}
          </button>
        </div>
        
        {/* Search Guidelines */}
        <div className="mt-2 text-sm text-gray-500">
          {searchTerm.trim() && activeFiltersCount > 0 && (
            <span>✨ Searching "{searchTerm}" with {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}</span>
          )}
          {searchTerm.trim() && activeFiltersCount === 0 && (
            <span>🔍 Searching for "{searchTerm}"</span>
          )}
          {!searchTerm.trim() && activeFiltersCount > 0 && (
            <span>🎯 Filtering with {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}</span>
          )}
          {!searchTerm.trim() && activeFiltersCount === 0 && (
            <span>💡 Enter a search term or select filters below</span>
          )}
        </div>
      </div>

      {/* Rate Limit Notice */}
      {cooldownTimer > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-800">
              ⏱️ Please wait {cooldownTimer} second{cooldownTimer > 1 ? 's' : ''} before searching again
            </div>
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {!hasSearched && recentSearches.length > 0 && (
        <div className="mb-6 bg-white rounded-lg p-4 shadow">
          <h3 className="font-semibold mb-3">Recent Searches</h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchTerm(search);
                  // Don't auto-search, let user decide when to search
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="mb-6 bg-white rounded-lg p-6 shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">
            Advanced Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </h3>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
            <select
              value={filters.genres}
              onChange={(e) => setFilters({...filters, genres: Array.from(e.target.selectedOptions, option => option.value)})}
              multiple
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {popularGenres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year Range</label>
            <div className="flex gap-2">
              <select
                value={filters.yearStart}
                onChange={(e) => setFilters({...filters, yearStart: e.target.value})}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">From</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={filters.yearEnd}
                onChange={(e) => setFilters({...filters, yearEnd: e.target.value})}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">To</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.statuses}
              onChange={(e) => setFilters({...filters, statuses: Array.from(e.target.selectedOptions, option => option.value)})}
              multiple
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Finished Airing">Completed</option>
              <option value="Currently Airing">Airing</option>
              <option value="Not yet aired">Upcoming</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
            <select
              value={filters.minScore}
              onChange={(e) => setFilters({...filters, minScore: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any Rating</option>
              <option value="9">9.0+</option>
              <option value="8">8.0+</option>
              <option value="7">7.0+</option>
              <option value="6">6.0+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">
            {searchTerm.trim() ? 'Searching and filtering anime...' : 'Filtering anime...'}
          </p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {hasSearched && !isLoading && !error && searchResults.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No anime found matching your criteria</p>
          <p className="text-gray-400 mt-2">Try adjusting your search terms or filters</p>
          <div className="mt-4">
            <button
              onClick={clearAllFilters}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all and start over
            </button>
          </div>
        </div>
      )}

      {hasSearched && !isLoading && !error && searchResults.length > 0 && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700">
              Found {searchResults.length} result{searchResults.length > 1 ? 's' : ''}
              {searchTerm.trim() && (
                <span className="text-blue-600"> for "{searchTerm}"</span>
              )}
              {activeFiltersCount > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  (with {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied)
                </span>
              )}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {searchResults.map((anime) => (
              <AnimeCard key={anime.malId} anime={anime} />
            ))}
          </div>

          {/* Pagination Controls */}
          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={async () => {
                  setIsLoadingMore(true);
                  const nextPage = currentPage + 1;
                  
                  try {
                    const queryParams = new URLSearchParams();
                    
                    // Include search term if it was part of the original search
                    if (lastSearchParams.searchTerm.trim()) {
                      queryParams.append('q', lastSearchParams.searchTerm.trim());
                    }
                    
                    // Include all filters from the last search
                    if (lastSearchParams.filters.genres.length > 0) {
                      queryParams.append('genres', lastSearchParams.filters.genres.join(','));
                    }
                    if (lastSearchParams.filters.yearStart) {
                      queryParams.append('year_start', lastSearchParams.filters.yearStart);
                    }
                    if (lastSearchParams.filters.yearEnd) {
                      queryParams.append('year_end', lastSearchParams.filters.yearEnd);
                    }
                    if (lastSearchParams.filters.statuses.length > 0) {
                      queryParams.append('status', lastSearchParams.filters.statuses.join(','));
                    }
                    if (lastSearchParams.filters.minScore) {
                      queryParams.append('min_score', lastSearchParams.filters.minScore);
                    }
                    if (lastSearchParams.filters.maxScore) {
                      queryParams.append('max_score', lastSearchParams.filters.maxScore);
                    }
                    
                    // Use consistent limit and page parameters
                    queryParams.append('limit', '25');
                    queryParams.append('page', String(nextPage));
                    
                    // IMPORTANT: Pass the api_start_page parameter for proper pagination
                    queryParams.append('api_start_page', String(nextApiStartPage));
                    
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
                    const response = await fetch(`${baseUrl}/anime/search/advanced?${queryParams}`);
                    
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      
                      if (response.status === 429) {
                        throw new Error(errorData.error || 'Too many requests. Please wait a moment and try again.');
                      } else if (response.status === 400) {
                        throw new Error(errorData.error || 'Invalid search parameters. Please adjust your filters.');
                      } else {
                        throw new Error(errorData.error || 'Failed to load more results');
                      }
                    }
                    
                    const data = await response.json();
                    console.log(`Fetched page ${nextPage} results: ${data.data.length} new results`);
                    console.log(`Backend fetched API pages: ${data.pagination.api_pages_fetched}`);
                    
                    // Check if we got any new results
                    if (data.data.length === 0) {
                      // No new results found, but let user know and hide the Load More button
                      setHasNextPage(false);
                      setError('No more results found matching your criteria. Try adjusting your filters to discover more anime.');
                      setTimeout(() => setError(null), 5000); // Clear the message after 5 seconds
                    } else {
                      // Append new results to existing ones
                      setSearchResults(prevResults => [...prevResults, ...data.data]);
                      setHasNextPage(data.pagination.has_next_page);
                      setTotalResults(data.pagination.total_results);
                      setCurrentPage(data.pagination.current_page);
                      
                      // Update the next API start page for subsequent requests
                      if (data.pagination.next_api_start_page) {
                        setNextApiStartPage(data.pagination.next_api_start_page);
                      }
                    }
                  } catch (err: any) {
                    console.error('Error fetching more results:', err);
                    setError(err.message || 'Failed to load more results. Please try again.');
                  } finally {
                    setIsLoadingMore(false);
                  }
                }}
                disabled={isLoadingMore}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isLoadingMore
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoadingMore ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading more...
                  </div>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Getting Started Help */}
      {!hasSearched && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Find Your Next Anime?</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Combine search terms with filters for powerful results. Try "attack on titan" + Action genre, 
            or just use filters alone to discover new anime!
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setSearchTerm('demon slayer');
                setFilters(prev => ({...prev, genres: ['Action']}));
              }}
              className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full hover:bg-blue-200 transition-colors"
            >
              🗡️ "demon slayer" + Action
            </button>
            <button
              onClick={() => {
                setFilters(prev => ({...prev, genres: ['Romance', 'Comedy'], minScore: '8.0'}));
              }}
              className="bg-pink-100 text-pink-800 px-4 py-2 rounded-full hover:bg-pink-200 transition-colors"
            >
              💕 Romance + Comedy (8.0+)
            </button>
            <button
              onClick={() => {
                setFilters(prev => ({...prev, yearStart: '2020', minScore: '8.5'}));
              }}
              className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full hover:bg-yellow-200 transition-colors"
            >
              ⭐ Recent & Highly Rated
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;