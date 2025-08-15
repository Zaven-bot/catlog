"""
Database Operations for ETL Pipeline
"""
import logging
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from contextlib import contextmanager
from config import config

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Handles all database operations for the ETL pipeline"""
    
    def __init__(self):
        self.connection_params = {
            'host': config.db_host,
            'port': config.db_port,
            'database': config.db_name,
            'user': config.db_user,
            'password': config.db_password
        }
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = psycopg2.connect(**self.connection_params)
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def test_connection(self) -> bool:
        """Test database connectivity"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    result = cursor.fetchone()
                    logger.info("Database connection successful")
                    return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def insert_raw_anime_data(self, anime_data: List[Dict[str, Any]], endpoint: str, etl_run_id: str) -> int:
        """Insert raw anime data from Jikan API"""
        inserted_count = 0
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                for anime in anime_data:
                    try:
                        cursor.execute("""
                            INSERT INTO "RawAnimeData" ("malId", "rawJson", "sourceApi", "endpoint", "etlRunId")
                            VALUES (%s, %s, %s, %s, %s)
                        """, (
                            anime.get('mal_id'),
                            Json(anime),
                            'jikan',
                            endpoint,
                            etl_run_id
                        ))
                        inserted_count += 1
                    except Exception as e:
                        logger.error(f"Failed to insert raw data for anime {anime.get('mal_id')}: {e}")
        
        logger.info(f"Inserted {inserted_count} raw anime records")
        return inserted_count
    
    def upsert_processed_anime(self, processed_data: List[Dict[str, Any]], etl_run_id: str) -> int:
        """Upsert processed anime data - CORRECT: Updates allowed for current state"""
        upserted_count = 0
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                for anime in processed_data:
                    try:
                        cursor.execute("""
                            INSERT INTO "ProcessedAnime" (
                                "malId", "title", "titleEnglish", "genres", "score", "scoredBy",
                                "rank", "popularity", "members", "favorites", "episodes", "status",
                                "season", "year", "rating", "studios", "imageUrl", "synopsis", "etlRunId"
                            ) VALUES (
                                %(malId)s, %(title)s, %(titleEnglish)s, %(genres)s, %(score)s, %(scoredBy)s,
                                %(rank)s, %(popularity)s, %(members)s, %(favorites)s, %(episodes)s, %(status)s,
                                %(season)s, %(year)s, %(rating)s, %(studios)s, %(imageUrl)s, %(synopsis)s, %(etlRunId)s
                            )
                            ON CONFLICT ("malId") DO UPDATE SET
                                "title" = EXCLUDED."title",
                                "titleEnglish" = EXCLUDED."titleEnglish",
                                "genres" = EXCLUDED."genres",
                                "score" = EXCLUDED."score",
                                "scoredBy" = EXCLUDED."scoredBy",
                                "rank" = EXCLUDED."rank",
                                "popularity" = EXCLUDED."popularity",
                                "members" = EXCLUDED."members",
                                "favorites" = EXCLUDED."favorites",
                                "episodes" = EXCLUDED."episodes",
                                "status" = EXCLUDED."status",
                                "season" = EXCLUDED."season",
                                "year" = EXCLUDED."year",
                                "rating" = EXCLUDED."rating",
                                "studios" = EXCLUDED."studios",
                                "imageUrl" = EXCLUDED."imageUrl",
                                "synopsis" = EXCLUDED."synopsis",
                                "processedAt" = NOW(),
                                "etlRunId" = EXCLUDED."etlRunId"
                        """, {**anime, 'etlRunId': etl_run_id})
                        upserted_count += 1
                    except Exception as e:
                        logger.error(f"Failed to upsert processed data for anime {anime.get('malId')}: {e}")
        
        logger.info(f"Upserted {upserted_count} processed anime records")
        return upserted_count
    
    def insert_daily_rankings(self, rankings_data: List[Dict[str, Any]], snapshot_date: date, etl_run_id: str) -> int:
        """Insert daily rankings snapshot - CORRECTED: No overwrites of historical data"""
        inserted_count = 0
        existing_count = 0
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # First, check if we already have data for this date
                cursor.execute("""
                    SELECT COUNT(*) FROM "DailyRankings" 
                    WHERE "snapshotDate" = %s
                """, (snapshot_date,))
                
                existing_records = cursor.fetchone()[0]
                if existing_records > 0:
                    logger.warning(f"Found {existing_records} existing records for {snapshot_date}. Historical data should not be overwritten!")
                    # Option 1: Fail the ETL run (recommended for production)
                    # raise Exception(f"Cannot overwrite historical data for {snapshot_date}")
                    
                    # Option 2: Skip insertion (for development/testing)
                    logger.warning("Skipping insertion to preserve historical data integrity")
                    return 0
                
                # Insert new historical data
                for ranking in rankings_data:
                    try:
                        cursor.execute("""
                            INSERT INTO "DailyRankings" (
                                "malId", "snapshotDate", "rank", "popularity", "score", 
                                "scoredBy", "members", "favorites", "etlRunId"
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT ("malId", "snapshotDate") DO NOTHING
                        """, (
                            ranking['malId'],
                            snapshot_date,
                            ranking.get('rank'),
                            ranking.get('popularity'),
                            ranking.get('score'),
                            ranking.get('scoredBy'),
                            ranking.get('members'),
                            ranking.get('favorites'),
                            etl_run_id
                        ))
                        
                        # Check if the row was actually inserted
                        if cursor.rowcount > 0:
                            inserted_count += 1
                        else:
                            existing_count += 1
                            
                    except Exception as e:
                        logger.error(f"Failed to insert daily ranking for anime {ranking.get('malId')}: {e}")
        
        if existing_count > 0:
            logger.warning(f"Skipped {existing_count} existing records for {snapshot_date}")
        
        logger.info(f"Inserted {inserted_count} new daily ranking records for {snapshot_date}")
        return inserted_count
    
    def log_etl_run(self, run_id: str, status: str, pipeline_step: str, 
                   rows_processed: Optional[int] = None, error_message: Optional[str] = None,
                   api_request_count: Optional[int] = None, start_time: Optional[datetime] = None,
                   end_time: Optional[datetime] = None) -> None:
        """Log ETL run information"""
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO "EtlLogs" (
                        "runId", "startTime", "endTime", "status", "pipelineStep",
                        "rowsProcessed", "errorMessage", "apiRequestCount"
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT ("runId") DO UPDATE SET
                        "endTime" = EXCLUDED."endTime",
                        "status" = EXCLUDED."status",
                        "pipelineStep" = EXCLUDED."pipelineStep",
                        "rowsProcessed" = EXCLUDED."rowsProcessed",
                        "errorMessage" = EXCLUDED."errorMessage",
                        "apiRequestCount" = EXCLUDED."apiRequestCount"
                """, (
                    run_id,
                    start_time or datetime.now(),
                    end_time,
                    status,
                    pipeline_step,
                    rows_processed,
                    error_message,
                    api_request_count
                ))
        
        logger.info(f"ETL run {run_id}: {status} - {pipeline_step}")
    
    def cleanup_old_data(self) -> None:
        """Clean up old raw data and logs based on retention policy"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Clean up old raw data
                cursor.execute("""
                    DELETE FROM "RawAnimeData" 
                    WHERE "ingestedAt" < NOW() - INTERVAL '%s days'
                """, (config.raw_data_retention_days,))
                raw_deleted = cursor.rowcount
                
                # Clean up old logs
                cursor.execute("""
                    DELETE FROM "EtlLogs" 
                    WHERE "createdAt" < NOW() - INTERVAL '%s days'
                """, (config.etl_log_retention_days,))
                logs_deleted = cursor.rowcount
                
                logger.info(f"Cleaned up {raw_deleted} old raw data records and {logs_deleted} old log records")
    
    def get_recent_etl_logs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent ETL logs"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT * FROM "EtlLogs" 
                    ORDER BY "startTime" DESC 
                    LIMIT %s
                """, (limit,))
                return [dict(row) for row in cursor.fetchall()]