'use client';

import React, { useState } from 'react';
import { useAnime } from '../hooks/useAnime';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onResults?: (results: any[]) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onResults }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { searchAnime } = useAnime();
  const router = useRouter();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim()) {
      setIsSearching(true);
      
      try {
        // Call the search function
        const results = await searchAnime(query.trim());
        
        // If onResults callback is provided, use it (for inline results)
        if (onResults) {
          onResults(results);
        } else {
          // Otherwise, navigate to search results page
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
        
        // Call optional onSearch callback
        if (onSearch) {
          onSearch(query.trim());
        }
        
        setQuery(''); // Clear search after successful search
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center max-w-md mx-auto">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search for anime..."
        disabled={isSearching}
        className="border border-gray-300 rounded-l-lg px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
      />
      <button 
        type="submit" 
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-r-lg border border-purple-600 transition-colors disabled:opacity-50"
        disabled={!query.trim() || isSearching}
      >
        {isSearching ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
};

export default SearchBar;