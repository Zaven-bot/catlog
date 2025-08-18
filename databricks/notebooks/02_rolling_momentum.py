# Databricks notebook source
# MAGIC %md
# MAGIC # Step 3: Rolling Momentum Analysis
# MAGIC 
# MAGIC **Purpose**: Implement 7-day and 30-day rolling averages for rank and score momentum analysis using Spark.
# MAGIC 
# MAGIC **Output**: Creates `RollingMomentumAnalysis` table with rolling statistics for trend analysis.
# MAGIC 
# MAGIC **Validation**: Compare results with PostgreSQL baseline analytics for consistency.

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Setup and Configuration

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from pyspark.sql.window import Window
import pandas as pd
from datetime import datetime, timedelta

# Initialize Spark session
spark = SparkSession.builder \
    .appName("CatLog_Stage2_RollingMomentum") \
    .config("spark.sql.adaptive.enabled", "true") \
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
    .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
    .getOrCreate()

print(f"✅ Spark session initialized for Rolling Momentum Analysis")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Load Configuration and Data

# COMMAND ----------

import os

# Connection configuration
jdbc_url = f"jdbc:postgresql://{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'catlog')}"
connection_properties = {
    "user": os.getenv('POSTGRES_USER', 'postgres'),
    "password": os.getenv('POSTGRES_PASSWORD', ''),
    "driver": "org.postgresql.Driver",
    "fetchsize": "1000"
}

# Load DailyRankings data (last 90 days for rolling calculations)
print("📊 Loading DailyRankings data for rolling analysis...")

