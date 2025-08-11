'use client';

import React, { useEffect } from 'react';
import { useCatStore } from '../stores/catStore';

const VirtualCat: React.FC = () => {
    const { mood, setMood, logActivity } = useCatStore();

    useEffect(() => {
        const handleActivity = () => {
            logActivity();
            setMood('happy');
        };

        const handleInactivity = () => {
            setMood('bored');
        };

        // Simulate user activity detection
        window.addEventListener('click', handleActivity);
        const inactivityTimeout = setTimeout(handleInactivity, 5000); // 5 seconds of inactivity

        return () => {
            window.removeEventListener('click', handleActivity);
            clearTimeout(inactivityTimeout);
        };
    }, [logActivity, setMood]);

    const getCatEmoji = () => {
        switch (mood) {
            case 'happy':
                return '😸';
            case 'bored':
                return '😾';
            case 'sleeping':
                return '😴';
            case 'excited':
                return '🤩';
            default:
                return '😺';
        }
    };

    const getCatMessage = () => {
        switch (mood) {
            case 'happy':
                return 'Purr! Keep watching anime! 🐾';
            case 'bored':
                return "I'm bored... Watch something new! 😿";
            case 'sleeping':
                return 'Zzz... Let me sleep... 💤';
            case 'excited':
                return 'Wow! That anime looks amazing! ✨';
            default:
                return 'Hello! Ready to discover some anime? 🌟';
        }
    };

    return (
        <div className="virtual-cat bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-xs">
            <div className="text-center">
                <div className="text-6xl mb-2 animate-bounce">
                    {getCatEmoji()}
                </div>
                <p className="text-sm text-gray-700 font-medium">
                    {getCatMessage()}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                    Current mood: <span className="capitalize font-semibold">{mood}</span>
                </div>
            </div>
        </div>
    );
};

export default VirtualCat;