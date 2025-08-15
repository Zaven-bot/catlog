"""
Analytics Queries for Trending Data
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from database import DatabaseManager

logger = logging.getLogger(__name__)

class AnalyticsEngine:
    """Handles analytics queries for trending anime data"""
    
    def __init__(self):
        self.db = DatabaseManager()
    
    def get_trending_summary(self) -> Dict[str, Any]:
        """Get all 6 trending metrics for the widget"""
        try:
            return {
                "biggestClimbersWeek": self.get_biggest_climbers(days=7),
                "biggestClimbersMonth": self.get_biggest_climbers(days=30),
                "newToTop50": self.get_new_entries_top50(),
                "scoreSurgingWeek": self.get_score_momentum(days=7), 
                "scoreSurgingMonth": self.get_score_momentum(days=30),
                "longestRunning": self.get_longest_top10_streaks()
            }
        except Exception as e:
            logger.error(f"Failed to get trending summary: {e}")
            return self._get_empty_trending_summary()
    
    def get_biggest_climbers(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get anime with biggest ranking improvements"""
        if not self._has_sufficient_data(days * 2):
            return self._insufficient_data_response("climbers", days * 2)
        
        with self.db.get_connection() as conn:
            with conn.cursor() as cursor:
                if days == 7:
                    # Weekly climbers
                    cursor.execute("""
                        WITH recent_rankings AS (
                            SELECT DISTINCT ON ("malId") 
                                "malId", "rank", "snapshotDate"
                            FROM "DailyRankings" 
                            WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '7 days'
                                AND "rank" IS NOT NULL
                            ORDER BY "malId", "snapshotDate" DESC
                        ),
                        week_ago_rankings AS (
                            SELECT DISTINCT ON ("malId")
                                "malId", "rank" as "oldRank", "snapshotDate"
                            FROM "DailyRankings" 
                            WHERE "snapshotDate" BETWEEN CURRENT_DATE - INTERVAL '14 days' 
                                AND CURRENT_DATE - INTERVAL '7 days'
                                AND "rank" IS NOT NULL
                            ORDER BY "malId", "snapshotDate" DESC
                        )
                        SELECT 
                            p."title",
                            p."malId",
                            recent."rank" as "currentRank",
                            week_ago."oldRank" as "previousRank",
                            (week_ago."oldRank" - recent."rank") as "rankChange"
                        FROM recent_rankings recent
                        JOIN week_ago_rankings week_ago ON recent."malId" = week_ago."malId"
                        JOIN "ProcessedAnime" p ON recent."malId" = p."malId"
                        WHERE (week_ago."oldRank" - recent."rank") > 0
                        ORDER BY "rankChange" DESC 
                        LIMIT 5
                    """)
                else:
                    # Monthly climbers
                    cursor.execute("""
                        WITH recent_rankings AS (
                            SELECT DISTINCT ON ("malId") 
                                "malId", "rank", "snapshotDate"
                            FROM "DailyRankings" 
                            WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '7 days'
                                AND "rank" IS NOT NULL
                            ORDER BY "malId", "snapshotDate" DESC
                        ),
                        month_ago_rankings AS (
                            SELECT DISTINCT ON ("malId")
                                "malId", "rank" as "oldRank", "snapshotDate"
                            FROM "DailyRankings" 
                            WHERE "snapshotDate" BETWEEN CURRENT_DATE - INTERVAL '37 days' 
                                AND CURRENT_DATE - INTERVAL '30 days'
                                AND "rank" IS NOT NULL
                            ORDER BY "malId", "snapshotDate" DESC
                        )
                        SELECT 
                            p."title",
                            p."malId",
                            recent."rank" as "currentRank",
                            month_ago."oldRank" as "previousRank",
                            (month_ago."oldRank" - recent."rank") as "rankChange"
                        FROM recent_rankings recent
                        JOIN month_ago_rankings month_ago ON recent."malId" = month_ago."malId"
                        JOIN "ProcessedAnime" p ON recent."malId" = p."malId"
                        WHERE (month_ago."oldRank" - recent."rank") > 0
                        ORDER BY "rankChange" DESC 
                        LIMIT 5
                    """)
                
                results = cursor.fetchall()
                return [
                    {
                        "title": row[0],
                        "malId": row[1],
                        "currentRank": row[2],
                        "previousRank": row[3],
                        "rankChange": row[4],
                        "timeframe": "week" if days == 7 else "month"
                    }
                    for row in results
                ]
    
    def get_score_momentum(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get anime with biggest score increases"""
        if not self._has_sufficient_data(days * 2):
            return self._insufficient_data_response("score_momentum", days * 2)
        
        min_score_change = 0.02 if days == 7 else 0.05
        
        with self.db.get_connection() as conn:
            with conn.cursor() as cursor:
                if days == 7:
                    # Weekly score momentum
                    cursor.execute("""
                        WITH recent_scores AS (
                            SELECT DISTINCT ON ("malId")
                                "malId", "score", "snapshotDate"
                            FROM "DailyRankings" 
                            WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '3 days'
                                AND "score" IS NOT NULL
                            ORDER BY "malId", "snapshotDate" DESC
                        ),
                        week_ago_scores AS (
                            SELECT DISTINCT ON ("malId")
                                "malId", "score" as "oldScore", "snapshotDate"
                            FROM "DailyRankings" 
                            WHERE "snapshotDate" BETWEEN CURRENT_DATE - INTERVAL '10 days' 
                                AND CURRENT_DATE - INTERVAL '7 days'
                                AND "score" IS NOT NULL
                            ORDER BY "malId", "snapshotDate" DESC
                        )
                        SELECT 
                            p."title",
                            p."malId",
                            recent."score" as "currentScore",
                            week_ago."oldScore" as "previousScore",
                            ROUND((recent."score" - week_ago."oldScore")::numeric, 2) as "scoreChange"
                        FROM recent_scores recent
                        JOIN week_ago_scores week_ago ON recent."malId" = week_ago."malId"
                        JOIN "ProcessedAnime" p ON recent."malId" = p."malId"
                        WHERE (recent."score" - week_ago."oldScore") > %s
                        ORDER BY "scoreChange" DESC 
                        LIMIT 5
                    """, (min_score_change,))
                else:
                    # Monthly score momentum
                    cursor.execute("""
                        WITH recent_scores AS (
                            SELECT DISTINCT ON ("malId")
                                "malId", "score", "snapshotDate"
                            FROM "DailyRankings" 
                            WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '7 days'
                                AND "score" IS NOT NULL
                            ORDER BY "malId", "snapshotDate" DESC
                        ),
                        month_ago_scores AS (
                            SELECT DISTINCT ON ("malId")
                                "malId", "score" as "oldScore", "snapshotDate"
                            FROM "DailyRankings" 
                            WHERE "snapshotDate" BETWEEN CURRENT_DATE - INTERVAL '37 days' 
                                AND CURRENT_DATE - INTERVAL '30 days'
                                AND "score" IS NOT NULL
                            ORDER BY "malId", "snapshotDate" DESC
                        )
                        SELECT 
                            p."title",
                            p."malId",
                            recent."score" as "currentScore",
                            month_ago."oldScore" as "previousScore",
                            ROUND((recent."score" - month_ago."oldScore")::numeric, 2) as "scoreChange"
                        FROM recent_scores recent
                        JOIN month_ago_scores month_ago ON recent."malId" = month_ago."malId"
                        JOIN "ProcessedAnime" p ON recent."malId" = p."malId"
                        WHERE (recent."score" - month_ago."oldScore") > %s
                        ORDER BY "scoreChange" DESC 
                        LIMIT 5
                    """, (min_score_change,))
                
                results = cursor.fetchall()
                return [
                    {
                        "title": row[0],
                        "malId": row[1],
                        "currentScore": float(row[2]),
                        "previousScore": float(row[3]),
                        "scoreChange": float(row[4]),
                        "timeframe": "week" if days == 7 else "month"
                    }
                    for row in results
                ]
    
    def get_new_entries_top50(self) -> List[Dict[str, Any]]:
        """Get anime that recently entered top 50"""
        if not self._has_sufficient_data(14):
            return self._insufficient_data_response("new_entries", 14)
        
        with self.db.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    WITH recent_top50 AS (
                        SELECT DISTINCT "malId"
                        FROM "DailyRankings" 
                        WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '7 days'
                            AND "rank" <= 50
                    ),
                    historical_presence AS (
                        SELECT DISTINCT "malId"
                        FROM "DailyRankings" 
                        WHERE "snapshotDate" BETWEEN CURRENT_DATE - INTERVAL '90 days' 
                            AND CURRENT_DATE - INTERVAL '7 days'
                            AND "rank" <= 50
                    )
                    SELECT 
                        p."title",
                        p."malId",
                        rankings."rank" as "currentRank",
                        rankings."snapshotDate" as "firstAppearance"
                    FROM recent_top50 rt
                    JOIN "ProcessedAnime" p ON rt."malId" = p."malId"
                    JOIN "DailyRankings" rankings ON rt."malId" = rankings."malId"
                    LEFT JOIN historical_presence hp ON rt."malId" = hp."malId"
                    WHERE hp."malId" IS NULL
                        AND rankings."snapshotDate" >= CURRENT_DATE - INTERVAL '7 days'
                        AND rankings."rank" <= 50
                    ORDER BY rankings."rank"
                    LIMIT 5
                """)
                
                results = cursor.fetchall()
                return [
                    {
                        "title": row[0],
                        "malId": row[1],
                        "currentRank": row[2],
                        "firstAppearance": row[3].isoformat()
                    }
                    for row in results
                ]
    
    def get_longest_top10_streaks(self) -> List[Dict[str, Any]]:
        """Get anime with longest consecutive top 10 runs"""
        if not self._has_sufficient_data(30):
            return self._insufficient_data_response("streaks", 30)
        
        with self.db.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        p."malId",
                        p."title",
                        COUNT(*) as "daysInTop10",
                        MIN(rankings."snapshotDate") as "firstTopTenDate",
                        MAX(rankings."snapshotDate") as "lastTopTenDate"
                    FROM "ProcessedAnime" p
                    JOIN "DailyRankings" rankings ON p."malId" = rankings."malId"
                    WHERE rankings."rank" <= 10 
                        AND rankings."snapshotDate" >= CURRENT_DATE - INTERVAL '90 days'
                    GROUP BY p."malId", p."title"
                    HAVING COUNT(*) >= 7
                    ORDER BY "daysInTop10" DESC
                    LIMIT 5
                """)
                
                results = cursor.fetchall()
                return [
                    {
                        "title": row[1],
                        "malId": row[0],
                        "daysInTop10": row[2],
                        "firstTopTenDate": row[3].isoformat(),
                        "lastTopTenDate": row[4].isoformat()
                    }
                    for row in results
                ]
    
    def _has_sufficient_data(self, required_days: int) -> bool:
        """Check if we have enough historical data for analysis"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT MIN("snapshotDate") FROM "DailyRankings"
                """)
                result = cursor.fetchone()
                
                if not result or not result[0]:
                    return False
                
                earliest_date = result[0]
                days_available = (date.today() - earliest_date).days
                return days_available >= required_days
    
    def _insufficient_data_response(self, metric_type: str, required_days: int) -> List[Dict[str, Any]]:
        """Return response for insufficient data scenarios"""
        with self.db.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT MIN("snapshotDate") FROM "DailyRankings"
                """)
                result = cursor.fetchone()
                
                days_available = 0
                if result and result[0]:
                    days_available = (date.today() - result[0]).days
                
                return [{
                    "message": f"Insufficient data for {metric_type}",
                    "required_days": required_days,
                    "available_days": days_available,
                    "available_in_days": max(0, required_days - days_available)
                }]
    
    def _get_empty_trending_summary(self) -> Dict[str, Any]:
        """Return empty trending summary for error cases"""
        return {
            "biggestClimbersWeek": [],
            "biggestClimbersMonth": [],
            "newToTop50": [],
            "scoreSurgingWeek": [],
            "scoreSurgingMonth": [],
            "longestRunning": []
        }