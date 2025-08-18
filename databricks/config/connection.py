"""
Databricks Configuration for CatLog Stage 2 Analytics
PostgreSQL JDBC connection and Spark configuration
"""

import os
from typing import Dict, Any

class DatabricksConfig:
    """Configuration for Databricks Spark jobs"""
    
    def __init__(self):
        self.postgres_config = self._get_postgres_config()
        self.spark_config = self._get_spark_config()
    
    def _get_postgres_config(self) -> Dict[str, str]:
        """PostgreSQL connection configuration"""
        return {
            'host': os.getenv('POSTGRES_HOST', 'localhost'),
            'port': os.getenv('POSTGRES_PORT', '5432'),
            'database': os.getenv('POSTGRES_DB', 'catlog'),
            'user': os.getenv('POSTGRES_USER', 'postgres'),
            'password': os.getenv('POSTGRES_PASSWORD', ''),
            'driver': 'org.postgresql.Driver',
            'url': f"jdbc:postgresql://{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'catlog')}"
        }
    
    def _get_spark_config(self) -> Dict[str, Any]:
        """Spark session configuration"""
        return {
            'app_name': 'CatLog_Stage2_Analytics',
            'executor_memory': '2g',
            'driver_memory': '1g',
            'executor_cores': 2,
            'max_result_size': '1g',
            'sql_adaptive_enabled': True,
            'sql_adaptive_coalescePartitions_enabled': True
        }
    
    def get_jdbc_properties(self) -> Dict[str, str]:
        """JDBC connection properties for Spark DataFrame reader"""
        return {
            'user': self.postgres_config['user'],
            'password': self.postgres_config['password'],
            'driver': self.postgres_config['driver'],
            'fetchsize': '1000',
            'batchsize': '1000'
        }
    
    def get_connection_url(self) -> str:
        """Get JDBC connection URL"""
        return self.postgres_config['url']

# Global configuration instance
config = DatabricksConfig()

# Table names for Stage 2 analytics
ANALYTICS_TABLES = {
    'source_table': 'DailyRankings',
    'rolling_momentum': 'RollingMomentumAnalysis', 
    'volatility': 'VolatilityRankings',
    'genre_percentiles': 'GenrePercentiles',
    'trend_significance': 'TrendSignificance',
    'trend_correlation': 'TrendCorrelation'
}

# Time windows for rolling analytics
TIME_WINDOWS = {
    'short_term': 7,    # 7-day rolling window
    'medium_term': 14,  # 14-day rolling window
    'long_term': 30     # 30-day rolling window
}

# Validation thresholds
VALIDATION_THRESHOLDS = {
    'max_variance_percent': 5.0,  # Max 5% variance from PostgreSQL baseline
    'min_row_count': 100,         # Minimum rows expected in results
    'max_job_runtime_minutes': 10  # Max runtime for any single job
}
