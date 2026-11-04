# Lansub MQTT — Realtime IoT Telemetry & Device Control Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![MQTT](https://img.shields.io/badge/Protocol-MQTT%20v3.1.1%2Fv5.0-660066?style=flat-square&logo=eclipsemosquitto)](https://mosquitto.org/)
[![Docker](https://img.shields.io/badge/Orchestration-Docker%20Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

**Lansub MQTT** is a lightweight, modern, self-hosted IoT telemetry streaming and device control platform. It connects to multiple MQTT brokers (local Mosquitto, EMQX, HiveMQ Cloud, AWS IoT), subscribes dynamically to topics with wildcards at runtime, streams data to a clean Next.js white-theme dashboard over authenticated WebSockets, and dispatches control commands back to field devices.

---

## Key Features

- **Multi-Tenant Data Isolation**: Strict user-level data separation powered by Argon2 password hashing, PyJWT tokens, and Fernet encryption for broker credentials at rest.
- **Dynamic Multi-Broker Engine**: Add or remove brokers (plaintext TCP or TLS/SSL) and modify topic subscriptions on the fly—no backend restarts required.
- **Sub-Second Streaming**: Push live metrics from broker to browser over WebSockets with $< 50\text{ms}$ typical delivery latency.
- **Intelligent Payload Extraction**: Deep recursive extraction from JSON (via JSONPath or dot notation like `$.metrics.temp`), double-encoded raw payloads, raw numeric floats, or text status strings.
- **Interactive UI Widgets**:
  - **Stat Card**: Real-time value, units, delta trends, and animated alert states.
  - **Radial Gauge Dial**: Smooth 240° SVG arc with safe, warning, and critical danger threshold color zones.
  - **Realtime Line Chart**: Zero-dependency vector time-series chart with 1h / 24h / 7d historical ranges.
  - **Relay Switch**: Bi-directional toggle button dispatching `ON`/`OFF` payloads to control relays, lights, or pumps.
  - **Action Button**: One-shot trigger button for operations like *"Reboot Machine"*, *"Trigger Alarm"*, or custom JSON payloads.
  - **Live Message Stream Table**: Real-time packet viewer with Pause/Resume inspection and raw payload viewing.
- **Widget Management**: Each saved widget has hover-reveal **Edit** (✏️) and **Delete** (🗑️) buttons for in-place reconfiguration without page refresh.
- **Threshold Alerts & Alarms**: Configurable Min/Max alert boundaries, active alert indicators in the topbar, and visual alarms across cards, gauges, and tables.
- **One-Click CSV Export**: Stream historical topic telemetry to CSV from line charts or export live buffered packets from the message stream.
- **Automated Data Retention**: Integrated background worker periodically purging telemetry past each topic's `retain_days`.
- **Bidirectional IoT Simulator**: Standalone Python script (`scripts/simulator.py`) for simulating multi-sensor telemetry and acknowledging control commands.
- **Automated Test Suite**: 22 unit and integration tests covering wildcard matching, authentication, ingestion, and schema validation.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph IoT ["IoT Devices & Simulation"]
        Device["Physical Sensors & Actuators"]
        Sim["Python Simulator (scripts/simulator.py)"]
    end

    subgraph Brokers ["MQTT Brokers"]
        Mosquitto["Local Mosquitto (:7003)"]
        CloudBrokers["EMQX / HiveMQ Cloud (:8883 TLS)"]
    end

    subgraph Backend ["FastAPI Core (:7001)"]
        MQTTWorker["aiomqtt Multi-Broker Manager"]
        Ingest["IngestService (Queue + Batch Insert)"]
        Retention["Data Retention Worker (hourly)"]
        WSHub["WebSocket Hub (User Scoped)"]
        REST["REST API (Auth, Brokers, Topics, History, Publish)"]
    end

    subgraph Storage ["Database"]
        Postgres[("PostgreSQL 16 (:7005)")]
    end

    subgraph Frontend ["Next.js 15 Dashboard (:7000)"]
        UIWidgets["Widgets: StatCard, Gauge, LineChart, Switch, Button, Table"]
        UIStore["Zustand Store + Alert Engine"]
    end

    Device <-->|MQTT Pub/Sub| Mosquitto
    Sim <-->|MQTT Pub/Sub| Mosquitto
    Mosquitto <--> MQTTWorker
    CloudBrokers <--> MQTTWorker

    MQTTWorker -->|Raw Packet| Ingest
    Ingest -->|Batch DB Flush| Postgres
    Ingest -->|Value + Alert Tag| WSHub
    WSHub -->|WebSocket Stream| UIStore
    UIStore --> UIWidgets

    UIWidgets -->|Publish (Switch/Button)| REST
    REST -->|Publish Command| MQTTWorker
    Retention -->|Purge Expired Messages| Postgres
```

---

## Quick Start (Docker Compose)

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running on Windows, macOS, or Linux)
- [Git](https://git-scm.com/)

### 2. Clone & Configure

```bash
git clone https://github.com/Arish03/Lansub-MQTT.git
cd "Lansub-MQTT"

# Copy the environment template (do NOT commit .env to git)
cp .env.example .env
```

> **Important:** `.env` is excluded from version control. Edit it to set your own secrets and ports before starting.

### 3. Launch the Full Stack
```bash
# Start PostgreSQL, Mosquitto, FastAPI, and Next.js
docker compose up --build -d

# Verify all services are healthy
docker compose ps
```

### 4. Access Services

| Service | URL / Port | Credentials (Default) |
|---|---|---|
| **Web Dashboard** | [http://localhost:7000](http://localhost:7000) | `admin@example.com` / `AdminSecurePassword123!` |
| **API Documentation** | [http://localhost:7001/docs](http://localhost:7001/docs) | Interactive Swagger UI |
| **MQTT Broker (TCP)** | `localhost:7003` | Plain TCP (anonymous enabled by default) |
| **MQTT Broker (WS)** | `localhost:7004` | WebSocket transport |
| **PostgreSQL Database** | `localhost:7005` | User: `app`, Pass: `app_secret`, DB: `mqtt` |

> **Azure VM / Remote Access:** Replace `localhost` with your VM's public IP or domain. The frontend auto-detects the host at runtime — no rebuild required.

### 5. Current Port Configuration

The project ships with these default ports (set in `.env` and `docker-compose.yml`):

```env
FRONTEND_PORT=7000
BACKEND_PORT=7001
MQTT_PORT=7003
MQTT_WS_PORT=7004
DB_PORT=7005
```

**To change ports** (e.g. if other services are running on these ports), edit `.env`:

```env
FRONTEND_PORT=8000
BACKEND_PORT=8001
MQTT_PORT=1883
MQTT_WS_PORT=9001
DB_PORT=5432

# Update browser-side endpoints to match your new BACKEND_PORT
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_WS_URL=ws://localhost:8001/ws
```

Then rebuild:
```bash
docker compose up -d --build
```

> **Note:** Internal container-to-container communication (e.g. backend → mosquitto on port `1883`) is **not** affected by host port changes. Only the host-side mapping changes.

---

## Running the Real-time IoT Simulator

The platform includes a bidirectional Python telemetry generator and command subscriber:

```bash
python scripts/simulator.py --host localhost --port 7003 --interval 1.0
```

### What it does:
1. **Publishes Telemetry:**
   - `sensor/temperature`: Sinusoidal curve ($22^\circ\text{C} - 32^\circ\text{C}$) with random noise and humidity.
   - `test/sensor1`: Pressure barometer ($1.0 - 4.0\text{ bar}$) matching the `test/#` wildcard.
   - `factory/machine1/power`: Electrical power in kW with periodic industrial spikes.
2. **Subscribes & Acknowledges Commands:**
   - Listens on `control/#` and `switch/#`.
   - When a Switch or Button widget is activated on the web dashboard, the simulator logs the command in real-time and publishes an acknowledgment back to `control/ack`.

---

## Running Automated Backend Tests

The project includes an automated test suite verifying topic matching, security primitives, ingestion logic, and API schemas:

```bash
python -m unittest discover backend/tests -v
```

### Test Coverage:
* `backend/tests/test_matcher.py`: Topic wildcard matching (`+`, `#`, exact, edge cases).
* `backend/tests/test_auth.py`: Password hashing (Argon2), JWT token generation/validation, Fernet credential encryption.
* `backend/tests/test_ingest.py`: JSONPath parsing, dot-notation fallback extraction, numeric float handling, double-encoded raw payload extraction.
* `backend/tests/test_api_crud.py`: Pydantic schema validation for Auth, Brokers, Topics, Dashboards, and Publish actions.

---

## Project Structure

```
Lansub MQTT/
├── docker-compose.yml         # Container orchestration (db, mosquitto, backend, frontend)
├── Makefile                   # Build and development automation targets
├── .env                       # Active environment config (NOT committed to git)
├── .env.example               # Environment variables template (committed to git)
├── HOW_TO_USE.md              # In-depth end-user guide & walkthroughs
├── ARCHITECTURE.md            # Detailed system design specification
├── BUILD.md                   # Build and deployment specifications
├── scripts/
│   └── simulator.py           # Real-time IoT telemetry simulator & responder
├── mosquitto/
│   └── config/
│       └── mosquitto.conf     # Eclipse Mosquitto configuration
├── backend/
│   ├── Dockerfile             # Python 3.12 container specification
│   ├── requirements.txt       # Dependencies
│   ├── alembic/               # Database migrations (initial schema, thresholds)
│   ├── tests/                 # Automated test suite (matcher, auth, ingest, schemas)
│   └── app/
│       ├── main.py            # FastAPI entry point, lifespan, WebSocket router
│       ├── config.py          # Environment settings (CORS, DB, JWT)
│       ├── db.py              # Async SQLAlchemy engine & session proxy
│       ├── api/               # REST endpoints (auth, brokers, topics, history, publish)
│       ├── models/            # SQLAlchemy database models
│       ├── schemas/           # Pydantic request & response schemas
│       ├── mqtt/              # aiomqtt multi-broker connection manager & topic matcher
│       ├── ws/                # Multi-tenant WebSocket fan-out hub
│       └── services/          # Ingestion queue, data retention worker, security
└── frontend/
    ├── Dockerfile             # Multi-stage Next.js production build
    ├── package.json           # Dependencies
    ├── tailwind.config.ts     # White-theme design tokens
    ├── app/
    │   ├── page.tsx           # Home redirect logic
    │   ├── login/page.tsx     # Authentication sign-in
    │   ├── register/page.tsx  # User registration
    │   ├── dashboard/page.tsx # Real-time widget grid, add/edit/delete widget modals
    │   └── settings/          # Broker and Topic management screens
    ├── components/
    │   ├── layout/            # Sidebar, Topbar (with alert counter), ConnectionBadge
    │   └── widgets/           # StatCard, GaugeWidget, LineChart, SwitchWidget, ButtonWidget, MessageTable
    └── lib/
        ├── api.ts             # REST client with auto-detecting VM IP & CSV export utilities
        ├── store.ts           # Zustand store with ring buffers, deep payload extraction & wildcard mapping
        └── ws-client.ts       # WebSocket client with heartbeat & auto-reconnect
```

---

## Environment Configuration (`.env`)

> `.env` is **not committed to git**. Use `.env.example` as your starting template.

```ini
# PostgreSQL
POSTGRES_USER=app
POSTGRES_PASSWORD=app_secret
POSTGRES_DB=mqtt
DATABASE_URL=postgresql+asyncpg://app:app_secret@db:5432/mqtt

# Security & Tokens
JWT_SECRET=c28f3a8b417e923e5a7b1892019c8f61539281a7d6e4b3c2a10987654321abcd
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FERNET_KEY=vX1K4-z8_hYQ3mK6_2j8b1n3P9q7xW4_k5M8r0T2y1A=

# Default Admin Account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=AdminSecurePassword123!

# Local Mosquitto Broker (internal Docker network port — do NOT change)
MQTT_DEFAULT_HOST=mosquitto
MQTT_DEFAULT_PORT=1883

# Host-exposed ports (change these to avoid conflicts on your VM)
FRONTEND_PORT=7000
BACKEND_PORT=7001
MQTT_PORT=7003
MQTT_WS_PORT=7004
DB_PORT=7005

# Frontend Public URLs (used by browser — set to your VM IP for remote access)
NEXT_PUBLIC_API_URL=http://localhost:7001
NEXT_PUBLIC_WS_URL=ws://localhost:7001/ws
# Note: For Azure VM remote access, replace 'localhost' with your Azure VM Public IP or Domain
# Example: NEXT_PUBLIC_API_URL=http://20.123.45.67:7001
```

---

## Azure VM Deployment

### Ports to open in Azure Network Security Group (NSG):

| Port | Protocol | Purpose |
|---|---|---|
| `7000` | TCP | Frontend Web UI |
| `7001` | TCP | Backend REST API & WebSocket |
| `7003` | TCP | MQTT TCP (for external simulators/devices) |
| `7004` | TCP | MQTT WebSocket |

> **DB port `7005` should NOT be opened** — PostgreSQL should only be accessible internally.

### Deploy / Update on Azure VM:
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker compose up -d --build

# Check status
docker compose ps
docker compose logs -f backend
```

---

## Documentation Links

* [**User Guide (`HOW_TO_USE.md`)**](HOW_TO_USE.md): Step-by-step UI tutorials, multi-user isolation tests, and troubleshooting.
* [**Architecture Design (`ARCHITECTURE.md`)**](ARCHITECTURE.md): Technical deep-dive into the ingestion pipeline, threading model, and WebSocket registry.
* [**Build Specifications (`BUILD.md`)**](BUILD.md): Container build recipes and bare-metal local development setup.

---

## License

This project is licensed under the MIT License.
