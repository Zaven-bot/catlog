# AWS Configuration
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  default     = "dev"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS max allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "catlog"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "catlog_user"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_backup_retention_period" {
  description = "Database backup retention period in days"
  type        = number
  default     = 7
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

# ECS Configuration
variable "backend_cpu" {
  description = "CPU units for backend service"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Memory for backend service in MB"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired count of backend service instances"
  type        = number
  default     = 2
}

variable "etl_cpu" {
  description = "CPU units for ETL service"
  type        = number
  default     = 512
}

variable "etl_memory" {
  description = "Memory for ETL service in MB"
  type        = number
  default     = 1024
}

# Application Configuration
variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
  default     = "your-super-secret-jwt-key-change-in-production"
}

variable "gcp_project_id" {
  description = "Google Cloud Project ID for BigQuery"
  type        = string
  default     = ""
}