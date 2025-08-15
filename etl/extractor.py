"""
Data Extraction from Jikan API
"""
import logging
import requests
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from config import config

logger = logging.getLogger(__name__)

class JikanExtractor:
    """Handles data extraction from Jikan API with rate limiting"""
    
    def __init__(self):
        self.base_url = "https://api.jikan.moe/v4"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'CatLog-ETL/1.0'
        })
        self.request_count = 0
        self.last_request_time = 0
    
    def _rate_limit_delay(self) -> None:
        """Enforce rate limiting between requests"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < config.jikan_rate_limit_delay:
            sleep_time = config.jikan_rate_limit_delay - time_since_last
            logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f} seconds")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _make_request(self, url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a request to Jikan API with retries and rate limiting"""
        self._rate_limit_delay()
        
        for attempt in range(config.jikan_max_retries):
            try:
                logger.debug(f"Making request to: {url} (attempt {attempt + 1})")
                response = self.session.get(url, params=params, timeout=10)
                self.request_count += 1
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    # Rate limited - wait longer and retry
                    wait_time = (attempt + 1) * 30  # 30s, 60s, 90s
                    logger.warning(f"Rate limited (429), waiting {wait_time}s before retry")
                    time.sleep(wait_time)
                    continue
                elif response.status_code == 404:
                    logger.warning(f"Resource not found (404): {url}")
                    return {}
                else:
                    response.raise_for_status()
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt == config.jikan_max_retries - 1:
                    raise
                time.sleep((attempt + 1) * 5)  # 5s, 10s, 15s backoff
        
        raise Exception(f"Failed to fetch data after {config.jikan_max_retries} attempts")
    
    def extract_top_anime_rankings(self, max_pages: Optional[int] = None) -> List[Dict[str, Any]]:
        """Extract top anime rankings from Jikan API"""
        max_pages = max_pages or config.rankings_max_pages
        all_anime = []
        
        logger.info(f"Starting extraction of top {max_pages * 25} anime rankings")
        
        for page in range(1, max_pages + 1):
            try:
                url = f"{self.base_url}/top/anime"
                params = {
                    'page': page,
                    'limit': 25
                }
                
                logger.info(f"Fetching page {page} of top anime...")
                data = self._make_request(url, params)
                
                if not data or 'data' not in data or not data['data']:
                    logger.warning(f"No data found on page {page}, stopping extraction")
                    break
                
                anime_list = data['data']
                logger.info(f"Retrieved {len(anime_list)} anime from page {page}")
                
                # Add explicit rank information based on page and position
                for i, anime in enumerate(anime_list):
                    calculated_rank = (page - 1) * 25 + i + 1
                    anime['calculated_rank'] = calculated_rank
                    
                    # Use the API rank if available, otherwise use calculated
                    if 'rank' not in anime or anime['rank'] is None:
                        anime['rank'] = calculated_rank
                
                all_anime.extend(anime_list)
                
                # Check if there are more pages
                pagination = data.get('pagination', {})
                if not pagination.get('has_next_page', False):
                    logger.info(f"No more pages available, stopping at page {page}")
                    break
                    
            except Exception as e:
                logger.error(f"Failed to extract page {page}: {e}")
                # Continue with other pages instead of failing completely
                continue
        
        logger.info(f"Extraction completed: {len(all_anime)} anime extracted, {self.request_count} API requests made")
        return all_anime
    
    def get_request_count(self) -> int:
        """Get the number of API requests made"""
        return self.request_count
    
    def reset_request_count(self) -> None:
        """Reset the request counter"""
        self.request_count = 0