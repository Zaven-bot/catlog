# 🐾 CatLog – Anime Tracking Application
## Pre-Stage: Core Application (Current Implementation)

CatLog is a full-stack anime tracking application built with modern web technologies. This README documents the **current baseline implementation** and the planned **7-stage data engineering transformation** that will be added incrementally.

---

## 🎯 Project Structure

This project has **two distinct phases**:

### **PHASE 1: Pre-Stage (CURRENT)** ✅
A complete, working anime tracking web application with all core user features.

### **PHASE 2: Data Engineering Stages 1-7 (PLANNED)**  
Will incrementally add production data engineering infrastructure **without changing user-facing features**.

---

## 🛠️ Current Tech Stack (Pre-Stage)

| Layer              | Technology                                    |
|--------------------|-----------------------------------------------|
| **Frontend**       | Next.js 13+, TypeScript, TailwindCSS         |
| **Backend API**    | Node.js, Express, RESTful APIs               |
| **Database**       | PostgreSQL + Prisma ORM                      |
| **Authentication** | JWT (stateless authentication)               |
| **External APIs**  | Jikan API (MyAnimeList data)                 |
| **Deployment**     | Vercel (frontend), Render (backend)          |

---

## ✅ CURRENT FEATURES (Pre-Stage Implementation)

### 🐱 Virtual Cat Companion
- **Interactive mood system**: Cat reacts to user activity (happy, bored, excited, neutral)
- **Activity-based responses**: Different animations based on anime tracking behavior
- **Smart suggestions**: Cat suggests actions based on current mood
- **Mood persistence**: Remembers activity levels across sessions

### 📺 Core Anime Tracking
- **Personal anime lists** with 5 status categories:
  - Currently Watching
  - Completed  
  - Plan to Watch
  - On Hold
  - Dropped
- **Personal ratings** (1-10 scale) and notes for each anime
- **Quick status updates** from anime cards with visual feedback
- **Rate & Review modal** (with fixed z-index layering)
- **List management** from dedicated `/my-list` page

### 🔍 Advanced Search & Discovery
- **Real-time search** using Jikan API with rate limiting
- **Advanced filtering** by:
  - Multiple genres (AND logic)
  - Year ranges (start/end)
  - Status (airing, completed, upcoming) 
  - Score ranges (min/max ratings)
- **Genre-only browsing** without search terms
- **Pagination** with "Load More" functionality
- **Recent searches** tracking and quick access
- **Search cooldown** to prevent API abuse

### 📊 Personal Statistics Dashboard
- **Comprehensive stats** calculated from user data:
  - Total anime counts by status
  - Episodes watched and estimated watch time
  - Top genres from user's list
  - Studio preferences analysis
  - Monthly activity tracking
  - Completion and drop rates
- **Interactive charts** using Chart.js:
  - Status breakdown (bar chart)
  - Genre distribution (bar chart) 
  - Personal rating distribution (doughnut chart)
  - Activity over time (line chart)

### 🔐 User Management
- **JWT-based authentication** with secure token handling
- **Registration and login** with form validation
- **Protected routes** throughout application
- **Persistent sessions** with automatic token refresh
- **User profile** management

### 📱 User Experience
- **Responsive design** optimized for mobile and desktop
- **Fast page navigation** with Next.js App Router
- **Optimistic UI updates** for better perceived performance
- **Error handling** with user-friendly messages
- **Loading states** throughout the application

---

## 🚀 Getting Started (Pre-Stage)

### Prerequisites
- Node.js 18+
- PostgreSQL database

### 1. Clone and Install
```bash
git clone <repository-url>
cd catlog

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
```

### 2. Database Setup
```bash
# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# Run database migrations
cd backend
npx prisma migrate dev
```

