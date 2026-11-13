"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  Box,
  Layers,
  Cpu,
  Activity,
  CheckCircle2,
  Sparkles,
  Eye,
  Sliders,
  Radio,
  Share2,
} from "lucide-react";

export default function DigitalTwinPage() {
  const [selectedNode, setSelectedNode] = useState("ESP32-001");
  const [simulatedLed, setSimulatedLed] = useState(true);
  const [emailNotify, setEmailNotify] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailNotify) return;
    setSubscribed(true);
  };

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-8 overflow-y-auto max-w-6xl w-full mx-auto">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-8 md:p-10 shadow-xl shadow-teal-500/10 mb-8">
            <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase mb-4 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                Coming Soon • Spatial Digital Twin Studio
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                Virtual 3D Mirroring for Physical IoT Assets
              </h1>
              <p className="text-emerald-100 text-sm md:text-base mt-2.5 leading-relaxed">
                Connect physical ESP32 boards, robotic actuators, and plant equipment to interactive 3D digital twins. Inspect live pin voltages, spatial heatmaps, and send bidirectional controls directly from CAD models.
              </p>

              {/* Notify form */}
              <div className="mt-6 max-w-md">
                {subscribed ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    You're registered for the Digital Twin early preview!
                  </div>
                ) : (
                  <form onSubmit={handleNotify} className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter email to get early 3D twin beta..."
                      value={emailNotify}
                      onChange={(e) => setEmailNotify(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 text-sm outline-none focus:bg-white/20 transition"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-white text-teal-800 font-semibold text-sm hover:bg-emerald-50 transition shadow-sm shrink-0"
                    >
                      Get Early Access
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 3D Hardware Wireframe & Pin Inspector Mockup */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Virtual Twin Canvas (Interactive Mockup)</h2>
                    <span className="text-xs text-slate-400">Node: {selectedNode} • Firmware v1.4.2</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSimulatedLed(!simulatedLed)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      simulatedLed
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    Actuator Pin GPIO 2: {simulatedLed ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Isometric Board Visualizer Graphic */}
              <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-8 flex flex-col items-center justify-center min-h-[340px] text-white overflow-hidden border border-slate-800">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                {/* Simulated Chip Board */}
                <div className="relative z-10 w-64 md:w-80 bg-slate-800/90 border-2 border-teal-500/50 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-teal-400" />
                      <span className="font-mono text-xs font-bold text-teal-200 tracking-wider">ESP32-WROOM-32D</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>

                  {/* Pin Layout Mockup */}
                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-700/60">
                      <span className="text-teal-300">GPIO 21 (I2C SDA)</span>
                      <span className="text-amber-400 font-bold">28.5 °C (Temp)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-700/60">
                      <span className="text-teal-300">GPIO 22 (I2C SCL)</span>
                      <span className="text-blue-400 font-bold">52.0 % (Humidity)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-700/60">
                      <span className="text-teal-300">GPIO 02 (Relay Out)</span>
                      <span className={`font-bold ${simulatedLed ? "text-emerald-400" : "text-slate-500"}`}>
                        {simulatedLed ? "HIGH (3.3V)" : "LOW (0.0V)"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center text-xs text-slate-400 z-10 font-medium">
                  3D WebGL Three.js spatial canvas rendering physical hardware mesh and dynamic thermal overlays.
                </div>
              </div>
            </div>

            {/* Twin Architecture Capabilities */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Planned 3D Features
                </h3>

                <ul className="space-y-3.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <Box className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">CAD / glTF 3D Imports</strong>
                      Upload custom 3D files of your factory lines, enclosures, and circuit boards.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Activity className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Live Thermal Heatmaps</strong>
                      Visual temperature and pressure gradient coloring directly over the 3D model surface.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Radio className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Spatial Telemetry Pins</strong>
                      Click any component on the 3D model to pop up live time-series sparklines and history.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 shadow-sm border border-slate-800">
                <div className="text-xs font-semibold uppercase text-teal-400 tracking-wider mb-1">
                  Edge Synchronization
                </div>
                <div className="text-sm font-bold text-white mb-2">Sub-10ms MQTT LWT Tracking</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Digital Twins mirror state using MQTT Last Will & Testament (LWT) and keep-alive heartbeats to reflect exact physical state.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

