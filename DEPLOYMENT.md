# CatLog Cloud Deployment Guide

This guide covers deploying CatLog to AWS using containerization and Infrastructure as Code (IaC) with Terraform.

## Architecture Overview

CatLog uses a microservices architecture deployed on AWS:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │    Load Balancer │    │      ECS        │
│   Load Balancer │◄──►│     (ALB)        │◄──►│   Fargate       │
│                 │    │                  │    │   Containers    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐            │
│   PostgreSQL    │    │     Redis        │            │
│     (RDS)       │    │  (ElastiCache)   │◄───────────┘
└─────────────────┘    └──────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ETL Pipeline  │    │   Data Quality   │    │    BigQuery     │
│   (Scheduled)   │───►│ (Great Expect.)  │───►│   (Cloud DW)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Kafka Producer │    │   Kafka Broker   │    │ Kafka Consumer  │
│   (Streaming)   │───►│   (Messages)     │───►│  (Processing)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

### Required Tools
- **Docker Desktop** (v4.0+)
- **Terraform** (v1.0+)
- **AWS CLI** (v2.0+)
- **Node.js** (v18+)
- **Python** (v3.11+)

### AWS Account Setup
1. Create AWS account with appropriate permissions
2. Configure AWS CLI credentials:
   ```bash
   aws configure
   ```
3. Ensure you have permissions for:
   - VPC management
   - ECS/Fargate
   - RDS
   - ElastiCache
   - ECR
   - IAM roles
   - Application Load Balancer

## Quick Start

### 1. Clone and Setup
```bash
git clone <your-catlog-repo>
cd catlog
cp .env.example .env
# Edit .env with your configuration
```

### 2. Set Environment Variables
```bash
export DB_PASSWORD="your-secure-database-password"
export JWT_SECRET="your-super-secret-jwt-key"
export GCP_PROJECT_ID="your-gcp-project-id"  # Optional
export AWS_REGION="us-west-2"  # Optional, defaults to us-west-2
```

### 3. Deploy to AWS
```bash
./deploy.sh deploy
```

This will:
- Build and push Docker images to ECR
- Deploy infrastructure with Terraform
- Deploy services to ECS
- Run database migrations
- Provide application URL

## Local Development

### Start Local Environment
```bash
./dev.sh init    # Initialize environment
./dev.sh build   # Build images
./dev.sh start   # Start all services
```

### Available Services
- **Application**: http://localhost
- **Backend API**: http://localhost:3000
- **Kafka UI**: http://localhost:8080
- **Database**: localhost:5432
- **Redis**: localhost:6379

### Common Commands
```bash
./dev.sh status           # Check service status
./dev.sh logs backend     # View backend logs
./dev.sh etl              # Run ETL manually
./dev.sh shell backend    # Open backend shell
./dev.sh restart          # Restart all services
./dev.sh stop             # Stop all services
```

## AWS Infrastructure Details

### Core Infrastructure
- **VPC**: Custom VPC with public/private subnets across 2 AZs
- **RDS**: PostgreSQL 15 with automated backups and encryption
- **ElastiCache**: Redis cluster with high availability
- **ECS**: Fargate cluster for containerized services
- **ALB**: Application Load Balancer with health checks
- **ECR**: Container registries for each service

### Security
- Private subnets for databases and application services
- Security groups with minimal required access
- Encrypted storage for RDS and ElastiCache
- IAM roles with least privilege principle
- KMS encryption for ECS logs

### High Availability
- Multi-AZ deployment for RDS and ElastiCache
- Auto-scaling groups for ECS services
- Load balancer health checks
- Automated failover for Redis

## Terraform Configuration

