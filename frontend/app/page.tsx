"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Gauge,
  SlidersHorizontal,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Cpu,
  Layers,
  Factory,
  Sprout,
  Server,
  HelpCircle,
  Eye,
  Lock,
  Compass,
} from "lucide-react";
import { getToken } from "@/lib/api";

export default function ModernLandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<"factory" | "datacenter" | "agri">("factory");

  // Interactive Live Demo Telemetry Simulation
  const [simTemp, setSimTemp] = useState<number>(27.8);
  const [simRelay, setSimRelay] = useState<boolean>(true);
  const [alarmTriggered, setAlarmTriggered] = useState<boolean>(false);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);

    // Natural live fluctuation
    const timer = setInterval(() => {
      setSimTemp((prev) => {
        const delta = (Math.random() - 0.48) * 0.6;
        const next = Math.round((prev + delta) * 10) / 10;
        return Math.min(36, Math.max(22, next));
      });
    }, 2800);

    return () => clearInterval(timer);
  }, []);

  // Trigger simulated overheat scenario for user interaction
  const triggerTestSpike = () => {
    setSimTemp(36.2);
    setAlarmTriggered(true);
    // Simulate automated fail-safe action: shuts off relay after 2.5s
    setTimeout(() => {
      setSimRelay(false);
    }, 1800);
  };

  const resetSimulation = () => {
    setSimTemp(25.4);
    setSimRelay(true);
    setAlarmTriggered(false);
  };

  const scenarios = [
    {
      id: "factory",
      title: "Manufacturing & Industrial",
      icon: Factory,
      badge: "Plant Floor Safety",
      headline: "Preventing Thermal Runaways & Machine Downtime",
      description:
        "High-output CNC machines and conveyor motors generate heat. When bearing friction causes temperatures to surge, Lansub MQTT detects the hazard in milliseconds and dispatches an automated shutdown to the motor relay before mechanical seizure occurs.",
      metrics: [
        { label: "Fail-Safe Response", value: "<10 ms" },
        { label: "Critical Protection", value: "24/7 Autonomous" },
        { label: "Hardware Supported", value: "Any MQTT Device" },
      ],
    },
    {
      id: "datacenter",
      title: "Data Centers & Server Rooms",
      icon: Server,
      badge: "Infrastructure Uptime",
      headline: "Continuous Hot-Aisle Telemetry & Cooling Balancing",
      description:
        "Server racks demand strict thermal boundaries. Lansub MQTT tracks cold/hot aisle temperatures across multi-sensor arrays, synchronizing environmental metrics onto live comparison charts and raising visual alerts the moment cooling efficiency dips.",
      metrics: [
        { label: "Telemetry Polling", value: "Real-time Stream" },
        { label: "Alert Channels", value: "In-App Toast Alarms" },
        { label: "Data Retention", value: "Configurable Days" },
      ],
    },
    {
      id: "agri",
      title: "Smart Agriculture & Greenhouses",
      icon: Sprout,
      badge: "Precision Climate",
      headline: "Autonomous Irrigation & Microclimate Stabilization",
      description:
        "Modern agricultural operations monitor humidity, soil moisture, and ambient temperature across distributed nodes. Lansub MQTT evaluates multi-condition rules to automatically trigger ventilation fans and irrigation valves based on environmental bounds.",
      metrics: [
        { label: "Deployment Scope", value: "Indoor & Field" },
        { label: "Device Registry", value: "Digital Twin Tracking" },
        { label: "Audit Reports", value: "1-Click CSV Export" },
      ],
    },
  ];

  const activeData = scenarios.find((s) => s.id === activeScenario) || scenarios[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <nav
          aria-label="Main Navigation"
          className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/25"
              aria-hidden="true"
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight block leading-tight">
                Lansub MQTT
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                IoT Operations Platform
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#about" className="hover:text-blue-600 transition-colors">
              About Platform
            </a>
            <a href="#cockpit" className="hover:text-blue-600 transition-colors">
              Live Cockpit
            </a>
            <a href="#scenarios" className="hover:text-blue-600 transition-colors">
              Use Cases
            </a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-95"
              >
                Open Dashboard
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-slate-700 hover:text-blue-600 text-sm font-bold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-95"
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
        <section
          aria-labelledby="hero-heading"
          className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                Operational Intelligence for Connected Devices
              </div>

              <h1
                id="hero-heading"
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.14]"
              >
                The Real-Time Command Center for Your IoT Fleet
              </h1>

              <p className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
                Raw MQTT data is invisible without the right lens. <strong>Lansub MQTT</strong> turns chaotic sensor streams into live situational awareness, automated machine protection, and historical hardware intelligence.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    Enter Live Dashboard
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      Start Free Today
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    <Link
                      href="/login"
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm transition-all shadow-sm"
                    >
                      Sign In to Workspace
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Live Cockpit Demo Box */}
            <div
              id="cockpit"
              className="relative max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-2xl shadow-blue-900/5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Live Platform Simulation • Node: Machine_Line_A
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={triggerTestSpike}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition active:scale-95"
                  >
                    Simulate Overheat Surge
                  </button>
                  <button
                    type="button"
                    onClick={resetSimulation}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-95"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Cockpit Visual Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-center">
                {/* 240 Speedometer Dial */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Operating Temperature
                  </span>

                  <div className="relative my-2 w-36 h-28 flex flex-col items-center justify-center">
                    <svg width="140" height="90" viewBox="0 0 140 90" aria-hidden="true">
                      {/* Background Arch Track */}
                      <path
                        d="M 25 75 A 45 45 0 1 1 115 75"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* Dynamic Color Progress Arch */}
                      <path
                        d="M 25 75 A 45 45 0 0 1 85 32"
                        fill="none"
                        stroke={simTemp >= 32 ? "#f43f5e" : simTemp >= 27 ? "#f59e0b" : "#10b981"}
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute top-8 flex flex-col items-center pointer-events-none">
                      <span className="text-2xl font-extrabold font-mono text-slate-900">
                        {simTemp.toFixed(1)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">°C</span>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono mt-1">
                    {simTemp >= 32 ? (
                      <span className="text-rose-600 font-bold flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Critical Threshold Exceeded
                      </span>
                    ) : simTemp >= 27 ? (
                      <span className="text-amber-600 font-bold">Warning Level Active</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">Normal Operating Band</span>
                    )}
                  </div>
                </div>

                {/* Automated Fail-Safe Actuator Status */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 md:col-span-2 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Autonomous Fail-Safe Rule Engine
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          simRelay
                            ? "bg-blue-100 text-blue-700"
                            : "bg-rose-100 text-rose-700 animate-pulse"
                        }`}
                      >
                        {simRelay ? "Relay 1: ENERGIZED" : "Relay 1: CUTOFF TRIPPED"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Rule: "Thermal Emergency Cutoff"
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        IF <span className="text-blue-600 font-semibold">sensor/temperature &gt; 32.0°C</span> THEN DISPATCH <span className="text-rose-600 font-semibold">OFF $\to$ control/relay1</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>
                      {alarmTriggered && !simRelay ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Machine protected. Emergency cutoff dispatched automatically.
                        </span>
                      ) : alarmTriggered ? (
                        <span className="text-rose-600 font-bold animate-pulse">
                          Threshold breach detected. Executing fail-safe...
                        </span>
                      ) : (
                        "Continuous 24/7 background rule monitoring active."
                      )}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">Latency: &lt;10ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is Lansub MQTT? (The Mission & Identity) */}
        <section
          id="about"
          aria-labelledby="about-title"
          className="py-16 md:py-24 bg-white border-y border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                Platform Identity
              </span>
              <h2
                id="about-title"
                className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mt-3"
              >
                What is Lansub MQTT?
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Lansub MQTT is an independent, developer-first IoT operations suite. It solves the biggest problem in connected hardware: <strong>making sensor telemetry instantly visible and actionable without fragile patchwork scripts.</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pillar 1 */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-7 flex flex-col justify-between">
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-5"
                    aria-hidden="true"
                  >
                    <Gauge className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Live Situational Awareness</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Stop parsing black-and-white terminal logs. View your machines on calibrated 240° speedometer dials, synchronized comparison graphs, and real-time status pills updated in real time.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/60 text-xs font-bold text-blue-600 flex items-center gap-1">
                  Speedometer Dials & Comparison Charts <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-7 flex flex-col justify-between">
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5"
                    aria-hidden="true"
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Autonomous Machine Protection</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Humans cannot monitor gauges 24 hours a day. Lansub MQTT acts as an always-on fail-safe controller, instantly executing cutoff commands when temperature, pressure, or current cross critical lines.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/60 text-xs font-bold text-emerald-600 flex items-center gap-1">
                  Zero-Latency Fail-Safe Rules <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-7 flex flex-col justify-between">
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mb-5"
                    aria-hidden="true"
                  >
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Audit Trails & Compliance</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Every threshold breach, alarm trigger, and command execution is permanently logged. Inspect chronological historical records and download clean CSV datasets with a single click.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/60 text-xs font-bold text-violet-600 flex items-center gap-1">
                  Historical Records & CSV Exports <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real-World Use Cases Section (Storytelling) */}
        <section
          id="scenarios"
          aria-labelledby="scenarios-title"
          className="py-16 md:py-24 max-w-7xl mx-auto px-6"
        >
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
              Real-World Applications
            </span>
            <h2
              id="scenarios-title"
              className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mt-3"
            >
              Where is Lansub MQTT Deployed?
            </h2>
            <p className="mt-3 text-base text-slate-500">
              Explore how operations teams protect hardware and streamline telemetry across different sectors.
            </p>
          </div>

          {/* Interactive Scenario Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {scenarios.map((sc) => {
              const Icon = sc.icon;
              const isSelected = activeScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveScenario(sc.id as any)}
                  className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-100"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                  {sc.title}
                </button>
              );
            })}
          </div>

          {/* Active Scenario Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-900/5">
            <div className="max-w-3xl">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                {activeData.badge}
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-4 mb-3">
                {activeData.headline}
              </h3>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                {activeData.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
              {activeData.metrics.map((m, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {m.label}
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className="py-16 md:py-24 bg-white border-t border-slate-200"
        >
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-14">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                Questions & Answers
              </span>
              <h2
                id="faq-title"
                className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mt-3"
              >
                Everything You Need to Know
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  What kind of devices can connect to Lansub MQTT?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Any device or microcontroller that speaks the standard MQTT protocol can stream data into Lansub MQTT. This includes ESP32, ESP8266, Raspberry Pi, Arduino, industrial PLC gateways, and software simulators.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  How does the Automated Fail-Safe Rule Engine work?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  You configure trigger rules directly from the web interface (e.g. <em>"If temperature &gt; 35°C for 2 consecutive minutes, dispatch OFF to control/relay1"</em>). When incoming telemetry violates the condition, Lansub MQTT automatically fires the action to protect your equipment.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  Do I own my data, or is it locked in a third-party cloud?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  You have 100% data ownership. Lansub MQTT runs self-contained on your own server or virtual machine with its own persistent PostgreSQL store and local broker. No proprietary cloud lock-in.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final Call to Action */}
        <section aria-labelledby="cta-heading" className="py-20 bg-blue-600 text-white text-center">
          <div className="max-w-3xl mx-auto px-6">
            <h2 id="cta-heading" className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Ready to Take Control of Your IoT Operations?
            </h2>
            <p className="mt-3.5 text-blue-100 text-sm md:text-base leading-relaxed">
              Experience zero-latency telemetry streaming, speedometer gauges, and autonomous fail-safes.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="px-7 py-3.5 rounded-xl bg-white text-blue-700 font-extrabold text-sm hover:bg-blue-50 transition shadow-lg active:scale-95"
                >
                  Enter Your Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="px-7 py-3.5 rounded-xl bg-white text-blue-700 font-extrabold text-sm hover:bg-blue-50 transition shadow-lg active:scale-95"
                  >
                    Create Free Workspace
                  </Link>
                  <Link
                    href="/login"
                    className="px-7 py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-sm border border-blue-500 transition"
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
          <div className="flex items-center gap-2.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Lansub MQTT Platform v1.0.0 • Operational Intelligence</span>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/dashboard" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <Link href="/topics" className="hover:text-blue-600 transition">
              Topics & Thresholds
            </Link>
            <Link href="/devices" className="hover:text-blue-600 transition">
              Devices
            </Link>
            <Link href="/rules" className="hover:text-blue-600 transition">
              Rules & Alarms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
