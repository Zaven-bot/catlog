# 🐾 CatLog – Anime Tracking with Data Engineering Pipeline

CatLog is a full-stack anime tracking application that combines modern web development with a robust data engineering pipeline. Built as a portfolio project showcasing both frontend development skills and data engineering capabilities using real anime data from the Jikan API.

## 🎯 Purpose

CatLog demonstrates two key technical areas:
- **Frontend Development**: React/Next.js application for anime discovery and tracking
- **Data Engineering**: Production-ready ETL pipeline for processing anime data at scale

This project showcases practical skills in full-stack development, data pipeline architecture, and modern DevOps practices.

---

## 🛠️ Tech Stack

| Layer              | Technology                                    |
|--------------------|-----------------------------------------------|
| **Frontend**       | Next.js, TypeScript, TailwindCSS             |
| **Backend API**    | Node.js, Express, RESTful APIs               |
| **Database**       | PostgreSQL + Prisma ORM                      |
| **Authentication** | JWT (stateless authentication)               |
| **Data Pipeline**  | Python ETL with Jikan API integration        |
| **External APIs**  | Jikan (MyAnimeList data)                     |
| **Testing**        | Jest (unit), Pytest (ETL)                    |
| **Deployment**     | Vercel (frontend), Render (backend)          |

---

## 🎯 Current Features

### 🐱 Virtual Cat Companion
- Interactive cat that reacts to user activity
- Different moods and animations based on anime tracking behavior
- Quick action suggestions based on cat's current mood

### 📺 Anime Discovery & Tracking
- Browse trending, seasonal, and all-time favorite anime
- Detailed anime information pages with ratings, genres, and synopsis
- Personal anime list management with status tracking:
  - Currently Watching
  - Completed
  - Plan to Watch
  - On Hold
  - Dropped
- Personal ratings and notes for each anime

### 🔍 Search & Discovery
- Real-time anime search using Jikan API
- Advanced filtering and pagination
- Recently searched anime tracking

### 📊 Statistics Dashboard
- Personal anime statistics and viewing habits
- Interactive charts showing:
  - Status breakdown (watching, completed, etc.)
  - Top genres from your list
  - Personal rating distribution
  - Viewing activity over time

### 🔐 User Management
- JWT-based authentication system
- User registration and login
- Protected routes and secure API access
- Personal profile management

---

## 🏗️ Data Engineering Pipeline

### ETL Pipeline (IMPLEMENTED)
A production-ready ETL pipeline that processes anime data from the Jikan API:

**Features:**
- **Extract**: Pulls trending and seasonal anime data from Jikan API with rate limiting
- **Transform**: Converts raw JSON data into structured, validated format
- **Load**: Stores both raw and processed data in PostgreSQL
- **Logging**: Comprehensive ETL run tracking and error handling
- **CLI Interface**: Easy-to-use command-line tools
- **Unit Tests**: Full test coverage for all ETL functions

**Database Schema:**
- `RawAnimeData`: Stores complete JSON responses from Jikan API
- `ProcessedAnime`: Structured, transformed anime data ready for analysis
- `EtlLogs`: Comprehensive logging of all ETL pipeline runs

**Usage:**
```bash
# Run ETL pipeline
cd etl
python pipeline.py run

# Extract seasonal anime
python pipeline.py run --source seasonal --year 2024 --season winter

# View recent ETL logs
python pipeline.py logs

# Test database connection
python pipeline.py test-connection
```

**Monitoring & Error Handling:**
- Unique run IDs for tracking
- Start/end timestamps and duration tracking
- Success/failure status logging
- Row count processing metrics
- Detailed error messages and stack traces
- Rate limiting and retry logic for API calls

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
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

### 3. ETL Pipeline Setup
```bash
# Configure ETL environment
cd etl
cp .env.example .env
# Edit .env with your database credentials

# Test ETL connection
python pipeline.py test-connection

# Run initial data load
python pipeline.py run --max-pages 5
```

### 4. Start Development Servers
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

## 📁 Project Structure