### 3. Start Development Servers
```bash
# Start backend (terminal 1)
cd backend
npm run dev

# Start frontend (terminal 2) 
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## 📁 Current Project Structure (Pre-Stage)

```
catlog/
├── README.md
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── middleware/      # Auth, CORS, error handling
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Jikan API integration
│   └── prisma/             # Database schema & migrations
├── frontend/               # Next.js React application
│   └── src/
│       ├── app/            # Next.js 13+ app router pages
│       ├── components/     # Reusable React components
│       ├── hooks/          # Custom React hooks
│       └── stores/         # State management (Zustand)
└── shared/                 # Shared TypeScript types
```

---

## 🧪 Testing (Pre-Stage)

Currently implements basic testing framework:

```bash
# Backend API tests
cd backend  
npm test

# Frontend component tests (planned)
cd frontend
npm test
```

---

## 📊 Current Data Flow (Pre-Stage)

```
Jikan API → Backend API → PostgreSQL → Frontend
    ↓           ↓            ↓           ↓
Raw JSON → Transform → User Data → React UI
```

**Simple Architecture:**
1. **Frontend** makes requests to Backend API
2. **Backend** fetches data from Jikan API when needed
3. **Database** stores user accounts, anime lists, and ratings
4. **No data pipeline** - everything is request/response based

---

## 🎯 DATA ENGINEERING TRANSFORMATION ROADMAP

The following 7 stages will add production data engineering infrastructure **without changing any user-facing features**:

### **STAGE 1: ETL Pipeline** 📊
**What it adds:** Automated data collection and processing
- Python ETL pipeline for batch processing anime data from Jikan API
- Database tables: `RawAnimeData`, `ProcessedAnime`, `EtlLogs`
- CLI interface for running ETL jobs manually
- Comprehensive logging and error handling
- Unit tests for all ETL functions

**User impact:** None (runs in background)

### **STAGE 2: Cloud Warehouse Sync** ☁️
**What it adds:** Data warehouse capabilities
- Sync processed data to BigQuery for analytics
- Materialized views for complex queries
- Configuration flags for cloud sync

**User impact:** None (backend infrastructure)

### **STAGE 3: Orchestration with Airflow** 🔄
**What it adds:** Workflow automation
- Apache Airflow DAGs for scheduling ETL runs
- Automated retries and failure alerts
- Configurable data refresh schedules

**User impact:** None (background automation)

### **STAGE 4: Streaming Data Simulation** ⚡
**What it adds:** Real-time updates
- Kafka streaming for live popularity updates
- WebSocket endpoints for real-time data
- **ONLY user-visible change:** Small live popularity widget on dashboard

**User impact:** Adds 1 small widget showing live anime popularity in the home page--inviting the user to look into them. This would send them to the Login home page if they're not logged in yet.

### **STAGE 5: Data Quality & Governance** ✅
**What it adds:** Data validation and monitoring
- Great Expectations for data quality validation
- Data documentation generation
- ETL pipeline validation gates

**User impact:** None (internal quality controls)

### **STAGE 6: Cloud Deployment** 🚀
**What it adds:** Production infrastructure
- Docker containers for all services
- Terraform for AWS infrastructure
- CI/CD pipelines with GitHub Actions

**User impact:** None (deployment improvements)

### **STAGE 7: Documentation & Architecture** 📚
**What it adds:** Comprehensive documentation
- Architecture diagrams (Mermaid.js)
- Complete setup guides
- Example screenshots and workflows

**User impact:** None (documentation only)

---

## 💡 Why This Approach?

**Incremental Development Benefits:**
- ✅ **Test each stage** thoroughly before moving to the next
- ✅ **Ensure stability** - the core app always works
- ✅ **Clear boundaries** - each stage has specific, well-defined goals
- ✅ **Rollback safety** - can revert any stage without breaking the app
- ✅ **Learning progression** - master each data engineering concept step by step

---

## 📈 Success Metrics (Pre-Stage)

- ✅ Users can register, login, and manage their anime lists
- ✅ Search returns real anime data from Jikan API with advanced filtering
- ✅ Cat companion responds meaningfully to user activity
- ✅ Statistics show comprehensive user data analysis
- ✅ Application is deployed and accessible online
- ✅ Performance is smooth on mobile and desktop
- ✅ Rate & Review modal appears correctly above other content

**Total Development Time (Pre-Stage)**: ~60 hours

---

## 🤝 Contributing

This is a portfolio project showcasing incremental data engineering development. Each stage will be thoroughly tested before proceeding to the next.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🎯 ETL PIPELINE DATA ARCHITECTURE

### **Data Collection Strategy**

**Daily Ranking Snapshots:**
- **Frequency**: Once daily at 3 AM UTC
- **Source**: `/top/anime` endpoint (top 100 anime)
- **API Usage**: 4 requests (25 anime per page × 4 pages)
- **Rate Limit**: 1 second between requests (well under 3/sec limit)

### **Database Schema Extensions**

**New Tables for Stage 1:**

#### `RawAnimeData`
```sql
-- Stores raw JSON responses from Jikan API
CREATE TABLE "RawAnimeData" (
    "id" SERIAL PRIMARY KEY,
    "malId" INTEGER NOT NULL,
    "rawJson" JSONB NOT NULL,        -- Complete API response
    "sourceApi" TEXT DEFAULT 'jikan',
    "endpoint" TEXT NOT NULL,        -- 'top', 'search', 'seasonal'
    "ingestedAt" TIMESTAMP DEFAULT NOW(),
    "etlRunId" TEXT NOT NULL
);
```

#### `ProcessedAnime`
```sql
-- Stores cleaned, structured anime data
CREATE TABLE "ProcessedAnime" (
    "id" SERIAL PRIMARY KEY,
    "malId" INTEGER UNIQUE NOT NULL,
    "title" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "genres" TEXT[],
    "score" DECIMAL(3,2),
    "scoredBy" INTEGER,
    "rank" INTEGER,                  -- Current MAL rank
    "popularity" INTEGER,            -- Current MAL popularity rank
    "members" INTEGER,
    "favorites" INTEGER,
    "episodes" INTEGER,
    "status" TEXT,
    "season" TEXT,
    "year" INTEGER,
    "rating" TEXT,
    "studios" TEXT[],
    "imageUrl" TEXT,
    "synopsis" TEXT,
    "processedAt" TIMESTAMP DEFAULT NOW(),
    "etlRunId" TEXT NOT NULL
);
```

#### `DailyRankings` ⭐ **NEW - Key Analytics Table**
```sql
-- Daily snapshots of anime rankings
CREATE TABLE "DailyRankings" (
    "id" SERIAL PRIMARY KEY,
    "malId" INTEGER NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "rank" INTEGER,
    "popularity" INTEGER,
    "score" DECIMAL(3,2),
    "scoredBy" INTEGER,
    "members" INTEGER,
    "favorites" INTEGER,
    "etlRunId" TEXT NOT NULL,
    
    UNIQUE("malId", "snapshotDate")
);
```

#### `EtlLogs`
```sql
-- Comprehensive ETL run tracking
CREATE TABLE "EtlLogs" (
    "id" SERIAL PRIMARY KEY,
    "runId" TEXT UNIQUE NOT NULL,
    "startTime" TIMESTAMP NOT NULL,
    "endTime" TIMESTAMP,
    "status" TEXT NOT NULL,          -- SUCCESS, FAILED, RUNNING
    "pipelineStep" TEXT NOT NULL,    -- EXTRACT, TRANSFORM, LOAD, COMPLETE
    "rowsProcessed" INTEGER,
    "errorMessage" TEXT,
    "apiRequestCount" INTEGER,
    "createdAt" TIMESTAMP DEFAULT NOW()
);
```

### **Analytics Queries Enabled**

#### **Ranking History**
```sql
-- Get ranking progression for an anime over last 30 days
SELECT 
    "snapshotDate",
    "rank",
    "score",
    "members",
    LAG("rank") OVER (ORDER BY "snapshotDate") as "previousRank"
