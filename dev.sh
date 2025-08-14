#!/bin/bash
# CatLog Local Development Script
# This script helps manage local development environment with Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CatLog Dev]${NC} $1"
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
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check for docker compose (modern syntax) or docker-compose (legacy)
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    elif docker-compose version &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    else
        print_error "Docker Compose is not available. Please install Docker Compose and try again."
        exit 1
    fi
}

# Initialize environment
init_env() {
    print_status "Initializing CatLog development environment..."
    
    # Copy environment template if .env doesn't exist
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env file from template"
        print_warning "Please review and update .env file with your configuration"
    fi
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p nginx/ssl
    
    print_success "Environment initialized"
}

# Build all Docker images
build_images() {
    print_status "Building Docker images..."
    
    services=("backend" "etl" "streaming")
    
    for service in "${services[@]}"; do
        print_status "Building ${service} image..."
        docker build -t "catlog-${service}:local" "./${service}/"
        print_success "${service} image built"
    done
}

# Start all services
start_services() {
    print_status "Starting CatLog services..."
    
    check_docker
    
    # Start core infrastructure first
    $DOCKER_COMPOSE up -d postgres redis
    
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Start application services
    $DOCKER_COMPOSE up -d backend nginx
    
    # Start streaming services
    $DOCKER_COMPOSE up -d zookeeper kafka
    sleep 15
    $DOCKER_COMPOSE up -d kafka-producer kafka-consumer kafka-ui
    
    print_success "All services started"
    print_status "Services available at:"
    print_status "  • Application: http://localhost"
    print_status "  • Backend API: http://localhost:3000"
    print_status "  • Kafka UI: http://localhost:8080"
    print_status "  • Database: localhost:5432"
    print_status "  • Redis: localhost:6379"
}

# Stop all services
stop_services() {
    print_status "Stopping CatLog services..."
    $DOCKER_COMPOSE down
    print_success "All services stopped"
}

# Show service logs
show_logs() {
    service=${1:-}
    if [ -z "$service" ]; then
        print_status "Available services: backend, etl, streaming, postgres, redis, kafka, kafka-producer, kafka-consumer"
        print_status "Usage: $0 logs [service_name]"
        print_status "Showing all logs..."
        $DOCKER_COMPOSE logs -f
    else
        print_status "Showing logs for $service..."
        $DOCKER_COMPOSE logs -f "$service"
    fi
}

# Run ETL pipeline manually
run_etl() {
    print_status "Running ETL pipeline..."
    
    $DOCKER_COMPOSE run --rm etl python pipeline.py
    
    print_success "ETL pipeline completed"
}

# Check service status
check_status() {
    print_status "CatLog services status:"
    $DOCKER_COMPOSE ps
    
    echo ""
    print_status "Health checks:"
    
    # Check backend health
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend is not responding"
    fi
    
    # Check database
    if $DOCKER_COMPOSE exec -T postgres pg_isready -U catlog_user > /dev/null 2>&1; then
        print_success "Database is healthy"
    else
        print_warning "Database is not responding"
    fi
    
    # Check Redis
    if $DOCKER_COMPOSE exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is healthy"
    else
        print_warning "Redis is not responding"
    fi
}

# Clean up everything
clean_all() {
    print_warning "This will remove all containers, volumes, and images!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up everything..."
        $DOCKER_COMPOSE down -v --rmi all --remove-orphans
        docker system prune -f
        print_success "Cleanup complete"
    else
        print_status "Cleanup cancelled"
    fi
}

# Reset database
reset_db() {
    print_warning "This will delete all data in the database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Resetting database..."
        $DOCKER_COMPOSE stop backend
        $DOCKER_COMPOSE exec postgres psql -U catlog_user -d catlog -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        $DOCKER_COMPOSE run --rm backend npx prisma migrate deploy
        $DOCKER_COMPOSE start backend
        print_success "Database reset complete"
    else
        print_status "Database reset cancelled"
    fi
}

# Development shell
dev_shell() {
    service=${1:-backend}
    print_status "Opening development shell for $service..."
    $DOCKER_COMPOSE exec "$service" /bin/bash
}

# Help function
show_help() {
    echo "CatLog Local Development Script"
    echo ""
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  init        Initialize development environment"
    echo "  build       Build all Docker images"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        Show service logs [service_name]"
    echo "  status      Check service status"
    echo "  etl         Run ETL pipeline manually"
    echo "  shell       Open development shell [service_name]"
    echo "  reset-db    Reset database (careful!)"
    echo "  clean       Clean up everything (careful!)"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs backend"
    echo "  $0 shell backend"
    echo ""
}

# Main script logic
case "${1:-}" in
    "init")
        init_env
        ;;
    "build")
        build_images
        ;;
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        sleep 2
        start_services
        ;;
    "logs")
        show_logs "${2:-}"
        ;;
    "status")
        check_status
        ;;
    "etl")
        run_etl
        ;;
    "shell")
        dev_shell "${2:-backend}"
        ;;
    "reset-db")
        reset_db
        ;;
    "clean")
        clean_all
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac