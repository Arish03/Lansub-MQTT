# ESP32 Mini Simulator — Build & Connect Guide

## Build a Real Physical IoT Simulator with ESP32 and Control Everything from Your Lansub MQTT Dashboard

This guide walks you through building a **physical mini simulator** on a breadboard with **real sensors, LEDs, a DC motor, and a push button** — all controlled by an ESP32 microcontroller that communicates bi-directionally with your **Lansub MQTT Dashboard**.

> **What you'll achieve:**
> - ESP32 reads **real sensor data** (temperature, humidity) and streams it live to the dashboard
> - Toggle an **LED ON/OFF** from the dashboard Switch Widget → the physical LED turns on/off
> - Toggle a **DC motor ON/OFF** from the dashboard → the motor starts/stops spinning
> - Press a **physical button** on the breadboard → the dashboard shows the event in real time
> - Set an **automatic safety rule** → if temperature exceeds a threshold, the dashboard automatically turns off the motor

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Parts List (What to Buy)](#2-parts-list-what-to-buy)
3. [Wiring Diagram](#3-wiring-diagram)
4. [Arduino IDE Setup](#4-arduino-ide-setup)
5. [Complete ESP32 Firmware Code](#5-complete-esp32-firmware-code)
6. [Configuring Your Network](#6-configuring-your-network)
7. [Registering Topics in the Dashboard](#7-registering-topics-in-the-dashboard)
8. [Adding Dashboard Widgets](#8-adding-dashboard-widgets)
9. [Setting Up Automated Safety Rules](#9-setting-up-automated-safety-rules)
10. [Testing the Full Loop](#10-testing-the-full-loop)
11. [How the Communication Works (Under the Hood)](#11-how-the-communication-works-under-the-hood)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHYSICAL BREADBOARD                         │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌──────┐  ┌──────────────────┐│
│  │ DHT22      │  │ Push Button│  │  LED │  │ DC Motor + Relay ││
│  │ Temp+Humid │  │ GPIO 4     │  │GPIO27│  │ GPIO 26          ││
│  └─────┬──────┘  └─────┬──────┘  └──┬───┘  └──────┬───────────┘│
│        │               │            │              │            │
│        └───────────┬────┴────────────┴──────────────┘            │
│                    │                                            │
│            ┌───────┴─────────┐                                  │
│            │   ESP32 DevKit  │                                  │
│            │   (Wi-Fi STA)   │                                  │
│            └───────┬─────────┘                                  │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     │  Wi-Fi (MQTT Protocol, TCP Port 7003)
                     │
         ┌───────────▼──────────────┐
         │  Lansub MQTT Broker      │
         │  (Mosquitto, Port 7003)  │
         └───────────┬──────────────┘
                     │
         ┌───────────▼──────────────┐
         │  Lansub Backend          │
         │  (FastAPI, Port 7001)    │
         │  - Stores telemetry      │
         │  - Evaluates rules       │
         │  - Publishes commands    │
         └───────────┬──────────────┘
                     │  WebSocket
         ┌───────────▼──────────────┐
         │  Lansub Dashboard        │
         │  (Next.js, Port 7000)    │
         │  - Gauge / Line Chart    │
         │  - Switch Widgets        │
         │  - Button Widgets        │
         │  - Toast Notifications   │
         └──────────────────────────┘
```

### Communication Flow — Two Directions

| Direction | What Happens | MQTT Topics |
|---|---|---|
| **ESP32 → Dashboard** (Telemetry) | ESP32 reads DHT22 sensor → publishes JSON → Broker → Backend stores & broadcasts via WebSocket → Dashboard widgets update live | `sensor/temperature`, `sensor/humidity`, `sensor/button` |
| **Dashboard → ESP32** (Control) | User flips Switch Widget → Frontend calls `POST /api/publish` → Backend publishes to Broker → ESP32 receives callback → toggles GPIO pin | `control/led`, `control/motor` |
| **Autonomous Rule** (Auto-Protect) | Backend Rule Engine evaluates every incoming value → if temp > threshold → auto-publishes `OFF` to `control/motor` → ESP32 motor stops | `sensor/temperature` → `control/motor` |

---

## 2. Parts List (What to Buy)

| Component | Quantity | Approx. Cost (INR) | Purpose |
|---|---|---|---|
| **ESP32 DevKit V1** (or ESP32-WROOM-32) | 1 | ₹400–600 | Main microcontroller with Wi-Fi |
| **DHT22** (or DHT11) temperature & humidity sensor | 1 | ₹150–250 | Real temperature & humidity readings |
| **5V Relay Module** (1-channel, optocoupler) | 1 | ₹50–80 | Switch high-power load (motor) |
| **Small DC Motor** (3V–6V hobby motor) | 1 | ₹30–50 | Physical actuator to control |
| **LED** (any color, 5mm) | 1 | ₹5 | Visual indicator |
| **220Ω Resistor** | 1 | ₹2 | Current limiter for LED |
| **10kΩ Resistor** | 2 | ₹4 | Pull-up for DHT22, pull-down for button |
| **Push Button** (momentary, 4-pin tactile) | 1 | ₹5 | Physical input to send events |
| **Breadboard** (830 tie-point, full-size) | 1 | ₹100–150 | Prototype wiring |
| **Jumper Wires** (male-to-male, male-to-female) | 20+ | ₹60 | Connections |
| **Micro-USB Cable** (data-capable) | 1 | ₹50 | Flash firmware + power ESP32 |
| **External 5V Power** (optional — USB power bank) | 1 | — | Power motor via relay if needed |

> [!TIP]
> **Budget option**: Skip the relay and motor. Use just the DHT22, LED, and push button (total ≈ ₹600) for a minimal but fully functional demo.

---

## 3. Wiring Diagram

```
                        ESP32 DevKit V1
                    ┌───────────────────────┐
                    │                       │
                    │   3V3 ──────────┐     │
                    │                 │     │
                    │   GND ──┬───┬───┼──┐  │
                    │         │   │   │  │  │
                    │  GPIO15 ┤   │   │  │  │  ← DHT22 Data
                    │         │   │   │  │  │
                    │  GPIO27 ┤   │   │  │  │  ← LED (via 220Ω)
                    │         │   │   │  │  │
                    │  GPIO26 ┤   │   │  │  │  ← Relay IN (Motor)
                    │         │   │   │  │  │
                    │   GPIO4 ┤   │   │  │  │  ← Push Button
                    │         │   │   │  │  │
                    │     5V  ┤   │   │  │  │  → Relay VCC
                    │         │   │   │  │  │
                    └─────────┘   │   │  │  │
                                  │   │  │  │
        ┌─────────────────────────┘   │  │  │
        │                             │  │  │
        │  WIRING DETAILS:            │  │  │
        │                             │  │  │
        ▼                             │  │  │
                                      │  │  │
  ┌─── DHT22 Sensor ───┐             │  │  │
  │ Pin 1 (VCC) → 3V3  │─────────────┘  │  │
  │ Pin 2 (DATA)→ GPIO15│                │  │
  │   (+ 10kΩ pull-up   │                │  │
  │    to 3V3)           │                │  │
  │ Pin 4 (GND) → GND  │────────────────┘  │
  └─────────────────────┘                   │
                                            │
  ┌─── LED ─────────────┐                   │
  │ Anode (+) → 220Ω →  │                   │
  │            GPIO 27   │                   │
  │ Cathode (−)→ GND    │──────────────────┘
  └─────────────────────┘

  ┌─── Push Button ─────┐
  │ One leg → GPIO 4    │
  │  (+ 10kΩ pull-down  │
  │   to GND)           │
  │ Other leg → 3V3     │
  └─────────────────────┘

  ┌─── Relay Module ────┐
  │ VCC → ESP32 5V      │
  │ GND → ESP32 GND     │
  │ IN  → GPIO 26       │
  │ COM → Motor (+)     │
  │ NO  → External 5V   │
  │ Motor (−) → Ext GND │
  └─────────────────────┘
```

### Pin Summary Table

| Component | ESP32 GPIO | Direction | Notes |
|---|---|---|---|
| **DHT22** (Data) | GPIO **15** | INPUT | 10kΩ pull-up to 3V3 |
| **LED** (Anode) | GPIO **27** | OUTPUT | Via 220Ω resistor to GND |
| **Relay** (IN) | GPIO **26** | OUTPUT | Controls motor power (active LOW on most modules) |
| **Push Button** | GPIO **4** | INPUT | 10kΩ pull-down to GND, other leg to 3V3 |

> [!IMPORTANT]
> - The **DHT22** VCC connects to the ESP32's **3V3** pin (not 5V) — the ESP32 GPIO pins are 3.3V logic.
> - The **Relay module** VCC connects to the ESP32's **5V** pin (from USB) — most relay modules need 5V to energize the coil.
> - If using **DHT11** instead of DHT22, the wiring and code are identical (DHT11 is less accurate but cheaper).

---

## 4. Arduino IDE Setup

### Step 1: Install ESP32 Board Package

1. Open Arduino IDE → **File → Preferences**
2. In **Additional Boards Manager URLs**, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools → Board → Boards Manager** → search `esp32` → Install **esp32** by *Espressif Systems*

### Step 2: Install Required Libraries

Open **Tools → Manage Libraries** and install:

| Library | Author | Purpose |
|---|---|---|
| **PubSubClient** | Nick O'Leary | MQTT client for ESP32 |
| **ArduinoJson** | Benoit Blanchon (v6+) | Build/parse JSON payloads |
| **DHT sensor library** | Adafruit | Read DHT22/DHT11 sensor |
| **Adafruit Unified Sensor** | Adafruit | Dependency for DHT library |

### Step 3: Select Your Board

- Go to **Tools → Board** → Select **"ESP32 Dev Module"**
- Go to **Tools → Port** → Select the COM port (e.g. `COM3` on Windows)

---

## 5. Complete ESP32 Firmware Code

Create a new sketch in Arduino IDE (`esp32_mini_simulator.ino`) and paste this complete code:

```cpp
// ================================================================
//  ESP32 Mini Simulator — Lansub MQTT Bi-Directional Controller
// ================================================================
//
//  SENSORS (ESP32 → Dashboard):
//    - DHT22 → Publishes temperature & humidity to sensor/temperature, sensor/humidity
//    - Push Button → Publishes press event to sensor/button
//
//  ACTUATORS (Dashboard → ESP32):
//    - LED on GPIO 27 → Controlled by dashboard via control/led
//    - DC Motor (via Relay) on GPIO 26 → Controlled via control/motor
//
// ================================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ==========================================
// 1. CONFIGURATION — EDIT THESE VALUES
// ==========================================

// Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_NAME";       // ← Your Wi-Fi network name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";    // ← Your Wi-Fi password

// MQTT Broker Address
// - Local PC:  Your PC's Wi-Fi IP (e.g. "192.168.1.100")
// - Azure VM:  Your VM's public IP (e.g. "20.198.xxx.xxx")
// - HiveMQ:    "broker.hivemq.com" with port 1883
const char* MQTT_SERVER   = "192.168.1.100";         // ← Replace with YOUR server IP
const int   MQTT_PORT     = 7003;                    // ← Lansub Mosquitto host port

// MQTT Credentials (leave empty if anonymous access is allowed)
const char* MQTT_USER     = "";
const char* MQTT_PASS     = "";

// ==========================================
// 2. PIN DEFINITIONS
// ==========================================

#define DHT_PIN       15       // DHT22 data pin
#define DHT_TYPE      DHT22    // Change to DHT11 if using DHT11
#define LED_PIN       27       // LED anode (via 220Ω resistor)
#define MOTOR_PIN     26       // Relay IN (controls DC motor)
#define BUTTON_PIN     4       // Push button (pulled LOW, pressed = HIGH)

// ==========================================
// 3. MQTT TOPIC DEFINITIONS
// ==========================================

// Telemetry Topics (ESP32 PUBLISHES these → Dashboard reads them)
const char* TOPIC_TEMPERATURE = "sensor/temperature";
const char* TOPIC_HUMIDITY    = "sensor/humidity";
const char* TOPIC_BUTTON      = "sensor/button";

// Control Topics (Dashboard PUBLISHES these → ESP32 listens)
const char* TOPIC_CTRL_LED    = "control/led";      // Payload: "ON" or "OFF"
const char* TOPIC_CTRL_MOTOR  = "control/motor";    // Payload: "ON" or "OFF"

// Acknowledgment Topic (ESP32 confirms it executed the command)
const char* TOPIC_ACK         = "control/ack";

// ==========================================
// 4. GLOBAL OBJECTS & STATE
// ==========================================

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient mqtt(espClient);

unsigned long lastTelemetry  = 0;
const int     TELEMETRY_INTERVAL = 3000;  // Send sensor data every 3 seconds

bool lastButtonState = LOW;
bool ledState        = false;
bool motorState      = false;

// ==========================================
// 5. MQTT CALLBACK — Handle Dashboard Commands
// ==========================================
//
// When the dashboard user flips a Switch Widget, the frontend
// calls POST /api/publish with:
//   { broker_id, topic: "control/led", payload: "ON", qos: 0 }
//
// The backend publishes the MQTT message to the Mosquitto broker.
// The ESP32 receives it here in this callback function.
//

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload bytes to a String
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();

  Serial.println("\n========================================");
  Serial.print("📥 COMMAND from Dashboard: [");
  Serial.print(topic);
  Serial.print("] → ");
  Serial.println(message);

  // --- LED Control ---
  if (String(topic) == TOPIC_CTRL_LED) {
    if (message.equalsIgnoreCase("ON") || message == "1") {
      digitalWrite(LED_PIN, HIGH);
      ledState = true;
      Serial.println("💡 LED → ON");
    } else {
      digitalWrite(LED_PIN, LOW);
      ledState = false;
      Serial.println("💡 LED → OFF");
    }

    // Send acknowledgment back to dashboard
    StaticJsonDocument<128> ack;
    ack["device"]  = "ESP32-SIMULATOR";
    ack["led"]     = ledState ? "ON" : "OFF";
    ack["status"]  = "OK";
    char ackBuf[128];
    serializeJson(ack, ackBuf);
    mqtt.publish(TOPIC_ACK, ackBuf);
  }

  // --- Motor Control ---
  if (String(topic) == TOPIC_CTRL_MOTOR) {
    if (message.equalsIgnoreCase("ON") || message == "1") {
      digitalWrite(MOTOR_PIN, HIGH);
      motorState = true;
      Serial.println("⚙️  MOTOR → ON (Relay energized)");
    } else {
      digitalWrite(MOTOR_PIN, LOW);
      motorState = false;
      Serial.println("⚙️  MOTOR → OFF (Relay de-energized)");
    }

    // Send acknowledgment
    StaticJsonDocument<128> ack;
    ack["device"]  = "ESP32-SIMULATOR";
    ack["motor"]   = motorState ? "ON" : "OFF";
    ack["status"]  = "OK";
    char ackBuf[128];
    serializeJson(ack, ackBuf);
    mqtt.publish(TOPIC_ACK, ackBuf);
  }

  Serial.println("========================================");
}

// ==========================================
// 6. Wi-Fi Connection
// ==========================================

void setupWiFi() {
  Serial.print("\n📶 Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ Wi-Fi Connected!");
  Serial.print("   ESP32 IP Address: ");
  Serial.println(WiFi.localIP());
}

// ==========================================
// 7. MQTT Reconnect with Auto-Subscribe
// ==========================================

void reconnectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("🔌 Connecting to Lansub MQTT Broker (");
    Serial.print(MQTT_SERVER);
    Serial.print(":");
    Serial.print(MQTT_PORT);
    Serial.print(") ... ");

    // Unique client ID to avoid conflicts
    String clientId = "ESP32_SIM_" + String(random(0xFFFF), HEX);

    bool connected = false;
    if (strlen(MQTT_USER) > 0) {
      connected = mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    } else {
      connected = mqtt.connect(clientId.c_str());
    }

    if (connected) {
      Serial.println("✅ CONNECTED!");

      // Subscribe to ALL control topics from the dashboard
      mqtt.subscribe(TOPIC_CTRL_LED);
      mqtt.subscribe(TOPIC_CTRL_MOTOR);

      Serial.println("   📡 Subscribed to: control/led");
      Serial.println("   📡 Subscribed to: control/motor");
    } else {
      Serial.print("❌ Failed (rc=");
      Serial.print(mqtt.state());
      Serial.println(") — retrying in 5s...");
      delay(5000);
    }
  }
}

// ==========================================
// 8. SETUP
// ==========================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n╔══════════════════════════════════════╗");
  Serial.println("║   ESP32 Mini Simulator — Lansub MQTT ║");
  Serial.println("╚══════════════════════════════════════╝");

  // Configure GPIO Pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(MOTOR_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT);  // 10kΩ external pull-down

  // Start LOW (everything off)
  digitalWrite(LED_PIN, LOW);
  digitalWrite(MOTOR_PIN, LOW);

  // Initialize DHT sensor
  dht.begin();

  // Connect to Wi-Fi
  setupWiFi();

  // Configure MQTT
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
}

// ==========================================
// 9. MAIN LOOP
// ==========================================

void loop() {
  // Maintain MQTT connection
  if (!mqtt.connected()) {
    reconnectMQTT();
  }
  mqtt.loop();

  // ─── A. Read & Publish Sensor Telemetry ───
  unsigned long now = millis();
  if (now - lastTelemetry > TELEMETRY_INTERVAL) {
    lastTelemetry = now;

    float temperature = dht.readTemperature();  // Celsius
    float humidity    = dht.readHumidity();

    // Check if sensor read failed
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("⚠️  DHT sensor read failed — skipping this cycle");
      return;
    }

    // ── Publish Temperature ──
    {
      StaticJsonDocument<256> doc;
      doc["value"]     = round(temperature * 10.0) / 10.0;
      doc["temp"]      = round(temperature * 10.0) / 10.0;
      doc["unit"]      = "°C";
      doc["device_id"] = "ESP32-SIMULATOR";
      doc["led"]       = ledState   ? "ON" : "OFF";
      doc["motor"]     = motorState ? "ON" : "OFF";

      char buffer[256];
      serializeJson(doc, buffer);
      mqtt.publish(TOPIC_TEMPERATURE, buffer);

      Serial.print("📤 Temperature: ");
      Serial.print(temperature, 1);
      Serial.println(" °C");
    }

    // ── Publish Humidity ──
    {
      StaticJsonDocument<128> doc;
      doc["value"]     = round(humidity * 10.0) / 10.0;
      doc["unit"]      = "%";
      doc["device_id"] = "ESP32-SIMULATOR";

      char buffer[128];
      serializeJson(doc, buffer);
      mqtt.publish(TOPIC_HUMIDITY, buffer);

      Serial.print("📤 Humidity:    ");
      Serial.print(humidity, 1);
      Serial.println(" %");
    }
  }

  // ─── B. Read Physical Button Press ───
  bool currentButton = digitalRead(BUTTON_PIN);

  // Detect rising edge (button just pressed)
  if (currentButton == HIGH && lastButtonState == LOW) {
    delay(50);  // Simple debounce
    currentButton = digitalRead(BUTTON_PIN);  // Re-read after debounce

    if (currentButton == HIGH) {
      Serial.println("🔘 BUTTON PRESSED! Publishing event...");

      StaticJsonDocument<128> doc;
      doc["event"]     = "pressed";
      doc["device_id"] = "ESP32-SIMULATOR";
      doc["timestamp"] = millis();

      char buffer[128];
      serializeJson(doc, buffer);
      mqtt.publish(TOPIC_BUTTON, buffer);
    }
  }
  lastButtonState = currentButton;
}
```

> [!NOTE]
> **Only 3 things to change before uploading:**
> 1. `WIFI_SSID` — Your Wi-Fi network name
> 2. `WIFI_PASSWORD` — Your Wi-Fi password
> 3. `MQTT_SERVER` — Your PC's local IP (run `ipconfig` in PowerShell) or your Azure VM's public IP

---

## 6. Configuring Your Network

### Finding Your PC's Local IP (Windows)

```powershell
ipconfig
```

Look for the **IPv4 Address** under your Wi-Fi adapter (e.g. `192.168.1.45`). Set this as `MQTT_SERVER` in the code.

### Opening the Firewall (Windows)

The Mosquitto broker runs on port `7003`. Allow it through Windows Firewall:

```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="Lansub MQTT 7003" dir=in action=allow protocol=TCP localport=7003
```

### Azure VM — Open NSG Port

If Lansub runs on an Azure VM, add an **Inbound Security Rule**:
- Destination port: `7003`
- Protocol: `TCP`
- Action: `Allow`

> [!IMPORTANT]
> The ESP32 and your PC/server **must** be on the same network (same Wi-Fi router) for local setups. The ESP32 is a separate device — it **cannot** use `localhost` or `127.0.0.1`.

---

## 7. Registering Topics in the Dashboard

Before the dashboard can visualize ESP32 data, you must **subscribe** to the MQTT topics. Navigate to **Topics** in the sidebar (`/topics`).

### Topic 1: Temperature Sensor

| Field | Value |
|---|---|
| **Pattern** | `sensor/temperature` |
| **Label** | `ESP32 Temperature` |
| **Payload Format** | `JSON` |
| **Value Path** | `value` |
| **Unit** | `°C` |
| **Retention** | `7` days |

### Topic 2: Humidity Sensor

| Field | Value |
|---|---|
| **Pattern** | `sensor/humidity` |
| **Label** | `ESP32 Humidity` |
| **Payload Format** | `JSON` |
| **Value Path** | `value` |
| **Unit** | `%` |
| **Retention** | `7` days |

### Topic 3: Button Press Events

| Field | Value |
|---|---|
| **Pattern** | `sensor/button` |
| **Label** | `Physical Button` |
| **Payload Format** | `JSON` |
| **Value Path** | `event` |
| **Unit** | *(leave empty)* |
| **Retention** | `1` day |

---

## 8. Adding Dashboard Widgets

Navigate to **Dashboard** in the sidebar and click **+ Add Widget** to create each widget.

### Widget 1: Temperature Gauge (Speedometer)

| Setting | Value |
|---|---|
| **Widget Type** | `Gauge` |
| **Title** | `🌡️ ESP32 Temperature` |
| **Topic** | Select `ESP32 Temperature (sensor/temperature)` |
| **Min** | `0` |
| **Max** | `50` |
| **Unit** | `°C` |

> This creates a live radial speedometer that shows the real temperature from your DHT22 sensor.

### Widget 2: Humidity Line Chart

| Setting | Value |
|---|---|
| **Widget Type** | `Line Chart` |
| **Title** | `💧 Humidity Trend` |
| **Topic** | Select `ESP32 Humidity (sensor/humidity)` |

> Historical humidity plotted as a smooth time-series line graph.

### Widget 3: LED Control Switch ⬅️ *(Bi-directional!)*

| Setting | Value |
|---|---|
| **Widget Type** | `Switch` |
| **Title** | `💡 LED Control` |
| **Broker** | Select your broker |
| **Control Topic** | `control/led` |

> **How it works**: When you flip this switch to ON, the frontend calls:
> ```
> POST /api/publish
> { "broker_id": "<your-broker-uuid>", "topic": "control/led", "payload": "ON", "qos": 0 }
> ```
> The backend publishes `ON` to the Mosquitto broker on `control/led`. The ESP32 is subscribed to `control/led` and receives the message in its `mqttCallback()` function → it sets `GPIO 27 HIGH` → the physical LED turns on.

### Widget 4: Motor Control Switch ⬅️ *(Bi-directional!)*

| Setting | Value |
|---|---|
| **Widget Type** | `Switch` |
| **Title** | `⚙️ Motor Control` |
| **Broker** | Select your broker |
| **Control Topic** | `control/motor` |

> Same mechanism as LED. Flipping to OFF publishes `"OFF"` → ESP32 sets `GPIO 26 LOW` → relay de-energizes → motor stops.

### Widget 5: Emergency Stop Button *(Optional)*

| Setting | Value |
|---|---|
| **Widget Type** | `Button` |
| **Title** | `🛑 Emergency Stop` |
| **Broker** | Select your broker |
| **Control Topic** | `control/motor` |
| **Payload** | `OFF` |
| **Button Label** | `EMERGENCY STOP` |
| **Variant** | `Danger` (red) |

> One-click panic button that immediately publishes `OFF` to `control/motor` and kills the motor.

---

## 9. Setting Up Automated Safety Rules

The Lansub Rule Engine can **autonomously** shut down actuators when sensor values breach a threshold — no human intervention needed.

Navigate to **Rules** in the sidebar (`/rules`) and click **+ Add Rule**.

### Rule: Overheat Motor Cutoff

| Setting | Value |
|---|---|
| **Rule Name** | `Overheat Motor Cutoff` |
| **Condition Topic** | `sensor/temperature` |
| **Operator** | `>` (greater than) |
| **Threshold Value** | `35` (°C) |
| **Duration** | `0` seconds (trigger immediately) |
| **Action Type** | `Publish MQTT + Notify` |
| **Target Broker** | Select your broker |
| **Target Topic** | `control/motor` |
| **Target Payload** | `OFF` |
| **Severity** | `Danger` |
| **Cooldown** | `60` seconds |

> **What happens**: Every time the ESP32 publishes a temperature reading, the backend Rule Engine evaluates it:
>
> ```
> if temperature > 35.0 → auto-publish "OFF" to control/motor
>                       → ESP32 receives "OFF" → motor stops spinning
>                       → Dashboard shows toast notification: "🚨 Overheat Motor Cutoff"
> ```
>
> This runs server-side — even if nobody is watching the dashboard, the motor will be automatically stopped.

---

## 10. Testing the Full Loop

### Step-by-Step Verification

1. **Flash the firmware** onto your ESP32 and open the Arduino Serial Monitor at `115200` baud.

2. **Verify connection** — you should see:
   ```
   ╔══════════════════════════════════════╗
   ║   ESP32 Mini Simulator — Lansub MQTT ║
   ╚══════════════════════════════════════╝
   📶 Connecting to Wi-Fi: MyHomeWiFi .....
   ✅ Wi-Fi Connected!
      ESP32 IP Address: 192.168.1.155
   🔌 Connecting to Lansub MQTT Broker (192.168.1.100:7003) ... ✅ CONNECTED!
      📡 Subscribed to: control/led
      📡 Subscribed to: control/motor
   📤 Temperature: 26.3 °C
   📤 Humidity:    54.2 %
   ```

3. **Check the Dashboard** — open `http://localhost:7000/dashboard`:
   - The **Temperature Gauge** needle should be moving to show real sensor values
   - The **Humidity Line Chart** should start plotting points

4. **Test LED control** — flip the **💡 LED Control** switch to ON:
   - Serial Monitor shows: `📥 COMMAND from Dashboard: [control/led] → ON` / `💡 LED → ON`
   - Your physical LED lights up!
   - Flip it OFF → LED turns off

5. **Test Motor control** — flip the **⚙️ Motor Control** switch to ON:
   - Serial Monitor shows: `📥 COMMAND from Dashboard: [control/motor] → ON` / `⚙️ MOTOR → ON (Relay energized)`
   - Your physical motor starts spinning!
   - Flip it OFF → motor stops

6. **Test the button** — press the physical push button on the breadboard:
   - Serial Monitor shows: `🔘 BUTTON PRESSED! Publishing event...`
   - The dashboard Message Table logs the button event

7. **Test the safety rule** — hold the DHT22 sensor near a warm object (or blow warm air) to push temperature above 35°C:
   - The Rule Engine triggers automatically
   - Motor stops spinning even if the switch is still "ON"
   - Dashboard shows a toast: `🚨 Overheat Motor Cutoff`

---

## 11. How the Communication Works (Under the Hood)

### Telemetry Flow (ESP32 → Dashboard)

```
1. ESP32 reads DHT22 sensor
      ↓
2. ESP32 builds JSON: {"value": 26.3, "unit": "°C", "device_id": "ESP32-SIMULATOR"}
      ↓
3. ESP32 calls mqtt.publish("sensor/temperature", jsonBuffer)
      ↓
4. Mosquitto Broker receives the MQTT message
      ↓
5. Lansub Backend (subscribed to sensor/temperature) receives it via paho-mqtt
      ↓
6. Backend stores the value in PostgreSQL (time-series table)
      ↓
7. Backend evaluates all active Rules for this user
      ↓
8. Backend broadcasts the new value over WebSocket to connected browsers
      ↓
9. Frontend WebSocket client (ws-client.ts) receives the message
      ↓
10. Zustand store updates → React re-renders → Gauge/Chart widgets update live
```

### Command Flow (Dashboard → ESP32)

```
1. User flips Switch Widget to "ON" in the browser
      ↓
2. SwitchWidget calls: api.publish({broker_id, topic: "control/led", payload: "ON"})
      ↓
3. Frontend sends: POST http://localhost:7001/api/publish
   Body: {"broker_id": "uuid", "topic": "control/led", "payload": "ON", "qos": 0}
      ↓
4. Backend verifies the user owns the broker (JWT auth)
      ↓
5. Backend calls mqtt_manager.publish(broker_id, "control/led", "ON")
      ↓
6. Mosquitto Broker receives the MQTT message
      ↓
7. ESP32 (subscribed to "control/led") receives it in mqttCallback()
      ↓
8. ESP32 sets digitalWrite(LED_PIN, HIGH) → physical LED turns on
      ↓
9. ESP32 publishes acknowledgment to "control/ack":
   {"device": "ESP32-SIMULATOR", "led": "ON", "status": "OK"}
```

### Automatic Rule Action

```
1. ESP32 publishes: sensor/temperature → {"value": 37.5}
      ↓
2. Backend Rule Engine evaluates:
   Rule "Overheat Motor Cutoff": 37.5 > 35.0 → TRUE
      ↓
3. Backend auto-publishes "OFF" to control/motor via MQTT
      ↓
4. ESP32 receives "OFF" on control/motor → motor stops
      ↓
5. Backend logs the trigger in rule_execution_logs table
      ↓
6. Backend sends WebSocket toast notification to the browser
      ↓
7. Dashboard shows: "🚨 Overheat Motor Cutoff — sensor/temperature (37.5) > 35.0"
```

---

## 12. Troubleshooting

### ESP32 won't connect to Wi-Fi

| Symptom | Fix |
|---|---|
| Stuck on `Connecting to Wi-Fi: ...........` | Check SSID and password are correct (case-sensitive). Ensure the network is **2.4 GHz** — ESP32 does **not** support 5 GHz Wi-Fi. |
| Connects then disconnects repeatedly | Move ESP32 closer to the router. Check if MAC filtering is enabled on your router. |

### ESP32 won't connect to MQTT Broker

| Symptom | Fix |
|---|---|
| `failed, rc=-2` | Wrong IP address. Run `ipconfig` and verify the IP. Check firewall port 7003 is open. |
| `failed, rc=-4` | Broker is not running. Run `docker ps` to verify `lansub-mqtt-broker` container is up. |
| `failed, rc=5` | Authentication required but credentials empty. Set `MQTT_USER` and `MQTT_PASS` if your broker requires auth. |
| Connects but no data appears on dashboard | Check that you registered the topic `sensor/temperature` on the Topics page. Topic patterns must match exactly. |

### Dashboard switch has no effect on ESP32

| Symptom | Fix |
|---|---|
| Switch shows "Published ON" but LED doesn't light up | Verify the ESP32 Serial Monitor shows the incoming command. If not, check that the ESP32 is subscribed to `control/led`. If the monitor shows the command but LED doesn't work, check the wiring (GPIO 27 → 220Ω → LED anode → LED cathode → GND). |
| "Missing broker or topic" error on the switch widget | Re-create the Switch Widget and make sure you selected a valid broker and typed the correct control topic (`control/led` or `control/motor`). |

### DHT22 sensor reads NaN

| Symptom | Fix |
|---|---|
| Serial shows `⚠️ DHT sensor read failed` | Check wiring. Verify the **10kΩ pull-up** resistor is connected between the DATA pin and 3V3. Try adding a `delay(2000)` at the end of `setup()` — the DHT22 needs 2 seconds to stabilize after power-on. |

### Motor doesn't spin

| Symptom | Fix |
|---|---|
| Relay clicks but motor doesn't spin | Check the motor wiring on the relay's **NO** (Normally Open) and **COM** terminals. Verify external 5V power is connected. |
| Relay doesn't click at all | Some relay modules are **active LOW** — change `digitalWrite(MOTOR_PIN, HIGH)` to `LOW` and vice versa. Test with `digitalWrite(MOTOR_PIN, LOW)` in `setup()` to see if the relay clicks. |

---

> [!TIP]
> **Next Steps After Building:**
> - Add more sensors (soil moisture sensor, ultrasonic distance sensor, light sensor) by defining new topics and widgets
> - Create additional rules (e.g. "if humidity < 30%, turn on a water pump")
> - Use MQTT **wildcards** on the Topics page (e.g. `sensor/#`) to capture all sensor data at once
> - Connect multiple ESP32 boards, each with its own `device_id`, to simulate a fleet