FROM "DailyRankings" 
WHERE "malId" = 1 
    AND "snapshotDate" >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY "snapshotDate" DESC;
```

#### **Biggest Climbers This Week**
```sql
-- Find anime that climbed rankings most (comparing most recent vs 7 days ago)
WITH recent_rankings AS (
    SELECT DISTINCT ON ("malId") 
        "malId", "rank", "snapshotDate"
    FROM "DailyRankings" 
    WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY "malId", "snapshotDate" DESC
),
week_ago_rankings AS (
    SELECT DISTINCT ON ("malId")
        "malId", "rank" as "oldRank", "snapshotDate"
    FROM "DailyRankings" 
    WHERE "snapshotDate" BETWEEN CURRENT_DATE - INTERVAL '14 days' 
        AND CURRENT_DATE - INTERVAL '7 days'
    ORDER BY "malId", "snapshotDate" DESC
)
SELECT 
    p."title",
    recent."rank" as "currentRank",
    week_ago."oldRank" as "previousRank",
    (week_ago."oldRank" - recent."rank") as "rankChange"
FROM recent_rankings recent
JOIN week_ago_rankings week_ago ON recent."malId" = week_ago."malId"
JOIN "ProcessedAnime" p ON recent."malId" = p."malId"
WHERE (week_ago."oldRank" - recent."rank") > 0  -- Only climbers
ORDER BY "rankChange" DESC 
LIMIT 10;
```

#### **Biggest Climbers This Month**
```sql
-- Find anime that climbed rankings most (comparing most recent vs 30 days ago)
WITH recent_rankings AS (
    SELECT DISTINCT ON ("malId") 
        "malId", "rank", "snapshotDate"
    FROM "DailyRankings" 
    WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY "malId", "snapshotDate" DESC
),
month_ago_rankings AS (
    SELECT DISTINCT ON ("malId")
        "malId", "rank" as "oldRank", "snapshotDate"
    FROM "DailyRankings" 
    WHERE "snapshotDate" BETWEEN CURRENT_DATE - INTERVAL '37 days' 
        AND CURRENT_DATE - INTERVAL '30 days'
    ORDER BY "malId", "snapshotDate" DESC
)
SELECT 
    p."title",
    recent."rank" as "currentRank",
    month_ago."oldRank" as "previousRank",
    (month_ago."oldRank" - recent."rank") as "rankChange"
