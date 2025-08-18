# Databricks notebook source
# MAGIC %md
# MAGIC # Step 2: Data Validation
# MAGIC 
# MAGIC **Purpose**: Validate PostgreSQL connection and DailyRankings data quality before starting Spark analytics.
# MAGIC 
# MAGIC **Success Criteria**:
# MAGIC - Connect to PostgreSQL successfully
# MAGIC - Load DailyRankings table with expected schema
# MAGIC - Verify data quality (row counts, date ranges, non-null values)
# MAGIC - Confirm genres field is populated

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Setup and Configuration

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import pandas as pd
from datetime import datetime, timedelta

# Initialize Spark session with optimized configuration
spark = SparkSession.builder \
    .appName("CatLog_Stage2_DataValidation") \
    .config("spark.sql.adaptive.enabled", "true") \
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
    .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
    .getOrCreate()

print(f"✅ Spark session initialized: {spark.version}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. PostgreSQL Connection Configuration

# COMMAND ----------

import os

# PostgreSQL connection configuration
postgres_config = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'), 
    'database': os.getenv('POSTGRES_DB', 'catlog'),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', ''),
}

# JDBC URL and properties
jdbc_url = f"jdbc:postgresql://{postgres_config['host']}:{postgres_config['port']}/{postgres_config['database']}"
connection_properties = {
    "user": postgres_config['user'],
    "password": postgres_config['password'], 
    "driver": "org.postgresql.Driver",
    "fetchsize": "1000",
    "batchsize": "1000"
}

print(f"📡 JDBC URL: {jdbc_url}")
print(f"👤 Connecting as user: {postgres_config['user']}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Test PostgreSQL Connection

# COMMAND ----------

try:
    # Test connection with a simple query
    test_df = spark.read \
        .format("jdbc") \
        .option("url", jdbc_url) \
        .option("dbtable", "(SELECT 1 as test_connection) as test") \
        .options(**connection_properties) \
        .load()
    
    result = test_df.collect()[0][0]
    print(f"✅ PostgreSQL connection successful! Test result: {result}")
    
except Exception as e:
    print(f"❌ PostgreSQL connection failed: {str(e)}")
    raise e

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Load and Validate DailyRankings Schema

# COMMAND ----------

# Load DailyRankings table
print("📊 Loading DailyRankings table...")

daily_rankings = spark.read \
    .format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "DailyRankings") \
    .options(**connection_properties) \
    .load()

# Cache the DataFrame for multiple operations
daily_rankings.cache()

print("✅ DailyRankings loaded successfully!")
print("\n🏗️ Schema:")
daily_rankings.printSchema()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Data Quality Validation

# COMMAND ----------

# Basic statistics
total_rows = daily_rankings.count()
print(f"📈 Total rows in DailyRankings: {total_rows:,}")

# Date range analysis
date_stats = daily_rankings.select(
    min("snapshotDate").alias("earliest_date"),
    max("snapshotDate").alias("latest_date"),
    countDistinct("snapshotDate").alias("unique_dates"),
    countDistinct("malId").alias("unique_anime")
).collect()[0]

print(f"\n📅 Date Range:")
print(f"  Earliest: {date_stats['earliest_date']}")
print(f"  Latest: {date_stats['latest_date']}")
print(f"  Unique dates: {date_stats['unique_dates']:,}")
print(f"  Unique anime: {date_stats['unique_anime']:,}")

# Data completeness check
completeness = daily_rankings.select(
    (count("*") - count("malId")).alias("missing_malId"),
    (count("*") - count("snapshotDate")).alias("missing_snapshotDate"),
    (count("*") - count("rank")).alias("missing_rank"),
    (count("*") - count("score")).alias("missing_score"),
    (count("*") - count("genres")).alias("missing_genres")
).collect()[0]

print(f"\n🔍 Data Completeness:")
for field, missing_count in completeness.asDict().items():
    missing_percent = (missing_count / total_rows) * 100
    print(f"  {field}: {missing_count:,} missing ({missing_percent:.1f}%)")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Genres Field Validation (Stage 2 Enhancement)

# COMMAND ----------

# Check genres field population
genres_stats = daily_rankings.select(
    count("*").alias("total_rows"),
    count("genres").alias("rows_with_genres"),
    sum(when(size("genres") > 0, 1).otherwise(0)).alias("rows_with_populated_genres")
).collect()[0]

