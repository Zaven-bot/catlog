"""
BigQuery manager module for CatLog ETL Pipeline - Cloud Warehouse Sync
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from google.cloud import bigquery
from google.cloud.exceptions import NotFound
from google.auth import exceptions as auth_exceptions

from config import ETLConfig


class BigQueryManager:
    """Handles BigQuery operations for cloud warehouse sync"""
    
    def __init__(self):
        self.config = ETLConfig()
        self.client = None
        self.logger = logging.getLogger(__name__)
        
        if self.config.ENABLE_CLOUD_SYNC:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize BigQuery client with authentication"""
        try:
            self.config.validate_bigquery()
            self.client = bigquery.Client(
                project=self.config.GCP_PROJECT_ID
            )
            self.logger.info(f"BigQuery client initialized for project: {self.config.GCP_PROJECT_ID}")
        except auth_exceptions.DefaultCredentialsError as e:
            raise Exception(f"BigQuery authentication failed. Check GOOGLE_APPLICATION_CREDENTIALS: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to initialize BigQuery client: {str(e)}")
    
    def create_dataset_if_not_exists(self) -> bool:
        """Create BigQuery dataset if it doesn't exist"""
        if not self.client:
            return False
            
        dataset_id = f"{self.config.GCP_PROJECT_ID}.{self.config.BIGQUERY_DATASET}"
        
        try:
            dataset = self.client.get_dataset(dataset_id)
            self.logger.info(f"Dataset {dataset_id} already exists")
            return True
        except NotFound:
            # Dataset doesn't exist, create it
            dataset = bigquery.Dataset(dataset_id)
            dataset.location = self.config.BIGQUERY_LOCATION
            dataset.description = "CatLog anime data warehouse - processed anime information"
            
            dataset = self.client.create_dataset(dataset, timeout=30)
            self.logger.info(f"Created dataset {dataset_id}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to create dataset {dataset_id}: {str(e)}")
            return False
    
    def create_table_if_not_exists(self) -> bool:
        """Create BigQuery table if it doesn't exist"""
        if not self.client:
            return False
            
        table_id = f"{self.config.GCP_PROJECT_ID}.{self.config.BIGQUERY_DATASET}.{self.config.BIGQUERY_TABLE}"
        
        try:
            table = self.client.get_table(table_id)
            self.logger.info(f"Table {table_id} already exists")
            return True
        except NotFound:
            # Table doesn't exist, create it
            schema = self._get_table_schema()
            table = bigquery.Table(table_id, schema=schema)
            table.description = "Processed anime data from Jikan API"
            
            table = self.client.create_table(table)
            self.logger.info(f"Created table {table_id}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to create table {table_id}: {str(e)}")
            return False
    
    def _get_table_schema(self) -> List[bigquery.SchemaField]:
        """Define BigQuery table schema matching ProcessedAnime"""
        return [
            bigquery.SchemaField("mal_id", "INTEGER", mode="REQUIRED"),
            bigquery.SchemaField("title", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("title_english", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("genres", "STRING", mode="REPEATED"),
            bigquery.SchemaField("score", "FLOAT", mode="NULLABLE"),
            bigquery.SchemaField("members", "INTEGER", mode="NULLABLE"),
            bigquery.SchemaField("popularity", "INTEGER", mode="NULLABLE"),
            bigquery.SchemaField("rank", "INTEGER", mode="NULLABLE"),
            bigquery.SchemaField("aired_from", "TIMESTAMP", mode="NULLABLE"),
            bigquery.SchemaField("aired_to", "TIMESTAMP", mode="NULLABLE"),
            bigquery.SchemaField("status", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("episodes", "INTEGER", mode="NULLABLE"),
            bigquery.SchemaField("duration", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("rating", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("studios", "STRING", mode="REPEATED"),
            bigquery.SchemaField("year", "INTEGER", mode="NULLABLE"),
            bigquery.SchemaField("season", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("image_url", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("synopsis", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("processed_at", "TIMESTAMP", mode="REQUIRED"),
            bigquery.SchemaField("etl_run_id", "STRING", mode="REQUIRED")
        ]
    
    def load_data(self, processed_data: List[Dict[str, Any]], etl_run_id: str) -> bool:
        """Load processed data into BigQuery"""
        if not self.client or not self.config.ENABLE_CLOUD_SYNC:
            self.logger.info("Cloud sync disabled, skipping BigQuery load")
            return True
        
        if not processed_data:
            self.logger.warning("No data to load to BigQuery")
            return True
        
        try:
            # Ensure dataset and table exist
            if not self.create_dataset_if_not_exists():
                return False
            if not self.create_table_if_not_exists():
                return False
            
            # Prepare data for BigQuery
            bq_data = self._prepare_data_for_bigquery(processed_data, etl_run_id)
            
            table_id = f"{self.config.GCP_PROJECT_ID}.{self.config.BIGQUERY_DATASET}.{self.config.BIGQUERY_TABLE}"
            table = self.client.get_table(table_id)
            
            # Configure load job
            job_config = bigquery.LoadJobConfig(
                write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
                source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
                autodetect=False,
                schema=self._get_table_schema()
            )
            
            # Load data
            job = self.client.load_table_from_json(
                bq_data, table, job_config=job_config
            )
            
            # Wait for job completion
            job.result(timeout=300)  # 5 minute timeout
            
            self.logger.info(f"Successfully loaded {len(bq_data)} rows to BigQuery table {table_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to load data to BigQuery: {str(e)}")
            return False
    
    def _prepare_data_for_bigquery(self, processed_data: List[Dict[str, Any]], etl_run_id: str) -> List[Dict[str, Any]]:
        """Prepare processed data for BigQuery format"""
        bq_data = []
        
        for anime in processed_data:
            # Convert datetime objects to ISO format strings
            bq_record = {
                "mal_id": anime["mal_id"],
                "title": anime["title"],
                "title_english": anime.get("title_english"),
                "genres": anime.get("genres", []),
                "score": anime.get("score"),
                "members": anime.get("members"),
                "popularity": anime.get("popularity"),
                "rank": anime.get("rank"),
                "aired_from": anime.get("aired_from").isoformat() if anime.get("aired_from") else None,
                "aired_to": anime.get("aired_to").isoformat() if anime.get("aired_to") else None,
                "status": anime.get("status"),
                "episodes": anime.get("episodes"),
                "duration": anime.get("duration"),
                "rating": anime.get("rating"),
                "studios": anime.get("studios", []),
                "year": anime.get("year"),
                "season": anime.get("season"),
                "image_url": anime.get("image_url"),
                "synopsis": anime.get("synopsis"),
                "processed_at": datetime.now().isoformat(),
                "etl_run_id": etl_run_id
            }
            bq_data.append(bq_record)
        
        return bq_data
    
    def create_materialized_view(self) -> bool:
        """Create materialized view for top anime by season"""
        if not self.client or not self.config.ENABLE_CLOUD_SYNC:
            self.logger.info("Cloud sync disabled, skipping materialized view creation")
            return True
        
        view_id = f"{self.config.GCP_PROJECT_ID}.{self.config.BIGQUERY_DATASET}.top_anime_by_season"
        
        # SQL for materialized view
        view_sql = f"""
        SELECT 
            year,
            season,
            mal_id,
            title,
            title_english,
            score,
            members,
            popularity,
            rank,
            genres,
            studios,
            status,
            episodes,
            ROW_NUMBER() OVER (
                PARTITION BY year, season 
                ORDER BY score DESC, members DESC
            ) as season_rank
        FROM `{self.config.GCP_PROJECT_ID}.{self.config.BIGQUERY_DATASET}.{self.config.BIGQUERY_TABLE}`
        WHERE 
            year IS NOT NULL 
            AND season IS NOT NULL 
            AND score IS NOT NULL
            AND score > 0
        """
        
        try:
            # Check if view already exists
            try:
                view = self.client.get_table(view_id)
                self.logger.info(f"Materialized view {view_id} already exists")
                return True
            except NotFound:
                pass
            
            # Create the view
            view = bigquery.Table(view_id)
            view.view_query = view_sql
            view.description = "Top anime ranked by season and year, ordered by score and member count"
            
            view = self.client.create_table(view)
            self.logger.info(f"Created materialized view {view_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create materialized view {view_id}: {str(e)}")
            return False
    
    def test_connection(self) -> bool:
        """Test BigQuery connection and permissions"""
        if not self.client:
            return False
            
        try:
            # Test basic connectivity by listing datasets
            datasets = list(self.client.list_datasets(max_results=1))
            self.logger.info("BigQuery connection test successful")
            return True
        except Exception as e:
            self.logger.error(f"BigQuery connection test failed: {str(e)}")
            return False