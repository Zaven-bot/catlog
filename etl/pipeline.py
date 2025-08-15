#!/usr/bin/env python3
"""
Main ETL Pipeline Orchestrator with CLI Interface
"""
import logging
import click
import uuid
from datetime import datetime, date
from typing import Optional

from config import config
from database import DatabaseManager
from extractor import JikanExtractor
from transformer import RankingTransformer
from analytics import AnalyticsEngine

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(config.log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class ETLPipeline:
    """Main ETL pipeline orchestrator"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.extractor = JikanExtractor()
        self.transformer = RankingTransformer()
        self.analytics = AnalyticsEngine()
    
    def run_rankings_pipeline(self, snapshot_date: Optional[date] = None) -> bool:
        """Run the complete rankings ETL pipeline"""
        run_id = f"rankings-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:8]}"
        snapshot_date = snapshot_date or date.today()
        start_time = datetime.now()
        
        logger.info(f"Starting ETL pipeline run: {run_id}")
        
        try:
            # Log pipeline start
            self.db.log_etl_run(
                run_id=run_id,
                status="RUNNING",
                pipeline_step="EXTRACT",
                start_time=start_time
            )
            
            # Step 1: Extract
            logger.info("Step 1: Extracting data from Jikan API...")
            raw_anime_data = self.extractor.extract_top_anime_rankings()
            
            if not raw_anime_data:
                error_msg = "No data extracted from Jikan API"
                logger.error(error_msg)
                self.db.log_etl_run(
                    run_id=run_id,
                    status="FAILED",
                    pipeline_step="EXTRACT",
                    error_message=error_msg,
                    api_request_count=self.extractor.get_request_count(),
                    end_time=datetime.now()
                )
                return False
            
            # Store raw data
            raw_count = self.db.insert_raw_anime_data(
                anime_data=raw_anime_data,
                endpoint="top",
                etl_run_id=run_id
            )
            
            logger.info(f"Extracted {len(raw_anime_data)} anime records")
            
            # Step 2: Transform
            logger.info("Step 2: Transforming data...")
            self.db.log_etl_run(
                run_id=run_id,
                status="RUNNING",
                pipeline_step="TRANSFORM",
                api_request_count=self.extractor.get_request_count()
            )
            
            processed_anime, rankings_data = self.transformer.transform_ranking_data(raw_anime_data)
            rankings_data = self.transformer.validate_ranking_data(rankings_data)
            
            if not processed_anime or not rankings_data:
                error_msg = "Data transformation failed - no valid records produced"
                logger.error(error_msg)
                self.db.log_etl_run(
                    run_id=run_id,
                    status="FAILED",
                    pipeline_step="TRANSFORM",
                    error_message=error_msg,
                    end_time=datetime.now()
                )
                return False
            
            logger.info(f"Transformed {len(processed_anime)} processed records and {len(rankings_data)} ranking records")
            
            # Step 3: Load
            logger.info("Step 3: Loading data into database...")
            self.db.log_etl_run(
                run_id=run_id,
                status="RUNNING",
                pipeline_step="LOAD"
            )
            
            # Load processed anime data
            processed_count = self.db.upsert_processed_anime(
                processed_data=processed_anime,
                etl_run_id=run_id
            )
            
            # Load daily rankings (with corrected historical data protection)
            rankings_count = self.db.insert_daily_rankings(
                rankings_data=rankings_data,
                snapshot_date=snapshot_date,
                etl_run_id=run_id
            )
            
            total_rows = processed_count + rankings_count
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Log successful completion
            self.db.log_etl_run(
                run_id=run_id,
                status="SUCCESS",
                pipeline_step="COMPLETE",
                rows_processed=total_rows,
                api_request_count=self.extractor.get_request_count(),
                end_time=end_time
            )
            
            logger.info(f"ETL pipeline completed successfully in {duration:.2f} seconds")
            logger.info(f"Processed {total_rows} total records ({processed_count} anime, {rankings_count} rankings)")
            
            # Cleanup old data
            logger.info("Cleaning up old data...")
            self.db.cleanup_old_data()
            
            return True
            
        except Exception as e:
            error_msg = f"ETL pipeline failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            
            self.db.log_etl_run(
                run_id=run_id,
                status="FAILED",
                pipeline_step="EXTRACT" if 'raw_anime_data' not in locals() else "LOAD",
                error_message=error_msg,
                api_request_count=self.extractor.get_request_count(),
                end_time=datetime.now()
            )
            
            return False
    
    def test_connections(self) -> bool:
        """Test all system connections"""
        logger.info("Testing system connections...")
        
        # Test database connection
        if not self.db.test_connection():
            logger.error("Database connection test failed")
            return False
        
        # Test Jikan API connection
        try:
            self.extractor._make_request(f"{self.extractor.base_url}/anime/1")
            logger.info("Jikan API connection test successful")
        except Exception as e:
            logger.error(f"Jikan API connection test failed: {e}")
            return False
        
        logger.info("All connection tests passed")
        return True

# CLI Interface
@click.group()
def cli():
    """CatLog ETL Pipeline CLI"""
    pass

@cli.command()
@click.option('--date', type=click.DateTime(formats=['%Y-%m-%d']), help='Snapshot date (default: today)')
@click.option('--dry-run', is_flag=True, help='Test connections without running pipeline')
def run(date, dry_run):
    """Run the ETL pipeline"""
    pipeline = ETLPipeline()
    
    # Test connections first
    if not pipeline.test_connections():
        click.echo("❌ Connection tests failed. Pipeline aborted.")
        return
    
    if dry_run:
        click.echo("✅ Connection tests passed. Use --dry-run=false to run the pipeline.")
        return
    
    snapshot_date = date.date() if date else None
    click.echo(f"🚀 Starting ETL pipeline for date: {snapshot_date or 'today'}")
    
    success = pipeline.run_rankings_pipeline(snapshot_date)
    
    if success:
        click.echo("✅ ETL pipeline completed successfully!")
    else:
        click.echo("❌ ETL pipeline failed. Check logs for details.")

@cli.command()
@click.option('--type', 'metric_type', 
              type=click.Choice(['climbers', 'momentum', 'streaks', 'new', 'summary']),
              default='summary', help='Type of analytics to run')
@click.option('--days', type=int, default=7, help='Time period for analysis (7 or 30 days)')
def analytics(metric_type, days):
    """Run analytics queries"""
    engine = AnalyticsEngine()
    
    try:
        if metric_type == 'climbers':
            results = engine.get_biggest_climbers(days)
            click.echo(f"📈 Biggest Climbers ({days} days):")
        elif metric_type == 'momentum':
            results = engine.get_score_momentum(days)
            click.echo(f"⚡ Score Momentum ({days} days):")
        elif metric_type == 'streaks':
            results = engine.get_longest_top10_streaks()
            click.echo("👑 Longest Top 10 Streaks:")
        elif metric_type == 'new':
            results = engine.get_new_entries_top50()
            click.echo("🆕 New Entries to Top 50:")
        else:  # summary
            results = engine.get_trending_summary()
            click.echo("📊 Complete Trending Summary:")
        
        # Pretty print results
        import json
        click.echo(json.dumps(results, indent=2, default=str))
        
    except Exception as e:
        click.echo(f"❌ Analytics query failed: {e}")

@cli.command()
def test():
    """Test all system connections"""
    pipeline = ETLPipeline()
    
    if pipeline.test_connections():
        click.echo("✅ All connection tests passed!")
    else:
        click.echo("❌ Connection tests failed!")

@cli.command()
@click.option('--limit', type=int, default=10, help='Number of recent logs to show')
def logs(limit):
    """View recent ETL logs"""
    db = DatabaseManager()
    
    try:
        recent_logs = db.get_recent_etl_logs(limit)
        
        if not recent_logs:
            click.echo("No ETL logs found.")
            return
        
        click.echo(f"📋 Recent ETL Logs (last {len(recent_logs)}):")
        click.echo("-" * 80)
        
        for log in recent_logs:
            status_emoji = "✅" if log['status'] == 'SUCCESS' else "❌" if log['status'] == 'FAILED' else "🔄"
            click.echo(f"{status_emoji} {log['startTime']} | {log['runId'][:16]}... | {log['status']} | {log['pipelineStep']}")
            if log.get('errorMessage'):
                click.echo(f"   Error: {log['errorMessage']}")
            if log.get('rowsProcessed'):
                click.echo(f"   Rows: {log['rowsProcessed']} | API Requests: {log.get('apiRequestCount', 'N/A')}")
        
    except Exception as e:
        click.echo(f"❌ Failed to retrieve logs: {e}")

if __name__ == '__main__':
    cli()