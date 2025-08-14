"""
CatLog ETL Airflow DAG - Orchestrated Anime Data Pipeline
Runs daily at midnight UTC with configurable parameters
"""
from datetime import datetime, timedelta
from typing import Dict, Any
import os

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator
from airflow.models import Variable
from airflow.utils.dates import days_ago
from airflow.utils.task_group import TaskGroup


# DAG Configuration
DAG_ID = "catlog_etl_pipeline"
SCHEDULE_INTERVAL = "0 0 * * *"  # Daily at midnight UTC
MAX_ACTIVE_RUNS = 1

# Default arguments
default_args = {
    'owner': 'catlog-data-team',
    'depends_on_past': False,
    'start_date': days_ago(1),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,
    'max_retry_delay': timedelta(minutes=30),
}

# Create DAG
dag = DAG(
    DAG_ID,
    default_args=default_args,
    description='CatLog ETL Pipeline - Extract anime data from Jikan API, transform and load to PostgreSQL and BigQuery',
    schedule_interval=SCHEDULE_INTERVAL,
    max_active_runs=MAX_ACTIVE_RUNS,
    catchup=False,
    tags=['etl', 'anime', 'data-engineering', 'catlog'],
    params={
        "source": "top",
        "max_pages": 10,
        "year": None,
        "season": None,
        "enable_cloud_sync": True,
        "genres": None
    }
)