### Variables
Copy and customize the Terraform variables:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings
```

### Key Variables
- `aws_region`: AWS region (default: us-west-2)
- `environment`: Environment name (dev, staging, production)
- `db_password`: Database password (use environment variable)
- `jwt_secret`: JWT secret key (use environment variable)
- `backend_desired_count`: Number of backend instances

### Manual Terraform Deployment
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## CI/CD with GitHub Actions

The repository includes automated CI/CD pipeline in `.github/workflows/deploy.yml`.

### Required GitHub Secrets
Set these in your GitHub repository settings:

```
AWS_ACCESS_KEY_ID          # AWS access key
AWS_SECRET_ACCESS_KEY      # AWS secret key
AWS_ACCOUNT_ID             # Your AWS account ID
DB_PASSWORD                # Database password
JWT_SECRET                 # JWT secret key
GCP_PROJECT_ID             # Google Cloud project (optional)
```

### Pipeline Stages
1. **Test**: Run unit tests for all services
2. **Build**: Build and push Docker images to ECR
3. **Deploy Infrastructure**: Apply Terraform changes
4. **Deploy Services**: Update ECS services
5. **Migrate**: Run database migrations

### Triggering Deployment
```bash
git push origin main  # Triggers automatic deployment
```

## Monitoring and Logging

### CloudWatch Logs
All services log to CloudWatch with the following log groups:
- `/ecs/catlog-{environment}`

### Health Checks
- **Backend**: `GET /health`
- **Database**: PostgreSQL connection check
- **Redis**: Redis ping command
- **Load Balancer**: HTTP health checks

### Monitoring Commands
```bash
# Check ECS service status
aws ecs describe-services --cluster catlog-dev-cluster --services catlog-dev-backend

# View CloudWatch logs
aws logs tail /ecs/catlog-dev --follow

# Check load balancer health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

## Scaling and Performance

### Auto-Scaling
ECS services are configured with:
- Minimum 1 instance
- Maximum 10 instances
- CPU-based scaling (>70% triggers scale-up)
- Memory-based scaling (>80% triggers scale-up)

### Performance Optimization
- **Database**: Connection pooling, read replicas for production
- **Redis**: Clustering enabled for high availability
- **ECS**: Right-sizing containers based on metrics
- **ALB**: Cross-zone load balancing enabled

## Troubleshooting

### Common Issues

**1. ECS Service Won't Start**
```bash
# Check ECS service events
aws ecs describe-services --cluster catlog-dev-cluster --services catlog-dev-backend

# Check CloudWatch logs
aws logs tail /ecs/catlog-dev --follow
```

**2. Database Connection Issues**
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier catlog-dev-postgres

# Test connection from ECS task
aws ecs execute-command --cluster catlog-dev-cluster --task <task-arn> --interactive --command "/bin/bash"
```

**3. Load Balancer 502 Errors**
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>

# Check security group rules
aws ec2 describe-security-groups --group-ids <security-group-id>
```

### Debug Commands
```bash
# Local debugging
./dev.sh logs backend
./dev.sh shell backend
docker-compose exec postgres psql -U catlog_user -d catlog

# AWS debugging
aws ecs list-tasks --cluster catlog-dev-cluster
aws ecs describe-tasks --cluster catlog-dev-cluster --tasks <task-arn>
aws logs describe-log-groups --log-group-name-prefix /ecs/catlog
```

## Cost Optimization

### Development Environment
- Use `t3.micro` instances for RDS and ElastiCache
- Single AZ deployment for non-production
- Scheduled scaling (shut down overnight)

### Production Considerations
- Use `t3.small` or larger instances
- Enable Multi-AZ for high availability
- Set up CloudWatch billing alerts
- Use Reserved Instances for predictable workloads

### Estimated Monthly Costs (us-west-2)
- **Development**: ~$50-100/month
- **Production**: ~$200-500/month (depending on scale)

## Cleanup

### Remove All AWS Resources
```bash
./deploy.sh destroy
```

### Remove Local Environment
```bash
./dev.sh clean
```

## Support and Documentation

- **Local Development**: See `dev.sh help`
- **AWS Deployment**: See `deploy.sh help`
- **Terraform Docs**: See `terraform/` directory
- **Application Docs**: See service-specific README files

For issues and contributions, please refer to the main repository documentation.