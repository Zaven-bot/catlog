"""
Database connection and operations module for CatLog ETL Pipeline
"""
import psycopg2
import psycopg2.extras
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from config import ETLConfig


class DatabaseManager:
    """Handles database connections and operations for ETL pipeline"""
    
    def __init__(self):
        self.config = ETLConfig()
        self.connection = None
    
    def connect(self):
        """Establish database connection"""
        try:
            if self.config.DATABASE_URL:
                self.connection = psycopg2.connect(self.config.DATABASE_URL)
            else:
                self.connection = psycopg2.connect(
                    host=self.config.DB_HOST,
                    port=self.config.DB_PORT,
                    database=self.config.DB_NAME,
                    user=self.config.DB_USER,
                    password=self.config.DB_PASSWORD
                )
            self.connection.autocommit = True
        except Exception as e:
            raise Exception(f"Failed to connect to database: {str(e)}")
    
    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
    
    def insert_raw_anime_data(self, anime_data: List[Dict[str, Any]], etl_run_id: str) -> int:
        """Insert raw anime data into RawAnimeData table"""
        cursor = self.connection.cursor()
        inserted_count = 0
        
        try:
            for anime in anime_data:
                cursor.execute("""
                    INSERT INTO "RawAnimeData" ("malId", "rawJson", "sourceApi", "etlRunId")
                    VALUES (%s, %s, %s, %s)
                """, (
                    anime.get('mal_id'),
                    json.dumps(anime),
                    'jikan',
                    etl_run_id
                ))
                inserted_count += 1
            
            return inserted_count
        except Exception as e:
            self.connection.rollback()
            raise Exception(f"Failed to insert raw anime data: {str(e)}")
        finally:
            cursor.close()
    
    def insert_processed_anime(self, processed_data: List[Dict[str, Any]], etl_run_id: str) -> int:
        """Insert processed anime data into ProcessedAnime table"""
        cursor = self.connection.cursor()
        inserted_count = 0
        
        try:
            for anime in processed_data:
                cursor.execute("""
                    INSERT INTO "ProcessedAnime" (
                        "malId", title, "titleEnglish", genres, score, members, 
                        popularity, rank, "airedFrom", "airedTo", status, episodes,
                        duration, rating, studios, year, season, "imageUrl", synopsis, "etlRunId"
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT ("malId") DO UPDATE SET
                        title = EXCLUDED.title,
                        "titleEnglish" = EXCLUDED."titleEnglish",
                        genres = EXCLUDED.genres,
                        score = EXCLUDED.score,
                        members = EXCLUDED.members,
                        popularity = EXCLUDED.popularity,
                        rank = EXCLUDED.rank,
                        "airedFrom" = EXCLUDED."airedFrom",
                        "airedTo" = EXCLUDED."airedTo",
                        status = EXCLUDED.status,
                        episodes = EXCLUDED.episodes,
                        duration = EXCLUDED.duration,
                        rating = EXCLUDED.rating,
                        studios = EXCLUDED.studios,
                        year = EXCLUDED.year,
                        season = EXCLUDED.season,
                        "imageUrl" = EXCLUDED."imageUrl",
                        synopsis = EXCLUDED.synopsis,
                        "processedAt" = NOW(),
                        "etlRunId" = EXCLUDED."etlRunId"
                """, (
                    anime['mal_id'],
                    anime['title'],
                    anime.get('title_english'),
                    anime.get('genres', []),
                    anime.get('score'),
                    anime.get('members'),
                    anime.get('popularity'),
                    anime.get('rank'),
                    anime.get('aired_from'),
                    anime.get('aired_to'),
                    anime.get('status'),
                    anime.get('episodes'),
                    anime.get('duration'),
                    anime.get('rating'),
                    anime.get('studios', []),
                    anime.get('year'),
                    anime.get('season'),
                    anime.get('image_url'),
                    anime.get('synopsis'),
                    etl_run_id
                ))
                inserted_count += 1
            
            return inserted_count
        except Exception as e:
            self.connection.rollback()
            raise Exception(f"Failed to insert processed anime data: {str(e)}")
        finally:
            cursor.close()
    
    def log_etl_run(self, run_id: str, status: str, pipeline_step: str, 
                   start_time: datetime, end_time: Optional[datetime] = None, 
                   rows_processed: Optional[int] = None, error_message: Optional[str] = None,
                   validation_results: Optional[Dict[str, Any]] = None):
        """Log ETL run information with optional data quality validation results"""
        cursor = self.connection.cursor()
        
        try:
            if validation_results:
                cursor.execute("""
                    INSERT INTO "EtlLogs" (
                        "runId", status, "pipelineStep", "startTime", "endTime", "rowsProcessed", "errorMessage",
                        "validationSuccess", "validationRunId", "totalExpectations", "successfulExpectations",
                        "failedExpectations", "validationSuccessPercent", "validationDetails"
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT ("runId") DO UPDATE SET
                        status = EXCLUDED.status,
                        "endTime" = EXCLUDED."endTime",
                        "rowsProcessed" = EXCLUDED."rowsProcessed",
                        "errorMessage" = EXCLUDED."errorMessage",
                        "validationSuccess" = EXCLUDED."validationSuccess",
                        "validationRunId" = EXCLUDED."validationRunId",
                        "totalExpectations" = EXCLUDED."totalExpectations",
                        "successfulExpectations" = EXCLUDED."successfulExpectations",
                        "failedExpectations" = EXCLUDED."failedExpectations",
                        "validationSuccessPercent" = EXCLUDED."validationSuccessPercent",
                        "validationDetails" = EXCLUDED."validationDetails"
                """, (
                    run_id, status, pipeline_step, start_time, end_time, rows_processed, error_message,
                    validation_results.get('validation_success'),
                    validation_results.get('validation_run_id'),
                    validation_results.get('total_expectations'),
                    validation_results.get('successful_expectations'),
                    validation_results.get('failed_expectations'),
                    validation_results.get('success_percent'),
                    json.dumps(validation_results.get('failed_expectation_details', []))
                ))
            else:
                cursor.execute("""
                    INSERT INTO "EtlLogs" ("runId", status, "pipelineStep", "startTime", "endTime", "rowsProcessed", "errorMessage")
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT ("runId") DO UPDATE SET
                        status = EXCLUDED.status,
                        "endTime" = EXCLUDED."endTime",
                        "rowsProcessed" = EXCLUDED."rowsProcessed",
                        "errorMessage" = EXCLUDED."errorMessage"
                """, (run_id, status, pipeline_step, start_time, end_time, rows_processed, error_message))
        except Exception as e:
            raise Exception(f"Failed to log ETL run: {str(e)}")
        finally:
            cursor.close()

    def update_validation_results(self, run_id: str, validation_results: Dict[str, Any]):
        """Update existing ETL run log with validation results"""
        cursor = self.connection.cursor()
        
        try:
            cursor.execute("""
                UPDATE "EtlLogs" SET
                    "validationSuccess" = %s,
                    "validationRunId" = %s,
                    "totalExpectations" = %s,
                    "successfulExpectations" = %s,
                    "failedExpectations" = %s,
                    "validationSuccessPercent" = %s,
                    "validationDetails" = %s
                WHERE "runId" = %s
            """, (
                validation_results.get('validation_success'),
                validation_results.get('validation_run_id'),
                validation_results.get('total_expectations'),
                validation_results.get('successful_expectations'),
                validation_results.get('failed_expectations'),
                validation_results.get('success_percent'),
                json.dumps(validation_results.get('failed_expectation_details', [])),
                run_id
            ))
        except Exception as e:
            raise Exception(f"Failed to update validation results: {str(e)}")
        finally:
            cursor.close()
    
    def get_latest_etl_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get latest ETL run logs"""
        cursor = self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT * FROM "EtlLogs" 
                ORDER BY "startTime" DESC 
                LIMIT %s
            """, (limit,))
            
            return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            raise Exception(f"Failed to fetch ETL logs: {str(e)}")
        finally:
            cursor.close()