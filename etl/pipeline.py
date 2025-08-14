#!/usr/bin/env python3
"""
Main ETL Pipeline for CatLog - Anime Data Processing
"""
import logging
import uuid
import click
from datetime import datetime
from typing import Optional, List, Dict, Any

from config import ETLConfig
from database import DatabaseManager
from extractor import JikanExtractor
from transformer import AnimeTransformer
from bigquery_manager import BigQueryManager


class CatLogETL:
    """Main ETL pipeline orchestrator"""
    
    def __init__(self):
        self.config = ETLConfig()
        self.db_manager = DatabaseManager()
        self.extractor = JikanExtractor()
        self.transformer = AnimeTransformer()
        self.bigquery_manager = BigQueryManager()
        self.logger = self._setup_logging()
        self.run_id = str(uuid.uuid4())
    
    def _setup_logging(self):
        """Configure logging for the ETL pipeline"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(f'etl_pipeline_{datetime.now().strftime("%Y%m%d")}.log')
            ]
        )
        return logging.getLogger(__name__)
    
    def run_full_pipeline(self, source: str = "top", max_pages: Optional[int] = None, 
                         year: Optional[int] = None, season: Optional[str] = None) -> Dict[str, Any]:
        """Run the complete ETL pipeline"""
        start_time = datetime.now()
        total_records = 0
        
        self.logger.info(f"Starting ETL pipeline run {self.run_id}")
        self.logger.info(f"Source: {source}, Max pages: {max_pages}")
        self.logger.info(f"Cloud sync enabled: {self.config.ENABLE_CLOUD_SYNC}")
        
        try:
            # Validate configuration
            self.config.validate()
            if self.config.ENABLE_CLOUD_SYNC:
                self.config.validate_bigquery()
            
            # Extract phase
            self.logger.info("=" * 50)
            self.logger.info("EXTRACT PHASE")
            self.logger.info("=" * 50)
            
            raw_data = self._extract_data(source, max_pages, year, season)
            if not raw_data:
                raise Exception("No data extracted from API")
            
            # Store raw data
            with self.db_manager as db:
                db.log_etl_run(self.run_id, "RUNNING", "EXTRACT", start_time)
                raw_count = db.insert_raw_anime_data(raw_data, self.run_id)
                self.logger.info(f"Stored {raw_count} raw records in database")
            
            # Transform phase
            self.logger.info("=" * 50)
            self.logger.info("TRANSFORM PHASE")
            self.logger.info("=" * 50)
            
            processed_data = self._transform_data(raw_data)
            if not processed_data:
                raise Exception("No data after transformation")
            
            # Load phase - PostgreSQL
            self.logger.info("=" * 50)
            self.logger.info("LOAD PHASE - PostgreSQL")
            self.logger.info("=" * 50)
            
            with self.db_manager as db:
                db.log_etl_run(self.run_id, "RUNNING", "LOAD", start_time)
                processed_count = db.insert_processed_anime(processed_data, self.run_id)
                total_records = processed_count
                self.logger.info(f"Loaded {processed_count} processed records to PostgreSQL")
            
            # Load phase - BigQuery (Stage 2)
            if self.config.ENABLE_CLOUD_SYNC:
                self.logger.info("=" * 50)
                self.logger.info("LOAD PHASE - BigQuery (Cloud Sync)")
                self.logger.info("=" * 50)
                
                # Load data to BigQuery
                bq_success = self.bigquery_manager.load_data(processed_data, self.run_id)
                if bq_success:
                    self.logger.info(f"Successfully synced {processed_count} records to BigQuery")
                    
                    # Create materialized view
                    view_success = self.bigquery_manager.create_materialized_view()
                    if view_success:
                        self.logger.info("Materialized view for top anime by season created/updated")
                else:
                    self.logger.warning("BigQuery sync failed, but PostgreSQL load was successful")
            
            # Mark as successful
            end_time = datetime.now()
            with self.db_manager as db:
                db.log_etl_run(
                    self.run_id, "SUCCESS", "COMPLETE", start_time, 
                    end_time, total_records
                )
            
            duration = end_time - start_time
            self.logger.info(f"ETL pipeline completed successfully in {duration}")
            self.logger.info(f"Total records processed: {total_records}")
            
            return {
                "run_id": self.run_id,
                "status": "SUCCESS",
                "records_processed": total_records,
                "duration_seconds": duration.total_seconds(),
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "cloud_sync_enabled": self.config.ENABLE_CLOUD_SYNC
            }
            
        except Exception as e:
            end_time = datetime.now()
            error_message = str(e)
            self.logger.error(f"ETL pipeline failed: {error_message}")
            
            # Log the failure
            with self.db_manager as db:
                db.log_etl_run(
                    self.run_id, "FAILED", "ERROR", start_time, 
                    end_time, total_records, error_message
                )
            
            return {
                "run_id": self.run_id,
                "status": "FAILED",
                "error": error_message,
                "records_processed": total_records,
                "duration_seconds": (end_time - start_time).total_seconds(),
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "cloud_sync_enabled": self.config.ENABLE_CLOUD_SYNC
            }
    
    def _extract_data(self, source: str, max_pages: Optional[int], 
                     year: Optional[int], season: Optional[str]) -> List[Dict[str, Any]]:
        """Extract data from Jikan API"""
        if source == "top":
            return self.extractor.extract_top_anime(max_pages)
        elif source == "seasonal":
            return self.extractor.extract_seasonal_anime(year, season)
        else:
            raise ValueError(f"Unknown source: {source}")
    
    def _transform_data(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Transform raw data into processed format"""
        processed_data = self.transformer.transform_anime_data(raw_data)
        validated_data = self.transformer.validate_processed_data(processed_data)
        return validated_data
    
    def get_etl_logs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent ETL run logs"""
        with self.db_manager as db:
            return db.get_latest_etl_runs(limit)


# CLI Interface
@click.group()
def cli():
    """CatLog ETL Pipeline - Anime Data Processing"""
    pass


@cli.command()
@click.option('--source', default='top', type=click.Choice(['top', 'seasonal']), 
              help='Data source to extract from')
@click.option('--max-pages', type=int, help='Maximum pages to fetch (default: 10)')
@click.option('--year', type=int, help='Year for seasonal data (current year if not specified)')
@click.option('--season', type=click.Choice(['spring', 'summer', 'fall', 'winter']), 
              help='Season for seasonal data (current season if not specified)')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose logging')
@click.option('--skip-cloud', is_flag=True, help='Skip cloud sync even if enabled in config')
def run(source, max_pages, year, season, verbose, skip_cloud):
    """Run the ETL pipeline"""
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Temporarily disable cloud sync if requested
    original_cloud_setting = None
    if skip_cloud:
        import os
        original_cloud_setting = os.environ.get('ENABLE_CLOUD_SYNC')
        os.environ['ENABLE_CLOUD_SYNC'] = 'false'
        click.echo("🔧 Cloud sync temporarily disabled for this run")
    
    try:
        etl = CatLogETL()
        result = etl.run_full_pipeline(source, max_pages, year, season)
        
        click.echo("\n" + "=" * 50)
        click.echo("ETL PIPELINE RESULTS")
        click.echo("=" * 50)
        click.echo(f"Run ID: {result['run_id']}")
        click.echo(f"Status: {result['status']}")
        click.echo(f"Records Processed: {result['records_processed']}")
        click.echo(f"Duration: {result['duration_seconds']:.2f} seconds")
        click.echo(f"Cloud Sync: {'✅ Enabled' if result['cloud_sync_enabled'] else '❌ Disabled'}")
        
        if result['status'] == 'FAILED':
            click.echo(f"Error: {result.get('error', 'Unknown error')}")
            exit(1)
        else:
            click.echo("✅ Pipeline completed successfully!")
    
    finally:
        # Restore original cloud sync setting
        if skip_cloud and original_cloud_setting is not None:
            import os
            os.environ['ENABLE_CLOUD_SYNC'] = original_cloud_setting


@cli.command()
@click.option('--limit', default=10, help='Number of recent logs to show')
def logs(limit):
    """Show recent ETL run logs"""
    etl = CatLogETL()
    logs_data = etl.get_etl_logs(limit)
    
    if not logs_data:
        click.echo("No ETL logs found.")
        return
    
    click.echo("\n" + "=" * 80)
    click.echo("RECENT ETL RUNS")
    click.echo("=" * 80)
    
    for log in logs_data:
        status_icon = "✅" if log['status'] == 'SUCCESS' else "❌" if log['status'] == 'FAILED' else "🔄"
        click.echo(f"{status_icon} {log['runId'][:8]}... | {log['status']} | {log['startTime']} | {log.get('rowsProcessed', 0)} rows")
        if log.get('errorMessage'):
            click.echo(f"   Error: {log['errorMessage']}")
        click.echo()


@cli.command()
def test_connection():
    """Test database and BigQuery connections"""
    try:
        etl = CatLogETL()
        etl.config.validate()
        
        # Test PostgreSQL
        with etl.db_manager as db:
            click.echo("✅ PostgreSQL connection successful!")
        
        # Test BigQuery if enabled
        if etl.config.ENABLE_CLOUD_SYNC:
            etl.config.validate_bigquery()
            if etl.bigquery_manager.test_connection():
                click.echo("✅ BigQuery connection successful!")
            else:
                click.echo("❌ BigQuery connection failed!")
                exit(1)
        else:
            click.echo("⚪ BigQuery connection skipped (cloud sync disabled)")
            
        click.echo("✅ Configuration validation passed!")
        
    except Exception as e:
        click.echo(f"❌ Connection failed: {str(e)}")
        exit(1)


@cli.command()
def setup_bigquery():
    """Setup BigQuery dataset, table, and materialized view"""
    try:
        etl = CatLogETL()
        
        if not etl.config.ENABLE_CLOUD_SYNC:
            click.echo("❌ Cloud sync is disabled. Enable it in .env to use BigQuery setup.")
            exit(1)
        
        etl.config.validate_bigquery()
        
        click.echo("🔧 Setting up BigQuery resources...")
        
        # Create dataset
        if etl.bigquery_manager.create_dataset_if_not_exists():
            click.echo("✅ Dataset created/verified")
        else:
            click.echo("❌ Failed to create dataset")
            exit(1)
        
        # Create table
        if etl.bigquery_manager.create_table_if_not_exists():
            click.echo("✅ Table created/verified")
        else:
            click.echo("❌ Failed to create table")
            exit(1)
        
        # Create materialized view
        if etl.bigquery_manager.create_materialized_view():
            click.echo("✅ Materialized view created/verified")
        else:
            click.echo("❌ Failed to create materialized view")
            exit(1)
        
        click.echo("🎉 BigQuery setup completed successfully!")
        
    except Exception as e:
        click.echo(f"❌ BigQuery setup failed: {str(e)}")
        exit(1)


if __name__ == '__main__':
    cli()