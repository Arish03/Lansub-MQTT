"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  Cpu,
  Plus,
  WifiOff,
  CheckCircle,
  XCircle,
  Trash2,
  Server,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const brokerStatuses = useAppStore((state: any) => state.brokerStatuses || {});

  // Form State matching reference screenshot 3
  const [name, setName] = useState("");
  const [protocol, setProtocol] = useState<"mqtt://" | "mqtts://">("mqtt://");
  const [mqttVersion, setMqttVersion] = useState("3.1.1");
  const [host, setHost] = useState("mosquitto");
  const [port, setPort] = useState(1883);
  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDevices = async () => {
    try {
      const data = await api.getBrokers();
      setDevices(data);
    } catch (err) {
      console.error("Failed to load devices/brokers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const tls = protocol === "mqtts://";
      const res = await api.testBroker({
        host,
        port: Number(port),
        username: username || undefined,
        password: password || undefined,
        tls,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to reach device/broker",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleAddDevice = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tls = protocol === "mqtts://";
      await api.createBroker({
        name,
        host,
        port: Number(port),
        username: username || undefined,
        password: password || undefined,
        client_id: clientId || undefined,
        tls,
      });
      // Reset form
      setName("");
      setHost("mosquitto");
      setPort(1883);
      setClientId("");
      setUsername("");
      setPassword("");
      setTestResult(null);
      await loadDevices();
    } catch (err: any) {
      alert(err.message || "Failed to add device");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDevice = async (id: string, devName: string) => {
    if (!confirm(`Are you sure you want to remove device "${devName}"?`)) return;
    try {
      await api.deleteBroker(id);
      await loadDevices();
    } catch (err: any) {
      alert(err.message || "Failed to delete device");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-8 mt-16 max-w-7xl space-y-8">
          <div>
            <div className="flex items-center gap-2.5">
              <Cpu className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Devices
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage your MQTT devices, endpoints, and broker connections.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Existing Devices List */}
              {devices.length === 0 ? (
                /* Empty state matching reference screenshot 3 */
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm max-w-3xl mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <WifiOff className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    No Devices Found
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Add your first MQTT device using the form below.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Registered Devices ({devices.length})
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {devices.map((dev: any) => {
                      const status = brokerStatuses[dev.id] || "connected";
                      const isOnline = status === "connected";

                      return (
                        <div
                          key={dev.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Server className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                  {dev.name}
                                </h3>
                                <p className="text-xs font-mono text-slate-400 truncate max-w-[170px]">
                                  {dev.host}:{dev.port}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isOnline
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {isOnline ? "online" : "offline"}
                            </span>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              {dev.tls ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                  <ShieldCheck className="w-3.5 h-3.5" /> TLS
                                </span>
                              ) : (
                                <span>Plain TCP</span>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteDevice(dev.id, dev.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Device"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Device Form matching reference screenshot 3 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm max-w-3xl mx-auto">
                <div className="flex items-center gap-2 pb-5 border-b border-slate-100 mb-6">
                  <Plus className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Add Device / Broker Connection
                  </h2>
                </div>

                <form onSubmit={handleAddDevice} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ESP32-Floor-1 or Local Mosquitto"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                  </div>

                  {/* Protocol and MQTT Version */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Protocol *
                      </label>
                      <select
                        value={protocol}
                        onChange={(e: any) => setProtocol(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono font-medium"
                      >
                        <option value="mqtt://">mqtt:// (Plain TCP)</option>
                        <option value="mqtts://">mqtts:// (TLS / SSL)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        MQTT Version
                      </label>
                      <select
                        value={mqttVersion}
                        onChange={(e) => setMqttVersion(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono font-medium"
                      >
                        <option value="3.1.1">3.1.1</option>
                        <option value="5.0">5.0</option>
                      </select>
                    </div>
                  </div>

                  {/* Host and Port */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Host *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. broker.example.com or mosquitto"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Port *
                      </label>
                      <input
                        type="number"
                        required
                        value={port}
                        onChange={(e) => setPort(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                      />
                    </div>
                  </div>

                  {/* Client ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Client ID
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank for auto-generated ID"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Optional Auth Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Username (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Device username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Password (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Test Connection Result */}
                  {testResult && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                        testResult.success
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <span className="font-medium">{testResult.message}</span>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between border-t border-slate-100 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing || !host}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Test Connection
                    </button>

                    <button
                      type="submit"
                      disabled={saving || !name || !host}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Add Device
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

