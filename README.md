# Vehicle Tracking System (VTS) - Backend & Dashboard

A premium, modular fleet monitoring solution composed of a **FastAPI** backend (storing telemetry in **PostgreSQL**) and a responsive **Next.js 15** analytics dashboard.

---

## Folder Structure

```
GPS_Project/
├── alembic.ini             # Alembic configuration
├── .env                    # Local environment settings
├── requirements.txt        # Backend dependencies
├── README.md               # Setup and usage guide
├── alembic/                # Migration scripts
│   ├── env.py
│   └── versions/
│       ├── 001_initial_migration.py
│       └── 002_timezone_aware.py
├── app/                    # FastAPI Backend Source
│   ├── main.py             # Entry point
│   ├── database.py         # DB connection manager
│   ├── config.py           # Configuration loader
│   ├── exceptions.py       # API Error handlers
│   ├── logging_config.py   # Colored stdout logger
│   ├── models/             # SQLAlchemy schemas
│   ├── schemas/            # Pydantic schemas
│   ├── crud/               # DB operation logic
│   └── routers/            # Router endpoints
├── postman/                # Postman collections
└── dashboard/              # Next.js Dashboard Frontend (NEW)
    ├── package.json        # Dependencies (React, Recharts, Lucide, Tailwind)
    ├── tsconfig.json       # TypeScript configuration
    ├── next.config.js      # Environment mapping
    ├── tailwind.config.js  # Dark theme configuration
    ├── postcss.config.js   # PostCSS configuration
    ├── app/                # Next.js pages & styling
    │   ├── layout.tsx      # Sidebar navigation wrapper
    │   ├── page.tsx        # Page 1: Overview
    │   ├── globals.css     # Global styles & glassmorphism tokens
    │   ├── vehicles/
    │   │   ├── page.tsx    # Page 2: Vehicle Management
    │   │   └── [id]/
    │   │       └── page.tsx # Page 3: Vehicle Details
    │   ├── packets/
    │   │   └── page.tsx    # Page 4: Raw Packet Monitor
    │   ├── analytics/
    │   │   └── page.tsx    # Page 5: Telemetry Analytics
    │   └── explorer/
    │       └── page.tsx    # Page 6: Database Explorer
    ├── components/         # React Components
    │   ├── sidebar.tsx     # Navigation sidebar
    │   └── ui/             # Layout components (Card, Table, Button, etc.)
    └── lib/
        ├── api.ts          # API fetch client
        └── utils.ts        # Helper functions (cn classnames merger)
```

---

## Backend Setup (FastAPI & PostgreSQL)

### 1. PostgreSQL Local Database Setup
Connect to your local PostgreSQL instance and execute:
```sql
CREATE DATABASE vts_db;
```

Verify your credentials in your local `.env` configuration file:
- `DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/vts_db` (for Alembic migrations)
- `ASYNC_DATABASE_URL=postgresql+asyncpg://postgres:postgres123@localhost:5432/vts_db` (for async server connections)

### 2. Install Dependencies & Run Migrations
1. Activate virtual environment and install packages:
   ```bash
   pip install -r requirements.txt
   ```
2. Run database migrations:
   ```bash
   alembic upgrade head
   ```
3. Run the development web server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   FastAPI will start on [http://localhost:8000](http://localhost:8000).

---

## Frontend Setup (Next.js Dashboard)

### 1. Installation
1. Navigate to the `dashboard/` directory in a new terminal:
   ```bash
   cd dashboard
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```

### 2. Start the Frontend Web Server
1. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
   The dashboard will start on [http://localhost:3000](http://localhost:3000).

---

## Dashboard Pages & Features

### Page 1: Dashboard Overview
- **Key Widgets**: Metric cards tracking total vehicles, total logged coordinates, total raw packets, active online count, and the latest ingest timestamp.
- **Auto-polling**: Automatically fetches latest fleet statistics every 10 seconds.
- **Activity Table**: Lists registered vehicles sorted by most recently seen, including vehicle status badges.

### Page 2: Vehicle Management
- **Search & Filters**: Search vehicles by name or device hardware UID. Filter inventory lists by vehicle type using a dropdown selector.
- **Badge Indicators**:
  - `Online` (green, pulsing): active telemetry received in the last 5 minutes.
  - `Idle` (amber): last seen active between 5 and 30 minutes ago.
  - `Offline` (red): last seen over 30 minutes ago or never connected.

### Page 3: Vehicle Details (`/vehicles/[id]`)
- **Profile Info**: Static metadata representing the vehicle's profile.
- **Latest Logs**: Active metrics showing last coordinates, speed, and altitude.
- **History Table**: Chronological table showing the vehicle's last 50 telemetry points.
- **Metrics Stats**: Calculated average and maximum speeds along with cumulative points count.

### Page 4: Raw Packet Monitor
- **Ingestion Log**: Displays row records of parsed telemetry log packages from `raw_packets`.
- **JSON Viewer**: Click on any row in the table to expand a styled JSON viewer displaying the complete nested payload data.

### Page 5: Telemetry Analytics
- **Speed Timeline**: Chart depicting speed over time for coordinates updates.
- **Ingest Volume**: Area chart tracking logged points per calendar day.
- **Distribution Chart**: Bar graph comparing cumulative location packages produced by each vehicle.

### Page 6: Database Explorer
- **Direct SQL Tables View**: Explores table rows directly from `vehicles`, `locations`, and `raw_packets`.
- **Paging Controllers**: Uses `Previous` and `Next` buttons to shift database page offsets using standard `skip`/`limit` SQL queries.
