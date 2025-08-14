# CatLog ETL Pipeline

A robust ETL (Extract, Transform, Load) pipeline for processing anime data from the Jikan API into PostgreSQL.

## Features

- **Extract**: Pulls trending anime data from Jikan API with rate limiting
- **Transform**: Converts raw JSON data into structured, validated format
- **Load**: Stores both raw and processed data in PostgreSQL
- **Logging**: Comprehensive ETL run tracking and error handling
- **CLI Interface**: Easy-to-use command-line tools
- **Unit Tests**: Full test coverage for all ETL functions

## Directory Structure

```
etl/
├── config.py          # Configuration management
├── database.py        # Database operations
├── extractor.py       # Jikan API data extraction
├── transformer.py     # Data transformation and validation
├── pipeline.py        # Main ETL orchestrator and CLI
├── requirements.txt   # Python dependencies
├── .env.example       # Environment variables template
└── tests/
    ├── test_extractor.py
    └── test_transformer.py
```

## Database Schema

The ETL pipeline creates and uses three new tables:

### RawAnimeData
Stores raw JSON responses from Jikan API:
- `id`: Primary key
- `malId`: MyAnimeList ID
- `rawJson`: Complete JSON response
- `sourceApi`: Always "jikan"
- `ingestedAt`: Timestamp
- `etlRunId`: Links to ETL run

### ProcessedAnime
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

### EtlLogs
Tracks all ETL pipeline runs:
- `id`: Primary key
- `runId`: Unique run identifier
- `startTime`, `endTime`: Run duration
- `status`: SUCCESS, FAILED, RUNNING
- `rowsProcessed`: Number of records processed
- `errorMessage`: Error details if failed
- `pipelineStep`: EXTRACT, TRANSFORM, LOAD, COMPLETE, ERROR

## Setup

### 1. Install Dependencies

```bash
cd etl
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string

### 3. Run Database Migration

The ETL tables are already created via Prisma migration `20250814170714_add_etl_tables`.

### 4. Test Connection

```bash
python pipeline.py test-connection
```

## Usage

### Run ETL Pipeline

```bash
# Extract top anime (default: 10 pages)
python pipeline.py run

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

1. **Extract**: Fetch anime data from Jikan API endpoints
   - Rate limiting: 1 second between requests
   - Retry logic: 3 attempts with exponential backoff
   - Pagination support for large datasets

2. **Transform**: Convert raw JSON to structured format
   - Data cleaning and validation
   - Type conversion and null handling
   - Date parsing and season calculation
   - Array field extraction (genres, studios)

3. **Load**: Store data in PostgreSQL
   - Raw data preserved for auditing
   - Processed data with upsert logic
   - Comprehensive logging and error tracking

## Configuration Options

Environment variables (optional):
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
- Detailed error messages
- Log files with timestamps

## Error Handling

The pipeline handles:
- Network timeouts and API rate limits
- Invalid data formats
- Database connection issues
- Partial failures (continues processing)
- Comprehensive logging for debugging

## Example Output

```
==================================================
ETL PIPELINE RESULTS
==================================================
Run ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Status: SUCCESS
Records Processed: 250
Duration: 45.67 seconds
✅ Pipeline completed successfully!
```

## Scheduling

For production use, schedule the ETL pipeline with cron:

```bash
# Run daily at midnight
0 0 * * * cd /path/to/catlog/etl && python pipeline.py run
```