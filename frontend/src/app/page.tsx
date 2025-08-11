import React from 'react';
import VirtualCat from '../components/VirtualCat';
import SearchBar from '../components/SearchBar';

const HomePage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-4xl font-bold mb-4">Welcome to CatLog!</h1>
            <p className="text-lg mb-8">Your anime companion with a virtual cat twist.</p>
            <SearchBar />
            <VirtualCat />
        </div>
    );
};

export default HomePage;