# Task Functions
def extract_anime_data(**context) -> Dict[str, Any]:
    """Extract anime data from Jikan API"""
    import sys
    import os
    
    # Add ETL directory to Python path
    etl_path = '/opt/airflow/dags/etl'
    if (etl_path not in sys.path):
        sys.path.insert(0, etl_path)
    
    from extractor import JikanExtractor
    import uuid
    import logging
    
    # Get parameters from DAG run
    params = context['params']
    source = params.get('source', 'top')
    max_pages = params.get('max_pages', 10)
    year = params.get('year')
    season = params.get('season')
    genres = params.get('genres')
    
    run_id = str(uuid.uuid4())
    
    logging.info(f"Starting extraction with run_id: {run_id}")
    logging.info(f"Parameters: source={source}, max_pages={max_pages}, year={year}, season={season}")
    
    extractor = JikanExtractor()
    
    # Extract based on source type
    if source == "top":
        raw_data = extractor.extract_top_anime(max_pages)
    elif source == "seasonal":
        raw_data = extractor.extract_seasonal_anime(year, season)
    elif source == "genre" and genres:
        raw_data = extractor.extract_anime_by_genre(genres, max_pages // 2)
    else:
        raise ValueError(f"Invalid source configuration: {source}")
    
    if not raw_data:
        raise Exception("No data extracted from Jikan API")
    
    logging.info(f"Successfully extracted {len(raw_data)} anime records")
    
    # Store extraction results in XCom
    return {
        'run_id': run_id,
        'raw_data': raw_data,
        'record_count': len(raw_data),
        'source': source,
        'extraction_timestamp': datetime.now().isoformat()
    }


def transform_anime_data(**context) -> Dict[str, Any]:
    """Transform raw anime data into processed format"""
    import sys
    
    # Add ETL directory to Python path
    etl_path = '/opt/airflow/dags/etl'
    if (etl_path not in sys.path):
        sys.path.insert(0, etl_path)
    
    from transformer import AnimeTransformer
    import logging
    
    # Get raw data from previous task
    extraction_results = context['task_instance'].xcom_pull(task_ids='extract_anime_data')
    raw_data = extraction_results['raw_data']
    run_id = extraction_results['run_id']
    
    logging.info(f"Starting transformation for run_id: {run_id}")
    logging.info(f"Transforming {len(raw_data)} raw records")
    
    transformer = AnimeTransformer()
    
    # Transform and validate data
    processed_data = transformer.transform_anime_data(raw_data)
    validated_data = transformer.validate_processed_data(processed_data)
    
    if not validated_data:
        raise Exception("No valid data after transformation")
    
    logging.info(f"Successfully transformed {len(validated_data)} records")
    logging.info(f"Validation passed: {len(validated_data)}/{len(processed_data)} records valid")
    
    return {
        'run_id': run_id,
        'processed_data': validated_data,
        'record_count': len(validated_data),
        'validation_rate': len(validated_data) / len(processed_data) if processed_data else 0,
        'transformation_timestamp': datetime.now().isoformat()
    }


def load_to_postgresql(**context) -> Dict[str, Any]:
    """Load data to PostgreSQL database"""
    import sys
    
    # Add ETL directory to Python path
    etl_path = '/opt/airflow/dags/etl'
    if (etl_path not in sys.path):
        sys.path.insert(0, etl_path)
    
    from database import DatabaseManager
    import logging
    
    # Get data from previous tasks
    extraction_results = context['task_instance'].xcom_pull(task_ids='extract_anime_data')
    transformation_results = context['task_instance'].xcom_pull(task_ids='transform_anime_data')
    
    run_id = transformation_results['run_id']
    raw_data = extraction_results['raw_data']
    processed_data = transformation_results['processed_data']
    
    logging.info(f"Starting PostgreSQL load for run_id: {run_id}")
    
    # Load data to PostgreSQL
    with DatabaseManager() as db:
        # Log ETL run start
        start_time = datetime.now()
        db.log_etl_run(run_id, "RUNNING", "LOAD", start_time)
        
        try:
            # Insert raw data
            raw_count = db.insert_raw_anime_data(raw_data, run_id)
            logging.info(f"Inserted {raw_count} raw records")
            
            # Insert processed data
            processed_count = db.insert_processed_anime(processed_data, run_id)
            logging.info(f"Inserted {processed_count} processed records")
            
            # Log success
            end_time = datetime.now()
            db.log_etl_run(run_id, "SUCCESS", "LOAD", start_time, end_time, processed_count)
            
        except Exception as e:
            # Log failure
            end_time = datetime.now()
            db.log_etl_run(run_id, "FAILED", "LOAD", start_time, end_time, 0, str(e))
            raise
    
    return {
        'run_id': run_id,
        'postgresql_records': processed_count,
        'load_timestamp': datetime.now().isoformat()
    }


def load_to_bigquery(**context) -> Dict[str, Any]:
    """Load data to BigQuery (conditional based on configuration)"""
    import sys
    
    # Add ETL directory to Python path
    etl_path = '/opt/airflow/dags/etl'
    if (etl_path not in sys.path):
        sys.path.insert(0, etl_path)
    
    from bigquery_manager import BigQueryManager
    from config import ETLConfig
    import logging
    
    # Check if cloud sync is enabled
    params = context['params']
    enable_cloud_sync = params.get('enable_cloud_sync', False)
    
    if not enable_cloud_sync:
        logging.info("Cloud sync disabled, skipping BigQuery load")
        return {
            'run_id': context['task_instance'].xcom_pull(task_ids='extract_anime_data')['run_id'],
            'bigquery_records': 0,
            'skipped': True,
            'load_timestamp': datetime.now().isoformat()
        }
    
    # Get data from previous tasks
    transformation_results = context['task_instance'].xcom_pull(task_ids='transform_anime_data')
    run_id = transformation_results['run_id']
    processed_data = transformation_results['processed_data']
    
    logging.info(f"Starting BigQuery load for run_id: {run_id}")
    
    # Load to BigQuery
    bq_manager = BigQueryManager()
    
    # Load data
    success = bq_manager.load_data(processed_data, run_id)
    if not success:
        raise Exception("Failed to load data to BigQuery")
    
    # Create/update materialized view
    view_success = bq_manager.create_materialized_view()
    if not view_success:
        logging.warning("Failed to create/update materialized view, but data load succeeded")
    
    logging.info(f"Successfully loaded {len(processed_data)} records to BigQuery")
    
    return {
        'run_id': run_id,
        'bigquery_records': len(processed_data),
        'materialized_view_updated': view_success,
        'load_timestamp': datetime.now().isoformat()
    }


def validate_data_quality(**context) -> Dict[str, Any]:
    """Validate processed anime data using Great Expectations"""
    import sys
    
    # Add ETL directory to Python path
    etl_path = '/opt/airflow/dags/etl'
    if etl_path not in sys.path:
        sys.path.insert(0, etl_path)
    
    from data_quality import DataQualityManager
    import logging
    
    # Get data from previous task
    transformation_results = context['task_instance'].xcom_pull(task_ids='transform_anime_data')
    run_id = transformation_results['run_id']
    processed_data = transformation_results['processed_data']
    
    logging.info(f"Starting data quality validation for run_id: {run_id}")
    logging.info(f"Validating {len(processed_data)} processed records")
    
    # Initialize data quality manager
    dq_manager = DataQualityManager()
    
    # Run data quality validation
    validation_success, validation_summary = dq_manager.validate_data(processed_data)
    validation_results = dq_manager.log_validation_results(validation_summary, run_id)
    
    # Generate data docs
    dq_manager.generate_data_docs()
    
    # Check if validation should fail the pipeline
    success_percent = validation_summary['statistics']['success_percent']
    if not validation_success and success_percent < 80:
        error_msg = f"Data quality validation failed with {success_percent:.1f}% success rate"
        logging.error(error_msg)
        raise Exception(error_msg)
    elif not validation_success:
        logging.warning(f"Data quality validation passed with warnings ({success_percent:.1f}% success rate)")
    else:
        logging.info(f"✅ Data quality validation passed ({success_percent:.1f}% success rate)")
    
    return {
        'run_id': run_id,
        'validation_success': validation_success,
        'validation_summary': validation_summary,
        'validation_results': validation_results,
        'validation_timestamp': datetime.now().isoformat()
    }


def send_success_notification(**context):
    """Send success notification with pipeline summary"""
    # Get results from all tasks
    extraction_results = context['task_instance'].xcom_pull(task_ids='extract_anime_data')
    transformation_results = context['task_instance'].xcom_pull(task_ids='transform_anime_data')
    postgresql_results = context['task_instance'].xcom_pull(task_ids='load_to_postgresql')
    bigquery_results = context['task_instance'].xcom_pull(task_ids='load_to_bigquery')
    
    run_id = extraction_results['run_id']
    total_records = postgresql_results['postgresql_records']
    
    # Calculate pipeline duration
    start_time = datetime.fromisoformat(extraction_results['extraction_timestamp'])
    end_time = datetime.fromisoformat(postgresql_results['load_timestamp'])
    duration = end_time - start_time
    
    # Create summary message
    cloud_sync_status = "✅ Enabled" if not bigquery_results.get('skipped', False) else "❌ Disabled"
    
    message = f"""
🎉 *CatLog ETL Pipeline Completed Successfully*

📊 *Pipeline Summary:*
• Run ID: `{run_id[:8]}...`
• Records Processed: {total_records}
• Duration: {duration.total_seconds():.1f} seconds
• Source: {extraction_results['source']}
• Cloud Sync: {cloud_sync_status}

📈 *Task Results:*
• Extraction: {extraction_results['record_count']} records
• Transformation: {transformation_results['record_count']} valid records
• PostgreSQL: {postgresql_results['postgresql_records']} records loaded
• BigQuery: {bigquery_results['bigquery_records']} records loaded

🕐 *Completed:* {end_time.strftime('%Y-%m-%d %H:%M:%S UTC')}
    """
    
    print("Pipeline completed successfully!")
    print(message)
    
    # If Slack webhook is configured, send notification
    slack_webhook = Variable.get("slack_webhook_url", default_var=None)
    if slack_webhook:
        # This would send to Slack if configured
        print(f"Slack notification would be sent to: {slack_webhook}")


def send_failure_notification(**context):
    """Send failure notification with error details"""
    import traceback
    
    # Get task instance and exception info
    task_instance = context['task_instance']
    exception = context.get('exception')
    
    error_message = str(exception) if exception else "Unknown error"
    error_details = traceback.format_exc() if exception else "No traceback available"
    
    message = f"""
❌ *CatLog ETL Pipeline Failed*

🚨 *Error Details:*
• Task: {task_instance.task_id}
• DAG: {task_instance.dag_id}
• Run ID: {task_instance.run_id}
• Error: {error_message}

📅 *Failed At:* {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

🔍 *Traceback:*
```
{error_details}
```

Please check the Airflow logs for more details.
    """
    
    print("Pipeline failed!")
    print(message)
    
    # If Slack webhook is configured, send notification
    slack_webhook = Variable.get("slack_webhook_url", default_var=None)
    if slack_webhook:
        print(f"Slack failure notification would be sent to: {slack_webhook}")


# Define Tasks
with dag:
    
    # Data Processing Tasks
    with TaskGroup("etl_process", tooltip="Main ETL processing tasks") as etl_group:
        
        extract_task = PythonOperator(
            task_id='extract_anime_data',
            python_callable=extract_anime_data,
            doc_md="""
            **Extract Task**
            
            Extracts anime data from Jikan API based on configured parameters:
            - source: 'top', 'seasonal', or 'genre'
            - max_pages: Number of pages to fetch
            - year/season: For seasonal data
            - genres: For genre-specific data
            """,
        )
        
        transform_task = PythonOperator(
            task_id='transform_anime_data',
            python_callable=transform_anime_data,
            doc_md="""
            **Transform Task**
            
            Transforms raw anime data into processed format:
            - Cleans and validates data
            - Converts types and formats
            - Extracts structured fields
            - Filters invalid records
            """,
        )
        
        validate_data_quality_task = PythonOperator(
            task_id='validate_data_quality',
            python_callable=validate_data_quality,
            doc_md="""
            **Data Quality Validation Task**
            
            Validates processed anime data using Great Expectations:
            - Runs data quality checks
            - Logs validation results
            - Generates data docs
            - Fails pipeline if validation success rate is below threshold
            """,
        )
        
        # PostgreSQL Load
        postgresql_load_task = PythonOperator(
            task_id='load_to_postgresql',
            python_callable=load_to_postgresql,
            doc_md="""
            **PostgreSQL Load Task**
            
            Loads both raw and processed data to PostgreSQL:
            - Stores raw JSON for auditing
            - Loads processed data with upsert logic
            - Records ETL run metadata
            """,
        )
        
        # BigQuery Load (conditional)
        bigquery_load_task = PythonOperator(
            task_id='load_to_bigquery',
            python_callable=load_to_bigquery,
            doc_md="""
            **BigQuery Load Task**
            
            Conditionally loads processed data to BigQuery:
            - Creates dataset/table if needed
            - Loads data for analytics
            - Updates materialized views
            - Skipped if cloud sync disabled
            """,
        )
        
        # Set task dependencies within the group
        extract_task >> transform_task >> validate_data_quality_task >> [postgresql_load_task, bigquery_load_task]
    
    # Notification Tasks
    success_notification = PythonOperator(
        task_id='send_success_notification',
        python_callable=send_success_notification,
        trigger_rule='all_success',
        doc_md="""
        **Success Notification**
        
        Sends completion notification with pipeline summary including:
        - Records processed
        - Duration
        - Task results
        - Cloud sync status
        """,
    )
    
    failure_notification = PythonOperator(
        task_id='send_failure_notification',
        python_callable=send_failure_notification,
        trigger_rule='one_failed',
        doc_md="""
        **Failure Notification**
        
        Sends failure notification with error details:
        - Failed task information
        - Error messages
        - Traceback details
        - Timestamp
        """,
    )
    
    # Set overall DAG dependencies
    etl_group >> [success_notification, failure_notification]