"""
Data Quality & Governance module for CatLog ETL Pipeline using Great Expectations
"""
import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import pandas as pd
import great_expectations as gx
from great_expectations.core.batch import RuntimeBatchRequest
from great_expectations.core.yaml_handler import YAMLHandler
from great_expectations.exceptions import DataContextError

from config import ETLConfig


class DataQualityManager:
    """Handles data quality validation using Great Expectations"""
    
    def __init__(self, project_root_dir: Optional[str] = None):
        self.config = ETLConfig()
        self.logger = logging.getLogger(__name__)
        
        # Set up Great Expectations context
        self.project_root_dir = project_root_dir or os.path.dirname(os.path.abspath(__file__))
        self.gx_project_dir = os.path.join(self.project_root_dir, "gx")
        
        self.context = self._setup_gx_context()
        self.yaml_handler = YAMLHandler()
        
    def _setup_gx_context(self) -> gx.DataContext:
        """Initialize or get existing Great Expectations context"""
        try:
            # Try to get existing context
            context = gx.get_context(context_root_dir=self.gx_project_dir)
            self.logger.info("Using existing Great Expectations context")
            return context
        except (DataContextError, FileNotFoundError):
            # Create new context if it doesn't exist
            self.logger.info("Creating new Great Expectations context")
            os.makedirs(self.gx_project_dir, exist_ok=True)
            context = gx.get_context(mode="file", context_root_dir=self.gx_project_dir)
            self._setup_initial_configuration()
            return context
    
    def _setup_initial_configuration(self):
        """Set up initial Great Expectations configuration"""
        try:
            # Create datasource for processed anime data
            datasource_config = {
                "name": "catlog_processed_anime",
                "class_name": "Datasource",
                "execution_engine": {
                    "class_name": "PandasExecutionEngine",
                },
                "data_connectors": {
                    "runtime_data_connector": {
                        "class_name": "RuntimeDataConnector",
                        "batch_identifiers": ["batch_id"]
                    }
                }
            }
            
            # Use the newer API to add datasource
            try:
                self.context.add_datasource(**datasource_config)
                self.logger.info("Created datasource for processed anime data")
            except Exception as e:
                self.logger.warning(f"Datasource may already exist or failed to create: {str(e)}")
            
        except Exception as e:
            self.logger.warning(f"Failed to set up initial configuration: {str(e)}")
    
    def create_expectation_suite(self, suite_name: str = "processed_anime_suite") -> bool:
        """Create expectation suite for processed anime data validation"""
        try:
            # Create or get existing suite using newer API
            try:
                suite = self.context.get_expectation_suite(suite_name)
                self.logger.info(f"Using existing expectation suite: {suite_name}")
            except:
                # Use the newer add_or_update_expectation_suite method
                suite = self.context.add_or_update_expectation_suite(expectation_suite_name=suite_name)
                self.logger.info(f"Created new expectation suite: {suite_name}")
            
            # Clear existing expectations to ensure fresh setup
            suite.expectations = []
            
            # Add data quality expectations
            expectations = self._get_anime_data_expectations()
            
            for expectation_config in expectations:
                # Create expectation objects from configurations
                from great_expectations.core.expectation_configuration import ExpectationConfiguration
                expectation = ExpectationConfiguration(**expectation_config)
                suite.add_expectation(expectation)
            
            # Save the suite
            self.context.add_or_update_expectation_suite(expectation_suite=suite)
            self.logger.info(f"Saved {len(expectations)} expectations to suite {suite_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create expectation suite: {str(e)}")
            return False
    
    def _get_anime_data_expectations(self) -> List[Dict[str, Any]]:
        """Define data quality expectations for processed anime data"""
        return [
            # Required field validations
            {
                "expectation_type": "expect_column_to_exist",
                "kwargs": {"column": "mal_id"}
            },
            {
                "expectation_type": "expect_column_to_exist", 
                "kwargs": {"column": "title"}
            },
            {
                "expectation_type": "expect_column_values_to_not_be_null",
                "kwargs": {"column": "mal_id"}
            },
            {
                "expectation_type": "expect_column_values_to_not_be_null",
                "kwargs": {"column": "title"}
            },
            
            # Score validation (0-10 range)
            {
                "expectation_type": "expect_column_values_to_be_between",
                "kwargs": {
                    "column": "score",
                    "min_value": 0.0,
                    "max_value": 10.0,
                    "mostly": 0.95  # Allow 5% of values to be null
                }
            },
            
            # Year validation (reasonable anime years)
            {
                "expectation_type": "expect_column_values_to_be_between",
                "kwargs": {
                    "column": "year", 
                    "min_value": 1900,
                    "max_value": datetime.now().year + 5,
                    "mostly": 0.9  # Allow some nulls/missing years
                }
            },
            
            # Episodes validation (non-negative)
            {
                "expectation_type": "expect_column_values_to_be_between",
                "kwargs": {
                    "column": "episodes",
                    "min_value": 0,
                    "max_value": 10000,  # Reasonable upper bound
                    "mostly": 0.9
                }
            },
            
            # Members validation (positive numbers)
            {
                "expectation_type": "expect_column_values_to_be_between",
                "kwargs": {
                    "column": "members",
                    "min_value": 0,
                    "mostly": 0.9
                }
            },
            
            # Status validation (known anime statuses)
            {
                "expectation_type": "expect_column_values_to_be_in_set",
                "kwargs": {
                    "column": "status",
                    "value_set": [
                        "Finished Airing", "Currently Airing", "Not yet aired",
                        "Cancelled", "Hiatus", "Unknown"
                    ],
                    "mostly": 0.95
                }
            },
            
            # Season validation
            {
                "expectation_type": "expect_column_values_to_be_in_set",
                "kwargs": {
                    "column": "season",
                    "value_set": ["spring", "summer", "fall", "winter"],
                    "mostly": 0.8  # Allow nulls for older anime
                }
            },
            
            # Uniqueness validation
            {
                "expectation_type": "expect_column_values_to_be_unique",
                "kwargs": {"column": "mal_id"}
            },
            
            # Title length validation
            {
                "expectation_type": "expect_column_value_lengths_to_be_between",
                "kwargs": {
                    "column": "title",
                    "min_value": 1,
                    "max_value": 500,
                    "mostly": 0.99
                }
            },
            
            # Row count validation
            {
                "expectation_type": "expect_table_row_count_to_be_between",
                "kwargs": {
                    "min_value": 1,
                    "max_value": 100000  # Reasonable upper bound for batch processing
                }
            }
        ]
    
    def validate_data(self, processed_data: List[Dict[str, Any]], 
                     suite_name: str = "processed_anime_suite") -> Tuple[bool, Dict[str, Any]]:
        """Validate processed anime data using Great Expectations"""
        try:
            # Convert to DataFrame for GX validation
            df = pd.DataFrame(processed_data)
            
            # Use a simplified approach with pandas datasource
            datasource_name = "catlog_pandas_datasource"
            
            # Try to get existing datasource or create new one
            try:
                datasource = self.context.get_datasource(datasource_name)
                self.logger.info(f"Using existing datasource: {datasource_name}")
            except:
                datasource = self.context.sources.add_pandas(datasource_name)
                self.logger.info(f"Created new datasource: {datasource_name}")
            
            # Add data asset with unique name
            asset_name = f"processed_anime_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            data_asset = datasource.add_dataframe_asset(name=asset_name)
            
            # Create batch request
            batch_request = data_asset.build_batch_request(dataframe=df)
            
            # Create validator
            validator = self.context.get_validator(
                batch_request=batch_request,
                expectation_suite_name=suite_name
            )
            
            # Run validation
            results = validator.validate()
            
            # Process results
            validation_summary = self._process_validation_results(results)
            
            self.logger.info(f"Data validation completed. Success: {validation_summary['success']}")
            self.logger.info(f"Validation summary: {validation_summary['statistics']}")
            
            return validation_summary['success'], validation_summary
            
        except Exception as e:
            self.logger.error(f"Data validation failed: {str(e)}")
            return False, {
                'success': False,
                'error': str(e),
                'statistics': {'total_expectations': 0, 'successful_expectations': 0, 'failed_expectations': 0, 'success_percent': 0}
            }
    
    def _process_validation_results(self, results) -> Dict[str, Any]:
        """Process Great Expectations validation results"""
        success = results['success']
        statistics = results['statistics']
        
        # Handle different meta structures in newer GX versions
        meta = results.get('meta', {})
        run_id = meta.get('run_id', 'unknown')
        validation_time = meta.get('validation_time', datetime.now().isoformat())
        
        # Extract batch info safely
        batch_info = meta.get('batch_spec', meta.get('batch_kwargs', {}))
        batch_id = batch_info.get('batch_id', 'batch_' + datetime.now().strftime('%Y%m%d_%H%M%S'))
        
        validation_summary = {
            'success': success,
            'run_id': run_id,
            'batch_id': batch_id,
            'validation_time': validation_time,
            'statistics': {
                'total_expectations': statistics['evaluated_expectations'],
                'successful_expectations': statistics['successful_expectations'], 
                'failed_expectations': statistics['unsuccessful_expectations'],
                'success_percent': statistics['success_percent']
            },
            'failed_expectations': []
        }
        
        # Collect details of failed expectations
        for result in results['results']:
            if not result['success']:
                validation_summary['failed_expectations'].append({
                    'expectation_type': result['expectation_config']['expectation_type'],
                    'column': result['expectation_config']['kwargs'].get('column'),
                    'details': result['result']
                })
        
        return validation_summary
    
    def generate_data_docs(self) -> bool:
        """Generate and serve Great Expectations Data Docs"""
        try:
            # Build data docs using newer API
            self.context.build_data_docs()
            
            # Get data docs sites - handle different return types
            try:
                data_docs_sites = self.context.get_docs_sites_urls()
                if isinstance(data_docs_sites, list):
                    # Handle list format
                    self.logger.info("Generated Great Expectations Data Docs")
                    for i, url in enumerate(data_docs_sites):
                        self.logger.info(f"Data Docs site {i}: {url}")
                elif isinstance(data_docs_sites, dict):
                    # Handle dict format
                    self.logger.info("Generated Great Expectations Data Docs")
                    for site_name, url in data_docs_sites.items():
                        self.logger.info(f"Data Docs site '{site_name}': {url}")
                else:
                    self.logger.info("Generated Great Expectations Data Docs (format unknown)")
            except Exception as url_error:
                self.logger.warning(f"Data docs generated but couldn't retrieve URLs: {str(url_error)}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to generate data docs: {str(e)}")
            return False
    
    def log_validation_results(self, validation_summary: Dict[str, Any], 
                             etl_run_id: str) -> Dict[str, Any]:
        """Format validation results for ETL logging"""
        # Convert any complex objects to strings for database storage
        validation_run_id = validation_summary.get('run_id')
        if hasattr(validation_run_id, '__str__'):
            validation_run_id = str(validation_run_id)
        
        return {
            'etl_run_id': etl_run_id,
            'validation_success': validation_summary['success'],
            'validation_run_id': validation_run_id,
            'total_expectations': validation_summary['statistics']['total_expectations'],
            'successful_expectations': validation_summary['statistics']['successful_expectations'],
            'failed_expectations': validation_summary['statistics']['failed_expectations'],
            'success_percent': validation_summary['statistics']['success_percent'],
            'failed_expectation_details': validation_summary.get('failed_expectations', []),
            'validation_timestamp': datetime.now().isoformat()
        }
    
    def setup_data_quality_framework(self) -> bool:
        """Set up the complete data quality framework"""
        try:
            self.logger.info("Setting up Great Expectations data quality framework...")
            
            # Create expectation suite
            if not self.create_expectation_suite():
                return False
            
            # Generate initial data docs (this may fail if no validation has been run yet)
            try:
                self.generate_data_docs()
                self.logger.info("✅ Initial data docs generated")
            except:
                self.logger.info("📊 Data docs will be generated after first validation run")
            
            self.logger.info("✅ Data quality framework setup completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to set up data quality framework: {str(e)}")
            return False