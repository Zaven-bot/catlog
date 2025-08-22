# 🐾 CatLog – Anime Tracking Application

CatLog is a full-stack anime tracking application with an integrated ETL pipeline for anime data analytics. Built with modern web technologies and data engineering practices.

---

## 🛠️ Tech Stack

| Layer                    | Current Technology                           | Future Enhancements                |
|--------------------------|----------------------------------------------|------------------------------------|
| **Frontend**             | Next.js 13+, TypeScript, TailwindCSS        | Chart.js (trending widgets)       |
| **Backend API**          | Node.js, Express, RESTful APIs              | API caching, rate limiting         |
| **Database (Primary)**   | PostgreSQL + Prisma ORM                     | Amazon RDS (production)            |
| **ETL Pipeline**         | Python 3.10, PostgreSQL                     | -                                  |
| **Advanced Analytics**   | -                                            | Databricks + Apache Spark          |
| **Analytics Warehouse**  | -                                            | Amazon Redshift                    |
| **Pipeline Orchestration** | -                                         | Apache Airflow                     |
| **Authentication**       | JWT (stateless authentication)              | -                                  |
| **External APIs**        | Jikan API (MyAnimeList data)                | -                                  |
| **Cloud Infrastructure** | -                                            | AWS (ECS, RDS, Redshift, Databricks) |

## 🏗️ System Architecture

| Component                | Technology & Purpose                                                     |
|--------------------------|--------------------------------------------------------------------------|
| **Frontend Application** | **Next.js 13+ + TypeScript** - Personal anime tracking, search, statistics, trending analytics dashboard |
| **Backend API Server**   | **Node.js + Express** - User management, authentication, list operations, search proxy, analytics API endpoints |
| **Production Database**  | **PostgreSQL + Prisma** - User accounts, watchlists, ratings, current anime data, basic analytics results |
| **ETL Pipeline**         | **Python 3.10** - Daily anime data extraction, transformation, loading, basic trending analytics |
| **Analytics Engine**     | **Python CLI** - Ranking analysis, momentum calculations, data validation, manual ETL operations |
| **External Data Source** | **Jikan API** - Real-time anime data, daily ranking updates, search results |

### **Future Analytics Architecture** (Stages 2-8)
| Component                | Technology & Purpose                                                     |
|--------------------------|--------------------------------------------------------------------------|
| **Advanced Analytics**   | **Databricks + Apache Spark** - Rolling window analysis, statistical computations, confidence intervals |
| **Analytics Warehouse**  | **Amazon Redshift** - Pre-computed advanced analytics results, optimized for complex queries |
| **Pipeline Orchestration** | **Apache Airflow** - Automated scheduling, dependency management, monitoring, data quality validation |
| **Cloud Infrastructure** | **AWS (RDS, Redshift, ECS, Databricks)** - Production deployment, auto-scaling, multi-database connectivity |

---

## ✅ CURRENT FEATURES

### 🐱 Virtual Cat Companion
- **Interactive mood system**: Cat gifs to react to user activity (happy, bored, excited, neutral)
- **Smart suggestions**: Cat suggests actions based on current mood
- **Mood persistence**: Remembers activity levels across sessions

### 📺 Core Anime Tracking
- **Personal anime lists** with 5 status categories (Watching, Completed, Plan to Watch, On Hold, Dropped)
- **Personal ratings** (1-10 scale) and notes for each anime
- **Quick status updates** from anime cards with visual feedback
- **List management** from dedicated `/my-list` page

### 🔍 Advanced Search & Discovery
- **Real-time search** using Jikan API with rate limiting
- **Advanced filtering** by genres, year ranges, status, and score ranges
- **Genre-only browsing** without search terms
- **Pagination** with "Load More" functionality
- **Search cooldown** to prevent API abuse

### 📊 Personal Statistics Dashboard
- **Comprehensive stats** calculated from user data (total counts, watch time, genre preferences)
- **Interactive charts** using Chart.js (status breakdown, genre distribution, ratings, activity over time)

### 🔐 User Management
- **JWT-based authentication** with secure token handling
- **Registration and login** with form validation
- **Protected routes** throughout application

### 📈 ETL Pipeline & Analytics (Stage 1)
- **Python ETL pipeline** for processing anime data from Jikan API
- **Database schema** with 4 new tables: `RawAnimeData`, `ProcessedAnime`, `DailyRankings`, `EtlLogs`
- **CLI interface** for running ETL jobs manually
- **Comprehensive logging** and error handling
- **Unit tests** for ETL functions

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
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

# Install ETL dependencies
cd ../etl
pip install -r requirements.txt
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

