import psycopg2
from psycopg2.extras import Json
from datetime import date, timedelta, time, datetime
import random
import uuid
from config import config

def get_base_anime_entries():
    conn = psycopg2.connect(
        host=config.db_host,
        port=config.db_port,
        database=config.db_name,
        user=config.db_user,
        password=config.db_password
    )
    with conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT ON ("malId") "malId", "title", "genres", "score", "popularity", "scoredBy", "members", "favorites"
                FROM "DailyRankings"
                WHERE "title" IS NOT NULL
                LIMIT 50
            """)
            return cur.fetchall()

def make_etl_run_id(snapshot_date):
    fake_time = time(21, 4, 8)  # Use a fixed time for consistency
    dt = datetime.combine(snapshot_date, fake_time)
    return f"rankings-{dt.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"

def insert_fake_entries(anime_list, days=51):
    conn = psycopg2.connect(
        host=config.db_host,
        port=config.db_port,
        database=config.db_name,
        user=config.db_user,
        password=config.db_password
    )
    today = date.today()
    for day_offset in range(days-1, 0, -1):  # 51 days ago up to yesterday
        snapshot_date = today - timedelta(days=day_offset)
        # Generate scores for all anime for this day, based on base score with noise
        base_scores = [float(a[3]) for a in anime_list]
        scores = [max(6.0, min(9.7, s + random.uniform(-0.05, 0.05))) for s in base_scores]
        # Assign ranks: highest score gets rank 1, lowest gets rank 50
        sorted_indices = sorted(range(len(scores)), key=lambda i: -scores[i])
        ranks = [0]*len(scores)
        for rank, idx in enumerate(sorted_indices):
            ranks[idx] = rank + 1
        # Insert all 50 entries for this day
        etl_run_id = make_etl_run_id(snapshot_date)
        with conn:
            with conn.cursor() as cur:
                for i, (malId, title, genres, base_score, base_popularity, base_scoredBy, base_members, base_favorites) in enumerate(anime_list):
                    # Add small noise to each metric
                    popularity = int(base_popularity * random.uniform(0.97, 1.03))
                    scoredBy = int(base_scoredBy * random.uniform(0.97, 1.03))
                    members = int(base_members * random.uniform(0.97, 1.03))
                    favorites = int(base_favorites * random.uniform(0.97, 1.03))
                    cur.execute("""
                        INSERT INTO "DailyRankings" (
                            "malId", "title", "snapshotDate", "rank", "popularity", "score",
                            "scoredBy", "members", "favorites", "genres", "etlRunId"
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT ("malId", "snapshotDate") DO NOTHING
                    """, (
                        malId,
                        title,
                        snapshot_date,
                        ranks[i],
                        popularity,
                        round(scores[i], 2),
                        scoredBy,
                        members,
                        favorites,
                        genres,
                        etl_run_id
                    ))
        print(f"Inserted fake rankings for {snapshot_date}")

if __name__ == "__main__":
    anime_list = get_base_anime_entries()
    if len(anime_list) != 50:
        print("Not enough base anime with all fields filled. Please check your data.")
    else:
        insert_fake_entries(anime_list, days=51)
        print("✅ Done generating historical fake rankings!")