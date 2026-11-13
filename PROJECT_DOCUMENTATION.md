# Lansub MQTT — Complete System Documentation & User Guide

---

## 1. Executive Overview

**Lansub MQTT** is a full-stack, enterprise-ready IoT telemetry streaming, device monitoring, and automated fail-safe platform. It provides end-to-end real-time synchronization between edge devices (microcontrollers, PLC gateways, IoT sensors) and modern web dashboards via MQTT brokers and WebSocket event streaming.

```
+-------------------------------------------------------------------------+
|                              EDGE TIER                                  |
|   ESP32 / Arduino / RPi        Industrial Sensors      Python Simulator |
|   (sensor/temperature)          (factory/power)          (test/stream)  |
+-------------------------------------------------------------------------+
                                    |
                                    | MQTT (TCP 1883/7003, WS 9001/7004)
                                    v
+-------------------------------------------------------------------------+
|                           BROKER TIER                                   |
|                        Eclipse Mosquitto 2.x                            |
|                     (or HiveMQ / EMQX / AWS IoT)                        |
+-------------------------------------------------------------------------+
                                    |
                                    | aiomqtt (Async MQTT Worker)
                                    v
+-------------------------------------------------------------------------+
|                          BACKEND ENGINE                                 |
|                       FastAPI (Python 3.12)                             |
|  * MQTT Manager (Auto-Reconnect)     * Rule Engine (Fail-safe Action)   |
|  * Async Ingest Queue (Batch DB)     * WebSocket Hub (Real-time Fanout) |
|  * Retention Cleanup Worker (Hourly) * Security (JWT + Fernet + Argon2) |
+-------------------------------------------------------------------------+
           |                                             |
           | AsyncPG                                     | WebSockets
           v                                             v
+-----------------------+              +----------------------------------+
|     DATABASE TIER     |              |          FRONTEND TIER           |
|    PostgreSQL 16      |              |          Next.js 15 (React 18)   |
|  - Telemetry Messages |              |  - Real-time KPI Stat Cards      |
|  - User Credentials   |              |  - Multi-Line Comparison Charts  |
|  - Topic Configs      |              |  - Speedometer Radial Gauges     |
|  - Digital Twins      |              |  - Relay Switches & Action Btns  |
|  - Automation Rules   |              |  - Rule Builder & Toast Alarms   |
+-----------------------+              +----------------------------------+
```

---

## 2. Where Data is Saved (Data Persistence Architecture)

All application data is persisted across distinct storage tiers with defined life cycles:

### 2.1. PostgreSQL Relational Database (Long-Term Storage)
The primary persistent store runs on **PostgreSQL 16** (container `lansub-mqtt-postgres`, host port `7005`, internal port `5432`, database `mqtt`).

```
                              DATABASE SCHEMA
                              ===============

   +-------------------+          +-------------------+
   |       users       | 1      * |      brokers      |
   |-------------------|----------|-------------------|
   | id (UUID, PK)     |          | id (UUID, PK)     |
   | email (Unique)    |          | user_id (FK)      |
   | password_hash     |          | name, host, port  |
   | created_at        |          | username, tls     |
   +-------------------+          | password_enc      |
        | 1        | 1            +-------------------+
        |          |                        | 1
        | *        | *                      | *
   +------------+ +-------------+    +-------------------+
   | dashboards | |    rules    |    |      topics       |
   |------------| |-------------|    |-------------------|
   | id (PK)    | | id (PK)     |    | id (UUID, PK)     |
   | user_id    | | user_id     |    | user_id (FK)      |
   | name       | | condition   |    | broker_id (FK)    |
   | layout     | | action      |    | pattern, label    |
   +------------+ +-------------+    | payload_format    |
        | 1            | 1           | value_path, unit  |
        | *            | *           | min/max threshold |
   +------------+ +-------------+    | retain_days       |
   |  widgets   | | rule_logs   |    +-------------------+
   |------------| |-------------|              | 1
   | id (PK)    | | id (PK)     |              | *
   | type       | | triggered_at|    +-------------------+
   | topic_id   | | trigger_val |    |     messages      |
   | config     | | action_taken|    |-------------------|
   +------------+ +-------------+    | id (UUID, PK)     |
                                     | topic_id (FK)     |
                                     | topic (String)    |
                                     | ts (DateTime, idx)|
                                     | payload (JSONB)   |
                                     | value (Float)     |
                                     +-------------------+
```

