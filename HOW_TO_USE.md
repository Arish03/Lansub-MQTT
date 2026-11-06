# User Guide: Realtime MQTT Dashboard (Lansub MQTT)

Welcome to **Lansub MQTT**, a high-performance, real-time IoT telemetry streaming and device control platform. This guide provides comprehensive, step-by-step instructions on running, configuring, testing, and managing your MQTT dashboard.

---

## Table of Contents
1. [Quick Start & Setup](#1-quick-start--setup)
2. [User Authentication & Multi-Tenancy](#2-user-authentication--multi-tenancy)
3. [Sidebar Navigation & Page Overview](#3-sidebar-navigation--page-overview)
4. [Managing MQTT Brokers](#4-managing-mqtt-brokers)
5. [Configuring Telemetry Topics & Thresholds](#5-configuring-telemetry-topics--thresholds)
6. [Interactive Dashboard & Widget Library](#6-interactive-dashboard--widget-library)
   - [Overview KPI Stat Cards](#1-overview-kpi-stat-cards)
   - [Real-time Multi-Line Comparison Chart](#2-real-time-multi-line-comparison-chart)
   - [Speedometer Radial Gauge Dial](#3-speedometer-radial-gauge-dial)
   - [Interactive Relay Switch & Action Buttons](#4-interactive-relay-switch--action-buttons)
   - [Recent Device Activity Table](#5-recent-device-activity-table)
7. [Device Management & Digital Twin Registry](#7-device-management--digital-twin-registry)
8. [Automation Rules & Alarm Engine](#8-automation-rules--alarm-engine)
   - [Creating Automated Fail-Safe Rules](#creating-automated-fail-safe-rules)
   - [Real-Time Toast Notifications & Alarm Logs](#real-time-toast-notifications--alarm-logs)
9. [Live Data Streaming & Manual Publishing](#9-live-data-streaming--manual-publishing)
10. [Historical Telemetry & CSV Export](#10-historical-telemetry--csv-export)
11. [User Profile & System Settings](#11-user-profile--system-settings)
12. [Running the Real-time Python IoT Simulator](#12-running-the-real-time-python-iot-simulator)
13. [Automated Backend Tests](#13-automated-backend-tests)
14. [Data Retention Cleanup Worker](#14-data-retention-cleanup-worker)
15. [REST API & WebSocket Reference](#15-rest-api--websocket-reference)
16. [Troubleshooting & FAQs](#16-troubleshooting--faqs)

---

## 1. Quick Start & Setup

The platform is fully containerized with Docker Compose, spinning up:
- **Database**: PostgreSQL 16 on host port `7005`
- **MQTT Broker**: Eclipse Mosquitto on host port `7003` (TCP) & `7004` (WebSocket)
- **Backend**: FastAPI (Python 3.12) on host port `7001`
- **Frontend**: Next.js 15 White-Theme UI on host port `7000`

> **Note:** Internal container-to-container ports are fixed (e.g. backend connects to Mosquitto on `1883` internally). Only the host-side port mappings above are configurable via `.env`.

### Launching the Stack

Open your terminal in the project directory and run:

```bash
# Start all containers in the background
docker compose up -d

# Or rebuild containers (after code changes)
docker compose up -d --build

# Verify all services are healthy and running
docker compose ps
```

To stop the system:
```bash
docker compose down
```

To view live service logs:
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Current Port Mapping

| Service | Host Port | Internal Port |
|---|---|---|
| Frontend (Next.js) | `7000` | `3000` |
| Backend (FastAPI) | `7001` | `8000` |
| MQTT TCP (Mosquitto) | `7003` | `1883` |
| MQTT WebSocket | `7004` | `9001` |
| PostgreSQL | `7005` | `5432` |

### Changing Default Ports (Resolving Port Conflicts on Your VM)

If your VM already has services running on ports `7000`–`7005`, you can easily change the host ports in your `.env` file:

1. Open `.env` and adjust the port mapping variables:
   ```env
   FRONTEND_PORT=8000
   BACKEND_PORT=8001
   MQTT_PORT=1883
   MQTT_WS_PORT=9001
   DB_PORT=5432

   # Update browser API endpoints to match your new BACKEND_PORT
   NEXT_PUBLIC_API_URL=http://localhost:8001
   NEXT_PUBLIC_WS_URL=ws://localhost:8001/ws
   ```
   *(Note: If accessing the dashboard from a laptop/browser via the VM's network IP, replace `localhost` with your VM IP, e.g., `http://192.168.1.100:8001`.)*

2. Rebuild and restart the containers with the new port mappings:
   ```bash
   docker compose up -d --build
   ```

3. Access your services on your new ports:
   - **Frontend UI:** `http://localhost:8000`
   - **Backend API & Swagger:** `http://localhost:8001/docs`
   - **MQTT Broker:** `localhost:1883`

---

## 2. User Authentication & Multi-Tenancy

The platform enforces complete **per-user data isolation**. Brokers, topics, telemetry history, and dashboard widgets belong strictly to the user who created them.

### Default Administrator Account

The backend automatically provisions an initial admin account on launch (configured in `.env`):
- **URL:** [http://localhost:7000/login](http://localhost:7000/login)
- **Email:** `admin@example.com`
- **Password:** `AdminSecurePassword123!`

> [!NOTE]
> If you started the database prior to the latest code update and receive `"Invalid email or password"`, simply run `docker compose restart backend`.

### Creating Additional Accounts
1. Navigate to [http://localhost:7000/register](http://localhost:7000/register).
2. Enter your email and a password.
3. Click **Create Account**.
4. You will be redirected immediately to your isolated dashboard workspace.

---

## 3. Sidebar Navigation & Page Overview

The platform uses a dedicated sidebar providing intuitive, one-click access across all features:

| Page | Route | Description |
|---|---|---|
| **Dashboard** | `/` | Main real-time KPI overview: Stat Cards, Multi-Line Chart, Speedometer Gauges, and Recent Device Activity table. |
| **Live Data** | `/livedata` | Real-time streaming stream of incoming MQTT packets, with manual publishing drawer and topic filters. |
| **History** | `/history` | Historical telemetry time-series analysis, custom date range filtering, and one-click CSV export. |
| **Devices** | `/devices` | Digital Twin registry: device cards, online/offline heartbeat status, and MQTT connection management. |
| **Rules & Alarms** | `/rules` | Automated fail-safe rule engine, condition-based automated publishing, and alarm event logs. |
| **Settings** | `/settings` | User profile management, password change, active broker preferences, and system diagnostic info. |

At the bottom of the sidebar, the **MQTT Status** indicator shows real-time broker connectivity (`Connected to broker` with a pulsing green indicator).

---

## 4. Managing MQTT Brokers

Navigate to **Settings → Brokers** or **Devices**.

### 1. Pre-Configured Local Mosquitto
The default installation comes pre-configured with a local Mosquitto broker:
- **Name:** Local Mosquitto
- **Host:** `mosquitto` (Docker internal service name — do NOT use `localhost` here)
- **Port:** `1883` (internal Docker network port)
- **TLS:** Disabled

### 2. Adding Remote Brokers (EMQX, HiveMQ Cloud, AWS IoT, etc.)
Click **Add Broker** (or **+ Add Device** on the Devices page) and configure:

| Field | Description | Example |
|---|---|---|
| **Broker Name** | Friendly label | `Production HiveMQ Cloud` |
| **Host** | Hostname or IP | `b2190f84.s1.eu.hivemq.cloud` |
| **Port** | MQTT port (`1883` for plaintext, `8883` for TLS) | `8883` |
| **Use TLS / SSL** | Enable SSL encryption (required for cloud brokers) | `Checked` |
| **Username** | Optional broker authentication user | `device_agent_1` |
| **Password** | Optional broker authentication password (stored Fernet-encrypted) | `SecretPass123!` |
| **Client ID** | Optional unique MQTT client identifier | `lansub_cloud_01` |

Click **Test Connection** to verify network and credentials, then click **Add Broker**. The backend will connect to the broker in the background and display a green **"Connected"** badge.

---

## 5. Configuring Telemetry Topics & Thresholds

Navigate to **Settings → Topics** (or configure topics directly when creating widgets).

Click **Add Topic** to register MQTT topic patterns to monitor.

### Topic Parameters

1. **Broker**: Select which broker to subscribe through.
2. **Topic Pattern**:
   - Exact topic: `factory/sensor1/temperature`
   - Single-level wildcard `+`: `factory/+/temperature` (matches `factory/bayA/temperature`, `factory/bayB/temperature`)
   - Multi-level wildcard `#`: `factory/#` (matches all subtopics)
3. **Payload Format**:
   - **JSON**: When payloads are JSON objects (e.g., `{"temp": 24.5, "humidity": 60}`).
   - **Number**: When payloads are raw numeric values (e.g., `24.5`).
   - **Text**: When payloads are strings, status codes, or plain text.
4. **JSON Value Path** (only if Format is JSON):
   - Supports dot/JSONPath notation, e.g. `$.temp` or nested `$.metrics.temperature.reading`.
5. **Unit**: Engineering unit displayed on widgets (e.g. `°C`, `RPM`, `bar`, `kW`, `V`, `A`).
6. **Min Threshold Alert (Optional)**: Low alarm limit (e.g. `15.0`). Values below this trigger a **Low Alert**.
7. **Max Threshold Alert (Optional)**: High alarm limit (e.g. `35.0`). Values above this trigger a **High Alert**.
8. **Data Retention**: Days to store messages in PostgreSQL before automatic purge (default: `7` days).

---

## 6. Interactive Dashboard & Widget Library

Navigate to **Dashboard** (`/`).

### 1. Overview KPI Stat Cards
- Displays key environmental and system metrics:
  - **Temperature**: Current reading with real-time delta indicators.
  - **Humidity**: Relative humidity percentage.
  - **Pressure**: Atmospheric pressure in hPa.
  - **Devices Online**: Active connected device count (e.g., `3 / 3`).
- Cards dynamically display color-coded status badges: **Emerald** for Normal, **Amber** for Warning, and **Rose** for Critical High.

### 2. Real-time Multi-Line Comparison Chart
- Compares multiple sensor topics on the same synchronized time-series graph (e.g., **Humidity (%)** in blue vs. **Temperature (°C)** in red).
- Interactive hover tooltips showing exact values and timestamps across all series.
- Seamless time-range selector: `1h`, `24h`, and `7d`.
- **CSV Export Button**: One-click download of all plotted series data.

### 3. Speedometer Radial Gauge Dial
- Upright vector arc dial with a $240^\circ$ sweep and an open opening at 6 o'clock (the bottom).
- Large central reading and unit display.
- Clearly separated bounds and limits below the opening:
  `Range: 0 – 50 °C`
  `Warning: 25 | Critical: 30`
- Dynamic threshold indicators:
  - **Normal**: Emerald track (`#10b981`)
  - **Warning**: Amber track (`#f59e0b`)
  - **Critical**: Rose track (`#f43f5e`) with pulsing alert badge.

### 4. Interactive Relay Switch & Action Buttons
- **Relay Switch**: Toggle state dispatches `ON` / `OFF` payloads to actuator topics like `control/relay1`.
- **Action Button**: Trigger one-shot commands (e.g., *"Reboot Device"*, *"Emergency Stop"*).

### 5. Recent Device Activity Table
- Tracks real-time telemetry events across registered devices.
- Columns: `Timestamp`, `Device ID`, `Temperature`, `Humidity`, `Pressure`, and `Status` (`online` green pill / `offline` red pill).

---

## 7. Device Management & Digital Twin Registry

Navigate to **Devices** (`/devices`).

The **Device Registry** lets you group MQTT topics into logical physical assets:
1. **Device Cards**: View device metadata, heartbeat status, and active telemetry topics.
2. **Online/Offline Heartbeat Tracking**: Monitors MQTT Keep-Alive and LWT (Last Will and Testament) messages. Devices that stop sending heartbeats automatically transition to `offline`.
3. **Adding a New Device**:
   - Click **+ Add Device**.
   - Enter **Device Name**, **Protocol** (`mqtt://` or `mqtts://`), **Host**, **Port**, and **Client ID**.
   - Save to register the device in your registry.

---

## 8. Automation Rules & Alarm Engine

Navigate to **Rules & Alarms** (`/rules`).

Execute automated fail-safes and trigger actions without human intervention.

### Creating Automated Fail-Safe Rules
Click **+ New Rule** and configure:

1. **Rule Name**: e.g., *"Overheat Shutdown Rule"*.
2. **Trigger Condition**:
   - **Topic**: `sensor/temperature`
   - **Operator**: `>` (supports `>`, `<`, `>=`, `<=`, `==`, `!=`)
   - **Threshold Value**: `35`
   - **Duration**: `120` seconds (e.g. condition must hold for 2 consecutive minutes).
3. **Automated Action**:
   - **Target Topic**: `control/relay1`
   - **Payload**: `OFF`
4. **Severity**: `Critical`, `Warning`, or `Info`.
5. **Save Rule**: The engine immediately evaluates incoming MQTT messages against this rule.

### Real-Time Toast Notifications & Alarm Logs
- **Instant Toaster Alerts**: When a threshold is breached, a toast notification pops up in the top-right corner of the screen detailing the alarm topic and value.
- **Alarm History Log**: View all triggered events, resolved timestamps, and automated action dispatch confirmations.

---

## 9. Live Data Streaming & Manual Publishing

Navigate to **Live Data** (`/livedata`).

- **Live Stream Stream**: View incoming raw MQTT messages with payload inspection and freeze/pause controls.
- **Manual Message Publishing**:
  - Click **Publish Message**.
  - Specify **Topic**, **QoS (0, 1, or 2)**, **Retain Flag**, and **Payload** (JSON or Plain Text).
  - Click **Dispatch** — the backend immediately publishes the packet to the broker.

---

## 10. Historical Telemetry & CSV Export

Navigate to **History** (`/history`).

- Select any subscribed topic to review long-term historical trends.
- Switch between `1 Hour`, `24 Hours`, `7 Days`, or `All Time`.
- Click **Export CSV** to stream a clean `.csv` file containing timestamps, extracted numbers, and raw payloads.

---

## 11. User Profile & System Settings

Navigate to **Settings** (`/settings`).

- **Profile Settings**: Update display name, email, and view account roles.
- **Change Password**: Update your account password securely using Argon2 hashing.
- **Broker Connections**: View and manage all configured broker connections.
- **System Diagnostics**: Check backend version, PostgreSQL connection health, and active WebSocket connection count.

---

## 12. Running the Real-time Python IoT Simulator

The platform includes a dedicated, bidirectional Python simulator at [`scripts/simulator.py`](scripts/simulator.py).

### Capabilities:
1. **Telemetry Publishing:** Concurrently generates realistic data:
   - `sensor/temperature`: Sinusoidal curve ($22^\circ\text{C}$ to $32^\circ\text{C}$) with noise and humidity.
   - `test/sensor1`: Pressure barometer stream ($1.0$ to $4.0\text{ bar}$) matching the `test/#` wildcard.
   - `factory/machine1/power`: Electrical consumption in kW with periodic industrial spikes.
2. **Command Listening & Actuator Simulation:**
   - Subscribes to `control/#` and `switch/#`.
   - When a Switch or Button widget is activated in the dashboard, the simulator logs the received command in real time and publishes an acknowledgment packet back to `control/ack`.

### Starting the Simulator:

In a terminal, run:

```bash
python scripts/simulator.py --host localhost --port 7003 --interval 1.0
```

#### CLI Options:
* `--host`: MQTT broker host (default: `localhost`).
* `--port`: MQTT TCP port — use `7003` for this deployment (default: `7003`).
* `--interval`: Publishing interval in seconds (default: `1.0`).
* `--username` / `--password`: Optional authentication credentials.
* `--tls`: Enable TLS for cloud brokers (port `8883`).

> [!TIP]
> If you changed `MQTT_PORT` in `.env`, pass that new port to `--port`.

---

## 13. Automated Backend Tests

The project includes an automated test suite verifying core logic:

```bash
# Run the entire test suite
python -m unittest discover backend/tests -v
```

### Test Coverage:
* `backend/tests/test_matcher.py`: Topic wildcard matching (`+`, `#`, exact, edge cases).
* `backend/tests/test_auth.py`: Password hashing (Argon2), JWT token generation/validation, Fernet credential encryption.
* `backend/tests/test_ingest.py`: JSONPath parsing, dot-notation fallback extraction, numeric float handling, double-encoded raw payload extraction.
* `backend/tests/test_api_crud.py`: Pydantic schema validation for Auth, Brokers, Topics, Dashboards, and Publish actions.
* `backend/tests/test_rules.py`: Automated rule engine condition evaluation, schema validation, and fail-safe triggers.

---

## 14. Data Retention Cleanup Worker

To prevent database bloat over long operating periods:
* The backend runs a periodic **Retention Cleanup Worker** ([`backend/app/services/retention.py`](backend/app/services/retention.py)).
* Every hour, it identifies messages older than each topic's `retain_days` and deletes them in a batch transaction:

$$\text{Cutoff} = \text{Now} - \text{retain\_days}$$

* Configurable per topic in the Topics settings page.

---

## 15. REST API & WebSocket Reference

### Interactive API Documentation
- **Swagger UI:** [http://localhost:7001/docs](http://localhost:7001/docs)
- **ReDoc:** [http://localhost:7001/redoc](http://localhost:7001/redoc)
- **Health Check:** [http://localhost:7001/health](http://localhost:7001/health)

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `PUT` | `/api/auth/profile` | Update profile information and password |
| `GET` | `/api/brokers` | List brokers owned by user |
| `POST` | `/api/brokers` | Create new broker connection |
| `POST` | `/api/brokers/test` | Test broker connection without saving |
| `GET` | `/api/topics` | List subscribed topics |
| `POST` | `/api/topics` | Add topic pattern to broker (with optional thresholds) |
| `GET` | `/api/topics/{id}/history` | Query time-series history (`1h`, `24h`, `7d`, `all`) |
| `GET` | `/api/topics/{id}/export-csv` | Stream topic history as a downloadable CSV file |
| `GET` | `/api/dashboards` | Fetch user dashboard with widgets |
| `POST` | `/api/dashboards/widgets` | Add widget (`stat`, `line`, `gauge`, `switch`, `button`) |
| `PUT` | `/api/dashboards/widgets/{id}` | Update existing widget config |
| `DELETE` | `/api/dashboards/widgets/{id}` | Remove widget |
| `GET` | `/api/rules` | Fetch automation rules and alarms |
| `POST` | `/api/rules` | Create automated fail-safe rule |
| `POST` | `/api/publish` | Publish MQTT message through broker |
| `WS` | `/ws?token={jwt}` | Real-time WebSocket streaming endpoint |

---

## 16. Troubleshooting & FAQs

### Q: How do I run the full platform on my local machine?
Make sure Docker Desktop is running, then run:
```bash
docker compose up --build -d
```
Open [http://localhost:7000](http://localhost:7000) and sign in with `admin@example.com` / `AdminSecurePassword123!`.

### Q: Stat Card / Gauge shows raw JSON instead of a number
The widget's metric extractor now handles deeply nested and double-encoded payloads. If you still see raw JSON:
- Ensure your topic's **Payload Format** is set to **JSON** in the Topics settings.
- Optionally set a **JSON Value Path** (e.g. `$.value`) to pinpoint the exact field.
- Restart containers to pick up the latest code: `docker compose up -d --build`.

### Q: Dashboard is empty / "No widgets yet"
This is the expected empty state when no widgets have been saved yet. Click **Add First Widget** to create your first widget and bind it to a topic.

### Q: Simulator says "Error connecting to MQTT Broker"
- Make sure Mosquitto is running: `docker compose up -d mosquitto`.
- Run the simulator with the correct host port: `python scripts/simulator.py --host localhost --port 7003`.
- If you changed `MQTT_PORT` in `.env`, use that port instead.

### Q: Topbar displays "Connecting..." or "Disconnected"
- Check that the backend is running: `docker compose ps`.
- Check browser console (F12) to ensure WebSocket can connect to `ws://localhost:7001/ws`.
- If running over a remote IP or domain, ensure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` in `.env` match your remote host (VM public IP or domain).

### Q: Broker status says "Inactive" or "Disconnected"
- Check that the broker hostname is reachable. When connecting to the bundled Mosquitto broker from inside Docker, the host must be `mosquitto` (not `localhost`).
- For cloud brokers (e.g. HiveMQ Cloud), ensure **TLS** is enabled and port is `8883`.

### Q: `git pull` blocked on Azure VM with `.env` conflict
Run:
```bash
cp .env .env.backup
git checkout -- .env
git pull origin main
cp .env.backup .env
```
This preserves your production `.env` while pulling the latest code.

### Q: How do I inspect stored telemetry messages in Postgres?
Connect to the PostgreSQL database container:
```bash
docker compose exec db psql -U app -d mqtt -c "SELECT id, topic, payload, value, ts FROM messages ORDER BY ts DESC LIMIT 10;"
```

### Q: Which ports do I need to open in Azure NSG (firewall)?

| Port | Purpose |
|---|---|
| `7000` | Frontend Web UI |
| `7001` | Backend API & WebSocket |
| `7003` | MQTT TCP (simulators / external devices) |
| `7004` | MQTT WebSocket transport |

> Do **NOT** expose port `7005` (PostgreSQL) publicly.
