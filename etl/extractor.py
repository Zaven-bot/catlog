"""
Jikan API extractor module for CatLog ETL Pipeline
"""
import requests
import time
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from config import ETLConfig


class JikanExtractor:
    """Handles data extraction from Jikan API"""
    
    def __init__(self):
        self.config = ETLConfig()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'CatLog-ETL-Pipeline/1.0'
        })
        self.logger = logging.getLogger(__name__)
    
    def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a rate-limited request to Jikan API"""
        url = f"{self.config.JIKAN_BASE_URL}/{endpoint}"
        
        for attempt in range(self.config.JIKAN_MAX_RETRIES):
            try:
                # Rate limiting
                time.sleep(self.config.JIKAN_RATE_LIMIT_DELAY)
                
                response = self.session.get(
                    url, 
                    params=params, 
                    timeout=self.config.JIKAN_TIMEOUT
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    # Rate limited, wait longer
                    wait_time = (attempt + 1) * 5
                    self.logger.warning(f"Rate limited, waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    response.raise_for_status()
                    
            except requests.exceptions.Timeout:
                self.logger.warning(f"Timeout on attempt {attempt + 1}")
                if attempt == self.config.JIKAN_MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except requests.exceptions.RequestException as e:
                self.logger.error(f"Request failed on attempt {attempt + 1}: {str(e)}")
                if attempt == self.config.JIKAN_MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)
        
        raise Exception(f"Failed to fetch data from {url} after {self.config.JIKAN_MAX_RETRIES} attempts")
    
    def extract_top_anime(self, max_pages: Optional[int] = None) -> List[Dict[str, Any]]:
        """Extract top anime data from Jikan API"""
        max_pages = max_pages or self.config.MAX_PAGES
        all_anime = []
        
        self.logger.info(f"Starting extraction of top anime, max pages: {max_pages}")
        
        for page in range(1, max_pages + 1):
            try:
                self.logger.info(f"Fetching page {page}")
                
                response_data = self._make_request("top/anime", {
                    "page": page,
                    "limit": 25
                })
                
                anime_list = response_data.get('data', [])
                if not anime_list:
                    self.logger.info(f"No more data on page {page}, stopping")
                    break
                
                all_anime.extend(anime_list)
                self.logger.info(f"Page {page}: extracted {len(anime_list)} anime")
                
                # Check if there are more pages
                pagination = response_data.get('pagination', {})
                if not pagination.get('has_next_page', False):
                    self.logger.info(f"Reached last page at page {page}")
                    break
                    
            except Exception as e:
                self.logger.error(f"Failed to extract page {page}: {str(e)}")
                # Continue with next page rather than failing entire extraction
                continue
        
        self.logger.info(f"Extraction complete. Total anime extracted: {len(all_anime)}")
        return all_anime
    
    def extract_seasonal_anime(self, year: Optional[int] = None, season: Optional[str] = None) -> List[Dict[str, Any]]:
        """Extract seasonal anime data"""
        current_year = datetime.now().year
        current_season = self._get_current_season()
        
        year = year or current_year
        season = season or current_season
        
        self.logger.info(f"Extracting seasonal anime for {season} {year}")
        
        try:
            response_data = self._make_request(f"seasons/{year}/{season}")
            anime_list = response_data.get('data', [])
            
            self.logger.info(f"Extracted {len(anime_list)} seasonal anime")
            return anime_list
            
        except Exception as e:
            self.logger.error(f"Failed to extract seasonal anime: {str(e)}")
            return []
    
    def _get_current_season(self) -> str:
        """Determine current anime season"""
        month = datetime.now().month
        if 3 <= month <= 5:
            return "spring"
        elif 6 <= month <= 8:
            return "summer"
        elif 9 <= month <= 11:
            return "fall"
        else:
            return "winter"
    
    def extract_anime_by_genre(self, genre_id: int, max_pages: int = 3) -> List[Dict[str, Any]]:
        """Extract anime by specific genre"""
        all_anime = []
        
        self.logger.info(f"Extracting anime for genre ID: {genre_id}")
        
        for page in range(1, max_pages + 1):
            try:
                response_data = self._make_request("anime", {
                    "genres": genre_id,
                    "page": page,
                    "limit": 25
                })
                
                anime_list = response_data.get('data', [])
                if not anime_list:
                    break
                
                all_anime.extend(anime_list)
                self.logger.info(f"Genre {genre_id} page {page}: extracted {len(anime_list)} anime")
                
                pagination = response_data.get('pagination', {})
                if not pagination.get('has_next_page', False):
                    break
                    
            except Exception as e:
                self.logger.error(f"Failed to extract genre {genre_id} page {page}: {str(e)}")
                continue
        
        self.logger.info(f"Genre {genre_id} extraction complete: {len(all_anime)} anime")
        return all_anime