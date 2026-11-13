# HiveMQ Integration Guide — Lansub MQTT

This guide provides comprehensive, step-by-step instructions on connecting **HiveMQ** (both the **Public Sandbox Broker** and **HiveMQ Cloud Cluster**) to the **Lansub MQTT** platform, managing broker IDs, creating telemetry topics, and publishing test data.

---

## Table of Contents
1. [Understanding the `broker_id`](#1-understanding-the-broker_id)
2. [Option 1: HiveMQ Public Broker (Quick 1-Minute Test)](#2-option-1-hivemq-public-broker-quick-1-minute-test)
   - [Step 1: Add Broker via Dashboard UI](#step-1-add-broker-via-dashboard-ui)
   - [Step 2: Obtain the `broker_id`](#step-2-obtain-the-broker_id)
   - [Step 3: Register Telemetry Topics](#step-3-register-telemetry-topics)
   - [Step 4: Create Dashboard Widgets](#step-4-create-dashboard-widgets)
   - [Step 5: Publish Live Telemetry](#step-5-publish-live-telemetry)
3. [Option 2: HiveMQ Cloud Cluster (Production with TLS)](#3-option-2-hivemq-cloud-cluster-production-with-tls)
   - [Credentials from HiveMQ Console](#credentials-from-hivemq-console)
   - [Configuring TLS & Port 8883](#configuring-tls--port-8883)
4. [Troubleshooting `AMQJSC0001E Connect timed out`](#4-troubleshooting-amqjsc0001e-connect-timed-out)
5. [Programmatic Automation via REST API](#5-programmatic-automation-via-rest-api)

---

## 1. Understanding the `broker_id`

In Lansub MQTT, every MQTT connection (whether local Mosquitto, HiveMQ, or EMQX) is assigned a unique **UUID `broker_id`** in the PostgreSQL database (for example: `c7b39a82-41d2-43f1-b924-d2e7fa82f7e0`).

### Why `broker_id` Matters:
1. **Topic Association**: Each topic in Lansub MQTT is linked to a `broker_id` foreign key. This informs the backend worker (`BrokerClientWorker`) which broker socket to subscribe on.
2. **Command Dispatching**: When publishing actuator commands via the REST API (`POST /api/publish`) or dashboard controls (Switch, Button), the `broker_id` routes the packet through the appropriate broker client.

---

## 2. Option 1: HiveMQ Public Broker (Quick 1-Minute Test)

HiveMQ provides a free, open-access public sandbox broker at `broker.hivemq.com`. It requires no account, sign-up, or credit card.

### Step 1: Add Broker via Dashboard UI

1. Open the Lansub MQTT Dashboard at [http://localhost:7000/devices](http://localhost:7000/devices).
2. Click **+ Add Device** (or navigate to **Settings $\to$ Brokers $\to$ Add Broker**).
3. Fill out the connection parameters:

| Parameter | Recommended Value | Description |
|---|---|---|
| **Name** | `HiveMQ Public Sandbox` | Friendly display label |
| **Protocol** | `mqtt://` | Standard unencrypted TCP |
| **MQTT Version** | `3.1.1` | Standard MQTT protocol version |
| **Host** | `broker.hivemq.com` | HiveMQ public sandbox hostname |
| **Port** | `1883` | Default unencrypted MQTT port |
| **Use TLS / SSL** | `Disabled` (Unchecked) | Port 1883 does not use TLS |
| **Client ID** | `lansub_hivemq_demo_01` | Any unique client identifier |
| **Username** | *(Leave empty)* | Not required for public sandbox |
| **Password** | *(Leave empty)* | Not required for public sandbox |

4. Click **Test Connection**. You should see:
   > `✓ Successfully connected to broker.hivemq.com:1883`
5. Click **Add Device** / **Save**.
6. The broker will immediately appear with a green **`Connected`** status badge.

---

### Step 2: Obtain the `broker_id`

#### Via the Web UI:
Navigate to **Settings $\to$ Brokers**. The UUID is displayed on the broker card and automatically populated in topic dropdowns.

#### Via the REST API:
```bash
# 1. Authenticate to obtain JWT token
TOKEN=$(curl -s -X POST http://localhost:7001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "AdminSecurePassword123!"}' \
  | jq -r .access_token)

# 2. Query brokers list
curl -s -X GET http://localhost:7001/api/brokers \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {id: .id, name: .name, host: .host, status: .status}'
```

**Sample JSON Output:**
```json
{
  "id": "c7b39a82-41d2-43f1-b924-d2e7fa82f7e0",
  "name": "HiveMQ Public Sandbox",
  "host": "broker.hivemq.com",
  "status": "connected"
}
```
Here, **`c7b39a82-41d2-43f1-b924-d2e7fa82f7e0`** is your `broker_id`.

---

### Step 3: Register Telemetry Topics

> [!TIP]
> Because `broker.hivemq.com` is public and shared by developers worldwide, always prefix your topics with a custom namespace (e.g. `lansub/demo/...`) to avoid collisions.

#### Via Web UI:
1. Navigate to **Settings $\to$ Topics**.
2. Click **+ Add Topic**:
   - **Broker**: Select `HiveMQ Public Sandbox`.
   - **Topic Pattern**: `lansub/demo/temperature`
   - **Label**: `HiveMQ Demo Temperature`
   - **Payload Format**: `JSON`
   - **JSON Value Path**: `$.value`
   - **Unit**: `°C`
   - **Min Threshold**: `15.0`
   - **Max Threshold**: `32.0`
   - **Data Retention**: `7` days
3. Click **Add Topic**.

Lansub MQTT will dynamically subscribe to `lansub/demo/temperature` on `broker.hivemq.com`.

---

### Step 4: Create Dashboard Widgets

1. Open **Dashboard** (`/`).
2. Click **+ Add Widget**:
   - **Widget Type**: `Gauge Dial`
   - **Title**: `HiveMQ Temperature`
   - **Topic**: `lansub/demo/temperature`
   - **Min**: `0`
   - **Max**: `50`
   - **Unit**: `°C`
3. Click **Add to Dashboard**.

---

### Step 5: Publish Live Telemetry

#### Method 1: Using the HiveMQ WebSocket Client Webpage
1. Visit the [HiveMQ WebSocket Client](https://www.hivemq.com/demos/websocket-client/).
2. Connect with:
   - **Host**: `broker.hivemq.com`
   - **Port**: `8884` *(Note: use 8884 with SSL for browser HTTPS)*
   - **SSL**: `Checked ✅`
3. Under **Publish**, send:
   - **Topic**: `lansub/demo/temperature`
   - **Message**:
     ```json
     {"value": 28.5, "temp": 28.5, "unit": "°C"}
     ```
4. Click **Publish**. Your Lansub dashboard gauge will instantly update!

#### Method 2: Using the Lansub Publish REST API
```bash
curl -X POST http://localhost:7001/api/publish \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "broker_id": "c7b39a82-41d2-43f1-b924-d2e7fa82f7e0",
    "topic": "lansub/demo/temperature",
    "payload": "{\"value\": 34.5, \"unit\": \"°C\"}",
    "qos": 0,
    "retain": false
  }'
```

#### Method 3: Using `mosquitto_pub` CLI
```bash
mosquitto_pub -h broker.hivemq.com -p 1883 -t "lansub/demo/temperature" -m '{"value": 29.2, "unit": "°C"}'
```

---

## 3. Option 2: HiveMQ Cloud Cluster (Production with TLS)

For production deployments, HiveMQ Cloud provides dedicated, TLS-secured MQTT clusters.

### Credentials from HiveMQ Console
1. Log in to [HiveMQ Cloud Console](https://console.hivemq.cloud/).
2. In your Cluster Overview, copy your **Cluster URL** (e.g. `xyz123.s1.eu.hivemq.cloud`).
3. Under **Access Management $\to$ Credentials**, create a device username and password (e.g., `iot_device_01` / `SecureClusterPass123!`).

### Configuring TLS & Port 8883 in Lansub MQTT

1. Go to **Devices $\to$ + Add Device**:
   - **Name**: `HiveMQ Cloud Production`
   - **Protocol**: `mqtts://`
   - **Host**: `xyz123.s1.eu.hivemq.cloud` *(your cluster host)*
   - **Port**: `8883` *(TLS port)*
   - **Use TLS / SSL**: **Checked ✅**
   - **Username**: `iot_device_01`
   - **Password**: `SecureClusterPass123!`
   - **Client ID**: `lansub_cloud_worker`
2. Click **Test Connection** $\to$ **Save**.

---

## 4. Troubleshooting `AMQJSC0001E Connect timed out`

If you encounter this error when using browser-based MQTT clients (like the HiveMQ Web Client), it is caused by one of three reasons:

### 1. Browser Mixed Content Security (HTTPS vs HTTP)
Modern browsers block unencrypted WebSocket (`ws://` on port 8000) from an HTTPS page.
- **Fix**: In the HiveMQ Web Client, change **Port** to **`8884`** and check **SSL: ON** (`wss://`).

### 2. Using Port 8883 in a Browser
Port `8883` is for **Raw TCP with TLS** (used by Python, ESP32, and native MQTT clients), **not** WebSockets.
- **Fix**: Web browsers must connect via WebSocket port **`8884`** (with SSL enabled), not `8883`.

### 3. HiveMQ Cloud Missing Credentials
HiveMQ Cloud rejects unauthenticated connections immediately.
- **Fix**: Ensure your username and password are provided in the connection settings.

---

## 5. Programmatic Automation via REST API

Here is an end-to-end bash script to provision HiveMQ and create topics automatically:

```bash
#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:7001/api"

# 1. Login
echo "Authenticating..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"AdminSecurePassword123!"}' \
  | jq -r .access_token)

# 2. Create Broker
echo "Creating HiveMQ broker..."
BROKER_ID=$(curl -s -X POST "$BASE_URL/brokers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HiveMQ-Production",
    "host": "broker.hivemq.com",
    "port": 1883,
    "tls": false,
    "client_id": "lansub_worker_auto",
    "enabled": true
  }' | jq -r .id)

echo "Broker created with ID: $BROKER_ID"

# 3. Create Topic
echo "Registering topic..."
TOPIC_ID=$(curl -s -X POST "$BASE_URL/topics" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"broker_id\": \"$BROKER_ID\",
    \"pattern\": \"lansub/demo/temperature\",
    \"label\": \"HiveMQ Temperature\",
    \"payload_format\": \"json\",
    \"value_path\": \"$.value\",
    \"unit\": \"°C\",
    \"min_threshold\": 15.0,
    \"max_threshold\": 32.0,
    \"retain_days\": 7,
    \"enabled\": true
  }" | jq -r .id)

echo "Topic created with ID: $TOPIC_ID"
echo "Ready to stream data to broker.hivemq.com on lansub/demo/temperature!"
```