```
catlog/
├── README.md
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── middleware/      # Auth, CORS, error handling
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # External API integrations
│   │   └── utils/          # JWT, validation utilities
│   └── prisma/             # Database schema & migrations
├── frontend/               # Next.js React application
│   └── src/
│       ├── app/            # Next.js 13+ app router pages
│       ├── components/     # Reusable React components
│       ├── hooks/          # Custom React hooks
│       └── stores/         # State management
├── etl/                    # Python ETL pipeline
│   ├── config.py           # Configuration management
│   ├── database.py         # Database operations
│   ├── extractor.py        # Jikan API data extraction
│   ├── transformer.py      # Data transformation
│   ├── pipeline.py         # Main ETL orchestrator & CLI
│   └── tests/              # ETL unit tests
└── shared/                 # Shared TypeScript types
```

---

## 🧪 Testing

### Backend API Tests
```bash
cd backend
npm test
```

### ETL Pipeline Tests
```bash
cd etl
python -m pytest tests/ -v
```

---

## 📊 Data Flow Architecture

```
Jikan API → ETL Pipeline → PostgreSQL → Backend API → Frontend
    ↓            ↓             ↓           ↓           ↓
Raw JSON → Transformation → Structured → REST API → React UI
   +              +            Data        +          +
Validation → Error Handling → Indexing → Caching → State Mgmt
```

**ETL Pipeline Flow:**
1. **Extract**: Fetch anime data from Jikan API with rate limiting
2. **Transform**: Clean, validate, and structure raw JSON data
3. **Load**: Store in PostgreSQL with comprehensive logging
4. **Monitor**: Track pipeline runs, errors, and performance metrics

---

## 🎯 Development Roadmap

### Completed ✅
- Core anime tracking functionality
- User authentication and management
- Real-time anime search and discovery
- Personal statistics dashboard
- Virtual cat companion with mood system
- Production-ready ETL pipeline
- Comprehensive error handling and logging
- Unit test coverage for ETL functions

### In Progress / Future Enhancements
- Cloud data warehouse integration (BigQuery)
- Apache Airflow orchestration
- Real-time streaming data updates
- Data quality validation with Great Expectations
- Containerization and cloud deployment
- CI/CD pipeline automation

---

## 🚀 Deployment

### Frontend
- Deployed on [Vercel](https://vercel.com/)
- Automatic deployments from main branch
- Environment variables configured for production API endpoints

### Backend
- Deployed on [Render](https://render.com/)
- PostgreSQL database on [Supabase](https://supabase.com/)
- JWT-based stateless authentication
- CORS configured for production frontend

### ETL Pipeline
- Can be scheduled via cron for regular data updates
- Supports both manual and automated execution
- Production-ready error handling and logging

---

## 💡 Technical Highlights

### Data Engineering
- **ETL Architecture**: Modular, testable pipeline design
- **Error Handling**: Comprehensive logging and graceful failure recovery
- **Data Quality**: Validation and transformation with detailed audit trails
- **Scalability**: Configurable batch processing and rate limiting
- **Monitoring**: Detailed metrics and run tracking

### Full-Stack Development
- **Type Safety**: End-to-end TypeScript implementation
- **State Management**: React hooks with optimistic updates
- **API Design**: RESTful endpoints with proper error handling
- **Database Design**: Normalized schema with proper indexing
- **Authentication**: Secure JWT implementation with protected routes

### DevOps & Quality
- **Testing**: Unit tests for both backend and ETL components
- **Documentation**: Comprehensive README and inline code documentation
- **Configuration**: Environment-based configuration management
- **Logging**: Structured logging with timestamps and error tracking

---

## 📈 Success Metrics

- ✅ Users can register, login, and manage their anime lists
- ✅ Search returns real anime data from Jikan API
- ✅ Cat companion responds meaningfully to user activity
- ✅ Statistics show real user data trends
- ✅ ETL pipeline processes data reliably with comprehensive logging
- ✅ Application is deployed and accessible online
- ✅ Performance is smooth on mobile and desktop

**Total Development Time**: ~80 hours across frontend, backend, and data pipeline

---

## 🤝 Contributing

This is a portfolio project, but feedback and suggestions are welcome! Please feel free to:
- Report bugs or issues
- Suggest new features
- Provide feedback on code quality or architecture

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
