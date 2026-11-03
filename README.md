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
- **Intelligent Payload Extraction**: Ingest and extract metrics from JSON (via JSONPath or dot notation like `$.metrics.temp`), raw numeric floats, or text status strings.
- **Interactive UI Widgets**:
  - **Stat Card**: Real-time value, units, delta trends, and animated alert states.
  - **Radial Gauge Dial**: Smooth 240° SVG arc with safe, warning, and critical danger threshold color zones.
  - **Realtime Line Chart**: Zero-dependency vector time-series chart with 1h / 24h / 7d historical ranges.
  - **Relay Switch**: Bi-directional toggle button dispatching `ON`/`OFF` payloads to control relays, lights, or pumps.
  - **Action Button**: One-shot trigger button for operations like *"Reboot Machine"*, *"Trigger Alarm"*, or custom JSON payloads.
  - **Live Message Stream Table**: Real-time packet viewer with Pause/Resume inspection and raw payload viewing.
- **Threshold Alerts & Alarms**: Configurable Min/Max alert boundaries, active alert indicators in the topbar, and visual alarms across cards, gauges, and tables.
- **One-Click CSV Export**: Stream historical topic telemetry to CSV from line charts or export live buffered packets from the message stream.
- **Automated Data Retention**: Integrated background worker periodically purging telemetry past each topic's `retain_days`.
- **Bidirectional IoT Simulator**: Standalone Python script (`scripts/simulator.py`) for simulating multi-sensor telemetry and acknowledging control commands.
- **Automated Test Suite**: 19 unit and integration tests covering wildcard matching, authentication, ingestion, and schema validation.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph IoT ["IoT Devices & Simulation"]
        Device["Physical Sensors & Actuators"]
        Sim["Python Simulator (scripts/simulator.py)"]
    end

    subgraph Brokers ["MQTT Brokers"]
        Mosquitto["Local Mosquitto (:1883)"]
        CloudBrokers["EMQX / HiveMQ Cloud (:8883 TLS)"]
    end

    subgraph Backend ["FastAPI Core (:8000)"]
        MQTTWorker["aiomqtt Multi-Broker Manager"]
        Ingest["IngestService (Queue + Batch Insert)"]
        Retention["Data Retention Worker (hourly)"]
        WSHub["WebSocket Hub (User Scoped)"]
        REST["REST API (Auth, Brokers, Topics, History, Publish)"]
    end

    subgraph Storage ["Database"]
        Postgres[("PostgreSQL 16 (:5432)")]
    end

    subgraph Frontend ["Next.js 15 Dashboard (:3000)"]
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

### 2. Launch the Full Stack
```bash
# Clone or navigate to the repository
cd "e:/Lansub MQTT"

# Start PostgreSQL, Mosquitto, FastAPI, and Next.js
docker compose up --build -d
```

### 3. Access Services

| Service | URL / Port | Credentials (Default) |
|---|---|---|
| **Web Dashboard** | [http://localhost:3000](http://localhost:3000) | `admin@example.com` / `AdminSecurePassword123!` |
| **API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI |
| **MQTT Broker** | `localhost:1883` | Plain TCP (anonymous enabled by default) |
| **PostgreSQL Database**| `localhost:5432` | User: `app`, Pass: `app_secret`, DB: `mqtt` |

---

## Running the Real-time IoT Simulator

The platform includes a bidirectional Python telemetry generator and command subscriber:

```powershell
python scripts/simulator.py --host localhost --port 1883 --interval 1.0
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

```powershell
python -m unittest discover backend/tests -v
```

### Test Coverage:
* `backend/tests/test_matcher.py`: Topic wildcard matching (`+`, `#`, exact, edge cases).
* `backend/tests/test_auth.py`: Password hashing (Argon2), JWT token generation/validation, Fernet credential encryption.
* `backend/tests/test_ingest.py`: JSONPath parsing, dot-notation fallback extraction, numeric float handling.
* `backend/tests/test_api_crud.py`: Pydantic schema validation for Auth, Brokers, Topics, Dashboards, and Publish actions.

---

## Project Structure

```
Lansub MQTT/
├── docker-compose.yml         # Container orchestration (db, mosquitto, backend, frontend)
├── Makefile                   # Build and development automation targets
├── .env.example               # Environment variables template
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
│       ├── config.py          # Environment settings
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
    │   ├── dashboard/page.tsx # Real-time widget grid & widget creation modal
    │   └── settings/          # Broker and Topic management screens
    ├── components/
    │   ├── layout/            # Sidebar, Topbar (with alert counter), ConnectionBadge
    │   └── widgets/           # StatCard, GaugeWidget, LineChart, SwitchWidget, ButtonWidget, MessageTable
    └── lib/
        ├── api.ts             # REST client & CSV export utilities
        ├── store.ts           # Zustand store with ring buffers & wildcard mapping
        └── ws-client.ts       # WebSocket client with heartbeat & auto-reconnect
```

---

## Environment Configuration (`.env`)

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

# Local Mosquitto Broker
MQTT_DEFAULT_HOST=mosquitto
MQTT_DEFAULT_PORT=1883

# Frontend Public URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## Documentation Links

* [**User Guide (`HOW_TO_USE.md`)**](HOW_TO_USE.md): Step-by-step UI tutorials, multi-user isolation tests, and troubleshooting.
* [**Architecture Design (`ARCHITECTURE.md`)**](ARCHITECTURE.md): Technical deep-dive into the ingestion pipeline, threading model, and WebSocket registry.
* [**Build Specifications (`BUILD.md`)**](BUILD.md): Container build recipes and bare-metal local development setup.

---

## License

This project is licensed under the MIT License.

