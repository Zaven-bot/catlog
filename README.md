# 🐾 CatLog – Anime Tracking Application

CatLog is a full-stack anime tracking application with an integrated ETL pipeline for anime data analytics. Built with modern web technologies and data engineering practices.

---

## 🛠️ Tech Stack

| Layer              | Technology                                    |
|--------------------|-----------------------------------------------|
| **Frontend**       | Next.js 13+, TypeScript, TailwindCSS         |
| **Backend API**    | Node.js, Express, RESTful APIs               |
| **Database**       | PostgreSQL + Prisma ORM                      |
| **ETL Pipeline**   | Python 3.10, PostgreSQL                      |
| **Authentication** | JWT (stateless authentication)               |
| **External APIs**  | Jikan API (MyAnimeList data)                 |

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
- **Score Momentum**: Identify anime with increasing scores
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

### **Stage 2: Cloud Warehouse Sync** ☁️
- Sync processed data to BigQuery for advanced analytics
- Materialized views for complex queries

### **Stage 3: Orchestration with Airflow** 🔄
- Apache Airflow DAGs for scheduling ETL runs
- Automated retries and failure alerts

### **Stage 4: Real-time Analytics Widget** ⚡
- Live trending anime widget on dashboard
- WebSocket endpoints for real-time updates

### **Stage 5: Data Quality & Governance** ✅
- Great Expectations for data validation
- Automated data quality monitoring

### **Stage 6: Cloud Deployment** 🚀
- Docker containers for all services
- Terraform for AWS infrastructure

### **Stage 7: Documentation & Architecture** 📚
- Architecture diagrams and comprehensive guides

---

## 📊 Current Data Flow

```
Jikan API → Python ETL → PostgreSQL → Backend API → Frontend
    ↓           ↓            ↓            ↓           ↓
Raw JSON → Transform → Analytics → User Data → React UI
```

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
- ✅ Application performs well on mobile and desktop

### ETL Pipeline (Stage 1)
- ✅ Python ETL pipeline successfully processes Jikan API data
- ✅ Database schema supports historical anime rankings
- ✅ CLI interface enables manual ETL operations
- ✅ Comprehensive logging tracks all ETL activities
- ✅ Unit tests validate ETL transformation logic

---

## 🤝 Contributing

This is a portfolio project showcasing incremental data engineering development. Each stage is thoroughly tested before proceeding to the next.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
