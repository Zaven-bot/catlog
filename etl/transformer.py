"""
Data Transformation for ETL Pipeline
"""
import logging
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime

logger = logging.getLogger(__name__)

class RankingTransformer:
    """Transforms raw Jikan API data into structured format for database storage"""
    
    def transform_ranking_data(self, raw_anime_list: List[Dict[str, Any]]) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Transform raw anime data into ProcessedAnime and DailyRankings format"""
        processed_anime = []
        rankings_data = []
        
        for anime in raw_anime_list:
            try:
                # Transform for ProcessedAnime table
                processed = self._transform_processed_anime(anime)
                processed_anime.append(processed)
                
                # Transform for DailyRankings table
                ranking = self._transform_daily_ranking(anime)
                rankings_data.append(ranking)
                
            except Exception as e:
                logger.error(f"Failed to transform anime {anime.get('mal_id')}: {e}")
                continue
        
        logger.info(f"Transformed {len(processed_anime)} anime records")
        return processed_anime, rankings_data
    
    def _transform_processed_anime(self, anime: Dict[str, Any]) -> Dict[str, Any]:
        """Transform raw anime data for ProcessedAnime table"""
        return {
            'malId': anime.get('mal_id'),
            'title': anime.get('title', '').strip(),
            'titleEnglish': self._safe_get_string(anime, 'title_english'),
            'genres': self._extract_genres(anime),
            'score': self._safe_get_decimal(anime, 'score'),
            'scoredBy': self._safe_get_int(anime, 'scored_by'),
            'rank': self._safe_get_int(anime, 'rank'),
            'popularity': self._safe_get_int(anime, 'popularity'),
            'members': self._safe_get_int(anime, 'members'),
            'favorites': self._safe_get_int(anime, 'favorites'),
            'episodes': self._safe_get_int(anime, 'episodes'),
            'status': self._safe_get_string(anime, 'status'),
            'season': self._safe_get_string(anime, 'season'),
            'year': self._safe_get_int(anime, 'year'),
            'rating': self._safe_get_string(anime, 'rating'),
            'studios': self._extract_studios(anime),
            'imageUrl': self._extract_image_url(anime),
            'synopsis': self._safe_get_string(anime, 'synopsis')
        }
    
    def _transform_daily_ranking(self, anime: Dict[str, Any]) -> Dict[str, Any]:
        """Transform raw anime data for DailyRankings table"""
        return {
            'malId': anime.get('mal_id'),
            'title': anime.get('title', '').strip(),
            'rank': self._safe_get_int(anime, 'rank'),
            'popularity': self._safe_get_int(anime, 'popularity'),
            'score': self._safe_get_decimal(anime, 'score'),
            'scoredBy': self._safe_get_int(anime, 'scored_by'),
            'members': self._safe_get_int(anime, 'members'),
            'favorites': self._safe_get_int(anime, 'favorites'),
            'genres': self._extract_genres(anime)  # Added for Stage 2 Spark analytics
        }
    
    def _safe_get_string(self, data: Dict[str, Any], key: str) -> Optional[str]:
        """Safely extract string value, handling None and empty strings"""
        value = data.get(key)
        if value is None or value == '':
            return None
        return str(value).strip()
    
    def _safe_get_int(self, data: Dict[str, Any], key: str) -> Optional[int]:
        """Safely extract integer value, handling None and conversion errors"""
        value = data.get(key)
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            logger.warning(f"Could not convert {key}='{value}' to int")
            return None
    
    def _safe_get_decimal(self, data: Dict[str, Any], key: str) -> Optional[Decimal]:
        """Safely extract decimal value for precise score storage"""
        value = data.get(key)
        if value is None:
            return None
        try:
            return Decimal(str(value))
        except (ValueError, TypeError):
            logger.warning(f"Could not convert {key}='{value}' to decimal")
            return None
    
    def _extract_genres(self, anime: Dict[str, Any]) -> List[str]:
        """Extract genre names from Jikan API format"""
        genres = anime.get('genres', [])
        if not isinstance(genres, list):
            return []
        
        genre_names = []
        for genre in genres:
            if isinstance(genre, dict) and 'name' in genre:
                genre_names.append(genre['name'])
            elif isinstance(genre, str):
                genre_names.append(genre)
        
        return genre_names
    
    def _extract_studios(self, anime: Dict[str, Any]) -> List[str]:
        """Extract studio names from Jikan API format"""
        studios = anime.get('studios', [])
        if not isinstance(studios, list):
            return []
        
        studio_names = []
        for studio in studios:
            if isinstance(studio, dict) and 'name' in studio:
                studio_names.append(studio['name'])
            elif isinstance(studio, str):
                studio_names.append(studio)
        
        return studio_names
    
    def _extract_image_url(self, anime: Dict[str, Any]) -> Optional[str]:
        """Extract the best available image URL"""
        images = anime.get('images', {})
        if not isinstance(images, dict):
            return None
        
        # Try to get the highest quality image
        jpg_images = images.get('jpg', {})
        if isinstance(jpg_images, dict):
            return (jpg_images.get('large_image_url') or 
                   jpg_images.get('image_url'))
        
        return None
    
    def validate_ranking_data(self, rankings_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate and clean ranking data"""
        valid_rankings = []
        
        for ranking in rankings_data:
            if not ranking.get('malId'):
                logger.warning("Skipping ranking entry without malId")
                continue
            
            # Ensure rank is within expected range (1-100 for top anime)
            rank = ranking.get('rank')
            if rank and (rank < 1 or rank > 1000):
                logger.warning(f"Unusual rank value {rank} for anime {ranking.get('malId')}")
            
            valid_rankings.append(ranking)
        
        logger.info(f"Validated {len(valid_rankings)} ranking entries")
        return valid_rankings