FROM recent_rankings recent
JOIN month_ago_rankings month_ago ON recent."malId" = month_ago."malId"
JOIN "ProcessedAnime" p ON recent."malId" = p."malId"
WHERE (month_ago."oldRank" - recent."rank") > 0  -- Only climbers
ORDER BY "rankChange" DESC 
LIMIT 10;
```

#### **Score Momentum (Weekly)**
```sql
-- Find anime with biggest score increases over the past week
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
    recent."score" as "currentScore",
    week_ago."oldScore" as "weekAgoScore",
    ROUND((recent."score" - week_ago."oldScore")::numeric, 2) as "scoreChange"
FROM recent_scores recent
JOIN week_ago_scores week_ago ON recent."malId" = week_ago."malId"
JOIN "ProcessedAnime" p ON recent."malId" = p."malId"
WHERE (recent."score" - week_ago."oldScore") > 0.02  -- Meaningful weekly increase
ORDER BY "scoreChange" DESC 
LIMIT 10;
```

#### **Score Momentum (Monthly)**
```sql
-- Find anime with biggest score increases over the past month
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
    recent."score" as "currentScore",
    month_ago."oldScore" as "monthAgoScore",
    ROUND((recent."score" - month_ago."oldScore")::numeric, 2) as "scoreChange"
