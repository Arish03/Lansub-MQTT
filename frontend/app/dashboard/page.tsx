"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/widgets/StatCard";
import { LineChart } from "@/components/widgets/LineChart";
import { MessageTable } from "@/components/widgets/MessageTable";
import { SwitchWidget } from "@/components/widgets/SwitchWidget";
import { GaugeWidget } from "@/components/widgets/GaugeWidget";
import { ButtonWidget } from "@/components/widgets/ButtonWidget";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws-client";
import { Plus, LayoutGrid, Radio, Loader2, Sparkles, Zap, Play, Square, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

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
      const patterns = topicsData.map((t) => t.pattern);
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

    return () => {
      // Keep background alive or clean if unmounting
    };
  }, []);

  const sendTestPacket = async () => {
    if (brokers.length === 0) {
      alert("No MQTT broker connected yet. Go to Brokers page to add one.");
      return;
    }

    setSendingTest(true);
    try {
      const broker = brokers[0];
      let targetTopic = topics[0]?.pattern || "sensor/temperature";
      // If topic is a wildcard like 'test/#', publish to concrete subtopic 'test/sensor1'
      if (targetTopic.endsWith("/#")) {
        targetTopic = targetTopic.replace("/#", "/sensor1");
      } else if (targetTopic.endsWith("/+")) {
        targetTopic = targetTopic.replace("/+", "/sensor1");
      } else if (targetTopic === "#") {
        targetTopic = "sensor/temperature";
      }

      const randomVal = Math.round((20 + Math.random() * 15) * 10) / 10;
      await api.publish({
        broker_id: broker.id,
        topic: targetTopic,
        payload: {
          value: randomVal,
          temp: randomVal,
          status: "normal",
        },
      });

      setTestNotice(`Published ${randomVal} to ${targetTopic}`);
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-8 mt-16 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {dashboard?.name || "Realtime Dashboard"}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                  Live
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Real-time telemetric streams, sparklines, and publication control switches.
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
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-sm disabled:opacity-50"
                title="Publish sample telemetry to your connected broker"
              >
                {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-blue-600" />}
                Send Test Data
              </button>

              <button
                onClick={() => setSimulating(!simulating)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors shadow-sm ${
                  simulating
                    ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
                title="Continuously publish readings every 2 seconds"
              >
                {simulating ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {simulating ? "Stop Simulator" : "Simulate Stream (2s)"}
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Widget
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Widgets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboard?.widgets?.map((w: any) => {
                  if (w.type === "stat") {
                    const topic = topics.find((t: any) => t.id === w.topic_id);
                    return (
                      <StatCard
                        key={w.id}
                        title={w.config?.title || topic?.label || "Metric"}
                        topic={w.config?.topic || topic?.pattern || ""}
                        unit={w.config?.unit || topic?.unit || ""}
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
                      />
                    );
                  }
                  return null;
                })}

                {/* Dynamic widgets when dashboard has no custom saved widgets */}
                {(!dashboard?.widgets || dashboard.widgets.length === 0) && (
                  <>
                    {topics.length > 0 ? (
                      <>
                        {topics.map((t: any) => (
                          <StatCard
                            key={`stat-${t.id}`}
                            title={t.label || t.pattern}
                            topic={t.pattern}
                            unit={t.unit || ""}
                          />
                        ))}
                        <SwitchWidget
                          title="Relay Control"
                          brokerId={brokers[0]?.id || ""}
                          topic="control/relay1"
                        />
                        <LineChart
                          key={`line-${topics[0].id}`}
                          title={`${topics[0].label || topics[0].pattern} (Live)`}
                          topicId={topics[0].id}
                          topic={topics[0].pattern}
                          unit={topics[0].unit || ""}
                        />
                      </>
                    ) : (
                      <>
                        <StatCard
                          title="Sample Telemetry"
                          topic="sensor/temperature"
                          unit="°C"
                        />
                        <SwitchWidget
                          title="Relay Switch 1"
                          brokerId={brokers[0]?.id || ""}
                          topic="control/relay1"
                        />
                        <LineChart
                          title="Temperature Trend"
                          topic="sensor/temperature"
                          unit="°C"
                        />
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Real-time raw table */}
              <div className="grid grid-cols-1 gap-6">
                <MessageTable />
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

                  {/* Telemetry topic selection for stat, line, gauge */}
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

                  {/* Gauge Specific Bounds */}
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

                  {/* Publish controls for switch and button */}
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

                  {/* Button Specific Configs */}
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
        </main>
      </div>
    </div>
  );
}
