"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Power, CheckCircle, AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react";

interface SwitchWidgetProps {
  key?: any;
  title: string;
  brokerId: string;
  topic: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SwitchWidget({ title, brokerId, topic, onEdit, onDelete }: SwitchWidgetProps) {
  const [isOn, setIsOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const handleToggle = async () => {
    if (!brokerId || !topic) return;
    setLoading(true);
    setStatusMsg(null);
    const nextState = !isOn;
    const payload = nextState ? "ON" : "OFF";

    try {
      await api.publish({
        broker_id: brokerId,
        topic,
        payload,
        qos: 0,
        retain: false,
      });
      setIsOn(nextState);
      setStatusMsg({ text: `Published ${payload}` });
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to publish", error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-slate-100 rounded-lg p-0.5">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white transition-colors"
                  title="Edit Widget"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-white transition-colors"
                  title="Delete Widget"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isOn ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <div className="my-4 flex items-center justify-between">
        <div>
          <span className="text-xl font-bold font-mono text-slate-800">
            {isOn ? "ACTIVE (ON)" : "INACTIVE (OFF)"}
          </span>
          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[180px]" title={topic}>
            {topic}
          </p>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isOn ? "bg-blue-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              isOn ? "translate-x-6" : "translate-x-0"
            }`}
          >
            {loading && <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />}
          </span>
        </button>
      </div>

      {/* Footer status */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
        {statusMsg ? (
          <div className={`flex items-center gap-1 font-medium ${statusMsg.error ? "text-rose-600" : "text-emerald-600"}`}>
            {statusMsg.error ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
            <span>{statusMsg.text}</span>
          </div>
        ) : (
          <span className="text-slate-400">Control Switch</span>
        )}
        <span className="text-[10px] font-mono text-slate-400">QoS 0</span>
      </div>
    </div>
  );
}