FROM recent_scores recent
JOIN month_ago_scores month_ago ON recent."malId" = month_ago."malId"
JOIN "ProcessedAnime" p ON recent."malId" = p."malId"
WHERE (recent."score" - month_ago."oldScore") > 0.05  -- Meaningful monthly increase
ORDER BY "scoreChange" DESC 
LIMIT 10;
```

#### **New Entries to Top 50**
```sql
-- Find anime that recently entered top 50 (first time in last 30 days)
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
    rankings."rank" as "currentRank",
    rankings."snapshotDate" as "firstAppearance"
FROM recent_top50 rt
JOIN "ProcessedAnime" p ON rt."malId" = p."malId"
JOIN "DailyRankings" rankings ON rt."malId" = rankings."malId"
LEFT JOIN historical_presence hp ON rt."malId" = hp."malId"
WHERE hp."malId" IS NULL  -- Not in historical top 50
    AND rankings."snapshotDate" >= CURRENT_DATE - INTERVAL '7 days'
    AND rankings."rank" <= 50
ORDER BY rankings."rank";
```

### **ETL Pipeline Workflow**

#### **Stage 1: Extract**
1. Fetch `/top/anime?page=1&limit=25` (rank 1-25)
2. Fetch `/top/anime?page=2&limit=25` (rank 26-50)  
3. Fetch `/top/anime?page=3&limit=25` (rank 51-75)
4. Fetch `/top/anime?page=4&limit=25` (rank 76-100)
5. Store raw JSON in `RawAnimeData`

#### **Stage 2: Transform**
1. Parse JSON responses
2. Extract key fields (rank, score, members, etc.)
3. Validate data quality
4. Handle missing/null values

#### **Stage 3: Load**
1. Upsert into `ProcessedAnime` (current state)
2. Insert into `DailyRankings` (historical snapshot)
3. Log success/failure in `EtlLogs`

### **Widget Data Endpoints**

#### **Live Trending Widget** (Stage 4)
```javascript
// GET /api/analytics/trending-now
{
  "biggestClimbersWeek": [
    { "malId": 123, "title": "Attack on Titan", "rankChange": +5, "timeframe": "week" }
  ],
  "biggestClimbersMonth": [
    { "malId": 456, "title": "Solo Leveling", "rankChange": +12, "timeframe": "month" }
  ],
  "newToTop50": [
    { "malId": 789, "title": "Frieren", "currentRank": 25, "firstAppearance": "2025-08-10" }
  ],
  "scoreSurgingWeek": [
    { "malId": 111, "title": "Demon Slayer", "scoreChange": +0.15, "timeframe": "week" }
  ],
  "scoreSurgingMonth": [
    { "malId": 222, "title": "JJK", "scoreChange": +0.35, "timeframe": "month" }
  ],
  "longestRunning": [
    { "malId": 999, "title": "One Piece", "daysInTop10": 127 }
  ]
}
```

### **Cute Widget Display Options**

#### **Option 1: Tabbed Interface**
```javascript
🔥 TRENDING NOW
━━━━━━━━━━━━━━
[📈 Weekly] [📅 Monthly] [🆕 New] [👑 Streaks]

// Weekly Tab
📈 WEEKLY HIGHLIGHTS
• Attack on Titan (+5 ranks) 
• Demon Slayer (+0.15 score)

// Monthly Tab  
📅 MONTHLY MOMENTUM
• Solo Leveling (+12 ranks)
• JJK (+0.35 score)

