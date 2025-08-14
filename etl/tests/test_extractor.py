"""
Unit tests for the ETL extractor module
"""
import pytest
from unittest.mock import Mock, patch
import requests
import sys
import os

# Add the etl directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extractor import JikanExtractor


class TestJikanExtractor:
    """Test cases for JikanExtractor class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.extractor = JikanExtractor()
        
        # Mock response data
        self.mock_anime_response = {
            "data": [
                {
                    "mal_id": 1,
                    "title": "Cowboy Bebop",
                    "score": 8.78,
                    "episodes": 26
                },
                {
                    "mal_id": 2,
                    "title": "Attack on Titan",
                    "score": 9.0,
                    "episodes": 25
                }
            ],
            "pagination": {
                "current_page": 1,
                "has_next_page": True,
                "last_visible_page": 5
            }
        }
    
    @patch('extractor.time.sleep')  # Mock sleep to speed up tests
    @patch('requests.Session.get')
    def test_make_request_success(self, mock_get, mock_sleep):
        """Test successful API request"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_anime_response
        mock_get.return_value = mock_response
        
        result = self.extractor._make_request("top/anime")
        
        assert result == self.mock_anime_response
        mock_get.assert_called_once()
    
    @patch('extractor.time.sleep')
    @patch('requests.Session.get')
    def test_make_request_rate_limited_then_success(self, mock_get, mock_sleep):
        """Test handling of rate limiting"""
        # First call returns 429 (rate limited), second call succeeds
        rate_limited_response = Mock()
        rate_limited_response.status_code = 429
        
        success_response = Mock()
        success_response.status_code = 200
        success_response.json.return_value = self.mock_anime_response
        
        mock_get.side_effect = [rate_limited_response, success_response]
        
        result = self.extractor._make_request("top/anime")
        
        assert result == self.mock_anime_response
        assert mock_get.call_count == 2
    
    @patch('extractor.time.sleep')
    @patch('requests.Session.get')
    def test_make_request_max_retries_exceeded(self, mock_get, mock_sleep):
        """Test failure after max retries"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("Server Error")
        mock_get.return_value = mock_response
        
        with pytest.raises(requests.exceptions.HTTPError):
            self.extractor._make_request("top/anime")
        
        assert mock_get.call_count == 3  # Should retry 3 times
    
    @patch.object(JikanExtractor, '_make_request')
    def test_extract_top_anime_single_page(self, mock_request):
        """Test extracting top anime from single page"""
        mock_request.return_value = self.mock_anime_response
        
        result = self.extractor.extract_top_anime(max_pages=1)
        
        assert len(result) == 2
        assert result[0]['mal_id'] == 1
        assert result[1]['mal_id'] == 2
        mock_request.assert_called_once()
    
    @patch.object(JikanExtractor, '_make_request')
    def test_extract_top_anime_multiple_pages(self, mock_request):
        """Test extracting top anime from multiple pages"""
        # First page response
        first_page = self.mock_anime_response.copy()
        
        # Second page response with no next page
        second_page = {
            "data": [
                {
                    "mal_id": 3,
                    "title": "Death Note",
                    "score": 9.0,
                    "episodes": 37
                }
            ],
            "pagination": {
                "current_page": 2,
                "has_next_page": False,
                "last_visible_page": 2
            }
        }
        
        mock_request.side_effect = [first_page, second_page]
        
        result = self.extractor.extract_top_anime(max_pages=2)
        
        assert len(result) == 3  # 2 from first page + 1 from second page
        assert result[2]['mal_id'] == 3
        assert mock_request.call_count == 2
    
    @patch.object(JikanExtractor, '_make_request')
    def test_extract_seasonal_anime(self, mock_request):
        """Test extracting seasonal anime"""
        mock_request.return_value = self.mock_anime_response
        
        result = self.extractor.extract_seasonal_anime(2023, "spring")
        
        assert len(result) == 2
        mock_request.assert_called_once_with("seasons/2023/spring")
    
    def test_get_current_season(self):
        """Test current season determination"""
        # Test different months
        with patch('extractor.datetime') as mock_datetime:
            # Spring (April)
            mock_datetime.now.return_value.month = 4
            assert self.extractor._get_current_season() == "spring"
            
            # Summer (July)
            mock_datetime.now.return_value.month = 7
            assert self.extractor._get_current_season() == "summer"
            
            # Fall (October)
            mock_datetime.now.return_value.month = 10
            assert self.extractor._get_current_season() == "fall"
            
            # Winter (January)
            mock_datetime.now.return_value.month = 1
            assert self.extractor._get_current_season() == "winter"
    
    @patch.object(JikanExtractor, '_make_request')
    def test_extract_anime_by_genre(self, mock_request):
        """Test extracting anime by genre"""
        mock_request.return_value = self.mock_anime_response
        
        result = self.extractor.extract_anime_by_genre(1, max_pages=1)  # Genre ID 1 (Action)
        
        assert len(result) == 2
        mock_request.assert_called_once_with("anime", {"genres": 1, "page": 1, "limit": 25})
    
    @patch.object(JikanExtractor, '_make_request')
    def test_extract_top_anime_empty_response(self, mock_request):
        """Test handling of empty response"""
        empty_response = {
            "data": [],
            "pagination": {
                "current_page": 1,
                "has_next_page": False,
                "last_visible_page": 1
            }
        }
        mock_request.return_value = empty_response
        
        result = self.extractor.extract_top_anime(max_pages=1)
        
        assert len(result) == 0