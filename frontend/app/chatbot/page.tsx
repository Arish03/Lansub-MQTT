"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  Bot,
  Sparkles,
  Send,
  Zap,
  Cpu,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lightbulb,
  Bell,
  ArrowRight,
} from "lucide-react";

export default function ChatbotPage() {
  const [inputMsg, setInputMsg] = useState("");
  const [chatLog, setChatLog] = useState([
    {
      role: "assistant",
      text: "Hello! I am your Lansub AI Copilot. I analyze real-time MQTT telemetry, diagnose hardware anomalies, and help build automated fail-safes. How can I assist your fleet today?",
      time: "Just now",
    },
  ]);
  const [emailNotify, setEmailNotify] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const samplePrompts = [
    "What caused the temperature spike on ESP32-001 at 3:42 PM?",
    "Generate a fail-safe rule to cut off relay 1 if humidity > 75%",
    "Summarize daily power consumption across Factory Bay 2",
    "Which sensors have not reported a heartbeat in the past hour?",
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setInputMsg("");

    setChatLog((prev) => [
      ...prev,
      { role: "user", text: userText, time: "Just now" },
      {
        role: "assistant",
        text: `[Preview Teaser] AI Copilot is currently in active development. When released, this query will execute live against your PostgreSQL telemetry store (${userText}) and correlate MQTT packets with your rule engine!`,
        time: "Just now",
      },
    ]);
  };

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
          {/* Coming Soon Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white p-8 md:p-10 shadow-xl shadow-blue-500/10 mb-8">
            <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase mb-4 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                Coming Soon • AI Copilot Beta
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                Conversational AI for Your IoT Fleet
              </h1>
              <p className="text-blue-100 text-sm md:text-base mt-2.5 leading-relaxed">
                Interact with your sensors in natural language. Diagnose anomalies, ask for historical trends, and synthesize automated fail-safe rules in seconds using built-in LLM intelligence.
              </p>

              {/* Notify form */}
              <div className="mt-6 max-w-md">
                {subscribed ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    You're on the early access list! We'll notify you on launch.
                  </div>
                ) : (
                  <form onSubmit={handleNotify} className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter your email for early access..."
                      value={emailNotify}
                      onChange={(e) => setEmailNotify(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 text-sm outline-none focus:bg-white/20 transition"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition shadow-sm shrink-0"
                    >
                      Notify Me
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Interactive Mock Chat Window */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Lansub Telemetry Copilot</h2>
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Interactive Demo Preview
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Sandbox Mode
                </span>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
                {chatLog.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-none shadow-sm"
                          : "bg-slate-100 text-slate-800 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Sample prompt pills */}
              <div className="pt-2 pb-3 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
                <span className="text-slate-400 shrink-0 font-medium">Try:</span>
                {samplePrompts.slice(0, 2).map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInputMsg(p)}
                    className="truncate max-w-[240px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Input form */}
              <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Ask anything about your sensors, brokers, or alarms..."
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-slate-50/50"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Feature Capabilities Sidebar */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Upcoming Capabilities
                </h3>

                <ul className="space-y-3.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Root-Cause Analysis</strong>
                      Correlate machine power drops, temperature spikes, and operator relay toggles automatically.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">NL Rule Synthesizer</strong>
                      "Shut off pump if pressure exceeds 4 bar" auto-generates fail-safe rules in your database.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Cpu className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">Predictive Maintenance</strong>
                      Early warning flags when vibration or thermal patterns deviate from baseline normal.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 shadow-sm border border-slate-800">
                <div className="text-xs font-semibold uppercase text-blue-400 tracking-wider mb-1">
                  Architecture Roadmap
                </div>
                <div className="text-sm font-bold text-white mb-2">Powered by Google Gemini</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Lansub Copilot integrates with FastAPI, accessing real-time message ring buffers and PostgreSQL time-series embeddings for sub-second responses.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
