"""
Data transformation module for CatLog ETL Pipeline
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime


class AnimeTransformer:
    """Handles transformation of raw anime data into processed format"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def transform_anime_data(self, raw_anime_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Transform list of raw anime data into processed format"""
        processed_anime = []
        
        for raw_anime in raw_anime_list:
            try:
                processed = self._transform_single_anime(raw_anime)
                if processed:
                    processed_anime.append(processed)
            except Exception as e:
                self.logger.error(f"Failed to transform anime {raw_anime.get('mal_id', 'unknown')}: {str(e)}")
                continue
        
        self.logger.info(f"Transformed {len(processed_anime)}/{len(raw_anime_list)} anime records")
        return processed_anime
    
    def _transform_single_anime(self, raw_anime: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Transform a single anime record"""
        if not raw_anime.get('mal_id'):
            self.logger.warning("Skipping anime with no mal_id")
            return None
        
        # Extract basic information
        mal_id = raw_anime['mal_id']
        title = raw_anime.get('title', '').strip()
        title_english = raw_anime.get('title_english', '').strip() if raw_anime.get('title_english') else None
        
        if not title:
            self.logger.warning(f"Skipping anime {mal_id} with no title")
            return None
        
        # Extract genres
        genres = []
        if raw_anime.get('genres'):
            genres = [genre['name'] for genre in raw_anime['genres'] if isinstance(genre, dict) and genre.get('name')]
        
        # Extract studios
        studios = []
        if raw_anime.get('studios'):
            studios = [studio['name'] for studio in raw_anime['studios'] if isinstance(studio, dict) and studio.get('name')]
        
        # Extract aired dates
        aired_from = None
        aired_to = None
        year = None
        season = None
        
        if raw_anime.get('aired'):
            aired_data = raw_anime['aired']
            
            # Parse aired from date
            if aired_data.get('from'):
                try:
                    aired_from = datetime.fromisoformat(aired_data['from'].replace('Z', '+00:00'))
                    year = aired_from.year
                    season = self._get_season_from_date(aired_from)
                except (ValueError, TypeError) as e:
                    self.logger.warning(f"Failed to parse aired_from date for {mal_id}: {str(e)}")
            
            # Parse aired to date
            if aired_data.get('to'):
                try:
                    aired_to = datetime.fromisoformat(aired_data['to'].replace('Z', '+00:00'))
                except (ValueError, TypeError) as e:
                    self.logger.warning(f"Failed to parse aired_to date for {mal_id}: {str(e)}")
        
        # Extract year from other sources if not available from aired date
        if not year and raw_anime.get('year'):
            year = raw_anime['year']
        
        # Extract image URL
        image_url = None
        if raw_anime.get('images', {}).get('jpg', {}).get('large_image_url'):
            image_url = raw_anime['images']['jpg']['large_image_url']
        elif raw_anime.get('images', {}).get('jpg', {}).get('image_url'):
            image_url = raw_anime['images']['jpg']['image_url']
        
        # Clean and validate numeric fields
        score = self._safe_float(raw_anime.get('score'))
        members = self._safe_int(raw_anime.get('members'))
        popularity = self._safe_int(raw_anime.get('popularity'))
        rank = self._safe_int(raw_anime.get('rank'))
        episodes = self._safe_int(raw_anime.get('episodes'))
        
        # Clean synopsis
        synopsis = None
        if raw_anime.get('synopsis'):
            synopsis = raw_anime['synopsis'].strip()
            if synopsis.lower() in ['none', 'n/a', 'null']:
                synopsis = None
        
        return {
            'mal_id': mal_id,
            'title': title,
            'title_english': title_english,
            'genres': genres,
            'score': score,
            'members': members,
            'popularity': popularity,
            'rank': rank,
            'aired_from': aired_from,
            'aired_to': aired_to,
            'status': raw_anime.get('status', '').strip() or 'Unknown',
            'episodes': episodes,
            'duration': raw_anime.get('duration', '').strip() if raw_anime.get('duration') else None,
            'rating': raw_anime.get('rating', '').strip() if raw_anime.get('rating') else None,
            'studios': studios,
            'year': year,
            'season': season,
            'image_url': image_url,
            'synopsis': synopsis
        }
    
    def _get_season_from_date(self, date: datetime) -> str:
        """Determine anime season from aired date"""
        month = date.month
        if 3 <= month <= 5:
            return "spring"
        elif 6 <= month <= 8:
            return "summer"
        elif 9 <= month <= 11:
            return "fall"
        else:
            return "winter"
    
    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert value to int"""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def validate_processed_data(self, processed_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate processed data and filter out invalid records"""
        valid_data = []
        
        for anime in processed_data:
            if self._is_valid_anime(anime):
                valid_data.append(anime)
            else:
                self.logger.warning(f"Filtering out invalid anime record: {anime.get('mal_id', 'unknown')}")
        
        self.logger.info(f"Validation complete: {len(valid_data)}/{len(processed_data)} records are valid")
        return valid_data
    
    def _is_valid_anime(self, anime: Dict[str, Any]) -> bool:
        """Check if processed anime data is valid"""
        # Required fields
        if not anime.get('mal_id') or not anime.get('title'):
            return False
        
        # Validate score range
        if anime.get('score') is not None and (anime['score'] < 0 or anime['score'] > 10):
            return False
        
        # Validate year range
        if anime.get('year') is not None and (anime['year'] < 1900 or anime['year'] > datetime.now().year + 5):
            return False
        
        # Validate episodes
        if anime.get('episodes') is not None and anime['episodes'] < 0:
            return False
        
        return True