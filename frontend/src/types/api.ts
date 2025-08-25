export interface Anime {
  id: number;
  malId: number;
  title: string;
  titleEnglish?: string;
  synopsis: string;
  imageUrl: string;
  genres: string[];
  episodes: number;
  status: string;
  score?: number;
  year?: number;
  rating?: string;
  studios: string[];
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
}

export interface UserAnime {
  id: number;
  status: AnimeStatus;
  personalRating?: number;
  notes?: string;
  episodesWatched?: number;
  isFavorite: boolean;
  startDate?: string;
  completedDate?: string;
  anime: Anime;
}

export interface Recommendation {
  animeId: number;
  reason: string;
}

// Only keep VirtualCat mood for your MP4 system
export type VirtualCatMood = 'bored' | 'happy' | 'excited' | 'super-excited';

// Helper functions for filtering
export const filterUserAnimeByStatus = (userAnimeList: UserAnime[], status: AnimeStatus): UserAnime[] =>
  userAnimeList.filter(ua => ua.status === status);

export const getUserWatchlist = (userAnimeList: UserAnime[]): UserAnime[] =>
  filterUserAnimeByStatus(userAnimeList, AnimeStatus.PLAN_TO_WATCH);

export const getUserWatched = (userAnimeList: UserAnime[]): UserAnime[] =>
  filterUserAnimeByStatus(userAnimeList, AnimeStatus.COMPLETED);

export const getUserDropped = (userAnimeList: UserAnime[]): UserAnime[] =>
  filterUserAnimeByStatus(userAnimeList, AnimeStatus.DROPPED);

export const getUserWatching = (userAnimeList: UserAnime[]): UserAnime[] =>
  filterUserAnimeByStatus(userAnimeList, AnimeStatus.WATCHING);

export const getUserOnHold = (userAnimeList: UserAnime[]): UserAnime[] =>
  filterUserAnimeByStatus(userAnimeList, AnimeStatus.ON_HOLD);