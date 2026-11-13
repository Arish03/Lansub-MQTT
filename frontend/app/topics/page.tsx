"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws-client";
import { useAppStore, topicMatches } from "@/lib/store";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Tag,
  Database,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  ArrowUpDown,
  Search,
} from "lucide-react";

export default function TopicsAndThresholdsPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Form State
  const [brokerId, setBrokerId] = useState("");
  const [pattern, setPattern] = useState("");
  const [label, setLabel] = useState("");
  const [qos, setQos] = useState(0);
  const [payloadFormat, setPayloadFormat] = useState<"json" | "text" | "number">("json");
  const [valuePath, setValuePath] = useState("$.value");
  const [unit, setUnit] = useState("°C");
  const [minThreshold, setMinThreshold] = useState("");
  const [maxThreshold, setMaxThreshold] = useState("");
  const [retainDays, setRetainDays] = useState(7);

  const topicData = useAppStore((state: any) => state.topicData || {});

  const loadData = async () => {
    try {
      const [topicsData, brokersData] = await Promise.all([
        api.getTopics(),
        api.getBrokers(),
      ]);
      setTopics(topicsData);
      setBrokers(brokersData);
      if (brokersData.length > 0 && !brokerId) {
        setBrokerId(brokersData[0].id);
      }
      const patterns = topicsData.map((t) => t.pattern);
      wsClient.subscribe(patterns);
    } catch (err) {
      console.error("Failed to load topics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    wsClient.connect();
  }, []);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerId) {
      alert("Please select a broker first");
      return;
    }
    if (!pattern.trim()) {
      alert("Topic pattern is required");
      return;
    }

    setSaving(true);
    try {
      await api.createTopic({
        broker_id: brokerId,
        pattern: pattern.trim(),
        label: label.trim() || undefined,
        qos: Number(qos),
        payload_format: payloadFormat,
        value_path: valuePath.trim() || undefined,
        unit: unit.trim() || undefined,
        min_threshold: minThreshold ? Number(minThreshold) : undefined,
        max_threshold: maxThreshold ? Number(maxThreshold) : undefined,
        retain_days: Number(retainDays),
        enabled: true,
      });

      setShowAddModal(false);
      setPattern("");
      setLabel("");
      setValuePath("$.value");
      setUnit("°C");
      setMinThreshold("");
      setMaxThreshold("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create topic subscription");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove topic "${name}"?`)) return;
    try {
      await api.deleteTopic(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete topic");
    }
  };

  // Resolve live value for a topic pattern from Zustand store
  const getLiveValue = (topicPattern: string) => {
    if (topicData[topicPattern]?.latestValue !== undefined) {
      return topicData[topicPattern].latestValue;
    }
    for (const key of Object.keys(topicData)) {
      if (topicMatches(topicPattern, key)) {
        return topicData[key]?.latestValue;
      }
    }
    return null;
  };

  const filteredTopics = topics.filter((t) => {
    const q = searchFilter.toLowerCase();
    return (
      t.pattern?.toLowerCase().includes(q) ||
      t.label?.toLowerCase().includes(q) ||
      t.unit?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <SlidersHorizontal className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Topics & Thresholds
                </h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Configure MQTT topic subscriptions, extraction rules, and safe operating bounds.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-all shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Topic Pattern
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                {topics.length}
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Total Topics</div>
                <div className="text-sm font-bold text-slate-700">Subscribed & Monitored</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                {topics.filter((t) => t.min_threshold !== null || t.max_threshold !== null).length}
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Threshold Alarms</div>
                <div className="text-sm font-bold text-slate-700">Active Warning Limits</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                {brokers.length}
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Connected Brokers</div>
                <div className="text-sm font-bold text-slate-700">Ingestion Sockets</div>
              </div>
            </div>
          </div>

          {/* Search Filter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search topics by pattern, label, or unit..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-sm outline-none placeholder:text-slate-400 bg-transparent"
            />
          </div>

          {/* Topics Table */}
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-medium">Loading subscribed topics...</p>
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">No Topics Found</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                Add an MQTT topic pattern (e.g. <code className="text-blue-600 font-mono">sensor/temperature</code>) to start streaming and alarming.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add First Topic
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Topic Pattern</th>
                      <th className="px-6 py-4">Broker</th>
                      <th className="px-6 py-4">Format / Path</th>
                      <th className="px-6 py-4">Safe Thresholds</th>
                      <th className="px-6 py-4">Live Reading</th>
                      <th className="px-6 py-4">Retention</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTopics.map((topic) => {
                      const broker = brokers.find((b) => b.id === topic.broker_id);
                      const liveVal = getLiveValue(topic.pattern);
                      const hasAlert =
                        liveVal !== null &&
                        ((topic.max_threshold !== null && liveVal > topic.max_threshold) ||
                          (topic.min_threshold !== null && liveVal < topic.min_threshold));

                      return (
                        <tr key={topic.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-mono font-semibold text-slate-900 text-sm">
                              {topic.pattern}
                            </div>
                            {topic.label && (
                              <div className="text-xs text-slate-400 mt-0.5">{topic.label}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {broker?.name || "Local Broker"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-medium text-slate-700 uppercase">
                              {topic.payload_format}
                            </div>
                            {topic.value_path && (
                              <div className="text-[11px] font-mono text-slate-400 truncate max-w-[130px]" title={topic.value_path}>
                                {topic.value_path}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {topic.min_threshold !== null || topic.max_threshold !== null ? (
                              <div className="space-y-0.5 text-xs font-mono">
                                {topic.min_threshold !== null && (
                                  <div className="text-slate-500">
                                    Min: <span className="font-semibold text-slate-800">{topic.min_threshold} {topic.unit}</span>
                                  </div>
                                )}
                                {topic.max_threshold !== null && (
                                  <div className="text-slate-500">
                                    Max: <span className="font-semibold text-rose-600">{topic.max_threshold} {topic.unit}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No limits set</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {liveVal !== null ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-mono font-bold text-sm ${
                                    hasAlert ? "text-rose-600" : "text-emerald-600"
                                  }`}
                                >
                                  {typeof liveVal === "number" ? liveVal.toFixed(1) : String(liveVal)} {topic.unit || ""}
                                </span>
                                {hasAlert ? (
                                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-mono text-slate-400">Waiting...</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                            {topic.retain_days} days
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDelete(topic.id, topic.pattern)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Topic"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Topic Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Add Topic & Threshold</h2>
                      <p className="text-xs text-slate-400">Subscribe to MQTT stream and configure limits</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateTopic} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Broker Sockets
                    </label>
                    <select
                      value={brokerId}
                      onChange={(e) => setBrokerId(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 bg-white"
                      required
                    >
                      {brokers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.host}:{b.port})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      MQTT Topic Pattern *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. sensor/temperature or factory/#"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                        Display Label
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Boiler Temp"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. °C, %, bar, kW"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                        Payload Format
                      </label>
                      <select
                        value={payloadFormat}
                        onChange={(e: any) => setPayloadFormat(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="json">JSON Object</option>
                        <option value="number">Raw Number</option>
                        <option value="text">Plain Text</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                        Value Path (JSON)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. $.value or $.temp"
                        value={valuePath}
                        onChange={(e) => setValuePath(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wide">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Safe Operating Thresholds (Alarms)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Min Alert (Low)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 15.0"
                          value={minThreshold}
                          onChange={(e) => setMinThreshold(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-amber-500 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Max Alert (High Danger)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 35.0"
                          value={maxThreshold}
                          onChange={(e) => setMaxThreshold(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save & Subscribe
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

