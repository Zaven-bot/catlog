# CatLog ETL Pipeline

A robust ETL (Extract, Transform, Load) pipeline for processing anime data from the Jikan API into PostgreSQL and BigQuery with comprehensive data quality validation.

## Features

- **Extract**: Pulls trending anime data from Jikan API with rate limiting
- **Transform**: Converts raw JSON data into structured, validated format
- **Load**: Stores both raw and processed data in PostgreSQL
- **Cloud Sync**: Push processed data to BigQuery data warehouse (Stage 2)
- **Data Quality & Governance**: Great Expectations validation with automated data docs (Stage 5)
- **Materialized Views**: Auto-generated BigQuery views for analytics
- **Logging**: Comprehensive ETL run tracking and error handling
- **CLI Interface**: Easy-to-use command-line tools
- **Unit Tests**: Full test coverage for all ETL functions

## Directory Structure

```
etl/
├── config.py              # Configuration management
├── database.py            # PostgreSQL database operations
├── extractor.py           # Jikan API data extraction
├── transformer.py         # Data transformation and validation
├── bigquery_manager.py    # BigQuery cloud warehouse operations
├── data_quality.py        # Great Expectations data quality validation
├── pipeline.py            # Main ETL orchestrator and CLI
├── bigquery_setup.sql     # BigQuery SQL scripts and views
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
├── gx/                    # Great Expectations configuration directory
└── tests/
    ├── test_extractor.py
    ├── test_transformer.py
    └── test_data_quality.py
```

## Database Schema

### PostgreSQL Tables

The ETL pipeline creates and uses three main tables:

#### RawAnimeData
Stores raw JSON responses from Jikan API:
- `id`: Primary key
- `malId`: MyAnimeList ID
- `rawJson`: Complete JSON response
- `sourceApi`: Always "jikan"
- `ingestedAt`: Timestamp
- `etlRunId`: Links to ETL run

#### ProcessedAnime
Stores transformed, structured data:
- `id`: Primary key
- `malId`: MyAnimeList ID (unique)
- `title`, `titleEnglish`: Anime titles
- `genres[]`: Array of genre names
- `score`, `members`, `popularity`, `rank`: Numeric metrics
- `airedFrom`, `airedTo`: Air dates
- `status`, `episodes`, `duration`, `rating`: Basic info
- `studios[]`: Array of studio names
- `year`, `season`: Temporal categorization
- `imageUrl`, `synopsis`: Media and description
- `processedAt`: Timestamp
- `etlRunId`: Links to ETL run

#### EtlLogs
Tracks all ETL pipeline runs with data quality validation results:
- `id`: Primary key
- `runId`: Unique run identifier
- `startTime`, `endTime`: Run duration
- `status`: SUCCESS, FAILED, RUNNING
- `rowsProcessed`: Number of records processed
- `errorMessage`: Error details if failed
- `pipelineStep`: EXTRACT, TRANSFORM, LOAD, COMPLETE, ERROR
- **Data Quality Fields (Stage 5)**:
  - `validationSuccess`: Boolean validation result
  - `validationRunId`: Great Expectations run ID
  - `totalExpectations`: Total validation rules checked
  - `successfulExpectations`: Passed validation rules
  - `failedExpectations`: Failed validation rules
  - `validationSuccessPercent`: Success percentage
  - `validationDetails`: JSON details of failed expectations

### BigQuery Tables (Cloud Warehouse)

#### processed_anime
Mirrors the PostgreSQL ProcessedAnime table with the same schema, optimized for analytics.

#### top_anime_by_season (Materialized View)
Pre-computed view ranking anime by season and year:
- All fields from processed_anime
- `season_rank`: Rank within each season/year combination
- Filtered for quality data (non-null scores, years, seasons)
- Ordered by score DESC, members DESC

## Setup

### 1. Install Dependencies

```bash
cd etl
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database and BigQuery credentials
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string

Optional (for BigQuery cloud sync):
- `ENABLE_CLOUD_SYNC`: Set to "true" to enable BigQuery sync
- `GCP_PROJECT_ID`: Your Google Cloud project ID
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account JSON key
- `BIGQUERY_DATASET`: Dataset name (default: "catlog_anime_data")
- `BIGQUERY_TABLE`: Table name (default: "processed_anime")

### 3. Database Migration

The ETL tables are already created via Prisma migrations:
- `20250814170714_add_etl_tables`
- `20250114000000_add_data_quality_fields`

### 4. Data Quality Setup

Set up Great Expectations data quality framework:

```bash
# Initialize data quality framework
python pipeline.py setup-data-quality

