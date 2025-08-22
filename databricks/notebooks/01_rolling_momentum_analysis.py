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

# COMMAND ----------

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

# Load the last 45 days of ranking data (need extra for 30-day rolling windows)
print("📥 Loading DailyRankings data...")

df_raw = db_connection.read_daily_rankings(days_back=45)
df_raw.cache()  # Cache for multiple operations

total_rows = df_raw.count()
print(f"✅ Loaded {total_rows:,} records from DailyRankings")

# Validate data quality
date_range = df_raw.agg(
    F.min("snapshotDate").alias("min_date"),
    F.max("snapshotDate").alias("max_date"),
    F.countDistinct("snapshotDate").alias("unique_dates"),
    F.countDistinct("malId").alias("unique_anime")
).collect()[0]

print(f"📅 Date range: {date_range['min_date']} to {date_range['max_date']}")
print(f"📊 {date_range['unique_dates']} unique dates, {date_range['unique_anime']} unique anime")

# Check data completeness
completeness = df_raw.select(
    F.sum(F.when(F.col("rank").isNull(), 1).otherwise(0)).alias("missing_rank"),
    F.sum(F.when(F.col("score").isNull(), 1).otherwise(0)).alias("missing_score"),
    F.sum(F.when(F.col("genres").isNull(), 1).otherwise(0)).alias("missing_genres"),
    F.sum(F.when(F.size("genres") == 0, 1).otherwise(0)).alias("empty_genres")
).collect()[0]

print(f"\n🔍 Data Quality Check:")
print(f"  Missing rank: {completeness['missing_rank']:,}")
print(f"  Missing score: {completeness['missing_score']:,}")
print(f"  Missing genres: {completeness['missing_genres']:,}")
print(f"  Empty genres: {completeness['empty_genres']:,}")

# Show sample
print("\n📋 Sample data:")
df_raw.show(5)

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

# Analyze what we can and cannot do
issues = []
capabilities = []

if unique_dates < MIN_DATES_FOR_7DAY:
    issues.append(f"❌ Need {MIN_DATES_FOR_7DAY} days for 7-day rolling windows (have {unique_dates})")
else:
    capabilities.append(f"✅ Can calculate 7-day rolling windows ({unique_dates} days available)")

if unique_dates < MIN_DATES_FOR_30DAY:
    issues.append(f"❌ Need {MIN_DATES_FOR_30DAY} days for 30-day rolling windows (have {unique_dates})")
else:
    capabilities.append(f"✅ Can calculate 30-day rolling windows ({unique_dates} days available)")

if unique_anime < MIN_ANIME_COUNT:
    issues.append(f"❌ Need at least {MIN_ANIME_COUNT} anime for meaningful analysis (have {unique_anime})")
else:
    capabilities.append(f"✅ Sufficient anime diversity ({unique_anime} anime)")

# Display results
if capabilities:
    print(f"\n✅ Current Capabilities:")
    for cap in capabilities:
        print(f"   {cap}")

if issues:
    print(f"\n❌ Current Limitations:")
    for issue in issues:
        print(f"   {issue}")

# Decide whether to proceed
CAN_PROCEED = len(issues) == 0

if not CAN_PROCEED:
    print(f"\n🛑 INSUFFICIENT DATA FOR ROLLING MOMENTUM ANALYSIS")
    print(f"\n📋 To proceed, you need:")
    print(f"   • At least {MIN_DATES_FOR_7DAY} days of data for basic rolling windows")
    print(f"   • At least {MIN_DATES_FOR_30DAY} days of data for comprehensive analysis")
    print(f"   • At least {MIN_ANIME_COUNT} different anime for meaningful patterns")
    
    print(f"\n🔧 How to get more data:")
    print(f"   • Run your ETL pipeline for {MIN_DATES_FOR_7DAY - unique_dates} more days")
    print(f"   • Ensure your scraping is collecting diverse anime rankings")
    print(f"   • Consider lowering the minimum thresholds for testing purposes")
    
    print(f"\n📊 Current data summary:")
    print(f"   • Date range: {date_range['min_date']} to {date_range['max_date']}")
    print(f"   • Total records: {total_rows:,}")
    print(f"   • Unique dates: {unique_dates}")
    print(f"   • Unique anime: {unique_anime}")
    
    print(f"\n✅ Data structure looks good - just need more volume!")
    print(f"🎯 This notebook will work perfectly once you have {MIN_DATES_FOR_7DAY}+ days of data.")
    
    # Stop execution here
    dbutils.notebook.exit("INSUFFICIENT_DATA")

