"""
Databricks Configuration for CatLog Stage 2 Analytics
PostgreSQL JDBC connection and Spark configuration
"""

import os
import logging
from typing import Dict, Any
from pyspark.sql import SparkSession
from pyspark.sql.types import *
import psycopg2
from pathlib import Path

# Load environment variables from .env file
def load_env_file():
    """Load environment variables from .env file"""
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print(f"✅ Loaded environment from {env_path}")
    else:
        print(f"❌ .env file not found at {env_path}")

# Load environment variables at import time
load_env_file()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

class DatabaseConnection:
    """Manages connections between Databricks and PostgreSQL"""
    
    def __init__(self):
        self.config = DatabricksConfig()
        self.spark = None
        self.postgres_conn = None
        
    def get_spark_session(self) -> SparkSession:
        """Create or get existing Spark session with PostgreSQL driver"""
        if self.spark is None:
            try:
                self.spark = SparkSession.builder \
                    .appName(self.config.spark_config['app_name']) \
                    .config("spark.jars.packages", "org.postgresql:postgresql:42.6.0") \
                    .config("spark.sql.adaptive.enabled", "true") \
                    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
                    .getOrCreate()
                    
                logger.info("Spark session created successfully")
            except Exception as e:
                logger.error(f"Failed to create Spark session: {e}")
                raise
                
        return self.spark
    
    def read_daily_rankings(self, days_back: int = None):
        """Read DailyRankings data from PostgreSQL using Spark"""
        spark = self.get_spark_session()
        
        # Base query - matches your existing DailyRankings table structure
        base_query = """
        SELECT 
            id,
            "malId",
            "snapshotDate",
            rank,
            popularity,
            score,
            "scoredBy",
            members,
            favorites,
            genres,
            "etlRunId"
        FROM "DailyRankings"
        """

        # Add date filter if specified - FIX: Add quotes around snapshotDate
        if days_back:
            base_query += f"""
            WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '{days_back} days'
            """
        
        # FIX: Add quotes around snapshotDate in ORDER BY
        base_query += ' ORDER BY "snapshotDate" DESC, rank ASC'
        
        try:
            df = spark.read \
                .format("jdbc") \
                .option("url", self.config.get_connection_url()) \
                .options(**self.config.get_jdbc_properties()) \
                .option("query", base_query) \
                .load()
                
            logger.info(f"Successfully loaded {df.count()} records from DailyRankings")
            return df
            
        except Exception as e:
            logger.error(f"Failed to read DailyRankings: {e}")
            raise
    
    def write_analytics_results(self, df, table_name: str, mode: str = "overwrite", validate: bool = True):
        """Write analytics results back to PostgreSQL with validation"""
        try:
            # Validate DataFrame before writing
            if validate:
                if df.count() == 0:
                    logger.warning(f"DataFrame is empty for table {table_name}")
                    return False
                
                logger.info(f"Writing {df.count()} records to {table_name}")
                logger.info(f"DataFrame schema: {df.schema}")
            
            # Check if table exists first
            table_exists = self._check_table_exists(table_name)
            
            if table_exists and mode == "overwrite":
                logger.warning(f"Table {table_name} exists and will be overwritten")
            
            # Write with error handling
            df.write \
                .format("jdbc") \
                .option("url", self.config.get_connection_url()) \
                .options(**self.config.get_jdbc_properties()) \
                .option("dbtable", f'"{table_name}"') \
                .option("createTableOptions", "ENGINE=InnoDB") \
                .mode(mode) \
                .save()
            
            # Validate write was successful
            if validate:
                written_count = self._count_table_rows(table_name)
                expected_count = df.count()
                
                if written_count != expected_count:
                    raise Exception(f"Write validation failed: expected {expected_count}, got {written_count}")
            
            logger.info(f"✅ Successfully wrote {df.count()} records to {table_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to write to {table_name}: {e}")
            raise

    def _check_table_exists(self, table_name: str) -> bool:
        """Check if PostgreSQL table exists"""
        try:
            conn = psycopg2.connect(
                host=self.config.postgres_config['host'],
                port=self.config.postgres_config['port'],
                database=self.config.postgres_config['database'],
                user=self.config.postgres_config['user'],
                password=self.config.postgres_config['password']
            )
            cursor = conn.cursor()
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = %s
                )
            """, (table_name,))
            exists = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            return exists
        except Exception as e:
            logger.error(f"Error checking if table {table_name} exists: {e}")
            return False

    def _count_table_rows(self, table_name: str) -> int:
        """Count rows in PostgreSQL table"""
        try:
            conn = psycopg2.connect(
                host=self.config.postgres_config['host'],
                port=self.config.postgres_config['port'],
                database=self.config.postgres_config['database'],
                user=self.config.postgres_config['user'],
                password=self.config.postgres_config['password']
            )
            cursor = conn.cursor()
            cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
            count = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            return count
        except Exception as e:
            logger.error(f"Error counting rows in {table_name}: {e}")
            return 0
    
    def test_connection(self) -> bool:
        """Test both Spark and PostgreSQL connections"""
        try:
            # Test Spark session
            spark = self.get_spark_session()
            spark.sql("SELECT 1").collect()
            logger.info("✅ Spark connection successful")
            
            # Test PostgreSQL connection via psycopg2
            conn = psycopg2.connect(
                host=self.config.postgres_config['host'],
                port=self.config.postgres_config['port'],
                database=self.config.postgres_config['database'],
                user=self.config.postgres_config['user'],
                password=self.config.postgres_config['password']
            )
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM \"DailyRankings\"")
            count = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            
            logger.info(f"✅ PostgreSQL connection successful - found {count} records in DailyRankings")
            
            # Test Spark -> PostgreSQL connection
            df = self.read_daily_rankings(days_back=7)
            record_count = df.count()
            logger.info(f"✅ Spark -> PostgreSQL connection successful - read {record_count} records")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Connection test failed: {e}")
            return False
    
    def close(self):
        """Clean up connections"""
        if self.spark:
            self.spark.stop()
            logger.info("Spark session closed")

# Global instances
config = DatabricksConfig()
db_connection = DatabaseConnection()

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
    'SEVEN_DAY': 7,    # 7-day rolling window
    'FOURTEEN_DAY': 14,  # 14-day rolling window
    'THIRTY_DAY': 30     # 30-day rolling window
}

# Validation thresholds
VALIDATION_THRESHOLDS = {
    'FIVE_PERCENT_VARIANCE': 5.0,  # Max 5% variance from PostgreSQL baseline
    'HUNDRED_MINIMUM_ROW': 100,         # Minimum rows expected in results
    'TEN_RUNTIME_MINUTES': 10  # Max runtime for any single job
}

if __name__ == "__main__":
    """
    Run connection tests when this file is executed directly
    Usage: python connection.py
    """
    print("=== CatLog Stage 2 Connection Test ===\n")
    
    # Test configuration
    print("=== Configuration Test ===")
    print(f"PostgreSQL Host: {config.postgres_config['host']}")
    print(f"PostgreSQL Database: {config.postgres_config['database']}")
    print(f"PostgreSQL User: {config.postgres_config['user']}")
    print(f"JDBC URL: {config.get_connection_url()}")
    
    # Test connection
    print("\n=== Connection Test ===")
    connection_success = db_connection.test_connection()
    print(f"Overall Connection Status: {'✅ SUCCESS' if connection_success else '❌ FAILED'}")
    
    if connection_success:
        print("\n=== Sample Data Preview ===")
        
        # Read last 7 days of data
        df = db_connection.read_daily_rankings(days_back=7)
        
        print(f"Total records (last 7 days): {df.count()}")
        print("\nSample data (first 5 records):")
        df.show(5)
        
        print("\n=== Data Quality Check ===")
        
        # Check for required fields
        required_columns = ['snapshotDate', 'malId', 'rank', 'score', 'genres']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            print(f"❌ Missing required columns: {missing_columns}")
        else:
            print("✅ All required columns present")
        
        # Check data ranges
        print(f"\nRank range: {df.agg({'rank': 'min'}).collect()[0][0]} - {df.agg({'rank': 'max'}).collect()[0][0]}")
        print(f"Score range: {df.agg({'score': 'min'}).collect()[0][0]} - {df.agg({'score': 'max'}).collect()[0][0]}")
    
    print("\n=== Test Complete ===")
    print("If all tests passed, you're ready for Stage 2 analytics!" if connection_success else "Please fix connection issues before proceeding.")
