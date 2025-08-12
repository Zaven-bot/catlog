'use client';

import React, { useEffect, useState } from 'react';
import { useUserAnimeList } from '../hooks/useUserAnimeList';
import { useAuth } from '../hooks/useAuth';

type CatMood = 'bored' | 'happy' | 'excited' | 'super-excited';

const VirtualCat: React.FC = () => {
    const { userAnimeList } = useUserAnimeList();
    const { user } = useAuth();
    const [mood, setMood] = useState<CatMood>('bored');
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (!user) {
            setMood('bored');
            return;
        }

        // Count currently watching anime
        const watchingCount = userAnimeList.filter(anime => anime.status === 'WATCHING').length;
        
        let newMood: CatMood;
        if (watchingCount === 0) {
            newMood = 'bored';
        } else if (watchingCount === 1) {
            newMood = 'happy';
        } else if (watchingCount === 2) {
            newMood = 'excited';
        } else {
            newMood = 'super-excited';
        }

        if (newMood !== mood) {
            setIsAnimating(true);
            setTimeout(() => {
                setMood(newMood);
                setIsAnimating(false);
            }, 200);
        }
    }, [userAnimeList, user, mood]);

    const getCatDisplay = () => {
        const watchingCount = userAnimeList.filter(anime => anime.status === 'WATCHING').length;
        
        switch (mood) {
            case 'bored':
                return {
                    videoSrc: '/videos/zero.mp4',
                    bgGradient: 'from-gray-400 to-gray-600',
                    message: user ? 
                        "Meow... You're not watching anything! Find something new! 😿" :
                        "Meow... Login to start watching anime together! 🐾",
                    subtext: user ? "Currently watching: 0 anime" : "Not logged in",
                    borderColor: 'border-gray-300'
                };
            case 'happy':
                return {
                    videoSrc: '/videos/one.mp4',
                    bgGradient: 'from-green-400 to-blue-500',
                    message: `Purr! You're watching ${watchingCount} anime. Let's enjoy it together! 🎬`,
                    subtext: `Currently watching: ${watchingCount} anime`,
                    borderColor: 'border-green-300'
                };
            case 'excited':
                return {
                    videoSrc: '/videos/two.mp4',
                    bgGradient: 'from-purple-500 to-pink-500',
                    message: `Amazing! ${watchingCount} anime at once! You're getting serious! ✨`,
                    subtext: `Currently watching: ${watchingCount} anime`,
                    borderColor: 'border-purple-300'
                };
            case 'super-excited':
                return {
                    videoSrc: '/videos/threeplus.mp4',
                    bgGradient: 'from-red-500 to-yellow-500',
                    message: `WOW! ${watchingCount} anime?! You're an anime master! 🔥`,
                    subtext: `Currently watching: ${watchingCount} anime`,
                    borderColor: 'border-red-300'
                };
            default:
                return {
                    videoSrc: '/videos/zero.mp4',
                    bgGradient: 'from-gray-400 to-gray-600',
                    message: 'Hello! Ready to discover some anime? 🌟',
                    subtext: '',
                    borderColor: 'border-gray-300'
                };
        }
    };

    const catDisplay = getCatDisplay();

    return (
        <div className="mt-8 flex flex-col items-center">
            {/* Cat Container with Enhanced Visuals */}
            <div className={`relative bg-white rounded-2xl shadow-lg border-2 ${catDisplay.borderColor} p-6 max-w-sm transform transition-all duration-500 hover:scale-105 ${isAnimating ? 'scale-110' : ''}`}>
                {/* Gradient Background Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${catDisplay.bgGradient} opacity-10 rounded-2xl`}></div>
                
                {/* Content */}
                <div className="relative z-10 text-center">
                    {/* Cat Video with Animation */}
                    <div className="mb-4 flex justify-center">
                        <video
                            src={catDisplay.videoSrc}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className={`w-32 h-32 rounded-full object-cover shadow-lg transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
                            style={{
                                filter: mood === 'bored' ? 'grayscale(20%)' : 'none'
                            }}
                        />
                    </div>
                    
                    {/* Cat Message */}
                    <p className="text-sm text-gray-800 font-medium mb-2 leading-relaxed">
                        {catDisplay.message}
                    </p>
                    
                    {/* Status Info */}
                    <div className="mt-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                        <span className="font-semibold">{catDisplay.subtext}</span>
                    </div>
                    
                    {/* Mood Indicator */}
                    <div className="mt-3 flex items-center justify-center space-x-2">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${catDisplay.bgGradient}`}></div>
                        <span className="text-xs text-gray-500 capitalize font-medium">
                            Mood: {mood.replace('-', ' ')}
                        </span>
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${catDisplay.bgGradient}`}></div>
                    </div>
                </div>
                
                {/* Floating Hearts Animation for Excited State */}
                {(mood === 'excited' || mood === 'super-excited') && (
                    <div className="absolute -top-2 -right-2">
                        <div className="text-red-500 animate-ping">💕</div>
                    </div>
                )}
                
                {/* Extra Sparkles for Super Excited */}
                {mood === 'super-excited' && (
                    <div className="absolute -top-1 -left-2">
                        <div className="text-yellow-400 animate-bounce">✨</div>
                    </div>
                )}
                
                {/* Floating Z's for Bored State */}
                {mood === 'bored' && (
                    <div className="absolute -top-1 right-2">
                        <div className="text-gray-400 animate-pulse text-xs">💭</div>
                    </div>
                )}
            </div>
            
            {/* Quick Action Suggestions */}
            {user && (
                <div className="mt-4 text-center">
                    {mood === 'bored' && (
                        <a 
                            href="/search" 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            🔍 Find New Anime
                        </a>
                    )}
                    {mood === 'happy' && (
                        <a 
                            href="/my-list" 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            📺 View My List
                        </a>
                    )}
                    {mood === 'excited' && (
                        <a 
                            href="/dashboard" 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            📊 Check Stats
                        </a>
                    )}
                    {mood === 'super-excited' && (
                        <a 
                            href="/dashboard" 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors animate-pulse"
                        >
                            🔥 You're on Fire! Check Stats
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};

export default VirtualCat;