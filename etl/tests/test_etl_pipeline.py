"""
Basic tests for ETL Pipeline components
"""
import pytest
from unittest.mock import Mock, patch
from datetime import date, datetime
import json

# Import our ETL modules
from database import DatabaseManager
from extractor import JikanExtractor
from transformer import RankingTransformer
from analytics import AnalyticsEngine

class TestJikanExtractor:
    """Test the Jikan API data extractor"""
    
    def test_rate_limiting(self):
        """Test that rate limiting is enforced"""
        extractor = JikanExtractor()
        
        # Mock time to test rate limiting
        with patch('time.time', side_effect=[0, 0.5, 1.5]):
            with patch('time.sleep') as mock_sleep:
                extractor._rate_limit_delay()
                mock_sleep.assert_called_once()
    
    @patch('requests.Session.get')
    def test_successful_api_request(self, mock_get):
        """Test successful API request handling"""
        extractor = JikanExtractor()
        
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': [{'mal_id': 1, 'title': 'Test Anime'}]}
        mock_get.return_value = mock_response
        
        result = extractor._make_request('https://test.com')
        assert result == {'data': [{'mal_id': 1, 'title': 'Test Anime'}]}
        assert extractor.request_count == 1

class TestRankingTransformer:
    """Test the data transformer"""
    
    def test_transform_anime_data(self):
        """Test anime data transformation"""
        transformer = RankingTransformer()
        
        # Sample raw anime data
        raw_data = [{
            'mal_id': 123,
            'title': 'Test Anime',
            'score': 8.5,
            'rank': 1,
            'members': 100000,
            'genres': [{'name': 'Action'}, {'name': 'Drama'}],
            'studios': [{'name': 'Studio Test'}]
        }]
        
        processed, rankings = transformer.transform_ranking_data(raw_data)
        
        assert len(processed) == 1
        assert len(rankings) == 1
        assert processed[0]['malId'] == 123
        assert processed[0]['title'] == 'Test Anime'
        assert processed[0]['genres'] == ['Action', 'Drama']
        assert rankings[0]['malId'] == 123
        assert rankings[0]['rank'] == 1
    
    def test_safe_data_extraction(self):
        """Test safe extraction of data fields"""
        transformer = RankingTransformer()
        
        # Test with missing/invalid data
        test_data = {'invalid_score': 'not_a_number', 'valid_int': '123'}
        
        assert transformer._safe_get_decimal(test_data, 'invalid_score') is None
        assert transformer._safe_get_int(test_data, 'valid_int') == 123
        assert transformer._safe_get_string(test_data, 'missing_field') is None

class TestAnalyticsEngine:
    """Test the analytics engine"""
    
    @patch.object(DatabaseManager, 'get_connection')
    def test_insufficient_data_handling(self, mock_connection):
        """Test handling of insufficient historical data"""
        # Mock database to return no data
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = [None]
        mock_connection.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        analytics = AnalyticsEngine()
        result = analytics.get_biggest_climbers(days=7)
        
        assert isinstance(result, list)
        if result:  # If data returned, should be insufficient data message
            assert 'message' in result[0]

def test_configuration_loading():
    """Test that configuration loads properly"""
    from config import config
    
    assert hasattr(config, 'jikan_rate_limit_delay')
    assert hasattr(config, 'rankings_max_pages')
    assert config.rankings_max_pages == 4  # Default value

if __name__ == '__main__':
    pytest.main([__file__])