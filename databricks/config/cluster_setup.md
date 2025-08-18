# Databricks Cluster Setup Guide

## 🚀 Step-by-Step Cluster Setup

### 1. Create Databricks Workspace
- Go to AWS Console → Databricks
- Create new workspace
- Choose region (us-west-2 recommended for cost)
- Enable VPC peering if needed for PostgreSQL access

### 2. Launch Cluster Configuration

```json
{
  "cluster_name": "catlog-stage2-analytics",
  "spark_version": "13.3.x-scala2.12",
  "node_type_id": "i3.large",
  "driver_node_type_id": "i3.large", 
  "num_workers": 2,
  "autoscale": {
    "min_workers": 1,
    "max_workers": 4
  },
  "auto_termination_minutes": 120,
  "enable_elastic_disk": true
}
```

### 3. Install Libraries

Add these libraries to the cluster:

#### Maven Coordinates
```
org.postgresql:postgresql:42.6.0
```

#### PyPI Packages
```
pandas==2.0.3
numpy==1.24.3
scipy==1.11.1
```

### 4. Environment Variables

Add to cluster configuration → Advanced Options → Environment Variables:

```bash
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=catlog
POSTGRES_USER=your-username
POSTGRES_PASSWORD=your-password
```

### 5. Network Configuration

#### For Local PostgreSQL:
- Ensure PostgreSQL accepts connections from Databricks IPs
- Update `postgresql.conf`: `listen_addresses = '*'`
- Update `pg_hba.conf`: Add Databricks subnet

#### For RDS PostgreSQL:
- Update security group to allow Databricks subnet
- Ensure RDS is publicly accessible or use VPC peering

### 6. Cluster Validation

Test with this simple notebook:

```python
# Test PostgreSQL connection
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("CatLog_Connection_Test") \
    .getOrCreate()

# Test JDBC connection
df = spark.read \
    .format("jdbc") \
    .option("url", "jdbc:postgresql://your-host:5432/catlog") \
    .option("dbtable", "DailyRankings") \
    .option("user", "your-user") \
    .option("password", "your-password") \
    .option("driver", "org.postgresql.Driver") \
    .load()

print(f"DailyRankings row count: {df.count()}")
df.show(5)
```

## 💰 Cost Optimization

### Development (Small Dataset)
- **Cluster**: 1-2 workers, i3.large
- **Runtime**: Auto-terminate after 2 hours
- **Estimated Cost**: $20-40/month

### Production (Large Dataset)
- **Cluster**: 2-4 workers, i3.xlarge
- **Runtime**: Scheduled jobs only
- **Estimated Cost**: $100-200/month

## 🔧 Troubleshooting

### Common Issues

1. **JDBC Connection Failed**
   - Check network security groups
   - Verify PostgreSQL authentication
   - Test connection from notebook

2. **Out of Memory Errors**
   - Increase executor memory
   - Add more workers
   - Optimize Spark SQL queries

3. **Slow Query Performance**
   - Check PostgreSQL indices
   - Optimize partition keys
   - Use pushdown predicates

### Performance Tuning

```python
# Optimize Spark configuration
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.execution.arrow.pyspark.enabled", "true")
```

## 📊 Monitoring

Track these metrics:
- Job runtime (target: <10 minutes)
- Memory usage (target: <80% of available)
- Network I/O to PostgreSQL
- Cost per analytics run
