export interface Anime {
    id: number;
    title: string;
    imageUrl: string;
    synopsis: string;
    genres: string[];
    episodes: number;
    status: 'airing' | 'completed' | 'upcoming' | 'cancelled';
}

export interface AnimeEntry {
    id: number;
    title: string;
    imageUrl: string;
    status: 'watched' | 'watching' | 'plan to watch' | 'dropped';
    notes?: string;
    rating?: number;
    tags?: string[];
    animeId?: number; // Reference to the base Anime
}

export interface User {
    id: number;
    username: string;
    email: string;
    watchlist: AnimeEntry[];
    watched: AnimeEntry[];
    dropped: AnimeEntry[];
}

export interface UserStats {
    totalWatched: number;
    totalTimeSpent: number; // in minutes
    genreBreakdown: Record<string, number>; // e.g., { Action: 5, Comedy: 3 }
}

export interface Recommendation {
    id: number;
    title: string;
    reason: string;
    animeId: number;
}

export type CatMood = 'happy' | 'bored' | 'curious' | 'playful' | 'neutral';

export interface CatState {
    mood: CatMood;
    lastActivity: Date;
    activityCount: number;
}

export interface VirtualCat {
    mood: CatMood;
    reactToActivity: (activity: string) => void;
}