// New Tab
🆕 NEW TO TOP 50
• Frieren (debut at #25)

// Streaks Tab
👑 LONGEST STREAKS
• One Piece (127 days)
```

#### **Option 2: Rotating Display**
```javascript
🔥 TRENDING NOW
━━━━━━━━━━━━━━
📈 Weekly Climber: Attack on Titan (+5)
⚡ Monthly Score Leader: JJK (+0.35)
🆕 New Entry: Frieren (#25)

// Rotates every 5 seconds between different metrics
```

#### **Option 3: Compact Summary**
```javascript
🔥 TRENDING NOW
━━━━━━━━━━━━━━
📈 Top Climbers:
   Week: Attack on Titan (+5)
   Month: Solo Leveling (+12)
   
⚡ Score Leaders:
   Week: Demon Slayer (+0.15)
   Month: JJK (+0.35)
   
🆕 New: Frieren (#25)
👑 Streak: One Piece (127d)
```

#### **Option 4: Expandable Cards**
```javascript
🔥 TRENDING NOW    [📊 View All]
━━━━━━━━━━━━━━
📈 Attack on Titan (+5 this week)
⚡ JJK (+0.35 score this month)  
🆕 Frieren (new at #25)

// Click "View All" expands to show all 6 metrics
```

### **Analytics Python Implementation**

```python
# analytics.py
class AnalyticsEngine:
    def get_trending_summary(self):
        """Get all 6 trending metrics for the widget"""
        return {
            "biggestClimbersWeek": self.get_biggest_climbers(days=7),
            "biggestClimbersMonth": self.get_biggest_climbers(days=30),
            "newToTop50": self.get_new_entries_top50(),
            "scoreSurgingWeek": self.get_score_momentum(days=7), 
            "scoreSurgingMonth": self.get_score_momentum(days=30),
            "longestRunning": self.get_longest_top10_streaks()
        }
    
    def get_biggest_climbers(self, days=7):
        """Weekly or monthly climbers based on days parameter"""
        if days == 7:
            # Use weekly SQL query
            pass
        elif days == 30:
            # Use monthly SQL query  
            pass
    
    def get_score_momentum(self, days=7):
        """Weekly or monthly score momentum"""
        if days == 7:
            # Use weekly score SQL query
            pass
        elif days == 30:
            # Use monthly score SQL query
            pass
```

### **Data Retention Policy**

- **RawAnimeData**: Keep 90 days (for debugging)
- **ProcessedAnime**: Keep current state only (upserts)
- **DailyRankings**: Keep forever (historical analysis)
- **EtlLogs**: Keep 1 year (operational monitoring)

---

### **Python ETL Implementation Details**

#### **File Structure (Stage 1)**
```
etl/
├── config.py              # Configuration management
├── database.py            # Database operations
├── extractor.py           # Jikan API data extraction
├── transformer.py         # Data transformation
├── analytics.py           # NEW: Analytics queries
├── pipeline.py            # Main ETL orchestrator & CLI
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── tests/
    ├── test_extractor.py
    ├── test_transformer.py
    └── test_analytics.py
```

#### **Key Python Classes**

**`JikanExtractor`**
```python
class JikanExtractor:
    def extract_top_anime_rankings(self, max_pages=4):
        """Extract top 100 anime with full ranking data"""
        # Fetch 4 pages of top anime (25 each = 100 total)
        # Return with explicit rank positions
        
    def extract_with_rate_limiting(self):
        """Ensure 1-second delays between requests"""
```

**`RankingTransformer`**
```python
class RankingTransformer:
    def transform_ranking_data(self, raw_data):
        """Transform for DailyRankings table"""
        # Extract: rank, popularity, score, members, favorites
        # Add snapshot date
        # Validate ranking positions (1-100)
        
    def calculate_rank_changes(self, current_data, previous_data):
        """Calculate ranking movements for analytics"""
```

**`AnalyticsEngine`**
```python
class AnalyticsEngine:
    def get_biggest_climbers(self, days=7):
        """Find anime that climbed rankings most"""
        
    def get_longest_top10_streaks(self):
        """Find anime with longest consecutive top 10 runs"""
        
    def get_score_momentum(self, days=30):
        """Find anime with fastest score increases"""
        
    def get_new_entries(self, days=7):
        """Find anime that entered top 100 this week"""
```

#### **CLI Commands (Stage 1)**
```bash
# Daily ETL run
python pipeline.py run --source rankings

# Analytics queries
python pipeline.py analytics --type climbers
python pipeline.py analytics --type momentum
python pipeline.py analytics --type streaks

# Data validation
python pipeline.py validate --date 2025-08-14

# View logs
python pipeline.py logs --limit 10
```

#### **Configuration Options**
```python
# config.py
class ETLConfig:
    # Rate limiting
    JIKAN_RATE_LIMIT_DELAY: float = 1.0
    JIKAN_MAX_RETRIES: int = 3
    
    # Data collection
    RANKINGS_MAX_PAGES: int = 4  # Top 100 anime
    SNAPSHOT_HOUR: int = 3       # 3 AM UTC
    
    # Data retention
    RAW_DATA_RETENTION_DAYS: int = 90
    ETL_LOG_RETENTION_DAYS: int = 365
```

### **Migration Strategy**

#### **Prisma Schema Updates (Stage 1)**
```prisma
// Add to existing schema.prisma
model RawAnimeData {
  id          Int      @id @default(autoincrement())
  malId       Int
  rawJson     Json
  sourceApi   String   @default("jikan")
  endpoint    String   // 'top', 'search', 'seasonal'
  ingestedAt  DateTime @default(now())
  etlRunId    String
}

model ProcessedAnime {
  id           Int      @id @default(autoincrement())
  malId        Int      @unique
  title        String
  titleEnglish String?
  genres       String[]
  score        Decimal? @db.Decimal(3,2)
  scoredBy     Int?
  rank         Int?
  popularity   Int?
  members      Int?
  favorites    Int?
  episodes     Int?
  status       String?
  season       String?
  year         Int?
  rating       String?
  studios      String[]
  imageUrl     String?
  synopsis     String?
  processedAt  DateTime @default(now())
  etlRunId     String
}

model DailyRankings {
  id           Int      @id @default(autoincrement())
  malId        Int
  snapshotDate DateTime @db.Date
  rank         Int?
  popularity   Int?
  score        Decimal? @db.Decimal(3,2)
  scoredBy     Int?
  members      Int?
  favorites    Int?
  etlRunId     String
  
  @@unique([malId, snapshotDate])
}

model EtlLogs {
  id              Int       @id @default(autoincrement())
  runId           String    @unique
  startTime       DateTime
  endTime         DateTime?
  status          String    // SUCCESS, FAILED, RUNNING
  pipelineStep    String    // EXTRACT, TRANSFORM, LOAD, COMPLETE
  rowsProcessed   Int?
  errorMessage    String?
  apiRequestCount Int?
  createdAt       DateTime  @default(now())
}
```

#### **Migration Command**
```bash
# Generate migration for new ETL tables
npx prisma migrate dev --name add_etl_analytics_tables
```

### **Testing Strategy**

#### **Unit Tests**
```python
# tests/test_analytics.py
def test_biggest_climbers():
    # Mock data with known ranking changes
    # Verify correct calculation of rank movements
    
def test_score_momentum():
    # Mock data with score changes over time
    # Verify correct momentum calculations
    
def test_streak_detection():
    # Mock consecutive top 10 appearances
    # Verify streak counting logic
```

#### **Integration Tests**
```python
# tests/test_pipeline_integration.py
def test_full_etl_pipeline():
    # Run complete ETL with test data
    # Verify all tables populated correctly
    # Check analytics queries return expected results
```

### **Monitoring & Alerting**

#### **Success Metrics**
- **Data Freshness**: Daily snapshots within 1 hour of schedule
- **API Success Rate**: >99% successful Jikan API calls
- **Data Quality**: No missing ranks in top 100
- **Processing Time**: Complete ETL run under 10 minutes

#### **Alert Conditions**
- ETL pipeline fails
- Missing daily snapshot
- Ranking data inconsistencies
- API rate limit exceeded

---

### **Realistic Data Population Timeline**

#### **Day 1**: First ETL Run
```sql
-- Only current snapshot available
INSERT INTO "DailyRankings" VALUES 
(1, '2025-08-14', 1, 1, 9.20, 50000, 2100000, 45000, 'run-001');
-- Can show: Current rankings only
```

**Available Analytics:**
- ✅ Current top 100 rankings
- ❌ No historical comparisons yet
- ❌ No trend analysis possible

#### **Day 7**: Week of Data
```sql
-- 7 days of snapshots available
-- Can show: 
-- - Current vs previous day changes
-- - Weekly trends starting to emerge
-- - No reliable "weekly changes" yet (need 14+ days)
```

**Available Analytics:**
- ✅ Day-to-day ranking changes
- ✅ Score fluctuations over the week
- ✅ New entries to rankings this week
- ⚠️ "Week-over-week" queries return empty (need 14+ days)

#### **Day 14**: Two Weeks of Data
```sql
-- Now can show:
-- - Reliable week-over-week changes
-- - 7-day ranking movements
-- - Short-term trends
```

**Available Analytics:**
- ✅ **Biggest Climbers This Week** query starts working
- ✅ 7-day ranking momentum
- ✅ Short-term top 10 streaks
- ⚠️ Monthly analysis still limited

#### **Day 30**: Month of Data
```sql
-- Now can show:
-- - Monthly score momentum
-- - Sustained top 10 streaks
-- - New entries vs returning favorites
```

**Available Analytics:**
- ✅ **Score Momentum** (30-day) query works fully
- ✅ **Longest Running Top 10** shows meaningful streaks
- ✅ Monthly trend analysis
- ✅ **New Entries** detection becomes reliable

#### **Day 90**: Full Analytics Power
```sql
-- All analytics queries work reliably
-- - Long-term trends
-- - Seasonal patterns
-- - Comprehensive historical analysis
```

**Available Analytics:**
- ✅ All queries return meaningful results
- ✅ Seasonal pattern detection
- ✅ Long-term ranking stability analysis
- ✅ Comprehensive trend visualization

### **Graceful Degradation Strategy**

The analytics endpoints will handle missing historical data elegantly:

```python
# analytics.py
class AnalyticsEngine:
    def get_biggest_climbers(self, days=7):
        """Returns climbers if enough data exists"""
        min_date_required = datetime.now() - timedelta(days=14)
        earliest_data = self.get_earliest_snapshot_date()
        
        if earliest_data > min_date_required:
            return {
                "data": [],
                "message": f"Insufficient historical data. Need {days*2} days, have {(datetime.now() - earliest_data).days}",
                "available_in_days": (min_date_required - earliest_data).days
            }
        
        # Proceed with full analysis
        return self._calculate_climbers(days)
```

### **Progressive Widget Enhancement**

#### **Week 1 Widget** (Limited Data)
```javascript
🔥 TRENDING NOW
━━━━━━━━━━━━━━
📊 Current Top 10:
   • Attack on Titan (#1)
   • One Piece (#2)
   
ℹ️  Historical trends available in 7 days
```

#### **Week 2 Widget** (Basic Trends)
```javascript
🔥 TRENDING NOW
━━━━━━━━━━━━━━
📈 This Week's Movers:
   • Solo Leveling (+3 ranks)
   • Frieren (-1 rank)
   
📊 Current Top 3:
   • Attack on Titan (#1)
   • One Piece (#2)
   • Demon Slayer (#3)
```

#### **Month 1+ Widget** (Full Analytics)
```javascript
🔥 TRENDING NOW
━━━━━━━━━━━━━━
📈 Biggest Climbers:
   • Attack on Titan (+5 ranks)
   • Solo Leveling (+3 ranks)
   
🏆 New to Top 10:
   • Frieren (debuted at #8)
   
⚡ Score Surging:
   • Demon Slayer (+0.3 this week)
   
👑 Longest Streaks:
   • One Piece (30 days in top 10)
```

---