# Generate data docs (after first run)
python pipeline.py generate-data-docs
```

### 5. BigQuery Setup (Optional)

If using cloud sync, set up BigQuery resources:

```bash
# Test BigQuery connection
python pipeline.py test-connection

# Set up BigQuery dataset, table, and views
python pipeline.py setup-bigquery
```

### 6. Test Connection

```bash
python pipeline.py test-connection
```

## Usage

### Run ETL Pipeline

```bash
# Basic run (PostgreSQL only)
python pipeline.py run

# With BigQuery cloud sync (if enabled in .env)
python pipeline.py run

# Skip cloud sync for one run
python pipeline.py run --skip-cloud

# Skip data quality validation
python pipeline.py run --skip-validation

# Extract top anime with custom page limit
python pipeline.py run --max-pages 5

# Extract seasonal anime
python pipeline.py run --source seasonal

# Extract specific season
python pipeline.py run --source seasonal --year 2023 --season spring

# Verbose logging
python pipeline.py run --verbose
```

### View ETL Logs

```bash
# Show recent ETL runs
python pipeline.py logs

# Show more logs
python pipeline.py logs --limit 20

# Show validation results
python pipeline.py validation-logs
```

### Data Quality Management

```bash
# Set up data quality framework
python pipeline.py setup-data-quality

# Generate Great Expectations Data Docs
python pipeline.py generate-data-docs

# View validation results
python pipeline.py validation-logs --limit 20
```

### BigQuery Management

```bash
# Set up BigQuery resources
python pipeline.py setup-bigquery

# Test connections (PostgreSQL + BigQuery)
python pipeline.py test-connection
```

### CLI Help

```bash
python pipeline.py --help
python pipeline.py run --help
```

## Running Tests

```bash
cd etl
python -m pytest tests/ -v
```

## Data Flow

### Stage 1: Basic ETL
1. **Extract**: Fetch anime data from Jikan API endpoints
2. **Transform**: Convert raw JSON to structured format
3. **Load**: Store data in PostgreSQL

### Stage 2: Cloud Warehouse Sync
4. **Cloud Load**: Push processed data to BigQuery
5. **Views**: Create/update materialized views for analytics

### Stage 5: Data Quality & Governance
6. **Validation**: Run Great Expectations data quality checks
7. **Documentation**: Generate automated data quality reports
8. **Monitoring**: Log validation results and fail pipeline on critical issues

### Key Features:
- Rate limiting: 1 second between API requests
- Retry logic: 3 attempts with exponential backoff
- Pagination support for large datasets
- Data cleaning and validation
- Comprehensive logging and error tracking
- **Data quality validation with 15+ validation rules**
- **Automated data documentation generation**

## Data Quality Validation

### Validation Rules
The pipeline includes comprehensive data quality checks:

1. **Required Fields**: mal_id and title must exist and not be null
2. **Data Types**: Correct types for all fields
3. **Score Range**: Scores between 0-10
4. **Year Range**: Valid anime years (1900 to current year + 5)
5. **Episode Count**: Non-negative episode counts
6. **Member Count**: Non-negative member counts
7. **Status Values**: Valid anime status values
8. **Season Values**: Valid season names (spring, summer, fall, winter)
9. **Uniqueness**: mal_id must be unique
10. **Title Length**: Reasonable title lengths (1-500 characters)
11. **Row Count**: Reasonable batch sizes for processing

### Validation Thresholds
- **Pipeline Success**: 80%+ validation success rate
- **Pipeline Warning**: 80-99% validation success rate
- **Pipeline Failure**: <80% validation success rate

### Data Docs
Great Expectations automatically generates comprehensive data quality documentation:
- Validation results history
- Data profiling statistics
- Expectation suite details
- Interactive data quality reports

Access data docs after running the pipeline:
```bash
python pipeline.py generate-data-docs
```

## BigQuery Analytics

Once data is in BigQuery, you can run powerful analytics queries:

### Top Anime by Season
```sql
SELECT * FROM `your-project.catlog_anime_data.top_anime_by_season`
WHERE year = 2023 AND season = 'spring'
ORDER BY season_rank
LIMIT 10;
```

### Genre Analysis
```sql
SELECT 
    genre,
    COUNT(*) as anime_count,
    AVG(score) as avg_score
