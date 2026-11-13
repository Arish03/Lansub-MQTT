# ESP32 Hardware Integration Guide — Lansub MQTT

This guide provides end-to-end instructions for connecting an **ESP32** (or ESP8266) microcontroller to the **Lansub MQTT** IoT platform.

It includes:
1. **Telemetry Streaming**: Periodically sending temperature and humidity readings formatted as JSON to `sensor/temperature`.
2. **Bi-Directional Actuator Control**: Subscribing to `control/relay1`. When you flip a switch on the Lansub dashboard, the ESP32 receives the command, toggles a physical GPIO pin (relay or onboard LED), and sends an acknowledgment packet back to `control/ack`!

---

## Table of Contents
1. [Network Architecture & Port Mapping](#1-network-architecture--port-mapping)
2. [Prerequisites & Arduino IDE Setup](#2-prerequisites--arduino-ide-setup)
3. [Complete ESP32 Firmware Code (`esp32_lansub.ino`)](#3-complete-esp32-firmware-code-esp32_lansubino)
4. [Finding Your Computer's Local IP](#4-finding-your-computers-local-ip)
5. [Firewall & Network Security Configuration](#5-firewall--network-security-configuration)
6. [Flashing the ESP32 & Testing](#6-flashing-the-esp32--testing)
7. [Dashboard Verification & Bi-Directional Control](#7-dashboard-verification--bi-directional-control)

---

## 1. Network Architecture & Port Mapping

Before programming the ESP32, determine the IP address and port to use:

```
+-------------------------------------------------------+
|                 ESP32 Microcontroller                 |
|  - WiFi Station Mode (WIFI_STA)                       |
|  - PubSubClient MQTT Library                          |
+-------------------------------------------------------+
                           |
                           | Wi-Fi (TCP Port 7003 or 1883)
                           v
+-------------------------------------------------------+
|             Lansub MQTT Host / Broker                 |
|  - Mosquitto TCP Port: 7003 (mapped to 1883 internal) |
|  - Or Public HiveMQ: broker.hivemq.com (Port 1883)    |
+-------------------------------------------------------+
```

| Deployment Scenario | Broker IP to Configure | MQTT Port |
|---|---|---|
| **Lansub on Azure VM / Cloud** | Your Azure VM's **Public IP** (e.g. `20.198.xxx.xxx`) | **`7003`** |
| **Lansub on Local PC / Laptop** | Your PC's **Local Wi-Fi IP** (e.g. `192.168.1.45`) | **`7003`** |
| **Testing with Public HiveMQ** | `broker.hivemq.com` | **`1883`** |

> [!IMPORTANT]
> - **Never** use `localhost` or `127.0.0.1` in the ESP32 code. The ESP32 is an independent network device and cannot resolve your computer via "localhost".
> - Ensure your ESP32 and computer are connected to the **same 2.4 GHz Wi-Fi network**.

---

## 2. Prerequisites & Arduino IDE Setup

1. **Install ESP32 Board Package**:
   - Open Arduino IDE $\to$ **File $\to$ Preferences**.
   - In **Additional Boards Manager URLs**, paste:
     ```text
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to **Tools $\to$ Board $\to$ Boards Manager**, search for **esp32** by *Espressif Systems*, and click **Install**.

2. **Install Required Libraries**:
   - Open **Tools $\to$ Manage Libraries...**
   - Search for and install:
     - **`PubSubClient`** by *Nick O'Leary*
     - **`ArduinoJson`** by *Benoit Blanchon* (v6.x or v7.x)

---

## 3. Complete ESP32 Firmware Code (`esp32_lansub.ino`)

Create a new sketch in Arduino IDE, paste the complete code below, and edit your **Wi-Fi credentials** and **server IP**:

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==========================================
// 1. WiFi & MQTT Network Configuration
// ==========================================
const char* ssid        = "YOUR_WIFI_NAME";       // <-- Your Wi-Fi SSID
const char* password    = "YOUR_WIFI_PASSWORD";   // <-- Your Wi-Fi Password

// Broker IP / Host:
// - If local PC: use PC local IP (e.g. "192.168.1.100")
// - If Azure VM: use your Azure Public IP (e.g. "20.x.x.x")
// - If HiveMQ Public: "broker.hivemq.com" (with port 1883)
const char* mqtt_server = "192.168.1.100";        // <-- Put your server IP here
const int   mqtt_port   = 7003;                   // Lansub MQTT host port

// Optional MQTT Credentials (leave empty if not enabled)
const char* mqtt_user   = "";
const char* mqtt_pass   = "";

// ==========================================
// 2. MQTT Topics & Hardware Pin Mapping
// ==========================================
const char* topic_telemetry = "sensor/temperature";  // Publish topic
const char* topic_control   = "control/relay1";      // Subscribe topic
const char* topic_ack       = "control/ack";          // Acknowledgment topic

// GPIO Pin for Relay / Onboard LED (GPIO 2 on most ESP32 Dev modules)
const int RELAY_PIN = 2;

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
float simulatedTemp = 24.0;
float simulatedHumidity = 50.0;

// ==========================================
// 3. Callback: Handle Incoming Dashboard Commands
// ==========================================
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();

  Serial.println("\n-----------------------------------------");
  Serial.print("📥 Command received from Lansub Dashboard on [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  // If command is sent to control/relay1
  if (String(topic) == topic_control) {
    if (message.equalsIgnoreCase("ON") || message == "1") {
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("⚡ Actuator State: ON");
      client.publish(topic_ack, "{\"device\":\"ESP32\",\"relay1\":\"ON\",\"status\":\"OK\"}");
    } else if (message.equalsIgnoreCase("OFF") || message == "0") {
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("⚡ Actuator State: OFF");
      client.publish(topic_ack, "{\"device\":\"ESP32\",\"relay1\":\"OFF\",\"status\":\"OK\"}");
    }
  }
  Serial.println("-----------------------------------------");
}

// ==========================================
// 4. WiFi Connection Helper
// ==========================================
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✓ Wi-Fi Connected!");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());
}

// ==========================================
// 5. MQTT Auto-Reconnect Helper
// ==========================================
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to Lansub MQTT Broker at ");
    Serial.print(mqtt_server);
    Serial.print(":");
    Serial.print(mqtt_port);
    Serial.print(" ... ");

    // Generate random client ID to avoid connection conflicts
    String clientId = "ESP32_Client_" + String(random(0xffff), HEX);

    bool connected = false;
    if (strlen(mqtt_user) > 0) {
      connected = client.connect(clientId.c_str(), mqtt_user, mqtt_pass);
    } else {
      connected = client.connect(clientId.c_str());
    }

    if (connected) {
      Serial.println("✓ CONNECTED!");
      
      // Subscribe to control commands from dashboard
      client.subscribe(topic_control);
      Serial.print("Subscribed to: ");
      Serial.println(topic_control);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" (retrying in 5 seconds...)");
      delay(5000);
    }
  }
}

// ==========================================
// 6. Setup & Main Execution Loop
// ==========================================
void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  Serial.begin(115200);
  setup_wifi();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  // Ensure MQTT client maintains active connection
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Publish telemetry every 5000ms (5 seconds)
  unsigned long now = millis();
  if (now - lastMsg > 5000) {
    lastMsg = now;

    // Simulate realistic sensor readings (or read DHT11/DHT22: dht.readTemperature())
    simulatedTemp += random(-5, 6) * 0.1;
    if (simulatedTemp < 20.0) simulatedTemp = 20.0;
    if (simulatedTemp > 35.0) simulatedTemp = 35.0;

    simulatedHumidity += random(-10, 11) * 0.2;
    if (simulatedHumidity < 40.0) simulatedHumidity = 40.0;
    if (simulatedHumidity > 80.0) simulatedHumidity = 80.0;

    // Build JSON payload matching Lansub MQTT extractor schema
    StaticJsonDocument<256> doc;
    doc["value"] = round(simulatedTemp * 10) / 10.0;
    doc["temp"] = round(simulatedTemp * 10) / 10.0;
    doc["humidity"] = round(simulatedHumidity * 10) / 10.0;
    doc["unit"] = "°C";
    doc["device_id"] = "ESP32-001";
    doc["relay_state"] = digitalRead(RELAY_PIN) == HIGH ? "ON" : "OFF";

    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);

    // Publish to telemetry topic
    client.publish(topic_telemetry, jsonBuffer);

    Serial.print("📤 Published Telemetry to [");
    Serial.print(topic_telemetry);
    Serial.print("]: ");
    Serial.println(jsonBuffer);
  }
}
```

---

## 4. Finding Your Computer's Local IP

If your Lansub Docker containers are running on your local Windows PC:
1. Open PowerShell and run:
   ```powershell
   ipconfig
   ```
2. Locate the **IPv4 Address** of your active Wi-Fi adapter (e.g. `192.168.1.45`).
3. Set `const char* mqtt_server = "192.168.1.45";` in the Arduino sketch.

---

## 5. Firewall & Network Security Configuration

### Windows Host Firewall:
Windows Defender Firewall may block external devices on your LAN from accessing port `7003`. Allow it by running this in an **Administrator PowerShell**:

```powershell
netsh advfirewall firewall add rule name="Lansub MQTT Port 7003" dir=in action=allow protocol=TCP localport=7003
```

### Azure VM Network Security Group (NSG):
If hosted on an Azure VM, add an Inbound Security Rule:
- **Source**: `Any`
- **Source port ranges**: `*`
- **Destination port ranges**: `7003`
- **Protocol**: `TCP`
- **Action**: `Allow`

---

## 6. Flashing the ESP32 & Testing

1. Connect the ESP32 to your PC using a micro-USB or USB-C data cable.
2. In Arduino IDE:
   - Go to **Tools $\to$ Board** and select `ESP32 Dev Module` (or your specific board).
   - Go to **Tools $\to$ Port** and select the active COM port (e.g. `COM3` or `/dev/ttyUSB0`).
3. Click the **Upload (➡️)** button.
4. Once upload completes, open **Tools $\to$ Serial Monitor** and set the baud rate to **`115200`**.
5. You should see:
   ```text
   Connecting to Wi-Fi: MyHomeWiFi .....
   ✓ Wi-Fi Connected!
   ESP32 IP Address: 192.168.1.155
   Connecting to Lansub MQTT Broker at 192.168.1.100:7003 ... ✓ CONNECTED!
   Subscribed to: control/relay1
   📤 Published Telemetry to [sensor/temperature]: {"value":24.3,"temp":24.3,"humidity":51.2,"unit":"°C","device_id":"ESP32-001"}
   ```

---

## 7. Dashboard Verification & Bi-Directional Control

1. **Real-time Telemetry Visualization**:
   - Open your dashboard at [http://localhost:7000](http://localhost:7000).
   - The **Speedometer Radial Gauge** and **Real-time Line Chart** will start plotting live data received from the ESP32!
   - The **Recent Device Activity Table** will log the incoming packets with `status: online`.

2. **Testing Bi-Directional Actuator Control**:
   - On the Lansub Dashboard, toggle the **Switch Widget** assigned to `control/relay1` to **ON**.
   - Watch your physical ESP32: The onboard LED (GPIO 2) illuminates immediately!
   - In the Arduino Serial Monitor, you will see:
     ```text
     -----------------------------------------
     📥 Command received from Lansub Dashboard on [control/relay1]: ON
     ⚡ Actuator State: ON
     -----------------------------------------
     ```
   - Toggling the switch back to **OFF** turns off the LED.
