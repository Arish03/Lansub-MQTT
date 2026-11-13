"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  Cpu,
  Layers,
  Database,
  Radio,
  CheckCircle2,
  Zap,
  Terminal,
  Clock,
  Sparkles,
  Lock,
  ChevronRight,
  Gauge,
  LineChart as LineChartIcon,
} from "lucide-react";
import { getToken } from "@/lib/api";

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"esp32" | "python">("esp32");

  // Simulated live demo state for the hero gauge
  const [demoTemp, setDemoTemp] = useState<number>(28.4);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);

    // Subtle sinusoidal fluctuation for the interactive hero preview
    const interval = setInterval(() => {
      setDemoTemp((prev) => {
        const next = prev + (Math.random() * 0.8 - 0.4);
        return Math.min(34, Math.max(24, Math.round(next * 10) / 10));
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <nav
          aria-label="Global"
          className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20"
              aria-hidden="true"
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight block leading-tight">
                Lansub MQTT
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block">
                Enterprise IoT Hub
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Features
            </a>
            <a href="#architecture" className="hover:text-blue-600 transition-colors">
              Architecture
            </a>
            <a href="#quickstart" className="hover:text-blue-600 transition-colors">
              ESP32 & Python
            </a>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-95"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-slate-700 hover:text-blue-600 text-sm font-semibold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-95"
                >
                  Get Started
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section aria-labelledby="hero-title" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-6">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                Next-Gen MQTT Telemetry & Automations
              </div>
              <h1
                id="hero-title"
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]"
              >
                Industrial IoT Telemetry & Automated Fail-Safe Control
              </h1>
              <p className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Ingest sensor data from ESP32 microcontrollers, PLC gateways, and multi-cloud brokers. Visualize with 240° speedometer dials and execute automated fail-safes without human latency.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    Open Live Dashboard
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      Start Monitoring Free
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    <Link
                      href="/login"
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm transition-all shadow-sm"
                    >
                      Sign In to Account
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Hero Visual Showcase */}
            <div className="relative max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200/80 p-6 md:p-8 shadow-2xl shadow-blue-900/5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Live Operational Telemetry • ESP32-001
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                  sensor/temperature
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Dial Gauge Mockup */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center flex flex-col items-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Temperature Dial
                  </div>
                  <div className="relative my-2 w-36 h-28 flex flex-col items-center justify-center">
                    <svg width="140" height="90" viewBox="0 0 140 90" aria-hidden="true">
                      <path
                        d="M 25 75 A 45 45 0 1 1 115 75"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 25 75 A 45 45 0 0 1 70 30"
                        fill="none"
                        stroke={demoTemp >= 30 ? "#f43f5e" : demoTemp >= 25 ? "#f59e0b" : "#10b981"}
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute top-8 flex flex-col items-center pointer-events-none">
                      <span className="text-2xl font-extrabold font-mono text-slate-900">
                        {demoTemp.toFixed(1)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">°C</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Range: 0 – 50 °C • Warn: 25 | Danger: 30
                  </span>
                </div>

                {/* Multi-Series Sparkline Preview */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 md:col-span-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Real-Time Synchronized Telemetry
                    </span>
                    <span className="text-xs font-mono font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Sub-10ms WebSocket
                    </span>
                  </div>

                  {/* SVG Wave */}
                  <svg
                    className="w-full h-24 overflow-visible"
                    viewBox="0 0 400 90"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M 0 50 Q 50 20, 100 45 T 200 40 T 300 25 T 400 35"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 0 70 Q 50 60, 100 75 T 200 65 T 300 80 T 400 70"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-3 border-t border-slate-200/60 mt-2">
                    <span className="text-blue-600 font-semibold">• Temperature (°C)</span>
                    <span className="text-amber-600 font-semibold">• Humidity (%)</span>
                    <span className="text-slate-400">Sample Rate: 1.0s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Pillars Section */}
        <section
          id="features"
          aria-labelledby="features-title"
          className="py-16 md:py-24 bg-white border-y border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2
                id="features-title"
                className="text-3xl font-extrabold tracking-tight text-slate-900"
              >
                Engineered for High-Frequency Industrial Telemetry
              </h2>
              <p className="mt-3 text-sm md:text-base text-slate-500">
                Built from the ground up for edge developers, factory managers, and embedded systems engineers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 transition-all hover:border-slate-300">
                <div
                  className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <Gauge className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">240° Radial Speedometers</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Precision vector gauges with bottom opening arch. Dynamically signals normal (emerald), warning (amber), and critical (rose) states.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 transition-all hover:border-slate-300">
                <div
                  className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Automated Fail-Safe Rules</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Trigger automated relay shutdowns when thresholds breach for sustained durations without human latency.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 transition-all hover:border-slate-300">
                <div
                  className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">PostgreSQL Batch Engine</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  AsyncPG queue inserts batches of 200 telemetry rows with hourly retention cleanup to avoid disk bloat.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 transition-all hover:border-slate-300">
                <div
                  className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Multi-Broker Hub</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Simultaneously stream from bundled Mosquitto (port 7003), HiveMQ Cloud, and remote industrial brokers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section
          id="architecture"
          aria-labelledby="arch-title"
          className="py-16 md:py-24 max-w-7xl mx-auto px-6"
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 id="arch-title" className="text-3xl font-extrabold tracking-tight text-slate-900">
              End-to-End IoT Pipeline
            </h2>
            <p className="mt-3 text-sm md:text-base text-slate-500">
              From physical microcontrollers to web dashboards in under 10 milliseconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                1. Edge Tier
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-4 mb-2">Hardware Nodes</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ESP32, Raspberry Pi, Arduino, or Python simulators publish JSON packets over TCP (Port 7003) or TLS (Port 8883).
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                2. Processing Core
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-4 mb-2">FastAPI & AsyncPG</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Aiomqtt worker extracts JSON paths, evaluates threshold alarms, records history in PostgreSQL, and fans out to WebSockets.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                3. Operations View
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-4 mb-2">Next.js 15 UI</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Real-time SVG charts, interactive relay toggles, alarm toast notifications, and one-click CSV time-series exports.
              </p>
            </div>
          </div>
        </section>

        {/* Quickstart Code Section */}
        <section
          id="quickstart"
          aria-labelledby="code-title"
          className="py-16 md:py-24 bg-slate-900 text-slate-100"
        >
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 id="code-title" className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  Get Connected in 60 Seconds
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Plug in your hardware or run the telemetry simulator in one command.
                </p>
              </div>

              <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setActiveTab("esp32")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "esp32"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ESP32 Arduino
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("python")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "python"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Python Simulator
                </button>
              </div>
            </div>

            <figure className="relative rounded-2xl bg-slate-950 border border-slate-800 p-5 shadow-2xl overflow-hidden">
              <figcaption className="sr-only">Quick-start code example for Lansub MQTT</figcaption>
              <pre
                tabIndex={0}
                role="region"
                aria-label="Code snippet"
                className="font-mono text-xs text-slate-300 overflow-x-auto focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg p-2"
              >
                <code>
                  {activeTab === "esp32"
                    ? `// ESP32 Arduino - PubSubClient Telemetry
#include <WiFi.h>
#include <PubSubClient.h>

const char* mqtt_server = "YOUR_SERVER_IP"; // Your PC / VM IP
const int   mqtt_port   = 7003;            // Lansub host port

// Publish JSON telemetry every 5 seconds
void sendTelemetry(float temp, float humidity) {
  String json = "{\\"value\\":" + String(temp, 1) + 
                ",\\"humidity\\":" + String(humidity, 1) + 
                ",\\"unit\\":\\"°C\\"}";
  client.publish("sensor/temperature", json.c_str());
}`
                    : `# Python Telemetry Simulator (Included in repo)
# Streams live sinusoidal data across 5 sensors concurrently
python scripts/simulator.py --host localhost --port 7003 --interval 1.0`}
                </code>
              </pre>
            </figure>
          </div>
        </section>

        {/* CTA Banner */}
        <section aria-labelledby="cta-title" className="py-20 bg-blue-600 text-white text-center">
          <div className="max-w-3xl mx-auto px-6">
            <h2 id="cta-title" className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Ready to Monitor & Automate Your IoT Fleet?
            </h2>
            <p className="mt-3 text-blue-100 text-sm md:text-base">
              Set up your brokers, visualize incoming topics, and protect hardware with automated fail-safes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="px-6 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 transition shadow-lg"
                >
                  Enter Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="px-6 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 transition shadow-lg"
                  >
                    Create Free Account
                  </Link>
                  <Link
                    href="/login"
                    className="px-6 py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm border border-blue-500 transition"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Semantic Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Lansub MQTT Platform v1.0.0 • All Systems Operational</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <Link href="/dashboard" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <Link href="/topics" className="hover:text-blue-600 transition">
              Topics
            </Link>
            <Link href="/devices" className="hover:text-blue-600 transition">
              Devices
            </Link>
            <Link href="/rules" className="hover:text-blue-600 transition">
              Rules
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