else:
    print(f"\n🚀 SUFFICIENT DATA - Proceeding with analysis!")
    print(f"🎯 All requirements met for rolling momentum analysis.")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Calculate Rolling Window Metrics
# MAGIC 
# MAGIC *Note: This section only executes if sufficient data is available*

# COMMAND ----------

# Only proceed if we have sufficient data
# (The rest of your existing code continues here...)

# Define window specifications for rolling calculations
window_7day = Window.partitionBy("malId").orderBy("snapshotDate").rowsBetween(-6, 0)  # Current + 6 previous days
window_30day = Window.partitionBy("malId").orderBy("snapshotDate").rowsBetween(-29, 0)  # Current + 29 previous days

print("🔄 Calculating rolling window metrics...")

# Calculate rolling averages and volatility
df_rolling = df_raw.select(
    "malId",
    "snapshotDate",
    "rank",
    "score", 
    "popularity",
    "members",
    "genres",
    
    # 7-day rolling metrics
    F.avg("rank").over(window_7day).alias("rank_7day_avg"),
    F.avg("score").over(window_7day).alias("score_7day_avg"),
    F.avg("popularity").over(window_7day).alias("popularity_7day_avg"),
    F.stddev("rank").over(window_7day).alias("rank_7day_volatility"),
    F.stddev("score").over(window_7day).alias("score_7day_volatility"),
    
    # 30-day rolling metrics  
    F.avg("rank").over(window_30day).alias("rank_30day_avg"),
    F.avg("score").over(window_30day).alias("score_30day_avg"),
    F.avg("popularity").over(window_30day).alias("popularity_30day_avg"),
    F.stddev("rank").over(window_30day).alias("rank_30day_volatility"),
    F.stddev("score").over(window_30day).alias("score_30day_volatility"),
    
    # Calculate momentum (change from rolling average)
    F.lag("rank", 7).over(Window.partitionBy("malId").orderBy("snapshotDate")).alias("rank_7days_ago"),
    F.lag("score", 7).over(Window.partitionBy("malId").orderBy("snapshotDate")).alias("score_7days_ago"),
    F.lag("rank", 30).over(Window.partitionBy("malId").orderBy("snapshotDate")).alias("rank_30days_ago"),
    F.lag("score", 30).over(Window.partitionBy("malId").orderBy("snapshotDate")).alias("score_30days_ago")
)

