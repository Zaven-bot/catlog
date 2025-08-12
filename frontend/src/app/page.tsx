'use client';

import React from 'react';
import VirtualCat from '../components/VirtualCat';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../hooks/useAuth';

const HomePage = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            {/* Hero Section */}
            <div className="flex flex-col items-center justify-center px-4 py-16">
                {/* Main Title */}
                <div className="text-center mb-8">
                    <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 pb-2 leading-tight">
                        🐾 CatLog
                    </h1>
                    <p className="text-xl text-gray-700 mb-2">
                        Your anime tracker with a pinch of cat memes
                    </p>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        Track your anime journey and celebrate it with cat memes!
                    </p>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        Hint: Use <b>Continue Watching</b> status for best cat memes!
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-4 w-full max-w-2xl">
                    <SearchBar />
                </div>

                {/* Virtual Cat - The Star of the Show */}
                <VirtualCat />

                {/* Quick Actions for New Users */}
                {!user && (
                    <div className="mt-12 text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Get Started with CatLog
                        </h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a 
                                href="/login" 
                                className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
                            >
                                🚀 Login / Sign Up
                            </a>
                            <a 
                                href="/anime" 
                                className="inline-flex items-center px-6 py-3 text-sm font-medium text-purple-600 bg-white border-2 border-purple-600 rounded-lg hover:bg-purple-50 transition-colors shadow-lg"
                            >
                                🔍 Browse Anime
                            </a>
                        </div>
                    </div>
                )}

                {/* Features Preview */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
                        <div className="text-4xl mb-3">📺</div>
                        <h4 className="font-semibold text-gray-800 mb-2">Track Your Anime</h4>
                        <p className="text-sm text-gray-600">
                            Keep track of what you're watching, completed, and planning to watch
                        </p>
                    </div>
                    <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
                        <div className="text-4xl mb-3">😺</div>
                        <h4 className="font-semibold text-gray-800 mb-2">Virtual Cat Companion</h4>
                        <p className="text-sm text-gray-600">
                            Your cat reacts to your anime watching habits and keeps you motivated
                        </p>
                    </div>
                    <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
                        <div className="text-4xl mb-3">📊</div>
                        <h4 className="font-semibold text-gray-800 mb-2">Statistics & Insights</h4>
                        <p className="text-sm text-gray-600">
                            Get detailed insights about your anime preferences and watching patterns
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;