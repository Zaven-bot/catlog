"""
Unit tests for the data quality module
"""
import pytest
import pandas as pd
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import sys
import os

# Add the etl directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_quality import DataQualityManager


class TestDataQualityManager:
    """Test cases for DataQualityManager class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.data_quality_manager = DataQualityManager()
        
        # Sample processed anime data for testing
        self.sample_processed_data = [
            {
                'mal_id': 1,
                'title': 'Test Anime 1',
                'score': 8.5,
                'year': 2023,
                'episodes': 24,
                'members': 50000,
                'status': 'Finished Airing',
                'season': 'spring',
                'genres': ['Action', 'Drama'],
                'studios': ['Studio A']
            },
            {
                'mal_id': 2,
                'title': 'Test Anime 2',
                'score': 7.2,
                'year': 2022,
                'episodes': 12,
                'members': 25000,
                'status': 'Currently Airing',
                'season': 'fall',
                'genres': ['Comedy'],
                'studios': ['Studio B']
            }
        ]
        
        # Invalid data for testing validation
        self.invalid_processed_data = [
            {
                'mal_id': 3,
                'title': 'Invalid Anime',
                'score': 15.0,  # Invalid score > 10
                'year': 1800,   # Invalid year < 1900
                'episodes': -5,  # Invalid negative episodes
                'members': -100, # Invalid negative members
                'status': 'Invalid Status',
                'season': 'invalid_season',
                'genres': [],
                'studios': []
            }
        ]
    
    @patch('great_expectations.get_context')
    def test_setup_gx_context_existing(self, mock_get_context):
        """Test setting up existing Great Expectations context"""
        mock_context = Mock()
        mock_get_context.return_value = mock_context
        
        manager = DataQualityManager()
        
        assert manager.context == mock_context
        mock_get_context.assert_called()
    
    @patch('great_expectations.get_context')
    def test_setup_gx_context_new(self, mock_get_context):
        """Test creating new Great Expectations context"""
        # First call raises DataContextError, second call succeeds
        from great_expectations.exceptions import DataContextError
        mock_context = Mock()
        mock_get_context.side_effect = [DataContextError("Not found"), mock_context]
        
        manager = DataQualityManager()
        
        assert manager.context == mock_context
        assert mock_get_context.call_count == 2
    
    def test_get_anime_data_expectations(self):
        """Test getting anime data expectations"""
        expectations = self.data_quality_manager._get_anime_data_expectations()
        
        assert len(expectations) > 0
        assert isinstance(expectations, list)
        
        # Check for required expectations
        expectation_types = [exp['expectation_type'] for exp in expectations]
        
        assert 'expect_column_to_exist' in expectation_types
        assert 'expect_column_values_to_not_be_null' in expectation_types
        assert 'expect_column_values_to_be_between' in expectation_types
        assert 'expect_column_values_to_be_unique' in expectation_types
        assert 'expect_column_values_to_be_in_set' in expectation_types
    
    @patch.object(DataQualityManager, '_setup_gx_context')
    def test_create_expectation_suite_success(self, mock_setup_context):
        """Test successful creation of expectation suite"""
        # Mock the context and suite
        mock_context = Mock()
        mock_suite = Mock()
        mock_suite.expectations = []
        
        mock_context.get_expectation_suite.side_effect = Exception("Not found")
        mock_context.create_expectation_suite.return_value = mock_suite
        mock_context.save_expectation_suite.return_value = True
        
        manager = DataQualityManager()
        manager.context = mock_context
        
        result = manager.create_expectation_suite("test_suite")
        
        assert result is True
        mock_context.create_expectation_suite.assert_called_with("test_suite")
        mock_context.save_expectation_suite.assert_called_with(mock_suite)
    
    @patch.object(DataQualityManager, '_setup_gx_context')
    def test_validate_data_success(self, mock_setup_context):
        """Test successful data validation"""
        # Mock the context and validator
        mock_context = Mock()
        mock_validator = Mock()
        
        # Mock validation results
        mock_results = {
            'success': True,
            'statistics': {
                'evaluated_expectations': 10,
                'successful_expectations': 10,
                'unsuccessful_expectations': 0,
                'success_percent': 100.0
            },
            'meta': {
                'run_id': 'test_run_id',
                'batch_kwargs': {'batch_id': 'test_batch'},
                'validation_time': datetime.now().isoformat()
            },
            'results': []
        }
        
        mock_validator.validate.return_value = mock_results
        mock_context.get_validator.return_value = mock_validator
        
        manager = DataQualityManager()
        manager.context = mock_context
        
        success, summary = manager.validate_data(self.sample_processed_data)
        
        assert success is True
        assert summary['success'] is True
        assert summary['statistics']['success_percent'] == 100.0
        mock_context.get_validator.assert_called_once()
        mock_validator.validate.assert_called_once()
    
    @patch.object(DataQualityManager, '_setup_gx_context')
    def test_validate_data_failure(self, mock_setup_context):
        """Test data validation with failures"""
        # Mock the context and validator
        mock_context = Mock()
        mock_validator = Mock()
        
        # Mock validation results with failures
        mock_results = {
            'success': False,
            'statistics': {
                'evaluated_expectations': 10,
                'successful_expectations': 7,
                'unsuccessful_expectations': 3,
                'success_percent': 70.0
            },
            'meta': {
                'run_id': 'test_run_id',
                'batch_kwargs': {'batch_id': 'test_batch'},
                'validation_time': datetime.now().isoformat()
            },
            'results': [
                {
                    'success': False,
                    'expectation_config': {
                        'expectation_type': 'expect_column_values_to_be_between',
                        'kwargs': {'column': 'score', 'min_value': 0, 'max_value': 10}
                    },
                    'result': {'unexpected_count': 1}
                }
            ]
        }
        
        mock_validator.validate.return_value = mock_results
        mock_context.get_validator.return_value = mock_validator
        
        manager = DataQualityManager()
        manager.context = mock_context
        
        success, summary = manager.validate_data(self.invalid_processed_data)
        
        assert success is False
        assert summary['success'] is False
        assert summary['statistics']['success_percent'] == 70.0
        assert len(summary['failed_expectations']) == 1
    
    @patch.object(DataQualityManager, '_setup_gx_context')
    def test_validate_data_exception(self, mock_setup_context):
        """Test data validation with exception"""
        manager = DataQualityManager()
        manager.context = Mock()
        manager.context.get_validator.side_effect = Exception("Validation error")
        
        success, summary = manager.validate_data(self.sample_processed_data)
        
        assert success is False
        assert 'error' in summary
        assert summary['statistics']['total_expectations'] == 0
    
    def test_log_validation_results(self):
        """Test logging validation results"""
        validation_summary = {
            'success': True,
            'run_id': 'validation_run_123',
            'statistics': {
                'total_expectations': 10,
                'successful_expectations': 9,
                'failed_expectations': 1,
                'success_percent': 90.0
            },
            'failed_expectations': []
        }
        
        result = self.data_quality_manager.log_validation_results(validation_summary, 'etl_run_456')
        
        assert result['etl_run_id'] == 'etl_run_456'
        assert result['validation_success'] is True
        assert result['validation_run_id'] == 'validation_run_123'
        assert result['total_expectations'] == 10
        assert result['successful_expectations'] == 9
        assert result['failed_expectations'] == 1
        assert result['success_percent'] == 90.0
        assert 'validation_timestamp' in result
    
    @patch.object(DataQualityManager, '_setup_gx_context')
    def test_generate_data_docs_success(self, mock_setup_context):
        """Test successful data docs generation"""
        mock_context = Mock()
        mock_context.build_data_docs.return_value = True
        mock_context.get_docs_sites_urls.return_value = {
            'local_site': 'file:///path/to/docs/index.html'
        }
        
        manager = DataQualityManager()
        manager.context = mock_context
        
        result = manager.generate_data_docs()
        
        assert result is True
        mock_context.build_data_docs.assert_called_once()
        mock_context.get_docs_sites_urls.assert_called_once()
    
    @patch.object(DataQualityManager, '_setup_gx_context')
    def test_generate_data_docs_failure(self, mock_setup_context):
        """Test data docs generation failure"""
        mock_context = Mock()
        mock_context.build_data_docs.side_effect = Exception("Build failed")
        
        manager = DataQualityManager()
        manager.context = mock_context
        
        result = manager.generate_data_docs()
        
        assert result is False
    
    @patch.object(DataQualityManager, 'create_expectation_suite')
    @patch.object(DataQualityManager, 'generate_data_docs')
    @patch.object(DataQualityManager, '_setup_gx_context')
    def test_setup_data_quality_framework_success(self, mock_setup_context, 
                                                  mock_generate_docs, mock_create_suite):
        """Test successful data quality framework setup"""
        mock_create_suite.return_value = True
        mock_generate_docs.return_value = True
        
        manager = DataQualityManager()
        
        result = manager.setup_data_quality_framework()
        
        assert result is True
        mock_create_suite.assert_called_once()
        mock_generate_docs.assert_called_once()
    
    @patch.object(DataQualityManager, 'create_expectation_suite')
    @patch.object(DataQualityManager, '_setup_gx_context')
    def test_setup_data_quality_framework_suite_failure(self, mock_setup_context, mock_create_suite):
        """Test data quality framework setup with suite creation failure"""
        mock_create_suite.return_value = False
        
        manager = DataQualityManager()
        
        result = manager.setup_data_quality_framework()
        
        assert result is False
        mock_create_suite.assert_called_once()
    
    def test_process_validation_results(self):
        """Test processing of validation results"""
        mock_results = {
            'success': False,
            'statistics': {
                'evaluated_expectations': 5,
                'successful_expectations': 3,
                'unsuccessful_expectations': 2,
                'success_percent': 60.0
            },
            'meta': {
                'run_id': 'test_run_123',
                'batch_kwargs': {'batch_id': 'batch_456'},
                'validation_time': '2023-08-14T12:00:00'
            },
            'results': [
                {
                    'success': True,
                    'expectation_config': {
                        'expectation_type': 'expect_column_to_exist',
                        'kwargs': {'column': 'mal_id'}
                    }
                },
                {
                    'success': False,
                    'expectation_config': {
                        'expectation_type': 'expect_column_values_to_be_between',
                        'kwargs': {'column': 'score'}
                    },
                    'result': {'unexpected_count': 2}
                }
            ]
        }
        
        summary = self.data_quality_manager._process_validation_results(mock_results)
        
        assert summary['success'] is False
        assert summary['run_id'] == 'test_run_123'
        assert summary['batch_id'] == 'batch_456'
        assert summary['statistics']['total_expectations'] == 5
        assert summary['statistics']['successful_expectations'] == 3
        assert summary['statistics']['failed_expectations'] == 2
        assert summary['statistics']['success_percent'] == 60.0
        assert len(summary['failed_expectations']) == 1
        assert summary['failed_expectations'][0]['expectation_type'] == 'expect_column_values_to_be_between'