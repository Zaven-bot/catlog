import os
from typing import Optional

class DatabricksConfig:
    """Configuration management for Databricks analytics pipeline"""
    
    def __init__(self):
        # PostgreSQL connection details
        self.postgres_host = os.getenv('POSTGRES_HOST', 'localhost')
        self.postgres_port = os.getenv('POSTGRES_PORT', '5432')
        self.postgres_db = os.getenv('POSTGRES_DB', 'catlog')
        self.postgres_user = os.getenv('POSTGRES_USER')
        self.postgres_password = os.getenv('POSTGRES_PASSWORD')
        
        # Databricks settings
        self.databricks_host = os.getenv('DATABRICKS_HOST')
        self.databricks_token = os.getenv('DATABRICKS_TOKEN')
        
        # Analytics settings
        self.rolling_window_days = int(os.getenv('ROLLING_WINDOW_DAYS', '30'))
        self.volatility_window_days = int(os.getenv('VOLATILITY_WINDOW_DAYS', '14'))
        self.confidence_level = float(os.getenv('CONFIDENCE_LEVEL', '0.95'))
        
        # Validation settings
        self.validation_tolerance = float(os.getenv('VALIDATION_TOLERANCE', '0.01'))
        self.min_data_points = int(os.getenv('MIN_DATA_POINTS', '10'))
    
    def get_postgres_jdbc_url(self) -> str:
        """Construct PostgreSQL JDBC URL for Spark"""
        return f"jdbc:postgresql://{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    def get_postgres_properties(self) -> dict:
        """Get PostgreSQL connection properties for Spark"""
        return {
            "user": self.postgres_user,
            "password": self.postgres_password,
            "driver": "org.postgresql.Driver"
        }
    
    def validate_config(self) -> bool:
        """Validate that required configuration is present"""
        required_fields = [
            self.postgres_user,
            self.postgres_password,
            self.postgres_host,
            self.postgres_db
        ]
        return all(field is not None for field in required_fields)

# Global config instance
config = DatabricksConfig()