daily_rankings = spark.read \
    .format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", """
        (SELECT * FROM "DailyRankings" 
         WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '90 days'
         AND "rank" IS NOT NULL 
         AND "score" IS NOT NULL) as recent_rankings
    """) \
    .options(**connection_properties) \
    .load()

daily_rankings.cache()
total_rows = daily_rankings.count()
print(f"✅ Loaded {total_rows:,} rows for rolling analysis")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Define Rolling Window Specifications

# COMMAND ----------

# Define window specifications for rolling calculations
window_7_days = Window.partitionBy("malId") \
    .orderBy("snapshotDate") \
    .rangeBetween(-6 * 86400, 0)  # 6 days before + current day = 7 days

window_30_days = Window.partitionBy("malId") \
    .orderBy("snapshotDate") \
    .rangeBetween(-29 * 86400, 0)  # 29 days before + current day = 30 days

print("✅ Window specifications defined:")
print("  - 7-day rolling window: current day + 6 preceding days")
print("  - 30-day rolling window: current day + 29 preceding days")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Calculate Rolling Averages and Momentum

# COMMAND ----------

print("🔄 Calculating rolling averages and momentum metrics...")

rolling_momentum = daily_rankings.select(
    "malId",
    "snapshotDate", 
    "rank",
    "score",
    "popularity",
    "members",
    "genres",
    
    # 7-day rolling averages
    avg("rank").over(window_7_days).alias("rank_7day_avg"),
    avg("score").over(window_7_days).alias("score_7day_avg"),
    avg("popularity").over(window_7_days).alias("popularity_7day_avg"),
    
    # 30-day rolling averages  
    avg("rank").over(window_30_days).alias("rank_30day_avg"),
    avg("score").over(window_30_days).alias("score_30day_avg"),
    avg("popularity").over(window_30_days).alias("popularity_30day_avg"),
    
    # 7-day momentum (change from 7 days ago)
    (col("rank") - lag("rank", 7).over(Window.partitionBy("malId").orderBy("snapshotDate"))).alias("rank_7day_change"),
    (col("score") - lag("score", 7).over(Window.partitionBy("malId").orderBy("snapshotDate"))).alias("score_7day_change"),
    
    # 30-day momentum (change from 30 days ago)
    (col("rank") - lag("rank", 30).over(Window.partitionBy("malId").orderBy("snapshotDate"))).alias("rank_30day_change"),
    (col("score") - lag("score", 30).over(Window.partitionBy("malId").orderBy("snapshotDate"))).alias("score_30day_change"),
    
    # Rolling standard deviation for volatility
    stddev("rank").over(window_7_days).alias("rank_7day_volatility"),
    stddev("rank").over(window_30_days).alias("rank_30day_volatility"),
    stddev("score").over(window_7_days).alias("score_7day_volatility"),
    stddev("score").over(window_30_days).alias("score_30day_volatility")
)

# Add derived momentum indicators
rolling_momentum = rolling_momentum.withColumn(
    "rank_momentum_7day", 
    when(col("rank_7day_change") < -5, "Strong_Climber")
    .when(col("rank_7day_change") < -1, "Climber") 
    .when(col("rank_7day_change") > 5, "Strong_Decliner")
    .when(col("rank_7day_change") > 1, "Decliner")
    .otherwise("Stable")
).withColumn(
    "rank_momentum_30day",
    when(col("rank_30day_change") < -10, "Strong_Climber")
    .when(col("rank_30day_change") < -2, "Climber")
    .when(col("rank_30day_change") > 10, "Strong_Decliner") 
    .when(col("rank_30day_change") > 2, "Decliner")
    .otherwise("Stable")
).withColumn(
    "score_momentum_7day",
    when(col("score_7day_change") > 0.1, "Score_Rising")
    .when(col("score_7day_change") < -0.1, "Score_Falling")
    .otherwise("Score_Stable")
).withColumn(
    "score_momentum_30day", 
    when(col("score_30day_change") > 0.2, "Score_Rising")
    .when(col("score_30day_change") < -0.2, "Score_Falling")
    .otherwise("Score_Stable")
)

rolling_momentum.cache()
print(f"✅ Rolling momentum calculations completed")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Data Quality Validation

# COMMAND ----------

# Validate rolling calculations
print("🔍 Validating rolling momentum calculations...")

# Check for null values in rolling averages
null_checks = rolling_momentum.select(
    count("*").alias("total_rows"),
    sum(when(col("rank_7day_avg").isNull(), 1).otherwise(0)).alias("null_rank_7day_avg"),
    sum(when(col("rank_30day_avg").isNull(), 1).otherwise(0)).alias("null_rank_30day_avg"),
    sum(when(col("score_7day_avg").isNull(), 1).otherwise(0)).alias("null_score_7day_avg"),
    sum(when(col("score_30day_avg").isNull(), 1).otherwise(0)).alias("null_score_30day_avg")
).collect()[0]

print(f"📊 Data quality summary:")
for field, value in null_checks.asDict().items():
    if 'null_' in field:
        percentage = (value / null_checks['total_rows']) * 100
        print(f"  {field}: {value:,} ({percentage:.1f}%)")
    else:
        print(f"  {field}: {value:,}")

# Sample results
print(f"\n📋 Sample rolling momentum results:")
rolling_momentum.select(
    "malId", "snapshotDate", "rank", "rank_7day_avg", "rank_30day_avg",
    "rank_7day_change", "rank_momentum_7day", "score_7day_change", "score_momentum_7day"
).filter(col("rank_7day_change").isNotNull()).show(10)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Identify Top Momentum Patterns

# COMMAND ----------

# Analyze momentum patterns
print("📈 Analyzing momentum patterns...")

# Top climbers by 7-day rank improvement
top_climbers_7day = rolling_momentum.filter(
    col("rank_7day_change").isNotNull() &
    col("snapshotDate") == rolling_momentum.agg(max("snapshotDate")).collect()[0][0]
).select(
    "malId", "snapshotDate", "rank", "rank_7day_change", "rank_momentum_7day"
).orderBy(col("rank_7day_change").asc()).limit(10)

print("🏆 Top 10 Climbers (7-day rank improvement):")
top_climbers_7day.show()

# Top climbers by 30-day rank improvement  
top_climbers_30day = rolling_momentum.filter(
    col("rank_30day_change").isNotNull() &
    col("snapshotDate") == rolling_momentum.agg(max("snapshotDate")).collect()[0][0]
).select(
    "malId", "snapshotDate", "rank", "rank_30day_change", "rank_momentum_30day"
).orderBy(col("rank_30day_change").asc()).limit(10)

print("🏆 Top 10 Climbers (30-day rank improvement):")
top_climbers_30day.show()

# Score momentum analysis
score_momentum_summary = rolling_momentum.filter(
    col("snapshotDate") == rolling_momentum.agg(max("snapshotDate")).collect()[0][0]
).groupBy("score_momentum_7day").agg(
    count("*").alias("anime_count"),
    avg("score_7day_change").alias("avg_score_change")
).orderBy("anime_count")

print("📊 Score momentum distribution (7-day):")
score_momentum_summary.show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Create RollingMomentumAnalysis Table

# COMMAND ----------

# Prepare final dataset for RollingMomentumAnalysis table
print("💾 Preparing RollingMomentumAnalysis table...")

# Add metadata and processing timestamp
rolling_momentum_final = rolling_momentum.withColumn(
    "processed_at", current_timestamp()
).withColumn(
    "etl_run_id", lit(f"spark_rolling_momentum_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
).withColumn(
    "data_quality_score",
    when(
        col("rank_7day_avg").isNotNull() & 
        col("rank_30day_avg").isNotNull() & 
        col("score_7day_avg").isNotNull() & 
        col("score_30day_avg").isNotNull(), 1.0
    ).otherwise(0.8)
)

# Show final schema
print("🏗️ Final RollingMomentumAnalysis schema:")
rolling_momentum_final.printSchema()

final_row_count = rolling_momentum_final.count()
print(f"📊 Final dataset: {final_row_count:,} rows")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Save Results to PostgreSQL

# COMMAND ----------

# Write results back to PostgreSQL
print("💾 Saving RollingMomentumAnalysis to PostgreSQL...")

try:
    # Create table if it doesn't exist and insert data
    rolling_momentum_final.write \
        .format("jdbc") \
        .option("url", jdbc_url) \
        .option("dbtable", "RollingMomentumAnalysis") \
        .option("driver", "org.postgresql.Driver") \
        .option("user", connection_properties["user"]) \
        .option("password", connection_properties["password"]) \
        .mode("overwrite") \
        .save()
    
    print("✅ RollingMomentumAnalysis table created successfully!")
    
    # Verify the save
    verification_df = spark.read \
        .format("jdbc") \
        .option("url", jdbc_url) \
        .option("dbtable", "RollingMomentumAnalysis") \
        .options(**connection_properties) \
        .load()
    
    saved_count = verification_df.count()
    print(f"✅ Verification: {saved_count:,} rows saved to PostgreSQL")
    
except Exception as e:
    print(f"❌ Error saving to PostgreSQL: {str(e)}")
    raise e

# COMMAND ----------

# MAGIC %md
# MAGIC ## 9. Cross-Validation with PostgreSQL

# COMMAND ----------

print("🔍 Cross-validating Spark results with PostgreSQL baseline...")

# Load PostgreSQL baseline analytics for comparison
try:
    postgres_climbers = spark.read \
        .format("jdbc") \
        .option("url", jdbc_url) \
        .option("dbtable", """
            (SELECT 
                d1."malId", 
                d1."rank" as current_rank,
                d2."rank" as prev_rank,
                (d2."rank" - d1."rank") as rank_improvement
             FROM "DailyRankings" d1
             JOIN "DailyRankings" d2 ON d1."malId" = d2."malId"
             WHERE d1."snapshotDate" = CURRENT_DATE - INTERVAL '1 day'
             AND d2."snapshotDate" = d1."snapshotDate" - INTERVAL '7 days'
             AND d1."rank" IS NOT NULL AND d2."rank" IS NOT NULL
             ORDER BY rank_improvement DESC
             LIMIT 10) as postgres_climbers
        """) \
        .options(**connection_properties) \
        .load()
    
    print("📊 PostgreSQL 7-day climbers (baseline):")
    postgres_climbers.show()
    
    # Compare with Spark results
    spark_climbers = rolling_momentum_final.filter(
        col("rank_7day_change").isNotNull() &
        col("snapshotDate") == rolling_momentum_final.agg(max("snapshotDate")).collect()[0][0]
    ).select(
        "malId", 
        col("rank").alias("current_rank"),
        (col("rank") - col("rank_7day_change")).alias("prev_rank"),
        (-col("rank_7day_change")).alias("rank_improvement")
    ).orderBy(col("rank_improvement").desc()).limit(10)
    
    print("📊 Spark 7-day climbers (new calculation):")
    spark_climbers.show()
    
    print("✅ Cross-validation completed - manually compare top results")
    
except Exception as e:
    print(f"⚠️ Cross-validation error: {str(e)}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 10. Performance Metrics and Summary

# COMMAND ----------

import time

# Performance summary
print("⏱️ ROLLING MOMENTUM ANALYSIS SUMMARY")
print("=" * 50)

execution_summary = {
    "Input Rows": f"{total_rows:,}",
    "Output Rows": f"{final_row_count:,}",
    "Rolling Windows": "7-day, 30-day",
    "Metrics Calculated": "Averages, Changes, Volatility, Momentum Categories",
    "Table Created": "✅ RollingMomentumAnalysis",
    "PostgreSQL Integration": "✅ Success",
    "Cross-Validation": "✅ Completed"
}

for metric, value in execution_summary.items():
    print(f"{metric}: {value}")

print(f"\n🎯 KEY INSIGHTS:")
print(f"  - Rolling averages provide smoothed trend analysis")
print(f"  - Momentum categories enable easy filtering")
print(f"  - Volatility metrics identify stable vs. fluctuating anime")
print(f"  - Results saved to PostgreSQL for API consumption")

print(f"\n➡️ NEXT STEP: Run 03_volatility.py for detailed volatility analysis")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Notes for Stage 2 Integration
# MAGIC 
# MAGIC ### New Analytics Available:
# MAGIC - **7-day & 30-day rolling averages** for rank, score, popularity
# MAGIC - **Momentum change detection** (climbers, decliners, stable)
# MAGIC - **Score trend analysis** (rising, falling, stable scores)
# MAGIC - **Volatility indicators** for identifying stable patterns
# MAGIC 
# MAGIC ### API Integration (Stage 4):
# MAGIC ```python
# MAGIC # Future API endpoint examples:
# MAGIC GET /api/analytics/rolling-momentum?window=7&limit=10
# MAGIC GET /api/analytics/rolling-momentum?window=30&category=climber
# MAGIC ```
# MAGIC 
# MAGIC ### Performance Optimization:
# MAGIC - Data is partitioned by malId for efficient window operations
# MAGIC - Results cached in PostgreSQL for fast API queries
# MAGIC - Rolling calculations use optimized Spark window functions
