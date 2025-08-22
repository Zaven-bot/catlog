# Databricks notebook source
# MAGIC %md
# MAGIC # Connection Test - Stage 2 Setup Validation
# MAGIC 
# MAGIC This notebook validates that Databricks can connect to your PostgreSQL database
# MAGIC and read your existing ETL data.

# COMMAND ----------

# Load environment variables (in Databricks, set these in cluster environment variables)
import os
import sys
from pyspark.sql import functions as F

# Add config directory to path
sys.path.append('/Workspace/Repos/your-repo/catlog/databricks/config')

from connection import db_connection, config

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Test Configuration

# COMMAND ----------

print("=== Configuration Test ===")
print(f"PostgreSQL Host: {config.postgres_config['host']}")
print(f"PostgreSQL Database: {config.postgres_config['database']}")
print(f"PostgreSQL User: {config.postgres_config['user']}")
print(f"JDBC URL: {config.get_connection_url()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Test Database Connection

# COMMAND ----------

print("=== Connection Test ===")
connection_success = db_connection.test_connection()
print(f"Overall Connection Status: {'✅ SUCCESS' if connection_success else '❌ FAILED'}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Sample Data Preview

# COMMAND ----------

if connection_success:
    print("=== Sample Data Preview ===")
    
    # Read last 7 days of data
    df = db_connection.read_daily_rankings(days_back=7)
    
    print(f"Total records (last 7 days): {df.count()}")
    print("\nSchema:")
    df.printSchema()
    
    print("\nSample data (first 5 records):")
    df.show(5, truncate=False)
    
    print("\nUnique dates in dataset:")
    df.select("snapshotDate").distinct().orderBy("snapshotDate").show()
    
else:
    print("❌ Skipping data preview due to connection failure")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Data Quality Check

# COMMAND ----------

if connection_success:
    print("=== Data Quality Check ===")
    
    # Check for required fields
    required_columns = ['snapshotDate', 'malId', 'rank', 'score', 'genres']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        print(f"❌ Missing required columns: {missing_columns}")
    else:
        print("✅ All required columns present")
    
    # Check data ranges
    print(f"\nRank range: {df.agg({'rank': 'min'}).collect()[0][0]} - {df.agg({'rank': 'max'}).collect()[0][0]}")
    print(f"Score range: {df.agg({'score': 'min'}).collect()[0][0]} - {df.agg({'score': 'max'}).collect()[0][0]}")
    
    # Check for nulls
    null_counts = df.select([F.sum(F.col(c).isNull().cast("int")).alias(c) for c in df.columns]).collect()[0].asDict()
    print(f"\nNull counts: {dict(null_counts)}")

# COMMAND ----------

print("=== Connection Test Complete ===")
print("If all tests passed, you're ready to proceed with Stage 2 analytics!")