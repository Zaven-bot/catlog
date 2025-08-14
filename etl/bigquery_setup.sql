-- CatLog BigQuery Setup Scripts
-- This file contains SQL scripts for setting up BigQuery resources

-- Create the main processed_anime table
-- (This is automatically created by the Python BigQuery manager)

-- Materialized view: Top anime by season
-- Ranks anime by season and year based on score and member count
CREATE OR REPLACE VIEW `{{PROJECT_ID}}.{{DATASET}}.top_anime_by_season` AS
SELECT 
    year,
    season,
    mal_id,
    title,
    title_english,
    score,
    members,
    popularity,
    rank,
    genres,
    studios,
    status,
    episodes,
    ROW_NUMBER() OVER (
        PARTITION BY year, season 
        ORDER BY score DESC, members DESC
    ) as season_rank
FROM `{{PROJECT_ID}}.{{DATASET}}.{{TABLE}}`
WHERE 
    year IS NOT NULL 
    AND season IS NOT NULL 
    AND score IS NOT NULL
    AND score > 0;

-- Additional useful queries for data analysis:

-- Top 10 anime by score across all seasons
/*
SELECT 
    title,
    title_english,
    score,
    members,
    year,
    season,
    genres,
    studios
FROM `{{PROJECT_ID}}.{{DATASET}}.{{TABLE}}`
WHERE score IS NOT NULL
ORDER BY score DESC, members DESC
LIMIT 10;
*/

-- Anime count by genre (flattened)
/*
SELECT 
    genre,
    COUNT(*) as anime_count,
    AVG(score) as avg_score
FROM `{{PROJECT_ID}}.{{DATASET}}.{{TABLE}}`,
UNNEST(genres) as genre
WHERE score IS NOT NULL
GROUP BY genre
ORDER BY anime_count DESC;
*/

-- Seasonal anime trends
/*
SELECT 
    year,
    season,
    COUNT(*) as anime_count,
    AVG(score) as avg_score,
    AVG(members) as avg_members
FROM `{{PROJECT_ID}}.{{DATASET}}.{{TABLE}}`
WHERE year IS NOT NULL AND season IS NOT NULL
GROUP BY year, season
ORDER BY year DESC, 
    CASE season 
        WHEN 'winter' THEN 1
        WHEN 'spring' THEN 2
        WHEN 'summer' THEN 3
        WHEN 'fall' THEN 4
    END;
*/