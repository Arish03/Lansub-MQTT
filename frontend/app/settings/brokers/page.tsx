"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Server, Plus, Shield, CheckCircle, XCircle, Trash2, Radio, PlayCircle, Loader2 } from "lucide-react";

export default function BrokersPage() {
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const brokerStatuses = useAppStore((state: any) => state.brokerStatuses);

  // Form State
  const [name, setName] = useState("");
  const [host, setHost] = useState("mosquitto");
  const [port, setPort] = useState(1883);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tls, setTls] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadBrokers = async () => {
    try {
      const data = await api.getBrokers();
      setBrokers(data);
    } catch (err) {
      console.error("Failed to load brokers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrokers();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testBroker({ host, port: Number(port), username, password, tls });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Test connection failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleCreateBroker = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createBroker({
        name,
        host,
        port: Number(port),
        username: username || undefined,
        password: password || undefined,
        tls,
      });
      setShowAddModal(false);
      setName("");
      setPassword("");
      setTestResult(null);
      await loadBrokers();
    } catch (err: any) {
      alert(err.message || "Failed to save broker");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this broker?")) return;
    try {
      await api.deleteBroker(id);
      await loadBrokers();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-8 mt-16 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">MQTT Brokers</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage connections to Mosquitto, EMQX, or HiveMQ Cloud instances.
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddModal(true);
                setTestResult(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Broker
            </button>
          </div>

          {/* Brokers Grid */}
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : brokers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <Server className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No MQTT brokers added yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Connect your first MQTT broker (e.g. local Mosquitto or cloud EMQX) to begin streaming data.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Broker
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {brokers.map((broker: any) => {
                const liveStatus = brokerStatuses[broker.id] || broker.status || "disconnected";
                return (
                  <div
                    key={broker.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">{broker.name}</h3>
                          <p className="text-xs font-mono text-slate-500 mt-0.5">
                            {broker.host}:{broker.port}
                          </p>
                        </div>
                        {/* Live status badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            liveStatus === "connected"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : liveStatus === "connecting"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              liveStatus === "connected"
                                ? "bg-emerald-500"
                                : liveStatus === "connecting"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {liveStatus.toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-5 space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                          <span>TLS Encryption</span>
                          <span className="font-medium text-slate-800">{broker.tls ? "Enabled (SSL)" : "Disabled"}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                          <span>Authentication</span>
                          <span className="font-medium text-slate-800">{broker.username ? broker.username : "None (Anon)"}</span>
                        </div>
                        <div className="flex justify-between py-1.5 text-slate-600">
                          <span>Client ID</span>
                          <span className="font-mono text-slate-800">{broker.client_id || "Auto"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Ready to route</span>
                      <button
                        onClick={() => handleDelete(broker.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Broker"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Broker Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">Add MQTT Broker</h2>
                <p className="text-xs text-slate-500 mt-1">Configure credentials for Mosquitto, EMQX, or HiveMQ Cloud.</p>

                {/* Preset Chips */}
                <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-slate-500">Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setName("Local Mosquitto");
                      setHost("mosquitto");
                      setPort(1883);
                      setTls(false);
                      setUsername("");
                      setPassword("");
                    }}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Local Mosquitto (1883)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName("HiveMQ Cloud");
                      setHost("your-cluster.s1.eu.hivemq.cloud");
                      setPort(8883);
                      setTls(true);
                    }}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    HiveMQ (TLS 8883)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName("Host Machine");
                      setHost("host.docker.internal");
                      setPort(1883);
                      setTls(false);
                    }}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Host PC (1883)
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                      testResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <form onSubmit={handleCreateBroker} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Friendly Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Factory Mosquitto or HiveMQ Cloud"
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Hostname / IP</label>
                        <input
                          type="text"
                          required
                          placeholder="mosquitto or broker.hivemq.com"
                          value={host}
                          onChange={(e: any) => setHost(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Port</label>
                        <input
                          type="number"
                          required
                          value={port}
                          onChange={(e: any) => setPort(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Inside Docker: use <span className="font-mono text-blue-600 font-semibold">mosquitto</span> (port 1883, TLS off). For PC: use <span className="font-mono text-blue-600 font-semibold">host.docker.internal</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Username (opt)</label>
                      <input
                        type="text"
                        placeholder="user"
                        value={username}
                        onChange={(e: any) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Password (opt)</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e: any) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-700">Enable TLS (8883)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={tls}
                      onChange={(e: any) => {
                        setTls(e.target.checked);
                        if (e.target.checked && port === 1883) setPort(8883);
                        if (!e.target.checked && port === 8883) setPort(1883);
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 text-blue-600" />}
                      Test
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm"
                      >
                        {saving ? "Saving..." : "Save Broker"}
                      </button>
                    </div>
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
