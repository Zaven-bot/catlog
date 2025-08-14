# CatLog Airflow Orchestration

Apache Airflow orchestration for the CatLog ETL pipeline, providing scheduled execution, monitoring, and failure handling.

## Features

- **Scheduled Execution**: Daily runs at midnight UTC with configurable parameters
- **Task Dependencies**: Proper ETL task ordering with parallel PostgreSQL/BigQuery loads
- **Error Handling**: Automatic retries with exponential backoff
- **Monitoring**: Web UI with task status, logs, and execution history
- **Notifications**: Success/failure notifications with pipeline summaries
- **Parameterized Runs**: Support for different data sources and configurations
- **Docker Deployment**: Complete containerized setup with all dependencies

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Jikan API     │    │   PostgreSQL    │    │    BigQuery     │
│   (Source)      │    │   (Local DB)    │    │ (Cloud Warehouse)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Airflow Orchestration                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Extract   │──│ Transform   │──│    Load (Parallel)      │ │
│  │             │  │             │  │  ┌─────────┬─────────┐  │ │
│  │ • Top Anime │  │ • Validate  │  │  │ PostgreSQL│BigQuery │  │ │
│  │ • Seasonal  │  │ • Clean     │  │  │   Load    │  Load   │  │ │
│  │ • By Genre  │  │ • Transform │  │  └─────────┴─────────┘  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │   Notifications     │
                    │ • Success Summary   │
                    │ • Failure Alerts    │
                    │ • Slack Integration │
                    └─────────────────────┘
```

## Directory Structure

```
airflow/
├── airflow.sh              # Management script
├── docker-compose.yml      # Airflow services configuration
├── Dockerfile             # Custom Airflow image
├── requirements.txt       # Python dependencies
├── .env                   # Environment configuration
├── dags/
│   └── catlog_etl_dag.py  # Main ETL DAG
├── logs/                  # Airflow logs (auto-created)
└── plugins/               # Custom plugins (auto-created)
```

## Prerequisites

### Required
- **Docker Desktop**: Download from [docker.com](https://www.docker.com/products/docker-desktop/)
- **8GB+ RAM**: Airflow requires significant memory for all services
- **PostgreSQL**: CatLog database must be running and accessible

### Optional
- **Google Cloud Project**: For BigQuery cloud sync
- **Slack Workspace**: For failure/success notifications

## Quick Start

### 1. Start Docker Desktop
Ensure Docker Desktop is running on your Mac.

### 2. Initialize Airflow (First Time Only)
```bash
cd airflow
./airflow.sh init
```

This creates the Airflow database, admin user, and required directories.

### 3. Start Airflow
```bash
./airflow.sh start
```

Services will start and be available at:
- **Web UI**: http://localhost:8080 (airflow/airflow)
- **Flower**: http://localhost:5555 (Celery monitoring)

### 4. Access Airflow Web UI
1. Open http://localhost:8080
2. Login: `airflow` / `airflow`
3. Find the `catlog_etl_pipeline` DAG
4. Toggle it ON to enable scheduling

## DAG Configuration

The `catlog_etl_pipeline` DAG runs daily at midnight UTC and supports these parameters:

### Default Parameters
```python
{
    "source": "top",           # Data source: top, seasonal, genre
    "max_pages": 10,          # Pages to fetch from API
    "year": None,             # Year for seasonal data
    "season": None,           # Season: spring, summer, fall, winter
    "enable_cloud_sync": True, # Enable BigQuery sync
    "genres": None            # Genre ID for genre-specific runs
}
```

### Manual Trigger with Custom Parameters
1. Go to DAG → Trigger DAG w/ Config
2. Modify JSON parameters:
```json
{
    "source": "seasonal",
    "year": 2023,
    "season": "spring",
    "max_pages": 5,
    "enable_cloud_sync": false
}
```

## Task Flow

The DAG consists of these task groups and dependencies:

### ETL Process Group
1. **extract_anime_data**: Fetch data from Jikan API
2. **transform_anime_data**: Clean and validate data
3. **load_to_postgresql**: Store in local database
4. **load_to_bigquery**: Sync to cloud warehouse (parallel with PostgreSQL)

### Notification Tasks
- **send_success_notification**: Completion summary
- **send_failure_notification**: Error details and debugging info

### Task Dependencies
```
extract → transform → [postgresql_load, bigquery_load] → [success_notify, failure_notify]
```

## Management Commands

The `airflow.sh` script provides easy management:

```bash
# First time setup
./airflow.sh init

# Start all services
./airflow.sh start

# Stop all services  
./airflow.sh stop

# Check service status
./airflow.sh status

# View logs
./airflow.sh logs                    # All services
./airflow.sh logs scheduler          # Specific service

# Trigger DAG manually
./airflow.sh trigger catlog_etl_pipeline

# Execute Airflow CLI commands
./airflow.sh cli dags list
./airflow.sh cli tasks list catlog_etl_pipeline

# Restart specific service
./airflow.sh restart scheduler

