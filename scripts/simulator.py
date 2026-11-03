#!/usr/bin/env python3
"""
Realtime MQTT IoT Data Simulator with Bidirectional Pub/Sub
------------------------------------------------------------
Simulates realistic IoT sensors (temperature, pressure, power)
and listens to control topics (e.g. control/relay1, control/actions/#)
dispatched from the Lansub MQTT Dashboard.
"""

import argparse
import json
import math
import os
import random
import sys
import time
from datetime import datetime, timezone
import paho.mqtt.client as mqtt

# ANSI Colors for clean terminal display
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


class IoTSimulator:
    def __init__(self, host: str, port: int, username: str = None, password: str = None, interval: float = 1.0, use_tls: bool = False):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.interval = interval
        self.use_tls = use_tls

        self.client = mqtt.Client(client_id=f"lansub_sim_{random.randint(1000, 9999)}", clean_session=True)
        if self.username:
            self.client.username_pw_set(self.username, self.password)
        if self.use_tls:
            self.client.tls_set()

        # Simulated state
        self.step = 0
        self.running = False
        self.actuator_states = {
            "relay1": "OFF",
            "alarm": "DISABLED",
            "pump": "IDLE"
        }

        # Setup callbacks
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"{GREEN}{BOLD}✓ Successfully connected to MQTT broker at {self.host}:{self.port}{RESET}")
            # Subscribe to control and action topics
            topics = [("control/#", 0), ("switch/#", 0)]
            for t, q in topics:
                client.subscribe(t, q)
                print(f"{CYAN}→ Subscribed to command topic: {BOLD}{t}{RESET}")
            print(f"{MAGENTA}{BOLD}⚡ Starting live telemetry streaming (interval: {self.interval}s)...{RESET}\n")
        else:
            print(f"{RED}✗ Connection failed with return code {rc}{RESET}")

    def on_disconnect(self, client, userdata, rc):
        if rc != 0:
            print(f"{YELLOW}! Unexpected disconnect from broker. Reconnecting...{RESET}")

    def on_message(self, client, userdata, msg):
        topic = msg.topic
        payload_raw = msg.payload.decode("utf-8", errors="replace").strip()
        now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")

        print(f"\n{YELLOW}{BOLD}[{now_str}] 📥 COMMAND RECEIVED FROM DASHBOARD:{RESET}")
        print(f"  {BOLD}Topic:{RESET}   {CYAN}{topic}{RESET}")
        print(f"  {BOLD}Payload:{RESET} {GREEN}{payload_raw}{RESET}")

        # Handle known actuator topics
        ack_payload = None
        if "relay" in topic.lower() or topic == "control/relay1":
            new_state = payload_raw.upper()
            self.actuator_states["relay1"] = new_state
            print(f"  {BOLD}Simulated Relay State Updated:{RESET} {MAGENTA}{new_state}{RESET}")
            ack_payload = {
                "device": "relay1",
                "state": new_state,
                "status": "ACK",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            try:
                cmd_data = json.loads(payload_raw)
                action = cmd_data.get("action", "unknown")
                print(f"  {BOLD}Action Dispatched:{RESET} {MAGENTA}{action}{RESET}")
            except Exception:
                action = payload_raw
            ack_payload = {
                "source_topic": topic,
                "command": action,
                "status": "EXECUTED",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        if ack_payload:
            ack_topic = "control/ack"
            self.client.publish(ack_topic, json.dumps(ack_payload))
            print(f"  {CYAN}Acknowledged on {BOLD}{ack_topic}{RESET}")

    def generate_telemetry(self):
        """Generates realistic cyclical and fluctuating physical sensor readings."""
        self.step += 1
        t = self.step * 0.1

        # 1. Temperature Sensor: smooth sinusoidal curve (22°C to 32°C) + noise
        base_temp = 27.0 + 5.0 * math.sin(t) + random.uniform(-0.4, 0.4)
        humidity = 50.0 + 10.0 * math.cos(t * 0.7) + random.uniform(-1.0, 1.0)
        temp_packet = {
            "value": round(base_temp, 1),
            "temp": round(base_temp, 1),
            "unit": "°C",
            "humidity": round(humidity, 1),
            "relay": self.actuator_states["relay1"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # 2. Test Stream (matches wildcard test/#): Pressure sensor (1.0 to 5.0 bar)
        pressure = 2.5 + 1.5 * math.sin(t * 1.5) + random.uniform(-0.2, 0.2)
        test_packet = {
            "value": round(pressure, 2),
            "pressure": round(pressure, 2),
            "unit": "bar",
            "sensor": "barometer_01",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # 3. Factory Machine Power: kW usage with occasional spike
        is_spike = random.random() < 0.05
        kw = random.uniform(12.0, 18.0) if not is_spike else random.uniform(28.0, 35.0)
        power_packet = {
            "value": round(kw, 2),
            "kw": round(kw, 2),
            "voltage": round(230.0 + random.uniform(-2.0, 2.0), 1),
            "spike": is_spike,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        return [
            ("sensor/temperature", temp_packet),
            ("test/sensor1", test_packet),
            ("factory/machine1/power", power_packet),
        ]

    def start(self):
        print(f"\n{BOLD}{CYAN}===================================================={RESET}")
        print(f"{BOLD}{CYAN}    Lansub MQTT Realtime IoT Simulator & Responder  {RESET}")
        print(f"{BOLD}{CYAN}===================================================={RESET}")
        print(f"Connecting to broker: {BOLD}{self.host}:{self.port}{RESET}")
        print("Press Ctrl+C to terminate.\n")

        try:
            self.client.connect(self.host, self.port, 60)
        except Exception as e:
            print(f"{RED}Error connecting to MQTT Broker: {e}{RESET}")
            print(f"{YELLOW}Hint: Ensure Mosquitto is running via `docker compose up -d mosquitto` or locally.{RESET}")
            return

        self.client.loop_start()
        self.running = True

        try:
            while self.running:
                packets = self.generate_telemetry()
                for topic, payload in packets:
                    payload_json = json.dumps(payload)
                    self.client.publish(topic, payload_json)
                    now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")
                    val_str = payload.get("value") or payload.get("temp")
                    print(f"[{now_str}] {GREEN}PUB{RESET} {BOLD}{topic:<24}{RESET} -> value={CYAN}{val_str}{RESET} {payload_json}")

                time.sleep(self.interval)
        except KeyboardInterrupt:
            print(f"\n{YELLOW}Stopping simulator...{RESET}")
        finally:
            self.running = False
            self.client.loop_stop()
            self.client.disconnect()
            print(f"{GREEN}Simulator stopped cleanly.{RESET}")


def main():
    parser = argparse.ArgumentParser(description="Lansub MQTT IoT Telemetry Simulator & Command Responder")
    parser.add_argument("--host", default="localhost", help="MQTT broker hostname (default: localhost)")
    parser.add_argument("--port", type=int, default=1883, help="MQTT broker port (default: 1883)")
    parser.add_argument("--username", default=None, help="MQTT username (optional)")
    parser.add_argument("--password", default=None, help="MQTT password (optional)")
    parser.add_argument("--interval", type=float, default=1.0, help="Publishing interval in seconds (default: 1.0)")
    parser.add_argument("--tls", action="store_true", help="Enable TLS (port 8883)")

    args = parser.parse_args()
    sim = IoTSimulator(
        host=args.host,
        port=args.port,
        username=args.username,
        password=args.password,
        interval=args.interval,
        use_tls=args.tls,
    )
    sim.start()


if __name__ == "__main__":
    main()

