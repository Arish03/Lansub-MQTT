# Build & Deployment Guide: Realtime MQTT Dashboard

This document details the build specifications, project layout, environment configuration, containerization, and build automation for the **Realtime MQTT Dashboard** as synthesized from `PRD.md`, `ARCHITECTURE.md`, `MVP.md`, and `PLAN.md`.

---

## 1. System Overview & Technology Matrix

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui | Next.js 15+, Node 20+ | Responsive white-theme dashboard UI |
| **State / Charts** | Zustand, TanStack Query, uPlot / Recharts | Latest | Live stream ring buffers, REST queries, high-fps charts |
| **Backend API** | Python, FastAPI, Uvicorn | Python 3.12+ | Async REST API & WebSocket hub |
| **MQTT Client** | `aiomqtt` (asyncio wrapper over Paho) | 2.0+ | Runtime multi-broker subscribe/publish engine |
| **Database** | PostgreSQL (+ TimescaleDB extension ready) | Postgres 16 | Relational config (users, brokers, topics) + time-series messages |
| **ORM & Migrations**| SQLAlchemy 2.0 (asyncio) + asyncpg + Alembic | 2.0+ | Database schema versioning & async queries |
| **Security & Auth** | Argon2 (`argon2-cffi`), PyJWT, Cryptography (Fernet) | Latest | User credentials, JWT auth, broker secrets encryption |
| **Local Broker** | Eclipse Mosquitto | 2.x | Local development MQTT broker |
| **Orchestration** | Docker & Docker Compose / Make | Compose v2 | Unified single-command environment lifecycle |

---

## 2. Directory Structure

The project follows a standard monorepo architecture:

```
Lansub MQTT/
├── ARCHITECTURE.md            # System architecture and technical design
├── BUILD.md                   # Build specification and setup instructions (this file)
├── MVP.md                     # MVP scope, locked decisions, and definition of done
├── PLAN.md                    # Roadmap, timeline, and environment variables
├── PRD.md                     # Product requirements and user stories
├── Makefile                   # Cross-platform build & lifecycle automation
├── docker-compose.yml         # Container orchestration (db, mosquitto, backend, frontend)
├── .env.example               # Template environment configuration
├── mosquitto/
│   └── config/
│       └── mosquitto.conf     # Eclipse Mosquitto configuration
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml         # Dependencies & project metadata
│   ├── requirements.txt       # Pinned requirements
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py            # FastAPI lifespan, router mounting, WS endpoint
│       ├── config.py          # Pydantic Settings, environment loading
│       ├── db.py              # Async SQLAlchemy engine & session factory
│       ├── models/            # User, Broker, Topic, Message, Dashboard, Widget
│       ├── schemas/           # Pydantic request/response schemas
│       ├── api/               # Auth, brokers, topics, publish, dashboards, history
│       ├── mqtt/
│       │   ├── manager.py     # aiomqtt multi-broker connection manager
│       │   └── matcher.py     # Wildcard topic matcher (+ and #)
│       ├── ws/
│       │   └── hub.py         # Multi-user WebSocket client registry & fan-out
│       └── services/
│           ├── ingest.py      # Async queue batch database writer
│           └── security.py    # Argon2 hashing & Fernet encryption
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── dashboard/
    │   │   └── page.tsx       # Live widget grid
    │   └── settings/
    │       ├── brokers/page.tsx
    │       └── topics/page.tsx
    ├── components/
    │   ├── layout/            # Sidebar, Topbar, ConnectionBadge
    │   ├── ui/                # shadcn primitives (Button, Card, Input, Dialog, etc.)
    │   └── widgets/           # StatCard, LineChart, MessageTable, SwitchWidget
    └── lib/
        ├── api.ts             # TanStack Query REST client
        ├── ws-client.ts       # WebSocket connection manager with auto-reconnect
        └── store.ts           # Zustand ring buffers & live states
```

---

## 3. Environment Variables Reference (`.env`)

Create a `.env` file in the project root:

```bash
# Database
POSTGRES_USER=app
POSTGRES_PASSWORD=app_secret
POSTGRES_DB=mqtt
DATABASE_URL=postgresql+asyncpg://app:app_secret@db:5432/mqtt

# Security & Encryption
# Generate JWT_SECRET: openssl rand -hex 32
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
# Generate FERNET_KEY: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FERNET_KEY=YOUR_GENERATED_BASE64_FERNET_KEY=

# Default Admin Seed (Optional)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=AdminSecurePassword123!

# Local Mosquitto Broker
MQTT_DEFAULT_HOST=mosquitto
MQTT_DEFAULT_PORT=1883

# Frontend Public URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## 4. Build & Execution Options

### Option A: Fully Containerized (Recommended for Production & Quick Start)

Run the full stack (PostgreSQL, Mosquitto, FastAPI Backend, Next.js Frontend) with Docker Compose:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Build and start all containers in detached mode
make up
# Or: docker compose up --build -d

# 3. Check logs
make logs
# Or: docker compose logs -f

# 4. Stop all services
make down
# Or: docker compose down
```

Services exposed:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Mosquitto MQTT**: `localhost:1883`
- **Postgres Database**: `localhost:5432`

---

### Option B: Local Development (Bare-Metal / Hybrid)

Run PostgreSQL and Mosquitto in Docker, but run FastAPI and Next.js locally for rapid hot-reloading.

#### 1. Start Infrastructure Dependencies
```bash
docker compose up -d db mosquitto
```

#### 2. Backend Setup (Python 3.12)
```bash
cd backend
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows PowerShell:
.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI dev server with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Frontend Setup (Node 20+)
```bash
cd frontend
npm install

# Start Next.js development server
npm run dev
```

---

## 5. Definition of Done & Verification Workflow

As established in `MVP.md`, verify the build by running through the smoke tests:

1. **Multi-User Isolation**:
   - Register User A (`userA@example.com`) and User B (`userB@example.com`).
   - Add a broker and topic `sensor/#` on User A's account.
   - Verify User B cannot view User A's brokers, topics, or WebSocket events.
2. **End-to-End Realtime Ingestion**:
   - Publish a test payload to the Mosquitto broker:
     ```bash
     docker exec -it lansub-mqtt-broker mosquitto_pub -t sensor/temp -m '{"temp": 24.5}'
     ```
   - Verify the value displays in the frontend widget within **< 1 second**.
3. **Control & Publish**:
   - Toggle the Switch widget in the UI configured to topic `switch/relay1`.
   - Verify using `mosquitto_sub -t switch/relay1` that payload `ON`/`OFF` arrives.
4. **Resilience & Auto-Reconnect**:
   - Restart the Mosquitto container (`docker compose restart mosquitto`).
   - Ensure the FastAPI backend reconnects with exponential backoff and automatically resubscribes all user topics without requiring a restart.

---

For complete user walkthroughs, UI guides, and live publishing examples, refer to the [User Guide (HOW_TO_USE.md)](file:///e:/Lansub%20MQTT/HOW_TO_USE.md).