genres_populated_percent = (genres_stats['rows_with_populated_genres'] / genres_stats['total_rows']) * 100

print(f"🎭 Genres Field Analysis:")
print(f"  Total rows: {genres_stats['total_rows']:,}")
print(f"  Rows with genres field: {genres_stats['rows_with_genres']:,}")
print(f"  Rows with populated genres: {genres_stats['rows_with_populated_genres']:,} ({genres_populated_percent:.1f}%)")

# Show sample genres
print(f"\n📋 Sample genres data:")
daily_rankings.select("malId", "snapshotDate", "genres") \
    .filter(size("genres") > 0) \
    .show(10, truncate=False)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Time Series Data Validation

# COMMAND ----------

# Check for consistent daily data
recent_30_days = daily_rankings.filter(
    col("snapshotDate") >= (current_date() - expr("INTERVAL 30 DAYS"))
)

daily_counts = recent_30_days.groupBy("snapshotDate") \
    .agg(
        count("*").alias("daily_row_count"),
        countDistinct("malId").alias("unique_anime_per_day")
    ) \
    .orderBy("snapshotDate")

print("📊 Recent 30 days data consistency:")
daily_counts.show(30)

# Identify any missing days
expected_days = 30
actual_days = daily_counts.count()
print(f"\n📅 Data Consistency Check:")
print(f"  Expected days (last 30): {expected_days}")
print(f"  Actual days with data: {actual_days}")
print(f"  Missing days: {expected_days - actual_days}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Performance Baseline

# COMMAND ----------

import time

# Test query performance for rolling window operations
print("⏱️ Performance baseline for rolling window queries...")

start_time = time.time()

# Simulate a 7-day rolling average query
rolling_test = daily_rankings.filter(
    col("snapshotDate") >= (current_date() - expr("INTERVAL 60 DAYS"))
).select(
    "malId", 
    "snapshotDate", 
    "rank", 
    "score"
).orderBy("malId", "snapshotDate")

result_count = rolling_test.count()
end_time = time.time()

print(f"✅ Query completed in {end_time - start_time:.2f} seconds")
print(f"📊 Processed {result_count:,} rows for 60-day window")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 9. Validation Summary

# COMMAND ----------

# Validation summary
print("🎯 STAGE 2 DATA VALIDATION SUMMARY")
print("=" * 50)

validation_results = {
    "PostgreSQL Connection": "✅ Success",
    "DailyRankings Schema": "✅ Valid with genres field",
    "Total Data Rows": f"✅ {total_rows:,} rows",
    "Date Range": f"✅ {date_stats['unique_dates']} days of data",
    "Genres Population": f"✅ {genres_populated_percent:.1f}% of rows have genres",
    "Data Consistency": f"✅ {actual_days}/{expected_days} recent days",
    "Query Performance": f"✅ {end_time - start_time:.2f}s for 60-day window"
}

for check, status in validation_results.items():
    print(f"{check}: {status}")

# Check if ready for Stage 2 analytics
days_of_data = date_stats['unique_dates']
genres_threshold = 80.0  # 80% of rows should have genres

ready_for_stage2 = (
    total_rows > 1000 and 
    days_of_data >= 30 and 
    genres_populated_percent >= genres_threshold
)

print("\n🚀 READINESS FOR STAGE 2 SPARK ANALYTICS:")
if ready_for_stage2:
    print("✅ READY! Proceed to rolling momentum analysis")
else:
    print("⚠️ NOT READY. Requirements:")
    print(f"   - Need ≥30 days of data (have {days_of_data})")
    print(f"   - Need ≥80% genres population (have {genres_populated_percent:.1f}%)")
    print(f"   - Need ≥1000 rows (have {total_rows:,})")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 10. Next Steps
# MAGIC 
# MAGIC If validation passes:
# MAGIC 1. ✅ Run `02_rolling_momentum.py` for 7/30-day rolling averages
# MAGIC 2. ✅ Run `03_volatility.py` for rolling standard deviation
# MAGIC 3. ✅ Run `04_genre_percentiles.py` for genre-based analytics
# MAGIC 4. ✅ Run `05_trend_significance.py` for statistical analysis
# MAGIC 5. ✅ Run `06_correlation_matrix.py` for correlation analysis
# MAGIC 
# MAGIC If validation fails:
# MAGIC - Run more ETL cycles to accumulate 30+ days of data
# MAGIC - Verify genres field is being populated correctly
# MAGIC - Check PostgreSQL connection configuration
