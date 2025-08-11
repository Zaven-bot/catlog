import axios from 'axios';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Enhanced rate limiting - Jikan allows 3 requests per second
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithRetry(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async executeWithRetry<T>(requestFn: () => Promise<T>, attempt: number = 1): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      // If rate limited and we have attempts left, wait and retry
      if (error.response?.status === 429 && attempt <= 3) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30 seconds
        console.log(`Rate limited, waiting ${backoffTime}ms before retry ${attempt}/3`);
        await this.delay(backoffTime);
        return this.executeWithRetry(requestFn, attempt + 1);
      }
      throw error;
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      await this.waitForRateLimit();
      
      const request = this.queue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Request failed:', error);
        }
      }
    }
    
    this.isProcessing = false;
  }

  private async waitForRateLimit() {
    const now = Date.now();
    
    // Reset counter every second
    if (now - this.windowStart >= 1000) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    // If we've made 3 requests in the current window, wait
    if (this.requestCount >= 3) {
      const waitTime = 1000 - (now - this.windowStart);
      if (waitTime > 0) {
        await this.delay(waitTime);
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }
    
    // Ensure minimum 350ms between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 350;
    
    if (timeSinceLastRequest < minInterval) {
      await this.delay(minInterval - timeSinceLastRequest);
    }
    
    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const requestQueue = new RequestQueue();

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  synopsis?: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  genres: Array<{ name: string }>;
  episodes?: number;
  status: string;
  score?: number;
  year?: number;
  rating?: string;
  studios: Array<{ name: string }>;
}

interface JikanSearchResponse {
  data: JikanAnime[];
  pagination: {
    current_page: number;
    has_next_page: boolean;
    last_visible_page: number;
  };
}

export class JikanService {
  static async searchAnime(query: string, page: number = 1, limit: number = 25): Promise<JikanSearchResponse> {
    return requestQueue.add(async () => {
      try {
        const response = await axios.get(`${JIKAN_BASE_URL}/anime`, {
          params: {
            q: query,
            page,
            limit
            // Removed order_by and sort parameters - they're not valid for search endpoint
          },
          timeout: 10000
        });
        
        return response.data;
      } catch (error: any) {
        console.error('Jikan search error:', error);
        if (error.response?.status === 429) {
          throw new Error('Rate limited by Jikan API. Please wait a moment and try again.');
        }
        if (error.response?.status === 400) {
          throw new Error('Invalid search parameters. Please try a different search.');
        }
        throw new Error('Failed to search anime');
      }
    });
  }

  static async getAnimeById(malId: number): Promise<JikanAnime> {
    return requestQueue.add(async () => {
      try {
        const response = await axios.get(`${JIKAN_BASE_URL}/anime/${malId}`);
        return response.data.data;
      } catch (error) {
        console.error('Jikan get anime error:', error);
        throw new Error('Failed to fetch anime details');
      }
    });
  }

  static async getTopAnime(page: number = 1, limit: number = 25): Promise<JikanSearchResponse> {
    return requestQueue.add(async () => {
      try {
        const response = await axios.get(`${JIKAN_BASE_URL}/top/anime`, {
          params: { page, limit },
          timeout: 15000
        });
        
        return response.data;
      } catch (error) {
        console.error('Jikan top anime error:', error);
        throw new Error('Failed to fetch top anime');
      }
    });
  }

  static async getSeasonalAnime(year?: number, season?: string): Promise<JikanSearchResponse> {
    const currentYear = year || new Date().getFullYear();
    const currentSeason = season || this.getCurrentSeason();
    
    return requestQueue.add(async () => {
      try {
        const response = await axios.get(`${JIKAN_BASE_URL}/seasons/${currentYear}/${currentSeason}`, {
          timeout: 15000
        });
        
        return response.data;
      } catch (error) {
        console.error('Jikan seasonal anime error:', error);
        throw new Error('Failed to fetch seasonal anime');
      }
    });
  }

  private static getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  // Transform Jikan anime data to our internal format
  static transformAnimeData(jikanAnime: JikanAnime) {
    return {
      malId: jikanAnime.mal_id,
      title: jikanAnime.title_english || jikanAnime.title,
      description: jikanAnime.synopsis,
      imageUrl: jikanAnime.images.jpg.large_image_url || jikanAnime.images.jpg.image_url,
      genres: jikanAnime.genres.map(g => g.name),
      episodes: jikanAnime.episodes,
      status: jikanAnime.status,
      score: jikanAnime.score,
      year: jikanAnime.year,
      rating: jikanAnime.rating,
      studios: jikanAnime.studios?.map(s => s.name) || []
    };
  }
}