"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyTopicsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/topics");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}
  const [qos, setQos] = useState(0);
  const [payloadFormat, setPayloadFormat] = useState<"json" | "text" | "number">("json");
  const [valuePath, setValuePath] = useState("");
  const [unit, setUnit] = useState("");
  const [minThreshold, setMinThreshold] = useState("");
  const [maxThreshold, setMaxThreshold] = useState("");
  const [retainDays, setRetainDays] = useState(7);

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
      // Sync WebSocket subscriptions
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

  const handleCreateTopic = async (e: any) => {
    e.preventDefault();
    if (!brokerId) {
      alert("Please select a broker first");
      return;
    }
    setSaving(true);
    try {
      await api.createTopic({
        broker_id: brokerId,
        pattern,
        label: label || undefined,
        qos: Number(qos),
        payload_format: payloadFormat,
        value_path: valuePath || undefined,
        unit: unit || undefined,
        min_threshold: minThreshold ? Number(minThreshold) : undefined,
        max_threshold: maxThreshold ? Number(maxThreshold) : undefined,
        retain_days: Number(retainDays),
      });
      setShowAddModal(false);
      setPattern("");
      setLabel("");
      setValuePath("");
      setUnit("");
      setMinThreshold("");
      setMaxThreshold("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create topic");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this topic subscription?")) return;
    try {
      await api.deleteTopic(id);
      await loadData();
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
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Topic Subscriptions</h1>
              <p className="text-sm text-slate-500 mt-1">
                Configure runtime subscriptions with single (+) or multi-level (#) MQTT wildcards.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={brokers.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Topic
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : brokers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <Info className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Add a broker first</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Before subscribing to topics, you must configure at least one active MQTT broker connection.
              </p>
              <a
                href="/settings/brokers"
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                Go to Brokers
              </a>
            </div>
          ) : topics.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <Radio className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No active subscriptions</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Add your first topic pattern (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">sensor/+/temp</code> or <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">factory/#</code>) to start streaming.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Topic
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Pattern</th>
                    <th className="py-3 px-4">Label</th>
                    <th className="py-3 px-4">Broker</th>
                    <th className="py-3 px-4">Payload Format</th>
                    <th className="py-3 px-4">JSON Path / Unit</th>
                    <th className="py-3 px-4">Retention</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topics.map((t: any) => {
                    const broker = brokers.find((b: any) => b.id === t.broker_id);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-blue-600">
                          {t.pattern}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {t.label || "--"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {broker ? broker.name : "Unknown"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] uppercase">
                            {t.payload_format}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {t.value_path || "--"} {t.unit ? `(${t.unit})` : ""}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {t.retain_days} days
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
          )}

          {/* Add Topic Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">Add Topic Subscription</h2>
                <p className="text-xs text-slate-500 mt-1">Backend dynamically subscribes without server restarts.</p>

                <form onSubmit={handleCreateTopic} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Broker</label>
                    <select
                      value={brokerId}
                      onChange={(e: any) => setBrokerId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                    >
                      {brokers.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.host}:{b.port})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Topic Pattern</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. factory/+/temperature or iot/#"
                      value={pattern}
                      onChange={(e: any) => setPattern(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Friendly Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Factory Temp"
                        value={label}
                        onChange={(e: any) => setLabel(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">QoS</label>
                      <select
                        value={qos}
                        onChange={(e: any) => setQos(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      >
                        <option value={0}>0 - At most once</option>
                        <option value={1}>1 - At least once</option>
                        <option value={2}>2 - Exactly once</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payload Format</label>
                      <select
                        value={payloadFormat}
                        onChange={(e: any) => setPayloadFormat(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      >
                        <option value="json">JSON Object</option>
                        <option value="number">Numeric Float</option>
                        <option value="text">Raw Text String</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Unit</label>
                      <input
                        type="text"
                        placeholder="e.g. °C, PSI, RPM"
                        value={unit}
                        onChange={(e: any) => setUnit(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {payloadFormat === "json" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">JSON Value Path (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. $.temp or $.metrics.speed"
                        value={valuePath}
                        onChange={(e: any) => setValuePath(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Threshold Alert</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 15.0"
                        value={minThreshold}
                        onChange={(e: any) => setMinThreshold(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Max Threshold Alert</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 35.0"
                        value={maxThreshold}
                        onChange={(e: any) => setMaxThreshold(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

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
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm"
                    >
                      {saving ? "Saving..." : "Subscribe Topic"}
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
