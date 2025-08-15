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
│   │   └── utils/          # JWT, validation utilities
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
