"""
ETL Pipeline Configuration Management
"""
import os
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class ETLConfig(BaseSettings):
    """ETL Pipeline Configuration"""
    
    # Database Configuration
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost:5432/catlog")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("DB_NAME", "catlog")
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "")
    
    # Rate limiting
    jikan_rate_limit_delay: float = float(os.getenv("JIKAN_RATE_LIMIT_DELAY", "1.0"))
    jikan_max_retries: int = int(os.getenv("JIKAN_MAX_RETRIES", "3"))
    
    # Data collection
    rankings_max_pages: int = int(os.getenv("RANKINGS_MAX_PAGES", "4"))
    snapshot_hour: int = int(os.getenv("SNAPSHOT_HOUR", "3"))
    
    # Data retention
    raw_data_retention_days: int = int(os.getenv("RAW_DATA_RETENTION_DAYS", "90"))
    etl_log_retention_days: int = int(os.getenv("ETL_LOG_RETENTION_DAYS", "365"))
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: str = os.getenv("LOG_FILE", "etl_pipeline.log")
    
    class Config:
        env_file = ".env"

# Global config instance
config = ETLConfig()