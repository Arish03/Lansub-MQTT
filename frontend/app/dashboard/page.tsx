"use client";

import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/widgets/StatCard";
import { LineChart } from "@/components/widgets/LineChart";
import { MultiLineChart, SeriesConfig } from "@/components/widgets/MultiLineChart";
import { MessageTable } from "@/components/widgets/MessageTable";
import { SwitchWidget } from "@/components/widgets/SwitchWidget";
import { GaugeWidget } from "@/components/widgets/GaugeWidget";
import { ButtonWidget } from "@/components/widgets/ButtonWidget";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws-client";
import {
  Plus,
  Loader2,
  Zap,
  Play,
  Square,
  CheckCircle,
  Activity,
  SlidersHorizontal,
} from "lucide-react";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWidget, setEditingWidget] = useState<any>(null);

  // Quick test & simulation state
  const [sendingTest, setSendingTest] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  // Widget creation state
  const [widgetType, setWidgetType] = useState<"stat" | "line" | "gauge" | "switch" | "button">("stat");
  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedBrokerId, setSelectedBrokerId] = useState("");
  const [switchTopic, setSwitchTopic] = useState("");
  const [gaugeMin, setGaugeMin] = useState<number>(0);
  const [gaugeMax, setGaugeMax] = useState<number>(100);
  const [gaugeUnit, setGaugeUnit] = useState<string>("°C");
  const [buttonPayload, setButtonPayload] = useState<string>('{"action": "trigger"}');
  const [buttonLabel, setButtonLabel] = useState<string>("Dispatch Action");
  const [buttonVariant, setButtonVariant] = useState<"primary" | "danger" | "emerald">("primary");
  const [savingWidget, setSavingWidget] = useState(false);

  const loadAll = async () => {
    try {
      const [dashData, topicsData, brokersData] = await Promise.all([
        api.getDashboard(),
        api.getTopics(),
        api.getBrokers(),
      ]);
      setDashboard(dashData);
      setTopics(topicsData);
      setBrokers(brokersData);

      if (topicsData.length > 0 && !selectedTopicId) {
        setSelectedTopicId(topicsData[0].id);
      }
      if (brokersData.length > 0 && !selectedBrokerId) {
        setSelectedBrokerId(brokersData[0].id);
      }

      // Subscribe to all topics on WebSocket
      const patterns = topicsData.map((t: any) => t.pattern);
      if (!patterns.includes("sensor/temperature")) patterns.push("sensor/temperature");
      if (!patterns.includes("sensor/humidity")) patterns.push("sensor/humidity");
      if (!patterns.includes("sensor/pressure")) patterns.push("sensor/pressure");
      wsClient.subscribe(patterns);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    wsClient.connect();
  }, []);

  const sendTestPacket = async () => {
    if (brokers.length === 0) {
      alert("No MQTT broker connected yet. Go to Devices / Brokers page to add one.");
      return;
    }

    setSendingTest(true);
    try {
      const broker = brokers[0];
      const randomTemp = Math.round((22 + Math.random() * 12) * 10) / 10;
      const randomHumid = Math.round(40 + Math.random() * 35);
      const randomPress = Math.round((1008 + Math.random() * 12) * 10) / 10;

      // Publish Temperature
      await api.publish({
        broker_id: broker.id,
        topic: "sensor/temperature",
        payload: { value: randomTemp, temp: randomTemp, unit: "°C" },
      });

      // Publish Humidity
      await api.publish({
        broker_id: broker.id,
        topic: "sensor/humidity",
        payload: { value: randomHumid, humidity: randomHumid, unit: "%" },
      });

      // Publish Pressure
      await api.publish({
        broker_id: broker.id,
        topic: "sensor/pressure",
        payload: { value: randomPress, pressure: randomPress, unit: "hPa" },
      });

      setTestNotice(`Published telemetry: ${randomTemp}°C, ${randomHumid}%, ${randomPress} hPa`);
      setTimeout(() => setTestNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to publish test message.");
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (simulating && brokers.length > 0) {
      interval = setInterval(() => {
        sendTestPacket();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [simulating, brokers, topics]);

  // Build multi-line series from topics or default sensor keys
  const multiLineSeries: SeriesConfig[] = useMemo(() => {
    const defaultColors = ["#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];
    if (topics.length > 0) {
      return topics.slice(0, 4).map((t: any, idx: number) => ({
        topic: t.pattern,
        label: `${t.label || t.pattern} (${t.unit || ""})`,
        color: defaultColors[idx % defaultColors.length],
        unit: t.unit || "",
      }));
    }
    return [
      {
        topic: "sensor/humidity",
        label: "Humidity (%)",
        color: "#3b82f6",
        unit: "%",
      },
      {
        topic: "sensor/temperature",
        label: "Temperature (°C)",
        color: "#ef4444",
        unit: "°C",
      },
    ];
  }, [topics]);

  const handleCreateWidget = async (e: any) => {
    e.preventDefault();
    setSavingWidget(true);

    let config: any = {};
    let topicId: string | null = selectedTopicId;

    if (widgetType === "switch") {
      topicId = null;
      config = {
        title: widgetTitle || "Relay Switch",
        broker_id: selectedBrokerId,
        topic: switchTopic || "control/relay1",
      };
    } else if (widgetType === "button") {
      topicId = null;
      config = {
        title: widgetTitle || "Action Button",
        broker_id: selectedBrokerId,
        topic: switchTopic || "control/actions",
        payload: buttonPayload,
        buttonLabel: buttonLabel || "Dispatch Action",
        variant: buttonVariant,
      };
    } else if (widgetType === "gauge") {
      const chosenTopic = topics.find((t: any) => t.id === selectedTopicId);
      config = {
        title: widgetTitle || (chosenTopic ? chosenTopic.label || chosenTopic.pattern : "Metric Gauge"),
        topic: chosenTopic ? chosenTopic.pattern : "unknown",
        unit: gaugeUnit || (chosenTopic ? chosenTopic.unit : ""),
        min: Number(gaugeMin),
        max: Number(gaugeMax),
      };
    } else {
      const chosenTopic = topics.find((t: any) => t.id === selectedTopicId);
      config = {
        title: widgetTitle || (chosenTopic ? chosenTopic.label || chosenTopic.pattern : "Metric"),
        topic: chosenTopic ? chosenTopic.pattern : "unknown",
        unit: chosenTopic ? chosenTopic.unit : "",
      };
    }

    try {
      await api.createWidget({
        type: widgetType,
        topic_id: topicId,
        config,
        position: {},
      });
      setShowAddModal(false);
      setWidgetTitle("");
      setSwitchTopic("");
      await loadAll();
    } catch (err: any) {
      alert(err.message || "Failed to add widget");
    } finally {
      setSavingWidget(false);
    }
  };

  const handleOpenEdit = (w: any) => {
    setEditingWidget(w);
    setWidgetType(w.type || "stat");
    setWidgetTitle(w.config?.title || "");
    if (w.topic_id) {
      setSelectedTopicId(w.topic_id);
    } else if (topics.length > 0) {
      setSelectedTopicId(topics[0].id);
    }
    if (w.config?.broker_id) {
      setSelectedBrokerId(w.config.broker_id);
    } else if (brokers.length > 0) {
      setSelectedBrokerId(brokers[0].id);
    }
    setSwitchTopic(w.config?.topic || "");
    setGaugeMin(w.config?.min !== undefined ? Number(w.config.min) : 0);
    setGaugeMax(w.config?.max !== undefined ? Number(w.config.max) : 100);
    setGaugeUnit(w.config?.unit || "");
    setButtonLabel(w.config?.buttonLabel || "Dispatch Action");
    setButtonPayload(
      typeof w.config?.payload === "object"
        ? JSON.stringify(w.config.payload)
        : w.config?.payload || "TRIGGER"
    );
    setButtonVariant(w.config?.variant || "primary");
    setShowEditModal(true);
  };

  const handleUpdateWidget = async (e: any) => {
    e.preventDefault();
    if (!editingWidget) return;
    setSavingWidget(true);

    let config: any = { ...editingWidget.config };
    let topicId: string | null = selectedTopicId;

    if (widgetType === "switch") {
      topicId = null;
      config = {
        title: widgetTitle || "Relay Switch",
        broker_id: selectedBrokerId,
        topic: switchTopic || "control/relay1",
      };
    } else if (widgetType === "button") {
      topicId = null;
      config = {
        title: widgetTitle || "Action Button",
        broker_id: selectedBrokerId,
        topic: switchTopic || "control/actions",
        payload: buttonPayload,
        buttonLabel: buttonLabel || "Dispatch Action",
        variant: buttonVariant,
      };
    } else if (widgetType === "gauge") {
      const chosenTopic = topics.find((t: any) => t.id === selectedTopicId);
      config = {
        title: widgetTitle || (chosenTopic ? chosenTopic.label || chosenTopic.pattern : "Metric Gauge"),
        topic: chosenTopic ? chosenTopic.pattern : (config.topic || "unknown"),
        unit: gaugeUnit || (chosenTopic ? chosenTopic.unit : ""),
        min: Number(gaugeMin),
        max: Number(gaugeMax),
      };
    } else {
      const chosenTopic = topics.find((t: any) => t.id === selectedTopicId);
      config = {
        title: widgetTitle || (chosenTopic ? chosenTopic.label || chosenTopic.pattern : "Metric"),
        topic: chosenTopic ? chosenTopic.pattern : (config.topic || "unknown"),
        unit: gaugeUnit || (chosenTopic ? chosenTopic.unit : ""),
      };
    }

    try {
      await api.updateWidget(editingWidget.id, {
        type: widgetType,
        topic_id: topicId,
        config,
      });
      setShowEditModal(false);
      setEditingWidget(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || "Failed to update widget");
    } finally {
      setSavingWidget(false);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm("Are you sure you want to remove this widget from your dashboard?")) {
      return;
    }
    try {
      await api.deleteWidget(widgetId);
      if (showEditModal) {
        setShowEditModal(false);
        setEditingWidget(null);
      }
      await loadAll();
    } catch (err: any) {
      alert(err.message || "Failed to delete widget");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-8 mt-16 max-w-7xl space-y-8">
          {/* Main Header matching reference */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {dashboard?.name || "IoT Dashboard"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  Live
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Real-time MQTT sensor monitoring and device telemetrics.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {testNotice && (
                <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-medium flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  {testNotice}
                </span>
              )}

              <button
                onClick={sendTestPacket}
                disabled={sendingTest}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-sm disabled:opacity-50"
                title="Publish sample telemetry to your connected broker"
              >
                {sendingTest ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                )}
                Send Test Data
              </button>

              <button
                onClick={() => setSimulating(!simulating)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors shadow-sm ${
                  simulating
                    ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
                title="Continuously publish readings every 2 seconds"
              >
                {simulating ? (
                  <Square className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {simulating ? "Stop Simulator" : "Simulate Stream (2s)"}
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Widget
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* TOP STAT CARDS ROW (4 cards across) matching reference screenshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  title="Temperature"
                  topic={topics[0]?.pattern || "sensor/temperature"}
                  unit={topics[0]?.unit || "°C"}
                  iconType="temp"
                />
                <StatCard
                  title="Humidity"
                  topic={topics[1]?.pattern || "sensor/humidity"}
                  unit={topics[1]?.unit || "%"}
                  iconType="humidity"
                />
                <StatCard
                  title="Pressure"
                  topic={topics[2]?.pattern || "sensor/pressure"}
                  unit={topics[2]?.unit || "hPa"}
                  iconType="pressure"
                />
                <StatCard
                  title="Devices Online"
                  topic={topics[3]?.pattern || "system/devices"}
                  unit={`/ ${Math.max(1, brokers.length)}`}
                  iconType="devices"
                />
              </div>

              {/* CENTERPIECE ROW: Multi-Line Chart (8 cols) + Side Gauges (4 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 8 columns: Large Multi-Line Realtime Chart */}
                <div className="lg:col-span-8">
                  <MultiLineChart
                    title="Real-time Sensor Data"
                    series={multiLineSeries}
                  />
                </div>

                {/* Right 4 columns: Stacked Gauges with range labels matching reference */}
                <div className="lg:col-span-4 space-y-5">
                  <GaugeWidget
                    title="Temperature"
                    topic={topics[0]?.pattern || "sensor/temperature"}
                    unit="°C"
                    min={0}
                    max={50}
                    warningThreshold={25}
                    dangerThreshold={30}
                  />
                  <GaugeWidget
                    title="Humidity"
                    topic={topics[1]?.pattern || "sensor/humidity"}
                    unit="%"
                    min={0}
                    max={100}
                    warningThreshold={70}
                    dangerThreshold={85}
                  />
                </div>
              </div>

              {/* Custom Widgets Section (if user created any custom widgets via Add Widget) */}
              {dashboard?.widgets && dashboard.widgets.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Custom Widgets & Actuators
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboard.widgets.map((w: any) => {
                      if (w.type === "stat") {
                        const topic = topics.find((t: any) => t.id === w.topic_id);
                        return (
                          <StatCard
                            key={w.id}
                            title={w.config?.title || topic?.label || "Metric"}
                            topic={w.config?.topic || topic?.pattern || ""}
                            unit={w.config?.unit || topic?.unit || ""}
                            onEdit={() => handleOpenEdit(w)}
                            onDelete={() => handleDeleteWidget(w.id)}
                          />
                        );
                      }
                      if (w.type === "line") {
                        const topic = topics.find((t: any) => t.id === w.topic_id);
                        return (
                          <LineChart
                            key={w.id}
                            title={w.config?.title || topic?.label || "Time Series"}
                            topicId={w.topic_id}
                            topic={w.config?.topic || topic?.pattern || ""}
                            unit={w.config?.unit || topic?.unit || ""}
                            onEdit={() => handleOpenEdit(w)}
                            onDelete={() => handleDeleteWidget(w.id)}
                          />
                        );
                      }
                      if (w.type === "gauge") {
                        const topic = topics.find((t: any) => t.id === w.topic_id);
                        return (
                          <GaugeWidget
                            key={w.id}
                            title={w.config?.title || topic?.label || "Gauge Dial"}
                            topic={w.config?.topic || topic?.pattern || ""}
                            unit={w.config?.unit || topic?.unit || ""}
                            min={w.config?.min !== undefined ? Number(w.config.min) : 0}
                            max={w.config?.max !== undefined ? Number(w.config.max) : 100}
                            warningThreshold={w.config?.warningThreshold}
                            dangerThreshold={w.config?.dangerThreshold}
                            onEdit={() => handleOpenEdit(w)}
                            onDelete={() => handleDeleteWidget(w.id)}
                          />
                        );
                      }
                      if (w.type === "button") {
                        return (
                          <ButtonWidget
                            key={w.id}
                            title={w.config?.title || "Action Trigger"}
                            brokerId={w.config?.broker_id || selectedBrokerId}
                            topic={w.config?.topic || "control/actions"}
                            payload={w.config?.payload || "TRIGGER"}
                            buttonLabel={w.config?.buttonLabel || "Dispatch"}
                            variant={w.config?.variant || "primary"}
                            onEdit={() => handleOpenEdit(w)}
                            onDelete={() => handleDeleteWidget(w.id)}
                          />
                        );
                      }
                      if (w.type === "switch") {
                        return (
                          <SwitchWidget
                            key={w.id}
                            title={w.config?.title || "Relay Control"}
                            brokerId={w.config?.broker_id || selectedBrokerId}
                            topic={w.config?.topic || "cmd/switch"}
                            onEdit={() => handleOpenEdit(w)}
                            onDelete={() => handleDeleteWidget(w.id)}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* RECENT DEVICE ACTIVITY TABLE matching reference screenshot */}
              <div>
                <MessageTable
                  title="Recent Device Activity"
                  subtitle="Chronological stream of sensor readings, packets, and online events"
                  maxHeight="h-96"
                  showStatusPill={true}
                />
              </div>
            </div>
          )}

          {/* Add Widget Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">Add Dashboard Widget</h2>
                <p className="text-xs text-slate-500 mt-1">Bind telemetry metrics or interactive switch controls.</p>

                <form onSubmit={handleCreateWidget} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Widget Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: "stat", label: "Stat Card" },
                        { type: "line", label: "Line Chart" },
                        { type: "gauge", label: "Gauge Dial" },
                        { type: "switch", label: "Switch (Relay)" },
                        { type: "button", label: "Button (Action)" },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setWidgetType(item.type as any)}
                          className={`py-2 px-2 text-xs font-medium rounded-xl border transition-colors ${
                            widgetType === item.type
                              ? "bg-blue-50 border-blue-600 text-blue-700 font-semibold"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Widget Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tank Pressure or Emergency Stop"
                      value={widgetTitle}
                      onChange={(e: any) => setWidgetTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {["stat", "line", "gauge"].includes(widgetType) && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Data Topic</label>
                      {topics.length === 0 ? (
                        <p className="text-xs text-rose-500">No topics available. Add one in Topics first.</p>
                      ) : (
                        <select
                          value={selectedTopicId}
                          onChange={(e: any) => setSelectedTopicId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        >
                          {topics.map((t: any) => (
                            <option key={t.id} value={t.id}>
                              {t.pattern} {t.label ? `(${t.label})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {widgetType === "gauge" && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Min Value</label>
                        <input
                          type="number"
                          value={gaugeMin}
                          onChange={(e: any) => setGaugeMin(Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Max Value</label>
                        <input
                          type="number"
                          value={gaugeMax}
                          onChange={(e: any) => setGaugeMax(Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit</label>
                        <input
                          type="text"
                          value={gaugeUnit}
                          onChange={(e: any) => setGaugeUnit(e.target.value)}
                          placeholder="e.g. °C, bar"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {["switch", "button"].includes(widgetType) && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Broker</label>
                        <select
                          value={selectedBrokerId}
                          onChange={(e: any) => setSelectedBrokerId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        >
                          {brokers.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.host})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Publish Topic</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. control/relay1 or control/reboot"
                          value={switchTopic}
                          onChange={(e: any) => setSwitchTopic(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </>
                  )}

                  {widgetType === "button" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Button Label</label>
                        <input
                          type="text"
                          value={buttonLabel}
                          onChange={(e: any) => setButtonLabel(e.target.value)}
                          placeholder="e.g. Reboot Machine"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payload (JSON or string)</label>
                        <input
                          type="text"
                          value={buttonPayload}
                          onChange={(e: any) => setButtonPayload(e.target.value)}
                          placeholder='e.g. {"cmd": "restart"}'
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Style Variant</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["primary", "danger", "emerald"] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setButtonVariant(v)}
                              className={`py-1.5 px-2 text-xs rounded-lg border capitalize font-medium ${
                                buttonVariant === v
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingWidget}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm"
                    >
                      {savingWidget ? "Adding..." : "Add to Dashboard"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Widget Modal */}
          {showEditModal && editingWidget && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Edit Dashboard Widget</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Modify telemetry topic, bounds, or control settings.</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingWidget(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleUpdateWidget} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Widget Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: "stat", label: "Stat Card" },
                        { type: "line", label: "Line Chart" },
                        { type: "gauge", label: "Gauge Dial" },
                        { type: "switch", label: "Switch (Relay)" },
                        { type: "button", label: "Button (Action)" },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setWidgetType(item.type as any)}
                          className={`py-2 px-2 text-xs font-medium rounded-xl border transition-colors ${
                            widgetType === item.type
                              ? "bg-blue-50 border-blue-600 text-blue-700 font-semibold"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Widget Title</label>
                    <input
                      type="text"
                      required
                      value={widgetTitle}
                      onChange={(e: any) => setWidgetTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {["stat", "line", "gauge"].includes(widgetType) && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Data Topic</label>
                      <select
                        value={selectedTopicId}
                        onChange={(e: any) => setSelectedTopicId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      >
                        {topics.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.pattern} {t.label ? `(${t.label})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {widgetType === "gauge" && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Min Value</label>
                        <input
                          type="number"
                          value={gaugeMin}
                          onChange={(e: any) => setGaugeMin(Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Max Value</label>
                        <input
                          type="number"
                          value={gaugeMax}
                          onChange={(e: any) => setGaugeMax(Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit</label>
                        <input
                          type="text"
                          value={gaugeUnit}
                          onChange={(e: any) => setGaugeUnit(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {["switch", "button"].includes(widgetType) && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Broker</label>
                        <select
                          value={selectedBrokerId}
                          onChange={(e: any) => setSelectedBrokerId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        >
                          {brokers.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.host})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Publish Topic</label>
                        <input
                          type="text"
                          required
                          value={switchTopic}
                          onChange={(e: any) => setSwitchTopic(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </>
                  )}

                  {widgetType === "button" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Button Label</label>
                        <input
                          type="text"
                          value={buttonLabel}
                          onChange={(e: any) => setButtonLabel(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payload</label>
                        <input
                          type="text"
                          value={buttonPayload}
                          onChange={(e: any) => setButtonPayload(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingWidget(null);
                      }}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingWidget}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm"
                    >
                      {savingWidget ? "Saving..." : "Save Changes"}
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
