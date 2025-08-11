export interface Anime {
    id: number;
    title: string;
    imageUrl: string;
    synopsis: string;
    genres: string[];
    episodes: number;
    status: 'airing' | 'completed' | 'upcoming' | 'cancelled';
}

export enum AnimeStatus {
    WATCHING = 'WATCHING',
    COMPLETED = 'COMPLETED',
    ON_HOLD = 'ON_HOLD',
    DROPPED = 'DROPPED',
    PLAN_TO_WATCH = 'PLAN_TO_WATCH'
}

export interface User {
    id: number;
    username: string;
    email: string;
    watchlist: Anime[];
    watched: Anime[];
    dropped: Anime[];
}

export interface Recommendation {
    animeId: number;
    reason: string;
}

export interface CatMood {
    mood: 'happy' | 'bored' | 'curious' | 'playful';
    lastActivity: Date;
}