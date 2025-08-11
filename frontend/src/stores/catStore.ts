import { create } from 'zustand';

type CatMood = 'happy' | 'bored' | 'sleeping' | 'excited' | 'neutral';

interface CatState {
  mood: CatMood;
  activityCount: number;
  lastActivity: Date | null;
  setMood: (mood: CatMood) => void;
  logActivity: () => void;
  resetActivity: () => void;
}

export const useCatStore = create<CatState>((set, get) => ({
  mood: 'neutral',
  activityCount: 0,
  lastActivity: null,
  
  setMood: (mood: CatMood) => set({ mood }),
  
  logActivity: () => set((state) => {
    const newCount = state.activityCount + 1;
    let newMood: CatMood = 'happy';
    
    // Determine mood based on activity
    if (newCount > 10) {
      newMood = 'excited';
    } else if (newCount > 5) {
      newMood = 'happy';
    } else {
      newMood = 'neutral';
    }
    
    return { 
      activityCount: newCount, 
      mood: newMood,
      lastActivity: new Date()
    };
  }),
  
  resetActivity: () => set({ 
    activityCount: 0, 
    mood: 'bored',
    lastActivity: null
  }),
}));