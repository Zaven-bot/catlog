#!/bin/bash
# CatLog Deployment Script for AWS
# This script helps deploy CatLog to AWS using Terraform and Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CatLog Deploy]${NC} $1"
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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker and try again."
        exit 1
    fi
    
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install Terraform and try again."
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI and try again."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Check AWS credentials
check_aws_credentials() {
    print_status "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "AWS credentials are configured"
}

# Build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."
    
    # Get AWS account ID and region
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=${AWS_REGION:-us-west-2}
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
    
    # Build and push each service
    services=("backend" "etl" "streaming")
    
    for service in "${services[@]}"; do
        print_status "Building ${service} image..."
        
        # Create ECR repository if it doesn't exist
        aws ecr describe-repositories --repository-names "catlog-dev-${service}" --region ${AWS_REGION} &> /dev/null || \
        aws ecr create-repository --repository-name "catlog-dev-${service}" --region ${AWS_REGION}
        
        # Build and push image
        docker build -t "catlog-${service}" "./${service}/"
        docker tag "catlog-${service}" "${ECR_REGISTRY}/catlog-dev-${service}:latest"
        docker push "${ECR_REGISTRY}/catlog-dev-${service}:latest"
        
        print_success "${service} image pushed successfully"
    done
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    print_status "Deploying infrastructure with Terraform..."
    
    cd terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan the deployment
    terraform plan -out=tfplan \
        -var="db_password=${DB_PASSWORD:-changeme123}" \
        -var="jwt_secret=${JWT_SECRET:-your-super-secret-jwt-key}" \
        -var="gcp_project_id=${GCP_PROJECT_ID:-}"
    
    # Apply the deployment
    terraform apply -auto-approve tfplan
    
    print_success "Infrastructure deployed successfully"
    
    cd ..
}

# Deploy services to ECS
deploy_services() {
    print_status "Deploying services to ECS..."
    
    # Update backend service
    aws ecs update-service \
        --cluster catlog-dev-cluster \
        --service catlog-dev-backend \
        --force-new-deployment \
        --region ${AWS_REGION:-us-west-2}
    
    print_status "Waiting for service deployment to stabilize..."
    aws ecs wait services-stable \
        --cluster catlog-dev-cluster \
        --services catlog-dev-backend \
        --region ${AWS_REGION:-us-west-2}
    
    print_success "Services deployed successfully"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Get subnet and security group IDs
    SUBNET_ID=$(aws ec2 describe-subnets \
        --filters "Name=tag:Name,Values=catlog-dev-private-subnet-1" \
        --query "Subnets[0].SubnetId" \
        --output text \
        --region ${AWS_REGION:-us-west-2})
    
    SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=tag:Name,Values=catlog-dev-ecs-tasks-sg" \
        --query "SecurityGroups[0].GroupId" \
        --output text \
        --region ${AWS_REGION:-us-west-2})
    
    # Run migration task
    aws ecs run-task \
        --cluster catlog-dev-cluster \
        --task-definition catlog-dev-backend \
        --overrides "{
            \"containerOverrides\": [{
                \"name\": \"backend\",
                \"command\": [\"npx\", \"prisma\", \"migrate\", \"deploy\"]
            }]
        }" \
        --network-configuration "{
            \"awsvpcConfiguration\": {
                \"subnets\": [\"${SUBNET_ID}\"],
                \"securityGroups\": [\"${SG_ID}\"]
            }
        }" \
        --region ${AWS_REGION:-us-west-2}
    
    print_success "Database migrations completed"
}

# Get application URL
get_application_url() {
    print_status "Getting application URL..."
    
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --names catlog-dev-alb \
        --query "LoadBalancers[0].DNSName" \
        --output text \
        --region ${AWS_REGION:-us-west-2})
    
    print_success "Application deployed at: http://${ALB_DNS}"
}

# Main deployment function
deploy() {
    print_status "Starting CatLog deployment to AWS..."
    
    check_dependencies
    check_aws_credentials
    build_and_push_images
    deploy_infrastructure
    deploy_services
    run_migrations
    get_application_url
    
    print_success "CatLog deployment completed successfully!"
}

# Destroy infrastructure
destroy() {
    print_warning "This will destroy all CatLog infrastructure in AWS!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Destroying infrastructure..."
        cd terraform
        terraform destroy -auto-approve \
            -var="db_password=${DB_PASSWORD:-changeme123}" \
            -var="jwt_secret=${JWT_SECRET:-your-super-secret-jwt-key}" \
            -var="gcp_project_id=${GCP_PROJECT_ID:-}"
        cd ..
        print_success "Infrastructure destroyed"
    else
        print_status "Destruction cancelled"
    fi
}

# Help function
show_help() {
    echo "CatLog AWS Deployment Script"
    echo ""
    echo "Usage: $0 COMMAND"
    echo ""
    echo "Commands:"
    echo "  deploy     Deploy CatLog to AWS"
    echo "  destroy    Destroy CatLog infrastructure"
    echo "  help       Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  AWS_REGION    AWS region (default: us-west-2)"
    echo "  DB_PASSWORD   Database password"
    echo "  JWT_SECRET    JWT secret key"
    echo "  GCP_PROJECT_ID Google Cloud Project ID (optional)"
    echo ""
    echo "Examples:"
    echo "  export DB_PASSWORD=mySecurePassword123"
    echo "  export JWT_SECRET=myJWTSecret"
    echo "  $0 deploy"
    echo ""
}

# Main script logic
case "${1:-}" in
    "deploy")
        deploy
        ;;
    "destroy")
        destroy
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac