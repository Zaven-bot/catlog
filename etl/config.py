"""
Configuration module for CatLog ETL Pipeline
"""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class ETLConfig:
    """Configuration class for ETL pipeline"""
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "catlog")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    
    # Jikan API Configuration
    JIKAN_BASE_URL: str = "https://api.jikan.moe/v4"
    JIKAN_RATE_LIMIT_DELAY: float = 1.0  # seconds between requests
    JIKAN_MAX_RETRIES: int = 3
    JIKAN_TIMEOUT: int = 30
    
    # ETL Configuration
    BATCH_SIZE: int = 100
    MAX_PAGES: int = 10  # Max pages to fetch from Jikan API
    
    @classmethod
    def validate(cls) -> bool:
        """Validate that required configuration is present"""
        required_vars = ["DATABASE_URL"]
        missing = [var for var in required_vars if not getattr(cls, var)]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {missing}")
        
        return True