# Clean up everything (destructive)
./airflow.sh clean
```

## Configuration

### Environment Variables (.env)

#### Airflow Settings
```bash
AIRFLOW_UID=50000
_AIRFLOW_WWW_USER_USERNAME=airflow
_AIRFLOW_WWW_USER_PASSWORD=airflow
```

#### CatLog ETL Configuration
```bash
DATABASE_URL=postgresql://ianunebasami@host.docker.internal:5432/catlog
ENABLE_CLOUD_SYNC=false
JIKAN_RATE_LIMIT_DELAY=1.0
JIKAN_MAX_RETRIES=3
ETL_BATCH_SIZE=100
ETL_MAX_PAGES=10
```

#### BigQuery (Optional)
```bash
GCP_PROJECT_ID=your-project-id
BIGQUERY_DATASET=catlog_anime_data
BIGQUERY_TABLE=processed_anime
BIGQUERY_LOCATION=US
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### Slack Notifications (Optional)
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Database Connection
The DAG connects to your CatLog PostgreSQL database using `host.docker.internal:5432` which allows Docker containers to access the host machine's localhost.

## Monitoring & Debugging

### Airflow Web UI (http://localhost:8080)
- **DAGs**: View all pipelines and their schedules
- **Grid View**: See task execution status over time
- **Graph View**: Visualize task dependencies
- **Logs**: Detailed execution logs for each task
- **Admin → Variables**: Manage Slack webhook configuration

### Logs
```bash
# Real-time scheduler logs
./airflow.sh logs scheduler

# Real-time worker logs  
./airflow.sh logs worker

# All logs
./airflow.sh logs
```

### Common Issues

#### 1. Database Connection Failed
- Ensure PostgreSQL is running on your Mac
- Check DATABASE_URL in `.env`
- Verify `host.docker.internal` resolves to your host

#### 2. Memory Issues
- Airflow requires 4GB+ RAM
- Close unnecessary applications
- Increase Docker Desktop memory limit

#### 3. DAG Not Appearing
- Check `./airflow.sh logs scheduler` for import errors
- Verify ETL modules are accessible
- Restart scheduler: `./airflow.sh restart scheduler`

#### 4. Task Failures
- Check task logs in Web UI
- Verify API rate limits aren't exceeded
- Check database permissions

## Scheduling Options

### Default Schedule
- **Frequency**: Daily at midnight UTC
- **Catchup**: Disabled (won't run historical dates)
- **Max Active Runs**: 1 (prevents overlapping executions)

### Custom Schedules
Modify `SCHEDULE_INTERVAL` in the DAG:
```python
# Every 6 hours
SCHEDULE_INTERVAL = "0 */6 * * *"

# Twice daily
SCHEDULE_INTERVAL = "0 0,12 * * *"

# Weekly on Sundays
SCHEDULE_INTERVAL = "0 0 * * 0"

# Manual only
SCHEDULE_INTERVAL = None
```

## Notifications

### Success Notification
Includes pipeline summary:
- Records processed
- Execution duration
- Task results breakdown
- Cloud sync status

### Failure Notification
Includes debugging information:
- Failed task details
- Error messages
- Full traceback
- Execution timestamp

### Slack Integration
1. Create Slack incoming webhook
2. Set `SLACK_WEBHOOK_URL` in `.env`
3. Restart Airflow services
4. Notifications will be sent to your Slack channel

## Production Considerations

### Resource Limits
- **Memory**: 8GB+ recommended
- **CPU**: 4+ cores for optimal performance
- **Disk**: 10GB+ for logs and temporary data

### Security
- Change default Airflow credentials
- Use environment-specific `.env` files
- Secure BigQuery service account keys
- Enable Airflow authentication in production

### Scaling
- Use `CeleryExecutor` for distributed task execution
- Add worker nodes for larger workloads
- Configure external PostgreSQL and Redis for high availability

### Monitoring
- Set up Airflow alerting for critical failures
- Monitor resource usage and performance
- Implement log aggregation for troubleshooting

## Troubleshooting

### Service Won't Start
```bash
# Check Docker status
docker info

# View initialization logs
./airflow.sh logs airflow-init

# Clean start
./airflow.sh stop
./airflow.sh clean
./airflow.sh init
./airflow.sh start
```

### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check service status
./airflow.sh status

# Restart problematic service
./airflow.sh restart scheduler
```

### DAG Issues
```bash
# Test DAG syntax
./airflow.sh cli dags check catlog_etl_pipeline

# List tasks
./airflow.sh cli tasks list catlog_etl_pipeline

# Test specific task
./airflow.sh cli tasks test catlog_etl_pipeline extract_anime_data 2025-08-14
```

## Next Steps

1. **Start Airflow**: Follow the Quick Start guide
2. **Configure Scheduling**: Adjust DAG parameters for your needs
3. **Set Up Monitoring**: Configure Slack notifications
4. **Enable Cloud Sync**: Add BigQuery credentials for data warehouse
5. **Production Deployment**: Consider scaling and security requirements

For support, check the Airflow logs and Web UI for detailed error information.