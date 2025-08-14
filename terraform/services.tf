# ECS Task Definitions
resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${aws_ecr_repository.backend.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
        },
        {
          name  = "JWT_SECRET"
          value = var.jwt_secret
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "backend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = local.tags
}

resource "aws_ecs_task_definition" "etl" {
  family                   = "${local.name}-etl"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.etl_cpu
  memory                   = var.etl_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "etl"
      image = "${aws_ecr_repository.etl.repository_url}:latest"

      environment = [
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
        },
        {
          name  = "ENABLE_CLOUD_SYNC"
          value = "true"
        },
        {
          name  = "JIKAN_RATE_LIMIT_DELAY"
          value = "1.0"
        },
        {
          name  = "JIKAN_MAX_RETRIES"
          value = "3"
        },
        {
          name  = "ETL_BATCH_SIZE"
          value = "100"
        },
        {
          name  = "ETL_MAX_PAGES"
          value = "10"
        },
        {
          name  = "GCP_PROJECT_ID"
          value = var.gcp_project_id
        },
        {
          name  = "BIGQUERY_DATASET"
          value = "catlog_anime_data"
        },
        {
          name  = "BIGQUERY_TABLE"
          value = "processed_anime"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "etl"
        }
      }
    }
  ])

  tags = local.tags
}

# ECS Services
resource "aws_ecs_service" "backend" {
  name            = "${local.name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 100
  }

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.backend]

  tags = local.tags
}

# EventBridge Rule for ETL scheduling
resource "aws_cloudwatch_event_rule" "etl_schedule" {
  name                = "${local.name}-etl-schedule"
  description         = "Trigger ETL pipeline daily"
  schedule_expression = "cron(0 0 * * ? *)"  # Daily at midnight UTC

  tags = local.tags
}

resource "aws_cloudwatch_event_target" "etl_schedule" {
  rule      = aws_cloudwatch_event_rule.etl_schedule.name
  target_id = "ECSTarget"
  arn       = aws_ecs_cluster.main.arn
  role_arn  = aws_iam_role.events.arn

  ecs_target {
    task_count          = 1
    task_definition_arn = aws_ecs_task_definition.etl.arn
    launch_type         = "FARGATE"

    network_configuration {
      security_groups  = [aws_security_group.ecs_tasks.id]
      subnets          = aws_subnet.private[*].id
      assign_public_ip = false
    }
  }
}

# IAM Role for EventBridge
resource "aws_iam_role" "events" {
  name = "${local.name}-events"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy" "events" {
  name = "${local.name}-events-policy"
  role = aws_iam_role.events.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:RunTask"
        ]
        Resource = aws_ecs_task_definition.etl.arn
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          aws_iam_role.ecs_task_execution.arn,
          aws_iam_role.ecs_task.arn
        ]
      }
    ]
  })
}