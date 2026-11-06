"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { api } from "@/lib/api";
import { useToastStore } from "@/lib/toast-store";
import {
  ShieldAlert,
  Plus,
  Play,
  Pause,
  Trash2,
  Pencil,
  Clock,
  Zap,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Bell,
  Activity,
} from "lucide-react";

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [conditionTopic, setConditionTopic] = useState("");
  const [operator, setOperator] = useState<">" | "<" | ">=" | "<=" | "==" | "!=">(">");
  const [thresholdValue, setThresholdValue] = useState<number>(35.0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [actionType, setActionType] = useState<"both" | "publish_mqtt" | "notify_only">("both");
  const [targetBrokerId, setTargetBrokerId] = useState("");
  const [targetTopic, setTargetTopic] = useState("control/relay1");
  const [targetPayload, setTargetPayload] = useState("OFF");
  const [severity, setSeverity] = useState<"danger" | "warning" | "info">("danger");
  const [enableToast, setEnableToast] = useState(true);
  const [enableBrowserPush, setEnableBrowserPush] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);

  const addToast = useToastStore((state) => state.addToast);

  const loadData = async () => {
    try {
      const [rulesData, logsData, topicsData, brokersData] = await Promise.all([
        api.getRules(),
        api.getRuleLogs(50),
        api.getTopics(),
        api.getBrokers(),
      ]);
      setRules(rulesData);
      setLogs(logsData);
      setTopics(topicsData);
      setBrokers(brokersData);

      if (topicsData.length > 0 && !conditionTopic) {
        setConditionTopic(topicsData[0].pattern);
      }
      if (brokersData.length > 0 && !targetBrokerId) {
        setTargetBrokerId(brokersData[0].id);
      }
    } catch (err) {
      console.error("Failed to load rules data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setName("");
    setConditionTopic(topics[0]?.pattern || "sensor/temperature");
    setOperator(">");
    setThresholdValue(35.0);
    setDurationSeconds(0);
    setActionType("both");
    setTargetBrokerId(brokers[0]?.id || "");
    setTargetTopic("control/relay1");
    setTargetPayload("OFF");
    setSeverity("danger");
    setEnableToast(true);
    setEnableBrowserPush(true);
    setCooldownSeconds(60);
    setShowAddModal(true);
  };

  const handleOpenEdit = (rule: any) => {
    setEditingRule(rule);
    setName(rule.name);
    setConditionTopic(rule.condition_topic);
    setOperator(rule.operator);
    setThresholdValue(Number(rule.threshold_value));
    setDurationSeconds(Number(rule.duration_seconds || 0));
    setActionType(rule.action_type || "both");
    setTargetBrokerId(rule.target_broker_id || brokers[0]?.id || "");
    setTargetTopic(rule.target_topic || "control/relay1");
    setTargetPayload(rule.target_payload || "OFF");
    setSeverity(rule.severity || "danger");
    setEnableToast(rule.enable_toast !== false);
    setEnableBrowserPush(rule.enable_browser_push !== false);
    setCooldownSeconds(Number(rule.cooldown_seconds || 60));
    setShowAddModal(true);
  };

  const handleSaveRule = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        condition_topic: conditionTopic,
        operator,
        threshold_value: Number(thresholdValue),
        duration_seconds: Number(durationSeconds),
        action_type: actionType,
        target_broker_id: targetBrokerId || undefined,
        target_topic: targetTopic,
        target_payload: targetPayload,
        severity,
        enable_toast: enableToast,
        enable_browser_push: enableBrowserPush,
        cooldown_seconds: Number(cooldownSeconds),
      };

      if (editingRule) {
        await api.updateRule(editingRule.id, payload);
        addToast({
          title: "Rule Updated",
          message: `Rule "${name}" was updated successfully.`,
          type: "success",
        });
      } else {
        await api.createRule(payload);
        addToast({
          title: "Rule Created",
          message: `New rule "${name}" was successfully registered.`,
          type: "success",
        });
      }

      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ruleId: string, currentEnabled: boolean) => {
    try {
      await api.toggleRule(ruleId);
      setRules((prev: any[]) =>
        prev.map((r: any) => (r.id === ruleId ? { ...r, enabled: !currentEnabled } : r))
      );
    } catch (err: any) {
      alert(err.message || "Failed to toggle rule");
    }
  };

  const handleDelete = async (ruleId: string, ruleName: string) => {
    if (!confirm(`Are you sure you want to delete rule "${ruleName}"?`)) return;
    try {
      await api.deleteRule(ruleId);
      await loadData();
      addToast({
        title: "Rule Deleted",
        message: `Rule "${ruleName}" was removed.`,
        type: "info",
      });
    } catch (err: any) {
      alert(err.message || "Failed to delete rule");
    }
  };

  const handleRequestPush = async () => {
    if ("Notification" in window) {
      const res = await Notification.requestPermission();
      if (res === "granted") {
        addToast({
          title: "Desktop Push Enabled",
          message: "You will now receive desktop notifications for critical alarms.",
          type: "success",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-8 mt-16 max-w-7xl space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Rules & Alarms
                </h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Configure automated fail-safes, threshold triggers, and direct actuator cutoffs.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRequestPush}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm"
              >
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                Enable Desktop Push
              </button>

              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Automation Rule
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Rules List */}
              {rules.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">No Automation Rules Configured</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Create your first rule to automatically dispatch commands (e.g. cut off relay when temperature exceeds safe threshold).
                  </p>
                  <button
                    onClick={handleOpenAdd}
                    className="mt-5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                  >
                    + Create First Rule
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {rules.map((rule: any) => {
                    const isDanger = rule.severity === "danger";
                    return (
                      <div
                        key={rule.id}
                        className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                          !rule.enabled ? "opacity-60 bg-slate-50/50" : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  rule.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                                }`}
                              />
                              <h3 className="text-base font-bold text-slate-900">{rule.name}</h3>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                isDanger
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {rule.severity}
                            </span>
                          </div>

                          {/* Condition and Action Callouts */}
                          <div className="mt-4 space-y-2.5 font-mono text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                              <span className="text-slate-500 text-[11px] font-sans font-semibold uppercase">
                                Condition:
                              </span>
                              <span className="font-bold text-slate-800">
                                {rule.condition_topic} {rule.operator} {rule.threshold_value}
                                {rule.duration_seconds > 0 ? ` (${rule.duration_seconds}s sustained)` : " (immediate)"}
                              </span>
                            </div>

                            {rule.action_type !== "notify_only" && (
                              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                                <span className="text-blue-600 text-[11px] font-sans font-semibold uppercase flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-blue-600" /> Fail-Safe Action:
                                </span>
                                <span className="font-bold text-blue-900">
                                  Publish &quot;{rule.target_payload}&quot; → {rule.target_topic}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {rule.last_triggered_at
                                ? `Last fired: ${new Date(rule.last_triggered_at).toLocaleTimeString()}`
                                : "Never triggered"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggle(rule.id, rule.enabled)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                rule.enabled
                                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                              }`}
                            >
                              {rule.enabled ? "Disable" : "Enable"}
                            </button>

                            <button
                              onClick={() => handleOpenEdit(rule)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                              title="Edit Rule"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(rule.id, rule.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Execution Logs Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recent Rule Executions & Alarms</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Audit log of automated actions taken by the rule engine
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-600">
                    {logs.length} logged events
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      No rule triggers recorded yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold sticky top-0 bg-white">
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Rule Name</th>
                          <th className="py-2.5 px-3">Trigger Reading</th>
                          <th className="py-2.5 px-3">Action Dispatched</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {logs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                              {new Date(log.triggered_at).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {log.rule_name}
                            </td>
                            <td className="py-2.5 px-3 font-extrabold text-rose-600">
                              {log.trigger_value}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                                <Zap className="w-3 h-3" /> {log.action_taken}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add / Edit Rule Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-7 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingRule ? "Edit Automation Rule" : "Create Automation Rule"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Define threshold triggers and automated fail-safe actions.
                </p>

                <form onSubmit={handleSaveRule} className="mt-5 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Rule Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Overheat Emergency Cutoff"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Condition Topic + Operator + Value */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Condition Topic *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. sensor/temperature"
                      value={conditionTopic}
                      onChange={(e) => setConditionTopic(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Operator *
                      </label>
                      <select
                        value={operator}
                        onChange={(e: any) => setOperator(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value=">">&gt; Greater Than</option>
                        <option value="<">&lt; Less Than</option>
                        <option value=">=">&gt;= Greater or Equal</option>
                        <option value="<=">&lt;= Less or Equal</option>
                        <option value="==">== Equal</option>
                        <option value="!=">!= Not Equal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Threshold Reading *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={thresholdValue}
                        onChange={(e) => setThresholdValue(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Sustained Duration */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Sustained Duration (Seconds)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(Number(e.target.value))}
                      placeholder="0 for immediate, 120 for 2 min"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      0 = trigger immediately. 120 = trigger only if condition persists for 2 consecutive minutes.
                    </p>
                  </div>

                  {/* Action Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Action Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: "both", label: "Publish + Notify" },
                        { type: "publish_mqtt", label: "Publish Only" },
                        { type: "notify_only", label: "Notify Only" },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setActionType(item.type as any)}
                          className={`py-2 px-2 text-xs font-medium rounded-xl border transition-colors ${
                            actionType === item.type
                              ? "bg-blue-50 border-blue-600 text-blue-700 font-bold"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* MQTT Target Payload & Topic if publishing */}
                  {actionType !== "notify_only" && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Actuator Fail-Safe Destination
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Publish Topic
                        </label>
                        <input
                          type="text"
                          required
                          value={targetTopic}
                          onChange={(e) => setTargetTopic(e.target.value)}
                          placeholder="e.g. control/relay1"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Payload Command
                        </label>
                        <input
                          type="text"
                          required
                          value={targetPayload}
                          onChange={(e) => setTargetPayload(e.target.value)}
                          placeholder="e.g. OFF or 0"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Severity & Cooldown */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Alarm Severity
                      </label>
                      <select
                        value={severity}
                        onChange={(e: any) => setSeverity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="danger">Critical (Red)</option>
                        <option value="warning">Warning (Amber)</option>
                        <option value="info">Info (Blue)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Cooldown (Seconds)
                      </label>
                      <input
                        type="number"
                        min={5}
                        value={cooldownSeconds}
                        onChange={(e) => setCooldownSeconds(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold"
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
                      className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {editingRule ? "Save Changes" : "Create Rule"}
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

