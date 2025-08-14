"""
Unit tests for the ETL transformer module
"""
import pytest
from datetime import datetime
import sys
import os

# Add the etl directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from transformer import AnimeTransformer


class TestAnimeTransformer:
    """Test cases for AnimeTransformer class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.transformer = AnimeTransformer()
        
        # Sample raw anime data from Jikan API
        self.sample_raw_anime = {
            "mal_id": 1,
            "title": "Cowboy Bebop",
            "title_english": "Cowboy Bebop",
            "synopsis": "In the year 2071, humanity has colonized several planets...",
            "score": 8.78,
            "members": 1234567,
            "popularity": 43,
            "rank": 28,
            "episodes": 26,
            "status": "Finished Airing",
            "rating": "R - 17+ (violence & profanity)",
            "duration": "24 min per ep",
            "year": 1998,
            "genres": [
                {"name": "Action"},
                {"name": "Drama"},
                {"name": "Space"}
            ],
            "studios": [
                {"name": "Sunrise"}
            ],
            "images": {
                "jpg": {
                    "image_url": "https://cdn.myanimelist.net/images/anime/4/19644.jpg",
                    "large_image_url": "https://cdn.myanimelist.net/images/anime/4/19644l.jpg"
                }
            },
            "aired": {
                "from": "1998-04-03T00:00:00+00:00",
                "to": "1999-04-24T00:00:00+00:00"
            }
        }
    
    def test_transform_single_anime_success(self):
        """Test successful transformation of a single anime"""
        result = self.transformer._transform_single_anime(self.sample_raw_anime)
        
        assert result is not None
        assert result['mal_id'] == 1
        assert result['title'] == "Cowboy Bebop"
        assert result['title_english'] == "Cowboy Bebop"
        assert result['score'] == 8.78
        assert result['members'] == 1234567
        assert result['popularity'] == 43
        assert result['rank'] == 28
        assert result['episodes'] == 26
        assert result['status'] == "Finished Airing"
        assert result['genres'] == ["Action", "Drama", "Space"]
        assert result['studios'] == ["Sunrise"]
        assert result['year'] == 1998
        assert result['season'] == "spring"
        assert result['image_url'] == "https://cdn.myanimelist.net/images/anime/4/19644l.jpg"
        assert isinstance(result['aired_from'], datetime)
        assert isinstance(result['aired_to'], datetime)
    
    def test_transform_anime_without_mal_id(self):
        """Test transformation fails when mal_id is missing"""
        anime_without_id = self.sample_raw_anime.copy()
        del anime_without_id['mal_id']
        
        result = self.transformer._transform_single_anime(anime_without_id)
        assert result is None
    
    def test_transform_anime_without_title(self):
        """Test transformation fails when title is missing"""
        anime_without_title = self.sample_raw_anime.copy()
        del anime_without_title['title']
        
        result = self.transformer._transform_single_anime(anime_without_title)
        assert result is None
    
    def test_transform_anime_with_null_values(self):
        """Test transformation handles null values gracefully"""
        anime_with_nulls = {
            "mal_id": 2,
            "title": "Test Anime",
            "score": None,
            "episodes": None,
            "year": None,
            "genres": [],
            "studios": []
        }
        
        result = self.transformer._transform_single_anime(anime_with_nulls)
        
        assert result is not None
        assert result['score'] is None
        assert result['episodes'] is None
        assert result['year'] is None
        assert result['genres'] == []
        assert result['studios'] == []
    
    def test_get_season_from_date(self):
        """Test season determination from date"""
        spring_date = datetime(2023, 4, 15)
        summer_date = datetime(2023, 7, 15)
        fall_date = datetime(2023, 10, 15)
        winter_date = datetime(2023, 1, 15)
        
        assert self.transformer._get_season_from_date(spring_date) == "spring"
        assert self.transformer._get_season_from_date(summer_date) == "summer"
        assert self.transformer._get_season_from_date(fall_date) == "fall"
        assert self.transformer._get_season_from_date(winter_date) == "winter"
    
    def test_safe_int_conversion(self):
        """Test safe integer conversion"""
        assert self.transformer._safe_int("123") == 123
        assert self.transformer._safe_int(123) == 123
        assert self.transformer._safe_int("invalid") is None
        assert self.transformer._safe_int(None) is None
        assert self.transformer._safe_int(123.45) == 123
    
    def test_safe_float_conversion(self):
        """Test safe float conversion"""
        assert self.transformer._safe_float("123.45") == 123.45
        assert self.transformer._safe_float(123.45) == 123.45
        assert self.transformer._safe_float("invalid") is None
        assert self.transformer._safe_float(None) is None
        assert self.transformer._safe_float(123) == 123.0
    
    def test_validate_processed_data(self):
        """Test data validation"""
        valid_anime = {
            'mal_id': 1,
            'title': 'Test Anime',
            'score': 8.5,
            'year': 2023,
            'episodes': 12
        }
        
        invalid_anime = {
            'mal_id': 2,
            'title': 'Invalid Anime',
            'score': 15.0,  # Invalid score > 10
            'year': 1800,   # Invalid year < 1900
            'episodes': -5  # Invalid negative episodes
        }
        
        data = [valid_anime, invalid_anime]
        validated = self.transformer.validate_processed_data(data)
        
        assert len(validated) == 1
        assert validated[0]['mal_id'] == 1
    
    def test_transform_anime_data_list(self):
        """Test transformation of multiple anime"""
        raw_data = [self.sample_raw_anime, self.sample_raw_anime.copy()]
        raw_data[1]['mal_id'] = 2
        raw_data[1]['title'] = "Second Anime"
        
        result = self.transformer.transform_anime_data(raw_data)
        
        assert len(result) == 2
        assert result[0]['mal_id'] == 1
        assert result[1]['mal_id'] == 2
        assert result[1]['title'] == "Second Anime"