### 4. ETL Pipeline Usage
```bash
# Run ETL pipeline manually
cd etl
python pipeline.py run --source rankings

# View analytics
python pipeline.py analytics --type climbers

# View logs
python pipeline.py logs --limit 10
```

---

## 📁 Project Structure

```
catlog/
├── README.md
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── middleware/      # Auth, CORS, error handling
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Jikan API integration
│   │   └── utils/          # JWT, validation utilities
│   └── prisma/             # Database schema & migrations
├── frontend/               # Next.js React application
│   └── src/
│       ├── app/            # Next.js 13+ app router pages
│       ├── components/     # Reusable React components
│       ├── hooks/          # Custom React hooks
│       └── stores/         # State management (Zustand)
├── etl/                    # Python ETL pipeline
│   ├── analytics.py        # Analytics query engine
│   ├── config.py          # Configuration management
│   ├── database.py        # Database operations
│   ├── extractor.py       # Jikan API data extraction
│   ├── pipeline.py        # Main ETL orchestrator & CLI
│   ├── transformer.py     # Data transformation
│   └── tests/             # ETL unit tests
├── databricks/             # Stage 2: Spark Analytics (NEW)
│   ├── config/            # Connection & cluster configuration
│   ├── notebooks/         # Spark analytics notebooks
│   ├── schemas/           # Analytics table definitions
│   └── validation/        # Cross-validation scripts
└── shared/                # Shared TypeScript types
```

---

## 🎯 ETL Pipeline (Stage 1 Implementation)

### Database Schema Extensions

The ETL pipeline adds 4 new tables to support anime analytics:

#### `RawAnimeData`
Stores raw JSON responses from Jikan API for debugging and reprocessing.

#### `ProcessedAnime`  
Stores cleaned, structured anime data with current rankings and metadata.

#### `DailyRankings`
Daily snapshots of anime rankings for historical trend analysis.

#### `EtlLogs`
Comprehensive ETL run tracking with status, timing, and error information.

### ETL Workflow

1. **Extract**: Fetch top 100 anime rankings from Jikan API (4 pages, 25 per page)
2. **Transform**: Parse JSON, validate data, extract key metrics
3. **Load**: Upsert current data, insert historical snapshots, log results

### Analytics Capabilities

The pipeline enables several analytics queries:
- **Ranking History**: Track how anime rankings change over time
- **Biggest Climbers**: Find anime that gained the most ranks (weekly/monthly)
- **Score Momentum**: Identify anime with increasing scores (weekly/monthly)
- **New Entries**: Detect anime entering top rankings for the first time

### Python CLI Commands

```bash
# Run daily ETL
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

---

## 🧪 Testing

```bash
# Backend API tests
cd backend  
npm test