#### Detailed Table Specifications:

1. **`messages` (Telemetry Storage)**:
   - Stores raw and extracted telemetry packets from incoming MQTT messages.
   - **`id`** (`UUID`, Primary Key): Unique message ID.
   - **`topic_id`** (`UUID`, Foreign Key $\to$ `topics.id` on delete cascade): Bound topic configuration.
   - **`topic`** (`String(255)`): Actual MQTT topic string (e.g. `sensor/temperature`).
   - **`ts`** (`DateTime with timezone`, Indexed): Message arrival timestamp.
   - **`payload`** (`JSONB`): Full raw message payload.
   - **`value`** (`Float`, Indexed): Extracted numeric reading (e.g. `29.8`).
   - **Composite Index**: `idx_messages_topic_id_ts_desc` on `(topic_id, ts DESC)` ensures instant time-range lookups even with millions of rows.

2. **`topics` (Topic Registry & Extraction Rules)**:
   - Configures how messages on an MQTT pattern are parsed and retained.
   - **`pattern`**: Topic string or wildcard (`sensor/temperature`, `factory/#`, `bay/+/temp`).
   - **`payload_format`**: `json`, `number`, or `text`.
   - **`value_path`**: Dot/JSONPath selector for nested data (e.g. `$.temp` or `$.metrics.reading`).
   - **`min_threshold` / `max_threshold`**: Floating-point alert limits.
   - **`retain_days`**: Message lifetime (default 7 days).

3. **`brokers` (Broker & Edge Connection Registry)**:
   - Stores connection parameters for local or remote MQTT brokers.
   - **`password_enc`**: Sensitive passwords are never saved in plaintext; they are encrypted at rest using **Fernet symmetric cryptography**.

4. **`rules` & `rule_execution_logs` (Automation & Alarms)**:
   - Stores condition rules (`sensor/temperature > 35` for `120s`), automated actions (`publish OFF to control/relay1`), and audit trails of all triggered alarms.

5. **`dashboards` & `widgets`**:
   - Stores user dashboard configuration, widget types (`stat`, `gauge`, `line`, `switch`, `button`), and card layouts.

---

### 2.2. Ingestion Buffer (FastAPI Backend Memory)
To protect PostgreSQL from being overwhelmed by high-frequency MQTT traffic (e.g., 5,000 packets/sec):
- Incoming MQTT packets are pushed into an asynchronous memory queue (`IngestService` in `backend/app/services/ingest.py`).
- A background worker flushes batches of up to **200 messages** or every **0.5 seconds** using bulk insert (`session.add_all()`).

---

### 2.3. Browser Client State (Zustand Memory)
The Next.js frontend maintains low-latency data in browser memory:
- **`topicData` Ring Buffer**: Retains up to **300 telemetry points** per topic in RAM for instant, smooth SVG graph animation.
- **`messages` Live Table**: Retains the last **100 packets** in RAM for the live message stream.
- **`activeAlerts`**: Tracks active breach conditions for visual alarms.

---

### 2.4. Data Retention Cleanup Worker (Automated Pruning)
To prevent disk exhaustion over long operating periods:
- The backend runs an automated background worker (`RetentionWorker` in `backend/app/services/retention.py`).
- Every **60 minutes**, it calculates:
  $$\text{Cutoff Timestamp} = \text{Current Time} - \text{retain\_days}$$