FROM `your-project.catlog_anime_data.processed_anime`,
UNNEST(genres) as genre
WHERE score IS NOT NULL
GROUP BY genre
ORDER BY anime_count DESC;
```

### Seasonal Trends
```sql
SELECT 
    year,
    season,
    COUNT(*) as anime_count,
    AVG(score) as avg_score
FROM `your-project.catlog_anime_data.processed_anime`
WHERE year >= 2020
GROUP BY year, season
ORDER BY year DESC, season;
```

## Configuration Options

Environment variables:
- `DATABASE_URL`: PostgreSQL connection (required)
- `ENABLE_CLOUD_SYNC`: Enable BigQuery sync (default: false)
- `GCP_PROJECT_ID`: Google Cloud project ID
- `GOOGLE_APPLICATION_CREDENTIALS`: Service account key path
- `BIGQUERY_DATASET`: BigQuery dataset name
- `BIGQUERY_TABLE`: BigQuery table name
- `BIGQUERY_LOCATION`: BigQuery location (default: US)

Optional ETL settings:
- `JIKAN_RATE_LIMIT_DELAY`: Seconds between API calls (default: 1.0)
- `JIKAN_MAX_RETRIES`: Max retry attempts (default: 3)
- `ETL_BATCH_SIZE`: Batch size for processing (default: 100)
- `ETL_MAX_PAGES`: Default max pages to fetch (default: 10)

## Monitoring

Each ETL run generates:
- Unique run ID for tracking
- Start/end timestamps
- Success/failure status
- Row counts processed
- Cloud sync status
- **Data quality validation results**
- **Great Expectations validation metrics**
- Detailed error messages
- Log files with timestamps

## Error Handling

The pipeline handles:
- Network timeouts and API rate limits
- Invalid data formats
- Database connection issues
- BigQuery authentication/permission errors
- **Data quality validation failures**
- **Critical vs. warning validation thresholds**
- Partial failures (continues processing)
- Cloud sync failures (doesn't affect PostgreSQL)

## Example Output

```
==================================================
ETL PIPELINE RESULTS
==================================================
Run ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Status: SUCCESS
Records Processed: 250
Duration: 45.67 seconds
Cloud Sync: ✅ Enabled
Data Quality Validation: ✅ Enabled
✅ Pipeline completed successfully!
```

### Data Quality Validation Output
```
==================================================
DATA QUALITY VALIDATION PHASE
==================================================
✅ Data quality validation passed (95.2% success rate)
📊 15 expectations evaluated, 14 successful, 1 failed
🔍 Failed expectations: expect_column_values_to_be_unique (1 duplicate mal_id)
📈 Data Docs generated successfully!
```

## Google Cloud Setup

### Prerequisites
1. Google Cloud Project with BigQuery API enabled
2. Service account with BigQuery permissions:
   - BigQuery Data Editor
   - BigQuery Job User
   - BigQuery User

### Service Account Setup
```bash
# Create service account
gcloud iam service-accounts create catlog-etl \
    --description="CatLog ETL Pipeline" \
    --display-name="CatLog ETL"

# Grant BigQuery permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:catlog-etl@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:catlog-etl@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/bigquery.jobUser"

# Create and download key
gcloud iam service-accounts keys create catlog-etl-key.json \
    --iam-account=catlog-etl@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Scheduling

For production use, schedule the ETL pipeline with cron:

```bash
# Run daily at midnight with cloud sync and data quality validation
0 0 * * * cd /path/to/catlog/etl && python pipeline.py run

# Run every 6 hours, skip cloud sync
0 */6 * * * cd /path/to/catlog/etl && python pipeline.py run --skip-cloud

# Run with validation disabled for testing
0 */6 * * * cd /path/to/catlog/etl && python pipeline.py run --skip-validation
```