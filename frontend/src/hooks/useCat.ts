'use client';

import { useEffect } from 'react';
import { useCatStore } from '../stores/catStore';

type ActivityType = 'log' | 'inactive' | 'search' | 'view';

interface Activity {
  type: ActivityType;
  timestamp: Date;
}

interface UseCatReturn {
  mood: string;
  logActivity: (type: ActivityType) => void;
}

const useCat = (): UseCatReturn => {
  const { mood, setMood, logActivity: storeLogActivity } = useCatStore();

  useEffect(() => {
    // Set up periodic mood checks based on inactivity
    const checkInactivity = () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // If no recent activity, make cat bored
      // This is a simplified check - in a real app you'd track actual activity timestamps
      const isInactive = Math.random() > 0.7; // Mock inactivity check
      
      if (isInactive && mood !== 'bored') {
        setMood('bored');
      }
    };

    const inactivityInterval = setInterval(checkInactivity, 30000); // Check every 30 seconds

    return () => clearInterval(inactivityInterval);
  }, [mood, setMood]);

  const logActivity = (type: ActivityType) => {
    storeLogActivity();
    
    // Set mood based on activity type
    switch (type) {
      case 'log':
        setMood('happy');
        break;
      case 'search':
        setMood('excited');
        break;
      case 'view':
        setMood('happy');
        break;
      case 'inactive':
        setMood('bored');
        break;
      default:
        setMood('neutral');
    }
  };

  return {
    mood,
    logActivity,
  };
};

export { useCat };