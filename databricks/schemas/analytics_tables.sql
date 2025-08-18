-- Stage 2 Analytics Tables DDL
-- These tables store the output of Databricks Spark analytics jobs

-- =============================================================================
-- 1. RollingMomentumAnalysis
-- =============================================================================
-- Purpose: Store 7-day and 30-day rolling averages and momentum calculations
-- Source: DailyRankings table via Spark rolling window operations

CREATE TABLE IF NOT EXISTS "RollingMomentumAnalysis" (
    "id" SERIAL PRIMARY KEY,
    "malId" INTEGER NOT NULL,
    "snapshotDate" DATE NOT NULL,
    
    -- Current values
    "rank" INTEGER,
    "score" DECIMAL(4,2),
    "popularity" INTEGER,
    "members" INTEGER,
    "genres" TEXT[],
    
    -- 7-day rolling averages
    "rank_7day_avg" DECIMAL(8,2),
    "score_7day_avg" DECIMAL(4,2), 
    "popularity_7day_avg" DECIMAL(10,2),
    
    -- 30-day rolling averages
    "rank_30day_avg" DECIMAL(8,2),
    "score_30day_avg" DECIMAL(4,2),
    "popularity_30day_avg" DECIMAL(10,2),
    
    -- Momentum changes (difference from N days ago)
    "rank_7day_change" INTEGER,
    "score_7day_change" DECIMAL(4,2),
    "rank_30day_change" INTEGER, 
    "score_30day_change" DECIMAL(4,2),
    
    -- Volatility (rolling standard deviation)
    "rank_7day_volatility" DECIMAL(8,2),
    "rank_30day_volatility" DECIMAL(8,2),
    "score_7day_volatility" DECIMAL(4,2),
    "score_30day_volatility" DECIMAL(4,2),
    
    -- Categorical momentum indicators
    "rank_momentum_7day" VARCHAR(20), -- 'Strong_Climber', 'Climber', 'Stable', 'Decliner', 'Strong_Decliner'
    "rank_momentum_30day" VARCHAR(20),
    "score_momentum_7day" VARCHAR(20), -- 'Score_Rising', 'Score_Stable', 'Score_Falling'
    "score_momentum_30day" VARCHAR(20),
    
    -- Processing metadata
    "data_quality_score" DECIMAL(3,2), -- 0.8-1.0 based on data completeness
    "processed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etl_run_id" VARCHAR(100) NOT NULL,
    
    CONSTRAINT "RollingMomentumAnalysis_unique" UNIQUE ("malId", "snapshotDate")
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS "idx_rolling_momentum_malId" ON "RollingMomentumAnalysis" ("malId");
CREATE INDEX IF NOT EXISTS "idx_rolling_momentum_date" ON "RollingMomentumAnalysis" ("snapshotDate");
CREATE INDEX IF NOT EXISTS "idx_rolling_momentum_rank_7day" ON "RollingMomentumAnalysis" ("rank_momentum_7day");
CREATE INDEX IF NOT EXISTS "idx_rolling_momentum_rank_30day" ON "RollingMomentumAnalysis" ("rank_momentum_30day");
CREATE INDEX IF NOT EXISTS "idx_rolling_momentum_etl_run" ON "RollingMomentumAnalysis" ("etl_run_id");

-- =============================================================================
-- 2. VolatilityRankings  
-- =============================================================================
-- Purpose: Store rolling standard deviation analysis for identifying stable vs volatile anime
-- Source: RollingMomentumAnalysis + additional volatility calculations

CREATE TABLE IF NOT EXISTS "VolatilityRankings" (
    "id" SERIAL PRIMARY KEY,
    "malId" INTEGER NOT NULL,
    "snapshotDate" DATE NOT NULL,
    
    -- Volatility metrics (rolling standard deviation)
    "rank_volatility_7day" DECIMAL(8,2),
    "rank_volatility_14day" DECIMAL(8,2),
    "rank_volatility_30day" DECIMAL(8,2),
    "score_volatility_7day" DECIMAL(4,2),
    "score_volatility_14day" DECIMAL(4,2),
    "score_volatility_30day" DECIMAL(4,2),
    
    -- Volatility classification
    "volatility_category" VARCHAR(20), -- 'Stable', 'Moderate', 'Volatile', 'Highly_Volatile'
    "volatility_percentile" DECIMAL(5,2), -- 0-100 percentile ranking of volatility
    
    -- Stability indicators  
    "consecutive_stable_days" INTEGER, -- Number of consecutive days with low volatility
    "stability_score" DECIMAL(3,2), -- 0-1 composite stability score
    
    -- Context data
    "current_rank" INTEGER,
    "current_score" DECIMAL(4,2),
    "genres" TEXT[],
    
    -- Processing metadata
    "processed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etl_run_id" VARCHAR(100) NOT NULL,
    
    CONSTRAINT "VolatilityRankings_unique" UNIQUE ("malId", "snapshotDate")
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS "idx_volatility_malId" ON "VolatilityRankings" ("malId");
CREATE INDEX IF NOT EXISTS "idx_volatility_date" ON "VolatilityRankings" ("snapshotDate");
CREATE INDEX IF NOT EXISTS "idx_volatility_category" ON "VolatilityRankings" ("volatility_category");
CREATE INDEX IF NOT EXISTS "idx_volatility_percentile" ON "VolatilityRankings" ("volatility_percentile");

-- =============================================================================
-- 3. GenrePercentiles
-- =============================================================================
-- Purpose: Store genre-specific percentile rankings for relative performance analysis
-- Source: DailyRankings with genre-based grouping and percentile calculations

CREATE TABLE IF NOT EXISTS "GenrePercentiles" (
    "id" SERIAL PRIMARY KEY,
    "malId" INTEGER NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "genre" VARCHAR(50) NOT NULL, -- Individual genre (unnested from array)
    
    -- Genre-specific percentiles (0-100)
    "rank_percentile_within_genre" DECIMAL(5,2),
    "score_percentile_within_genre" DECIMAL(5,2),
    "popularity_percentile_within_genre" DECIMAL(5,2),
    
    -- Rolling genre percentiles (30-day windows)
    "rank_percentile_30day_avg" DECIMAL(5,2),
    "score_percentile_30day_avg" DECIMAL(5,2),
    
    -- Genre performance indicators
    "genre_rank_among_peers" INTEGER, -- 1-N ranking within genre
    "total_anime_in_genre" INTEGER, -- Total anime in this genre for context
    "genre_performance_tier" VARCHAR(20), -- 'Top_10_Percent', 'Top_25_Percent', 'Above_Average', 'Below_Average'
    
    -- Context data
    "current_rank" INTEGER,
    "current_score" DECIMAL(4,2),
    "all_genres" TEXT[], -- Full genre array for reference
    
    -- Processing metadata
    "processed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etl_run_id" VARCHAR(100) NOT NULL,
    
    CONSTRAINT "GenrePercentiles_unique" UNIQUE ("malId", "snapshotDate", "genre")
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS "idx_genre_percentiles_malId" ON "GenrePercentiles" ("malId");
CREATE INDEX IF NOT EXISTS "idx_genre_percentiles_date" ON "GenrePercentiles" ("snapshotDate");
CREATE INDEX IF NOT EXISTS "idx_genre_percentiles_genre" ON "GenrePercentiles" ("genre");
CREATE INDEX IF NOT EXISTS "idx_genre_percentiles_tier" ON "GenrePercentiles" ("genre_performance_tier");

-- =============================================================================
-- 4. TrendSignificance
-- =============================================================================
-- Purpose: Store statistical significance testing of trends using linear regression
-- Source: Time series analysis of rank/score movements over 30-day windows

CREATE TABLE IF NOT EXISTS "TrendSignificance" (
    "id" SERIAL PRIMARY KEY,
    "malId" INTEGER NOT NULL,
    "snapshotDate" DATE NOT NULL,
    
    -- Linear regression results for rank trends
    "rank_trend_slope" DECIMAL(10,6), -- Slope of rank vs time (negative = improving)
    "rank_trend_r_squared" DECIMAL(5,4), -- R² correlation coefficient (0-1)
    "rank_trend_p_value" DECIMAL(10,8), -- Statistical significance (p-value)
    "rank_trend_confidence" VARCHAR(20), -- 'High', 'Medium', 'Low', 'Not_Significant'
    
    -- Linear regression results for score trends  
    "score_trend_slope" DECIMAL(10,6), -- Slope of score vs time
    "score_trend_r_squared" DECIMAL(5,4),
    "score_trend_p_value" DECIMAL(10,8), 
    "score_trend_confidence" VARCHAR(20),
    
    -- Trend classification
    "rank_trend_direction" VARCHAR(20), -- 'Improving', 'Declining', 'Stable'
    "score_trend_direction" VARCHAR(20), -- 'Rising', 'Falling', 'Stable'
    "trend_strength" VARCHAR(20), -- 'Strong', 'Moderate', 'Weak'
    
    -- Statistical context
    "days_of_data" INTEGER, -- Number of days used in calculation (should be ~30)
    "trend_start_rank" INTEGER, -- Rank at start of trend period
    "trend_end_rank" INTEGER, -- Current rank
    "trend_start_score" DECIMAL(4,2), -- Score at start of trend period
    "trend_end_score" DECIMAL(4,2), -- Current score
    
    -- Processing metadata
    "processed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etl_run_id" VARCHAR(100) NOT NULL,
    
    CONSTRAINT "TrendSignificance_unique" UNIQUE ("malId", "snapshotDate")
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS "idx_trend_significance_malId" ON "TrendSignificance" ("malId");
CREATE INDEX IF NOT EXISTS "idx_trend_significance_date" ON "TrendSignificance" ("snapshotDate");
CREATE INDEX IF NOT EXISTS "idx_trend_rank_direction" ON "TrendSignificance" ("rank_trend_direction");
CREATE INDEX IF NOT EXISTS "idx_trend_score_direction" ON "TrendSignificance" ("score_trend_direction");
CREATE INDEX IF NOT EXISTS "idx_trend_strength" ON "TrendSignificance" ("trend_strength");

-- =============================================================================
-- 5. TrendCorrelation
-- =============================================================================
-- Purpose: Store correlation analysis between different timeframe trends
-- Source: Cross-correlation analysis between 7-day vs 30-day movements

CREATE TABLE IF NOT EXISTS "TrendCorrelation" (
    "id" SERIAL PRIMARY KEY,
    "snapshotDate" DATE NOT NULL, -- Analysis date (not per anime, summary stats)
    
    -- Correlation coefficients between timeframes
    "rank_7day_vs_30day_correlation" DECIMAL(5,4), -- -1 to +1
    "score_7day_vs_30day_correlation" DECIMAL(5,4),
    "rank_vs_score_correlation_7day" DECIMAL(5,4), -- How rank changes correlate with score changes
    "rank_vs_score_correlation_30day" DECIMAL(5,4),
    
    -- Market-wide momentum patterns
    "total_anime_analyzed" INTEGER,
    "climbers_7day_count" INTEGER, -- Number of anime climbing in 7-day window
    "climbers_30day_count" INTEGER,
    "climbers_both_timeframes" INTEGER, -- Anime climbing in both 7 and 30 day windows
    
    -- Correlation strength indicators
    "correlation_strength_7day_vs_30day" VARCHAR(20), -- 'Strong', 'Moderate', 'Weak'
    "market_momentum_direction" VARCHAR(20), -- 'Bullish', 'Bearish', 'Mixed'
    
    -- Top correlated anime (JSON arrays of malIds)
    "most_correlated_anime" TEXT, -- JSON array: anime with highest 7-day/30-day correlation
    "least_correlated_anime" TEXT, -- JSON array: anime with lowest correlation (contrarian patterns)
    
    -- Processing metadata
    "processed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etl_run_id" VARCHAR(100) NOT NULL,
    
    CONSTRAINT "TrendCorrelation_unique" UNIQUE ("snapshotDate")
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS "idx_trend_correlation_date" ON "TrendCorrelation" ("snapshotDate");
CREATE INDEX IF NOT EXISTS "idx_market_momentum" ON "TrendCorrelation" ("market_momentum_direction");

-- =============================================================================
-- Views for Easy API Access
-- =============================================================================

-- Latest rolling momentum for all anime
CREATE OR REPLACE VIEW "LatestRollingMomentum" AS
SELECT rm.*
FROM "RollingMomentumAnalysis" rm
INNER JOIN (
    SELECT "malId", MAX("snapshotDate") as latest_date 
    FROM "RollingMomentumAnalysis" 
    GROUP BY "malId"
) latest ON rm."malId" = latest."malId" AND rm."snapshotDate" = latest.latest_date;

-- Current volatility rankings
CREATE OR REPLACE VIEW "CurrentVolatilityRankings" AS  
SELECT vr.*
FROM "VolatilityRankings" vr
INNER JOIN (
    SELECT "malId", MAX("snapshotDate") as latest_date
    FROM "VolatilityRankings"
    GROUP BY "malId" 
) latest ON vr."malId" = latest."malId" AND vr."snapshotDate" = latest.latest_date;

-- Latest trend significance
CREATE OR REPLACE VIEW "LatestTrendSignificance" AS
SELECT ts.*
FROM "TrendSignificance" ts  
INNER JOIN (
    SELECT "malId", MAX("snapshotDate") as latest_date
    FROM "TrendSignificance"
    GROUP BY "malId"
) latest ON ts."malId" = latest."malId" AND ts."snapshotDate" = latest.latest_date;