- Any records in `messages` older than the topic's `retain_days` are automatically purged in batch transactions.

---

## 3. How to Add a Device to the Project

In Lansub MQTT, connecting a physical or virtual device involves two steps:
1. **Network Registration (Broker Connection)**: Authorizing and verifying the communication channel.
2. **Telemetry Mapping (Topics & Widgets)**: Registering the sensor topics and binding them to dashboard widgets.

### Step-by-Step Walkthrough:

#### Method A: Via the Web Dashboard UI

1. **Navigate to Devices**:
   - Open [http://localhost:7000/devices](http://localhost:7000/devices) (or your remote IP).
   - Click **+ Add Device** (or configure under **Settings $\to$ Brokers**).

2. **Configure Connection Details**:
   - **Device / Connection Name**: e.g., `ESP32-Warehouse-01`
   - **Protocol**: Select `mqtt://` (standard TCP) or `mqtts://` (TLS encrypted).
   - **MQTT Version**: `3.1.1` (standard) or `5.0`.
   - **Host**:
     - *If using the built-in container broker*: Enter `mosquitto` (internal Docker hostname).
     - *If connecting to external cloud broker*: Enter the domain (e.g., `broker.emqx.io`, `xyz.hivemq.cloud`).
   - **Port**: `1883` (plaintext) or `8883` (TLS).
   - **Client ID**: e.g., `client_esp32_warehouse_01` (leave blank for auto-generation).
   - **Username / Password**: Optional authentication credentials.

3. **Verify Connection**:
   - Click **Test Connection**. The backend sends an ephemeral MQTT ping.
   - Upon receiving `✓ Connection successful`, click **Add Device**.

4. **Register Telemetry Topics**:
   - Navigate to **Settings $\to$ Topics**.
   - Click **Add Topic**.
   - **Broker**: Select your configured device/broker.
   - **Topic Pattern**: Enter the topic the device publishes to (e.g., `sensor/temperature`).
   - **Payload Format**: Choose `JSON`, `Number`, or `Text`.
   - **JSON Value Path**: If JSON, specify `$.value` or `$.temp`.
   - **Unit**: e.g., `°C`.
   - **Warning / Danger Limits**: e.g., Warning: `25`, Danger: `30`.

5. **Bind to Dashboard Widgets**:
   - Navigate to **Dashboard** (`/`).
   - Click **+ Add Widget**.
   - Choose **Gauge Dial**, **Stat Card**, or **Line Chart**.
   - Select your registered topic.
   - The widget will immediately begin rendering incoming real-time telemetry!

---

#### Method B: Programmatic Registration via REST API

You can automate device registration using `curl` or any HTTP client:

```bash
# 1. Obtain JWT Access Token
TOKEN=$(curl -s -X POST http://localhost:7001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "AdminSecurePassword123!"}' \
  | jq -r .access_token)

# 2. Register Device Connection (Broker)
BROKER_ID=$(curl -s -X POST http://localhost:7001/api/brokers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ESP32-FactoryFloor",
    "host": "mosquitto",
    "port": 1883,
    "tls": false,
    "client_id": "esp32_factory_01",
    "enabled": true
  }' | jq -r .id)

# 3. Register Sensor Telemetry Topic
curl -s -X POST http://localhost:7001/api/topics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"broker_id\": \"$BROKER_ID\",
    \"pattern\": \"sensor/temperature\",
    \"label\": \"Factory Temperature\",
    \"payload_format\": \"json\",
    \"value_path\": \"$.value\",
    \"unit\": \"°C\",
    \"min_threshold\": 15.0,
    \"max_threshold\": 32.0,
    \"retain_days\": 7,
    \"enabled\": true
  }"
```

---

## 4. Demo Data & Payloads (Ready to Use)

Below are production-grade demo payloads formatted to immediately trigger all visual states (Normal, Warning, Critical High) and control loops.

### 4.1. Core Sensor Telemetry Payloads

#### 1. Temperature Sensor (`sensor/temperature`)
* **Format**: JSON
* **Topic**: `sensor/temperature`
* **Default Thresholds**: Warning at `25.0°C`, Danger at `30.0°C`

```json
// Normal Reading (Emerald State)
{
  "value": 23.4,
  "temp": 23.4,
  "unit": "°C",
  "humidity": 48.2,
  "relay": "OFF",
  "timestamp": "2026-11-13T09:40:00Z"
}

// Warning Reading (Amber State)
{
  "value": 27.8,
  "temp": 27.8,
  "unit": "°C",
  "humidity": 55.0,
  "relay": "OFF",
  "timestamp": "2026-11-13T09:41:00Z"
}

// Critical High Reading (Rose / Red Pulsing State + Triggers Rules)
{
  "value": 36.2,
  "temp": 36.2,
  "unit": "°C",
  "humidity": 68.4,
  "relay": "ON",
  "timestamp": "2026-11-13T09:42:00Z"
}
```

#### 2. Humidity Sensor (`sensor/humidity`)
* **Format**: JSON
* **Topic**: `sensor/humidity`
* **Range**: `0 – 100 %`

```json
{
  "value": 52.0,
  "humidity": 52.0,
  "unit": "%",
  "sensor_id": "dht22_zone_b",
  "timestamp": "2026-11-13T09:40:00Z"
}
```

#### 3. Atmospheric Pressure Barometer (`sensor/pressure`)
* **Format**: JSON
* **Topic**: `sensor/pressure`
* **Unit**: `hPa`

```json
{
  "value": 1014.25,
  "pressure": 1014.25,
  "unit": "hPa",
  "altitude_m": 45.2,
  "timestamp": "2026-11-13T09:40:00Z"
}
```

#### 4. Industrial Power Meter (`factory/machine1/power`)
* **Format**: JSON
* **Topic**: `factory/machine1/power`
* **Unit**: `kW`

```json
{
  "value": 14.8,
  "kw": 14.8,
  "voltage": 398.2,
  "current": 21.5,
  "power_factor": 0.94,
  "spike": false,
  "timestamp": "2026-11-13T09:40:00Z"
}
```

#### 5. Digital Twin Node Telemetry (`devices/esp32_01/telemetry`)
* **Format**: JSON
* **Topic**: `devices/esp32_01/telemetry`

```json
{
  "device_id": "ESP32-001",
  "status": "online",
  "uptime_sec": 84210,
  "wifi_rssi_dbm": -58,
  "free_heap_bytes": 184200,
  "metrics": {
    "temperature": 29.5,
    "humidity": 51.0,
    "pressure": 1008.4
  },
  "timestamp": "2026-11-13T09:40:00Z"
}
```

#### 6. Relay & Actuator Control Topics (`control/relay1`)
* **Format**: Plain Text or JSON
* **Publish Topic**: `control/relay1`
* **Acknowledgment Topic**: `control/ack`

```text
ON
```
*(or `OFF`)*

---

## 5. How to Stream Demo Data into the Project

You can inject telemetry using any of the four options below:

### Option 1: Built-in Python IoT Simulator (Recommended)

The repository includes a bidirectional multi-sensor telemetry simulator at `scripts/simulator.py`.

```bash
# In your terminal (Windows PowerShell or Linux):
python scripts/simulator.py --host localhost --port 7003 --interval 1.0
```

* **What it does automatically**:
  - Connects to the Mosquitto broker on port `7003`.
  - Concurrently streams sinusoidal telemetry with realistic noise to:
    - `sensor/temperature`
    - `sensor/humidity`
    - `sensor/pressure`
    - `test/sensor1`
    - `factory/machine1/power`
  - Subscribes to `control/#`. When you toggle a **Switch** or trigger an **Automation Rule** on the web dashboard, the simulator receives the command in real time and publishes an ACK back to `control/ack`.

---

### Option 2: Dashboard UI Test Controls (Instant 1-Click)

1. Open the Dashboard at [http://localhost:7000/dashboard](http://localhost:7000/dashboard).
2. In the top action bar:
   - Click **Send Test Data**: Publishes a single random reading across temperature, humidity, and pressure.
   - Click **Simulate Stream**: Automatically publishes telemetry every 2 seconds. Click again to pause.

---

### Option 3: Command-Line Publishing (via `mosquitto_pub`)

If you have `mosquitto-clients` installed locally:

```bash
# Publish Normal Temperature
mosquitto_pub -h localhost -p 7003 -t "sensor/temperature" -m '{"value": 24.5, "temp": 24.5, "unit": "°C"}'

# Publish Critical High Temperature (will trigger Warning/Critical UI & Rules)
mosquitto_pub -h localhost -p 7003 -t "sensor/temperature" -m '{"value": 36.8, "temp": 36.8, "unit": "°C"}'

# Publish Humidity Reading
mosquitto_pub -h localhost -p 7003 -t "sensor/humidity" -m '{"value": 54.2, "humidity": 54.2, "unit": "%"}'

# Publish Actuator Command
mosquitto_pub -h localhost -p 7003 -t "control/relay1" -m "ON"
```

---

### Option 4: REST API Publishing (`POST /api/publish`)

Publish messages through the backend API directly:

```bash
curl -X POST http://localhost:7001/api/publish \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "broker_id": "<YOUR_BROKER_UUID>",
    "topic": "sensor/temperature",
    "payload": "{\"value\": 31.5, \"unit\": \"°C\"}",
    "qos": 0,
    "retain": false
  }'
```

---

## 6. Testing Automation Rules & Fail-Safes

You can verify the automated rule engine:

1. Navigate to **Rules & Alarms** (`/rules`).
2. Click **+ New Rule**:
   - **Name**: `Emergency Overheat Cutoff`
   - **Condition Topic**: `sensor/temperature`
   - **Operator**: `>`
   - **Threshold**: `32.0`
   - **Duration**: `0` seconds (instant trigger)
   - **Action Type**: `Publish MQTT & In-App Notification`
   - **Target Topic**: `control/relay1`
   - **Target Payload**: `OFF`
   - **Severity**: `Critical`
3. Save the rule.
4. Now publish a high temperature:
   ```bash
   mosquitto_pub -h localhost -p 7003 -t "sensor/temperature" -m '{"value": 37.5}'
   ```
5. **Expected Results**:
   - A red **Toast Notification** pops up in the top-right corner.
   - The backend automatically executes and publishes `OFF` to `control/relay1`.
   - The execution is permanently logged under the **Execution Logs** table on `/rules`.

---

## 7. Service Port Mapping Reference

| Service | Host Port | Internal Port | Protocol | Purpose |
|---|---|---|---|---|
| **Frontend** | `7000` | `3000` | HTTP | Next.js Light-Theme Dashboard UI |
| **Backend** | `7001` | `8000` | HTTP / WS | FastAPI REST API & `/ws` WebSocket Hub |
| **Mosquitto TCP** | `7003` | `1883` | MQTT | Device telemetry TCP ingest |
| **Mosquitto WS** | `7004` | `9001` | MQTT over WS | Browser-direct MQTT transport |
| **PostgreSQL** | `7005` | `5432` | TCP | Relational database (internal storage) |

---

## 8. Summary Checklist for New Deployments

- [ ] Run `docker compose up -d`
- [ ] Log in at `http://localhost:7000` (`admin@example.com` / `AdminSecurePassword123!`)
- [ ] Verify **MQTT Status** indicator at the bottom-left shows `Connected to broker`
- [ ] Launch `python scripts/simulator.py --host localhost --port 7003`
- [ ] Watch real-time multi-line charts, speedometer radial gauges, and recent activity tables populate live!

