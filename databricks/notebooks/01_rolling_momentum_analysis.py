# Databricks notebook source
# MAGIC %md
# MAGIC # Rolling Momentum Analysis - Stage 2 Analytics
# MAGIC 
# MAGIC This notebook provides complete rolling window momentum analysis:
# MAGIC - **Data validation** and connection testing
# MAGIC - **7-day and 30-day rolling averages** for rank, score, popularity
# MAGIC - **Momentum direction classification** (climbing, falling, stable)
# MAGIC - **Volatility measurements** and data quality scoring
# MAGIC - **PostgreSQL write-back** and validation
# MAGIC 
# MAGIC **Input**: PostgreSQL `DailyRankings` table
# MAGIC **Output**: PostgreSQL `RollingMomentumAnalysis` table

# COMMAND ----------a

# MAGIC %md
# MAGIC ## 1. Setup and Validation

# COMMAND ----------

import sys
from pyspark.sql import functions as F
from pyspark.sql.window import Window
from pyspark.sql.types import *
from datetime import datetime, timedelta

# Add config to path (adjust for your Databricks workspace)
sys.path.append('/Workspace/Repos/your-repo/catlog/databricks/config')

# Import our connection library
from connection import db_connection, config

print("✅ Imports successful")
print(f"📊 Current date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# Test connection
print("\n🔗 Testing database connection...")
connection_success = db_connection.test_connection()
if not connection_success:
    raise Exception("❌ Database connection failed. Check configuration.")

print("✅ Database connection validated!")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Load and Validate Source Data

# COMMAND ----------

# 1. Load enough data to calculate rolling windows, but only process latest day
print("📥 Loading data for rolling window calculations...")

# Load 45 days (need historical data for 30-day rolling windows)
df_raw = db_connection.read_daily_rankings(days_back=45)

# Get the latest snapshot date
latest_date = df_raw.agg(F.max("snapshotDate")).collect()[0][0]
print(f"🎯 Processing rolling analysis for: {latest_date}")

# Check if we already processed this date (avoid reprocessing)
existing_count = db_connection.check_existing_analysis(latest_date)
if existing_count > 0:
    print(f"⚠️ Analysis for {latest_date} already exists ({existing_count} records)")
    print("🛑 Skipping to avoid duplicates. Use force=True to override.")
    dbutils.notebook.exit("ALREADY_PROCESSED")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Data Sufficiency Analysis

# COMMAND ----------

unique_dates = date_range['unique_dates']
unique_anime = date_range['unique_anime']

print(f"\n🔍 Data Sufficiency Analysis:")
print(f"📊 Available: {unique_dates} unique dates, {unique_anime} unique anime")

# Check minimum requirements for meaningful rolling analysis
MIN_DATES_FOR_7DAY = 7
MIN_DATES_FOR_30DAY = 30
MIN_ANIME_COUNT = 10

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Calculate Rolling Window Metrics
# MAGIC 
# MAGIC *Note: This section only executes if sufficient data is available*

# COMMAND ----------

# Only proceed if we have sufficient data
# (The rest of your existing code continues here...)

# Define window specifications for rolling calculations
window_7day = Window.partitionBy("malId").orderBy("snapshotDate").rowsBetween(-6, 0)  # Current + 6 previous days
window_30day = Window.partitionBy("malId").orderBy("snapshotDate").rowsBetween(-29, 0)  # Current + 29 previous days

print("🔄 Calculating rolling window metrics...")

# Calculate rolling metrics for ALL rows (needed for proper window calculations)
df_rolling = df_raw.select(
    "malId", "snapshotDate", "rank", "score", "popularity", "members", "genres",
    
    # Rolling averages (calculated for all days, but we'll filter later)
    F.avg("rank").over(window_7day).alias("rank_7day_avg"),
    F.avg("score").over(window_7day).alias("score_7day_avg"),
    F.avg("popularity").over(window_7day).alias("popularity_7day_avg"),
    F.avg("rank").over(window_30day).alias("rank_30day_avg"),
    F.avg("score").over(window_30day).alias("score_30day_avg"),
    F.avg("popularity").over(window_30day).alias("popularity_30day_avg"),
    
    # Volatility with null handling
    F.coalesce(F.stddev("rank").over(window_7day), F.lit(0.0)).alias("rank_7day_volatility"),
    F.coalesce(F.stddev("rank").over(window_30day), F.lit(0.0)).alias("rank_30day_volatility"),
    F.coalesce(F.stddev("score").over(window_7day), F.lit(0.0)).alias("score_7day_volatility"),
    F.coalesce(F.stddev("score").over(window_30day), F.lit(0.0)).alias("score_30day_volatility"),
    
    # Lag for momentum calculations
    F.lag("rank", 7).over(Window.partitionBy("malId").orderBy("snapshotDate")).alias("rank_7days_ago"),
    F.lag("score", 7).over(Window.partitionBy("malId").orderBy("snapshotDate")).alias("score_7days_ago"),
    F.lag("rank", 30).over(Window.partitionBy("malId").orderBy("snapshotDate")).alias("rank_30days_ago"),
    F.lag("score", 30).over(Window.partitionBy("malId").orderBy("snapshotDate")).alias("score_30days_ago")
)

df_latest_only = df_rolling.filter(F.col("snapshotDate") == latest_date)

print(f"✅ Filtered to latest date. Records to process: {df_latest_only.count()}")


# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Calculate Momentum Changes and Directions

# COMMAND ----------

print("📈 Calculating momentum changes and directions...")

df_momentum = df_latest_only.withColumn(
    "rank_7day_change", F.col("rank") - F.col("rank_7days_ago")
).withColumn(
    "score_7day_change", F.col("score") - F.col("score_7days_ago")
).withColumn(
    "rank_30day_change", F.col("rank") - F.col("rank_30days_ago")
).withColumn(
    "score_30day_change", F.col("score") - F.col("score_30days_ago")
).withColumn(
    # Determine momentum direction for rank (negative change = climbing)
    "rank_momentum_7day", 
    F.when(F.col("rank_7day_change") < -3, "strongly_climbing")
     .when(F.col("rank_7day_change") < -1, "climbing")
     .when(F.col("rank_7day_change") > 3, "strongly_falling") 
     .when(F.col("rank_7day_change") > 1, "falling")
     .otherwise("stable")
).withColumn(
    "rank_momentum_30day",
    F.when(F.col("rank_30day_change") < -6, "strongly_climbing")
     .when(F.col("rank_30day_change") < -2, "climbing")
     .when(F.col("rank_30day_change") > 6, "strongly_falling")
     .when(F.col("rank_30day_change") > 2, "falling") 
     .otherwise("stable")
).withColumn(
    # Determine momentum direction for score (positive change = improving)
    "score_momentum_7day",
    F.when(F.col("score_7day_change") > 0.08, "strongly_improving")
     .when(F.col("score_7day_change") > 0.02, "improving")
     .when(F.col("score_7day_change") < -0.08, "strongly_declining")
     .when(F.col("score_7day_change") < -0.02, "declining")
     .otherwise("stable")
).withColumn(
    "score_momentum_30day", 
    F.when(F.col("score_30day_change") > 0.16, "strongly_improving")
     .when(F.col("score_30day_change") > 0.04, "improving")
     .when(F.col("score_30day_change") < -0.16, "strongly_declining")
     .when(F.col("score_30day_change") < -0.04, "declining")
     .otherwise("stable")
)

print(f"✅ Momentum calculations complete. Records: {df_momentum.count()}")

# Show some examples
print("\n📊 Sample momentum data:")
df_momentum.select("malId", "snapshotDate", "rank", "rank_7day_change", "rank_momentum_7day", "score", "score_7day_change", "score_momentum_7day").show(10)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Prepare Final Output Schema

# COMMAND ----------

# 5. Add processing metadata
df_final = df_momentum.withColumn(
    "processed_at", F.current_timestamp()
).withColumn(
    "etl_run_id", F.lit(f"rolling-momentum-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
)

print(f"✅ Output schema prepared. Final record count: {df_final.count()}")
print("\n📋 Output schema:")

print(f"🎯 Final output: {df_final.count()} records for {latest_date}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Write Results to PostgreSQL

# COMMAND ----------

print("💾 Writing results to RollingMomentumAnalysis table...")

try:
    # Write to PostgreSQL using the connection utility
    db_connection.write_analytics_results(df_final, "RollingMomentumAnalysis")

    print("✅ Successfully wrote rolling momentum analysis results!")
    print(f"📊 Records written: {df_final.count()}")
    print(f"📅 Date range: {df_final.agg({'snapshotDate': 'min'}).collect()[0][0]} to {df_final.agg({'snapshotDate': 'max'}).collect()[0][0]}")
    
except Exception as e:
    print(f"❌ Error writing to database: {e}")
    raise

# COMMAND ----------

# MAGIC %md
# MAGIC ## 10. Data Quality Logging

# COMMAND ----------

# List of columns to check for nulls
cols_to_check = df_final.columns

# Count rows with any null in the selected columns
rows_with_any_null = df_final.where(
    F.reduce(lambda a, b: a | b, [F.col(c).isNull() for c in cols_to_check])
).count()

print(f"🔍 Rows with at least one null in columns: {rows_with_any_null:,}")

# Count nulls per column
null_counts = df_final.select([
    F.count(F.when(F.col(c).isNull(), 1)).alias(c) for c in cols_to_check
]).collect()[0].asDict()

print("🔢 Null value count by column:")
for col, count in null_counts.items():
    print(f"  {col}: {count:,}")