print(f"✅ Rolling calculations complete. Records: {df_rolling.count()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Calculate Momentum Changes and Directions

# COMMAND ----------

print("📈 Calculating momentum changes and directions...")

df_momentum = df_rolling.withColumn(
    # Calculate changes (rank going down = improvement, so negative change is good)
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
# MAGIC ## 6. Calculate Data Quality Score

# COMMAND ----------

print("🔍 Calculating data quality scores...")

# Calculate data quality based on completeness and consistency
df_final = df_momentum.withColumn(
    "data_quality_score",
    F.when(F.col("rank").isNull() | F.col("score").isNull(), 0.0)
     .when(F.col("rank_7day_volatility").isNull(), 0.3)  # Not enough data for 7-day window
     .when(F.col("rank_30day_volatility").isNull(), 0.6)  # Not enough data for 30-day window  
     .when((F.col("rank") < 1) | (F.col("rank") > 10000), 0.2)  # Suspicious rank values
     .when((F.col("score") < 0) | (F.col("score") > 10), 0.2)  # Suspicious score values
     .otherwise(1.0)
).withColumn(
    # Add processing metadata
    "processed_at", F.current_timestamp()
).withColumn(
    "etl_run_id", F.lit(f"rolling-momentum-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
)

print(f"✅ Data quality scoring complete. Records: {df_final.count()}")

# Show quality distribution
print("\n📊 Data quality distribution:")
df_final.groupBy("data_quality_score").count().orderBy("data_quality_score").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Prepare Final Output Schema

# COMMAND ----------

# Select and order columns to match the RollingMomentumAnalysis table schema
df_output = df_final.select(
    "malId",
    "snapshotDate", 
    "rank",
    "score",
    "popularity",
    "members",
    "genres",
    F.round("rank_7day_avg", 2).alias("rank_7day_avg"),
    F.round("score_7day_avg", 2).alias("score_7day_avg"), 
    F.round("popularity_7day_avg", 2).alias("popularity_7day_avg"),
    F.round("rank_30day_avg", 2).alias("rank_30day_avg"),
    F.round("score_30day_avg", 2).alias("score_30day_avg"),
    F.round("popularity_30day_avg", 2).alias("popularity_30day_avg"),
    "rank_7day_change",
    F.round("score_7day_change", 2).alias("score_7day_change"),
    "rank_30day_change", 
    F.round("score_30day_change", 2).alias("score_30day_change"),
    F.round("rank_7day_volatility", 2).alias("rank_7day_volatility"),
    F.round("rank_30day_volatility", 2).alias("rank_30day_volatility"),
    F.round("score_7day_volatility", 2).alias("score_7day_volatility"),
    F.round("score_30day_volatility", 2).alias("score_30day_volatility"),
    "rank_momentum_7day",
    "rank_momentum_30day",
    "score_momentum_7day", 
    "score_momentum_30day",
    F.round("data_quality_score", 2).alias("data_quality_score"),
    "processed_at",
    "etl_run_id"
)

print(f"✅ Output schema prepared. Final record count: {df_output.count()}")
print("\n📋 Output schema:")
df_output.printSchema()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Write Results to PostgreSQL

# COMMAND ----------

print("💾 Writing results to RollingMomentumAnalysis table...")

try:
    # Write to PostgreSQL using the connection utility
    db_connection.write_analytics_results(df_output, "RollingMomentumAnalysis")
    
    print("✅ Successfully wrote rolling momentum analysis results!")
    print(f"📊 Records written: {df_output.count()}")
    print(f"📅 Date range: {df_output.agg({'snapshotDate': 'min'}).collect()[0][0]} to {df_output.agg({'snapshotDate': 'max'}).collect()[0][0]}")
    
except Exception as e:
    print(f"❌ Error writing to database: {e}")
    raise

# COMMAND ----------

# MAGIC %md
# MAGIC ## 9. Validation and Summary

# COMMAND ----------

print("🔍 Running validation checks...")

# Validation 1: Check for recent data
latest_date = df_output.agg({"snapshotDate": "max"}).collect()[0][0]
days_old = (datetime.now().date() - latest_date).days

if days_old <= 1:
    print(f"✅ Data freshness: Latest data is {days_old} day(s) old")
else:
    print(f"⚠️ Data freshness: Latest data is {days_old} day(s) old - may need ETL update")

# Validation 2: Check momentum distribution
print("\n📊 Momentum distribution (7-day rank):")
df_output.groupBy("rank_momentum_7day").count().orderBy("count", ascending=False).show()

print("\n📊 Momentum distribution (7-day score):")
df_output.groupBy("score_momentum_7day").count().orderBy("count", ascending=False).show()

# Validation 3: Check for strongly climbing anime
strong_climbers = df_output.filter(F.col("rank_momentum_7day") == "strongly_climbing").orderBy("rank_7day_change")

print(f"\n🚀 Strongly climbing anime (7-day): {strong_climbers.count()} found")
if strong_climbers.count() > 0:
    strong_climbers.select("malId", "rank", "rank_7day_change", "score", "score_7day_change").show(5)

print("\n✅ Rolling Momentum Analysis Complete!")
print(f"🎯 Job completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# COMMAND ----------

# List of columns to check for nulls
cols_to_check = df_momentum.columns

# Count rows with any null in the selected columns
rows_with_any_null = df_momentum.where(
    F.reduce(lambda a, b: a | b, [F.col(c).isNull() for c in cols_to_check])
).count()

print(f"🔍 Rows with at least one null in columns: {rows_with_any_null:,}")

# Count nulls per column
null_counts = df_momentum.select([
    F.count(F.when(F.col(c).isNull(), 1)).alias(c) for c in cols_to_check
]).collect()[0].asDict()

print("🔢 Null value count by column:")
for col, count in null_counts.items():
    print(f"  {col}: {count:,}")

# Add processing metadata (optional, if you want to keep these columns)
df_final = df_momentum.withColumn(
    "processed_at", F.current_timestamp()
).withColumn(
    "etl_run_id", F.lit(f"rolling-momentum-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
)

print(f"✅ Data quality logging complete. Records: {df_final.count()}")