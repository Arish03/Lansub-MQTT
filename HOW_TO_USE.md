# User Guide: Realtime MQTT Dashboard (Lansub MQTT)

Welcome to **Lansub MQTT**, a high-performance, real-time IoT telemetry streaming and device control platform. This guide provides comprehensive, step-by-step instructions on running, configuring, testing, and managing your MQTT dashboard.

---

## Table of Contents
1. [Quick Start & Setup](#1-quick-start--setup)
2. [User Authentication & Multi-Tenancy](#2-user-authentication--multi-tenancy)
3. [Managing MQTT Brokers](#3-managing-mqtt-brokers)
4. [Configuring Telemetry Topics & Thresholds](#4-configuring-telemetry-topics--thresholds)
5. [Using the Live Dashboard & Widgets](#5-using-the-live-dashboard--widgets)
   - [Telemetry Stat Card](#1-telemetry-stat-card)
   - [Radial Gauge Dial](#2-radial-gauge-dial)
   - [Realtime Line Chart](#3-realtime-line-chart)
   - [Interactive Relay Switch](#4-interactive-relay-switch)
   - [Action Button Trigger](#5-action-button-trigger)
   - [Live Message Stream Table](#6-live-message-stream-table)
6. [Interactive Device Control (Publishing)](#6-interactive-device-control-publishing)
7. [Running the Real-time Python IoT Simulator](#7-running-the-real-time-python-iot-simulator)
8. [Threshold Alerts & Visual Alarms](#8-threshold-alerts--visual-alarms)
9. [Exporting Telemetry Data (CSV)](#9-exporting-telemetry-data-csv)
10. [Automated Backend Tests](#10-automated-backend-tests)
11. [Data Retention Cleanup Worker](#11-data-retention-cleanup-worker)
12. [Multi-User Data Isolation Test](#12-multi-user-data-isolation-test)
13. [REST API & WebSocket Reference](#13-rest-api--websocket-reference)
14. [Troubleshooting & FAQs](#14-troubleshooting--faqs)

---

## 1. Quick Start & Setup

The platform is fully containerized with Docker Compose, spinning up:
- **Database**: PostgreSQL 16 on port `5432`
- **MQTT Broker**: Eclipse Mosquitto on port `1883` (MQTT) & `9001` (WS)
- **Backend**: FastAPI (Python 3.12) on port `8000`
- **Frontend**: Next.js 15 White-Theme UI on port `3000`

### Launching the Stack

Open your terminal in `e:\Lansub MQTT` and run:

```bash
# Start all containers in the background
docker compose up -d

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
```

---

## 2. User Authentication & Multi-Tenancy

The platform enforces complete **per-user data isolation**. Brokers, topics, telemetry history, and dashboard widgets belong strictly to the user who created them.

### Default Administrator Account

The backend automatically provisions an initial admin account on launch (configured in `.env`):
- **URL:** [http://localhost:3000/login](http://localhost:3000/login)
- **Email:** `admin@example.com`
- **Password:** `AdminSecurePassword123!`

> [!NOTE]
> If you started the database prior to the latest code update and receive `"Invalid email or password"`, simply run `docker compose restart backend`.

### Creating Additional Accounts
1. Navigate to [http://localhost:3000/register](http://localhost:3000/register).
2. Enter your email and a password.
3. Click **Create Account**.
4. You will be redirected immediately to your isolated dashboard workspace.

---

## 3. Managing MQTT Brokers

Navigate to **Brokers** in the sidebar navigation ([http://localhost:3000/settings/brokers](http://localhost:3000/settings/brokers)).

### 1. Pre-Configured Local Mosquitto
The admin account is pre-configured with a local Mosquitto broker:
- **Name:** Local Mosquitto
- **Host:** `mosquitto` (Docker internal DNS)
- **Port:** `1883`
- **TLS:** Disabled

### 2. Adding Remote Brokers (EMQX, HiveMQ Cloud, AWS IoT, etc.)
Click **Add Broker** and configure:

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

## 4. Configuring Telemetry Topics & Thresholds

Navigate to **Topics** in the sidebar navigation ([http://localhost:3000/settings/topics](http://localhost:3000/settings/topics)).

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

## 5. Using the Live Dashboard & Widgets

Navigate to **Dashboard** ([http://localhost:3000/dashboard](http://localhost:3000/dashboard)).

### Topbar Indicators
- **Connection Badge**:
  - `Live Connected` (Green pulse): WebSocket connected and receiving live fan-out packets.
  - `Connecting...` (Red): Auto-reconnection backoff in progress.
- **Active Alert Pill**:
  - Displays when one or more topics exceed safe limits (e.g. `⚠️ 1 Active Alert`).

### Built-in Widget Types

#### 1. Telemetry Stat Card
- Displays current numeric metric, unit, and last received timestamp.
- Outlines and pulses in amber/rose with an **Alert Badge** if safe thresholds are breached.

#### 2. Radial Gauge Dial
- High-performance 240° vector arc dial.
- Displays smooth stroke progress fill, center reading, and min/max bounds.
- Dynamic color zones: **Blue** (Normal) $\rightarrow$ **Amber** (Warning) $\rightarrow$ **Rose** (Critical High).

#### 3. Realtime Line Chart
- Lightweight SVG time-series sparkline.
- 1h, 24h, and 7d historical range filtering.
- Seeded with database history on load, smoothly appending live points as packets arrive.
- **CSV Download Button**: Instantly export historical time-series data to CSV.

#### 4. Interactive Relay Switch
- Bi-directional toggle button publishing `ON` / `OFF` payloads to control relays, lights, or pumps.
- Visual status feedback upon dispatch.

#### 5. Action Button Trigger
- One-shot command button to dispatch arbitrary actions (e.g. *"Reboot Machine"*, *"Trigger Alarm"*, *"Reset Counter"*).
- Configurable button labels, payload JSON/strings, and color styles (`primary`, `danger`, `emerald`).
- Displays loading spinner during transit and a confirmation badge upon delivery.

#### 6. Live Message Stream Table
- Displays the continuous raw message stream across all subscribed topics.
- Columns: Timestamp, Topic, Extracted Value, Raw Payload.
- Highlights alert rows in subtle red/amber.
- **Pause / Resume**: Freeze table rendering to inspect payloads without losing background stream.
- **CSV Export**: Click the **CSV** button to export all currently buffered stream messages.

### Adding Custom Widgets
1. On the Dashboard page, click the blue **Add Widget** button.
2. Select between:
   - **Stat Card**
   - **Line Chart**
   - **Gauge Dial** (set Min, Max, and Unit)
   - **Switch (Relay)** (set Broker and Topic)
   - **Button (Action)** (set Broker, Topic, Button Label, Payload, and Style)
3. Click **Add to Dashboard**.

---

## 6. Interactive Device Control (Publishing)

You can publish commands to devices directly from the UI or via REST API.

### Via UI Controls
* **Relay Switch**: Toggling the switch dispatches `ON` or `OFF` to topics like `control/relay1`.
* **Action Button**: Clicking the button sends your pre-configured JSON or text payload to topics like `control/actions` or `factory/machine1/reset`.

### Via REST API (`POST /api/publish`)
Authenticate with your Bearer token and publish programmatically:

```bash
curl -X POST http://localhost:8000/api/publish \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "broker_id": "<BROKER_UUID>",
    "topic": "control/relay1",
    "payload": "ON",
    "qos": 0,
    "retain": false
  }'
```

---

## 7. Running the Real-time Python IoT Simulator

The platform includes a dedicated, bidirectional Python simulator at [`scripts/simulator.py`](file:///e:/Lansub%20MQTT/scripts/simulator.py).

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

```powershell
python scripts/simulator.py --host localhost --port 1883 --interval 1.0
```

#### CLI Options:
* `--host`: MQTT broker host (default: `localhost`).
* `--port`: MQTT port (default: `1883`).
* `--interval`: Publishing interval in seconds (default: `1.0`).
* `--username` / `--password`: Optional authentication credentials.
* `--tls`: Enable TLS for cloud brokers (port `8883`).

---

## 8. Threshold Alerts & Visual Alarms

Lansub MQTT includes a multi-layered threshold alert engine:

1. **Setting Bounds:** In **Topics**, configure **Min Threshold** and **Max Threshold** (e.g. Min: `18`, Max: `30`).
2. **Real-time Detection:** When incoming sensor data violates thresholds:
   - The backend tags the WebSocket packet with `alert: "high"` or `alert: "low"`.
3. **UI Indicators:**
   - **Topbar:** Shows an active alert count pill (e.g. `⚠️ 1 Active Alert`).
   - **StatCard:** Glows with an animated amber or red warning badge.
   - **GaugeWidget:** Needle moves into the red danger zone and displays a warning symbol.
   - **MessageTable:** Highlights the packet row in red/amber with a pulsing status dot.

---

## 9. Exporting Telemetry Data (CSV)

Telemetry data can be exported in two ways:

### 1. Historical Telemetry from Line Charts
- On any **Line Chart** widget, click the **CSV** button in the widget header.
- The browser downloads a clean CSV file (`{topic}_{range}_export.csv`) containing `Timestamp (UTC)`, `Topic`, `Extracted Value`, and `Raw Payload` streamed from the backend API (`GET /api/topics/{id}/export-csv`).

### 2. Live Stream Export from Message Table
- In the **Live Message Stream** table, click the **CSV** button next to Pause/Resume.
- The browser generates and downloads a CSV snapshot of all currently buffered live stream packets.

---

## 10. Automated Backend Tests

The project includes an automated test suite verifying core logic:

```powershell
# Run the entire test suite
python -m unittest discover backend/tests -v
```

### Test Coverage:
* `backend/tests/test_matcher.py`: Topic wildcard matching (`+`, `#`, exact, edge cases).
* `backend/tests/test_auth.py`: Password hashing (Argon2), JWT token generation/validation, Fernet credential encryption.
* `backend/tests/test_ingest.py`: JSONPath parsing, dot-notation fallback extraction, numeric float handling.
* `backend/tests/test_api_crud.py`: Pydantic schema validation for Auth, Brokers, Topics, Dashboards, and Publish actions.

---

## 11. Data Retention Cleanup Worker

To prevent database bloat over long operating periods:
* The backend runs a periodic **Retention Cleanup Worker** ([`backend/app/services/retention.py`](file:///e:/Lansub%20MQTT/backend/app/services/retention.py)).
* Every hour, it identifies messages older than each topic's `retain_days` and deletes them in a batch transaction:
  $$\text{Cutoff} = \text{Now} - \text{retain\_days}$$
* Configurable per topic in the Topics settings page.

---

## 12. Multi-User Data Isolation Test

To verify that users cannot view or manipulate each other's data:

1. In your regular browser window, stay logged in as `admin@example.com`.
2. Open an **Incognito / Private Browsing window**.
3. Go to [http://localhost:3000/register](http://localhost:3000/register) and create an account:
   - **Email:** `engineer@plant2.com`
   - **Password:** `PlantPassword123!`
4. In the incognito window:
   - Notice that `engineer@plant2.com` has their own separate dashboard.
   - Go to **Brokers**; none of the admin's brokers are visible.
5. In the terminal, publish a message to a topic owned only by admin (`sensor/temperature`).
6. Notice that the message **only** appears in the admin's browser session. The second user's WebSocket stream receives zero unauthorized packets.

---

## 13. REST API & WebSocket Reference

### Interactive API Documentation
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `GET` | `/api/brokers` | List brokers owned by user |
| `POST` | `/api/brokers` | Create new broker connection |
| `POST` | `/api/brokers/test` | Test broker connection without saving |
| `GET` | `/api/topics` | List subscribed topics |
| `POST` | `/api/topics` | Add topic pattern to broker (with optional thresholds) |
| `GET` | `/api/topics/{id}/history` | Query time-series history (`1h`, `24h`, `7d`, `all`) |
| `GET` | `/api/topics/{id}/export-csv` | Stream topic history as a downloadable CSV file |
| `GET` | `/api/dashboards` | Fetch user dashboard with widgets |
| `POST` | `/api/dashboards/widgets` | Add widget (`stat`, `line`, `gauge`, `switch`, `button`) |
| `DELETE` | `/api/dashboards/widgets/{id}` | Remove widget |
| `POST` | `/api/publish` | Publish MQTT message through broker |
| `WS` | `/ws?token={jwt}` | Real-time WebSocket streaming endpoint |

---

## 14. Troubleshooting & FAQs

### Q: How do I run the full platform on my local machine?
Make sure Docker Desktop is running, then run:
```bash
docker compose up --build -d
```
Open [http://localhost:3000](http://localhost:3000) and sign in with `admin@example.com` / `AdminSecurePassword123!`.

### Q: Simulator says "Error connecting to MQTT Broker"
- Make sure Mosquitto is running (`docker compose up -d mosquitto`).
- Port `1883` must be mapped to localhost (included in `docker-compose.yml`).

### Q: Topbar displays "Connecting..." or "Disconnected"
- Check that the backend is running: `docker compose ps`.
- Check browser console (F12) to ensure WebSocket can connect to `ws://localhost:8000/ws`.
- If running over a remote IP or domain, ensure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` in `.env` match your remote host.

### Q: Broker status says "Inactive" or "Disconnected"
- Check that the broker hostname is reachable. When connecting to the bundled Mosquitto broker from inside Docker, the host must be `mosquitto` (not `localhost`).
- For cloud brokers (e.g. HiveMQ Cloud), ensure **TLS** is enabled and port is `8883`.

### Q: How do I inspect stored telemetry messages in Postgres?
Connect to the PostgreSQL database container:
```bash
docker compose exec db psql -U app -d mqtt -c "SELECT id, topic, payload, value, ts FROM messages ORDER BY ts DESC LIMIT 10;"
```