# ETL pipeline tests
cd etl
python -m pytest tests/
```

---

## 🎯 Future Stages (Planned)

#### **Current Stage 1 Analytics (Basic ETL) - Completed**
Our existing analytics provide immediate trending insights:
- **Biggest Climbers Week**: `get_biggest_climbers(days=7)` - Top 5 anime with biggest rank improvements this week
- **Biggest Climbers Month**: `get_biggest_climbers(days=30)` - Top 5 anime with biggest rank improvements this month
- **New to Top 50**: `get_new_entries_top50()` - Anime that entered top 50 for the first time
- **Score Surging Week**: `get_score_momentum(days=7)` - Top 5 anime with biggest score increases this week
- **Score Surging Month**: `get_score_momentum(days=30)` - Top 5 anime with biggest score increases this month
- **Longest Running**: `get_longest_top10_streaks()` - Anime with longest consecutive top 10 streaks
- **Python ETL Validation**: Continue existing data quality checks in PostgreSQL

### **Stage 2: Advanced Time Series Analytics with Databricks** ⚡ - **IN PROGRESS**
- **Keep Existing Python ETL**: Our current daily ETL pipeline continues as-is
- **Add Spark Analytics Layer**: Use Databricks for computationally intensive rolling window analysis
- **Data Source**: Spark reads from our existing PostgreSQL `DailyRankings` table
- **Data Enhancement**: Add `genres` field to `DailyRankings` table for advanced analytics
- **Cross-Platform Validation**: Ensure consistency between PostgreSQL basic analytics and Redshift advanced analytics
- **Databricks Validation**: Advanced statistical validation for rolling window calculations

#### **Stage 2 Progress - Databricks Infrastructure Setup** ✅
**Infrastructure Foundation (Completed)**:
- ✅ **Databricks Connection Layer**: Created `databricks/config/connection.py` with `DatabaseConnection` and `DatabricksConfig` classes
- ✅ **Environment Configuration**: Secure `.env` file management for PostgreSQL credentials
- ✅ **Spark Session Management**: Automatic Spark session creation with PostgreSQL JDBC drivers
- ✅ **Data Reading Methods**: `read_daily_rankings()` method successfully reads from PostgreSQL via Spark
- ✅ **Connection Testing**: Both standalone Python script and Databricks notebook testing capabilities
- ✅ **Schema Validation**: All PostgreSQL column names (camelCase) properly handled with quoted identifiers

**Current Capabilities**:
- ✅ **PostgreSQL → Spark Integration**: Successfully reads 50 records from `DailyRankings` table
- ✅ **Data Validation**: Confirms proper data structure (malId, snapshotDate, rank, score, genres, etc.)
- ✅ **Error Handling**: Comprehensive logging and connection error management
- ✅ **Self-Testing Scripts**: `python connection.py` runs full connection validation locally
- ✅ **Analytics Table Creation**: Created 5 new analytics tables in PostgreSQL schema (`RollingMomentumAnalysis`, `VolatilityRankings`, `GenrePercentiles`, `TrendSignificance`, `TrendCorrelation`)

**Files Created**:
```
databricks/
├── config/
│   ├── connection.py          # Core connection library with self-testing
│   └── .env                   # Secure environment variables
├── notebooks/
│   └── 00_connection_test.py  # Databricks notebook format testing
└── test_connection_simple.py  # Standalone connection test script
```

**Technical Implementation**:
- **Database Connection**: PostgreSQL JDBC via Spark with proper credential management
- **Column Handling**: Proper PostgreSQL quoted identifiers for camelCase columns (`"malId"`, `"snapshotDate"`, `"scoredBy"`, `"etlRunId"`)
- **Data Filtering**: Time-based filtering (e.g., last 7 days) with proper date handling
- **Self-Testing Capability**: `if __name__ == "__main__"` pattern for direct script execution
- **Databricks Compatibility**: Notebook format with `# MAGIC` commands for Databricks UI

**Next Stage 2 Tasks**:
- 🔄 **Rolling Window Analytics**: Implement Spark jobs for momentum, volatility, and genre analysis
- 🔄 **Data Writing Methods**: Add `write_analytics_results()` to connection layer
- 🔄 **Validation Scripts**: Cross-validation between PostgreSQL and Spark calculations

New Directories / Files Created:
- `databricks/config/connection.py`: Core connection library providing `DatabaseConnection` and `DatabricksConfig` classes. Centralizes all database configuration and provides clean methods for Spark → PostgreSQL connectivity and analytics settings.
- `databricks/config/.env`: Secure environment variables for PostgreSQL credentials, properly loaded by connection layer.
- `databricks/notebooks/00_connection_test.py`: Databricks notebook format for interactive connection testing in Databricks UI with proper `# MAGIC` command structure.

**Connection Test Results**:
```bash
✅ Spark connection successful
✅ PostgreSQL connection successful - found 50 records in DailyRankings  
✅ Spark → PostgreSQL connection successful - read 50 records
Overall Connection Status: ✅ SUCCESS
```

---

## 📊 Current Data Flow

'''
PostgreSQL (Raw Data) → Databricks (Processing) → Redshift (Analytics Results) → API → Frontend
       ↓                       ↓                        ↓                ↓        ↓
   DailyRankings       Rolling Window Analysis    Advanced Analytics    REST    Dashboard
   ProcessedAnime     Statistical Calculations    Pre-computed Results   APIs    Widgets
'''

**Architecture:**
1. **ETL Pipeline** collects and processes anime data daily
2. **Backend API** serves both user data and analytics
3. **Frontend** displays personal tracking + future analytics widgets
4. **Database** stores user accounts, lists, ratings, and anime analytics

---

## 🎯 Success Metrics

### Core Application
- ✅ Users can register, login, and manage anime lists
- ✅ Advanced search with filtering works smoothly
- ✅ Cat companion responds to user activity
- ✅ Personal statistics show comprehensive analysis

### ETL Pipeline (Stage 1)
- ✅ Python ETL pipeline successfully processes Jikan API data
- ✅ Database schema supports historical anime rankings
- ✅ CLI interface enables manual ETL operations for testing
- ✅ Comprehensive logging tracks all ETL activities
- ✅ Unit tests validate ETL transformation logic

---

## 🤝 Contributing

This is a portfolio project showcasing incremental data engineering development. Each stage is thoroughly tested before proceeding to the next.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
