#!/bin/bash
# CatLog Airflow Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CatLog Airflow]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Initialize Airflow (first time setup)
init_airflow() {
    print_status "Initializing Airflow for first time..."
    
    # Create required directories
    mkdir -p ./dags ./logs ./plugins
    
    # Set permissions (macOS specific)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        export AIRFLOW_UID=50000
    fi
    
    # Initialize database and create admin user
    docker-compose up airflow-init
    
    print_success "Airflow initialized successfully!"
    print_warning "Default login: username=airflow, password=airflow"
}

# Start Airflow services
start_airflow() {
    print_status "Starting Airflow services..."
    
    check_docker
    
    # Start all services in detached mode
    docker-compose up -d
    
    print_success "Airflow is starting up..."
    print_status "Services:"
    print_status "  • Web UI: http://localhost:8080"
    print_status "  • Login: airflow / airflow"
    print_status "  • Flower (Celery Monitor): http://localhost:5555 (optional)"
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if webserver is responding
    if curl -f -s http://localhost:8080/health > /dev/null; then
        print_success "Airflow Web UI is ready at http://localhost:8080"
    else
        print_warning "Airflow is still starting up. Please wait a moment and check http://localhost:8080"
    fi
}

# Stop Airflow services
stop_airflow() {
    print_status "Stopping Airflow services..."
    docker-compose down
    print_success "Airflow stopped"
}

# Show Airflow logs
show_logs() {
    service=${1:-}
    if [ -z "$service" ]; then
        print_status "Available services: webserver, scheduler, worker, triggerer"
        print_status "Usage: $0 logs [service_name]"
        print_status "Showing all logs..."
        docker-compose logs -f
    else
        print_status "Showing logs for $service..."
        docker-compose logs -f "airflow-$service"
    fi
}

# Restart specific service
restart_service() {
    service=${1:-}
    if [ -z "$service" ]; then
        print_error "Please specify a service: webserver, scheduler, worker, triggerer"
        exit 1
    fi
    
    print_status "Restarting airflow-$service..."
    docker-compose restart "airflow-$service"
    print_success "airflow-$service restarted"
}

# Execute Airflow CLI commands
airflow_cli() {
    print_status "Executing Airflow CLI: $*"
    docker-compose exec airflow-webserver airflow "$@"
}

# Run DAG manually
trigger_dag() {
    dag_id=${1:-catlog_etl_pipeline}
    print_status "Triggering DAG: $dag_id"
    docker-compose exec airflow-webserver airflow dags trigger "$dag_id"
    print_success "DAG $dag_id triggered"
}

# Clean up everything (including volumes)
clean_all() {
    print_warning "This will remove all Airflow data including logs and database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up all Airflow data..."
        docker-compose down -v
        docker-compose down --rmi all --volumes --remove-orphans
        sudo rm -rf ./logs/*
        print_success "Cleanup complete"
    else
        print_status "Cleanup cancelled"
    fi
}

# Show status of services
status() {
    print_status "Airflow services status:"
    docker-compose ps
}

# Main script logic
case "${1:-}" in
    "init")
        init_airflow
        ;;
    "start")
        start_airflow
        ;;
    "stop")
        stop_airflow
        ;;
    "restart")
        restart_service "${2:-}"
        ;;
    "logs")
        show_logs "${2:-}"
        ;;
    "cli")
        shift
        airflow_cli "$@"
        ;;
    "trigger")
        trigger_dag "${2:-}"
        ;;
    "status")
        status
        ;;
    "clean")
        clean_all
        ;;
    *)
        echo "CatLog Airflow Management Script"
        echo ""
        echo "Usage: $0 COMMAND [ARGS]"
        echo ""
        echo "Commands:"
        echo "  init                 Initialize Airflow (first time setup)"
        echo "  start               Start all Airflow services"
        echo "  stop                Stop all Airflow services"
        echo "  restart [service]   Restart specific service"
        echo "  logs [service]      Show logs (all services or specific)"
        echo "  cli [args]          Execute Airflow CLI commands"
        echo "  trigger [dag_id]    Trigger DAG manually"
        echo "  status              Show service status"
        echo "  clean               Clean up all data (destructive)"
        echo ""
        echo "Examples:"
        echo "  $0 init                          # First time setup"
        echo "  $0 start                         # Start Airflow"
        echo "  $0 logs scheduler                # Show scheduler logs"
        echo "  $0 trigger catlog_etl_pipeline   # Run ETL pipeline manually"
        echo "  $0 cli dags list                 # List all DAGs"
        echo ""
        exit 1
        ;;
esac