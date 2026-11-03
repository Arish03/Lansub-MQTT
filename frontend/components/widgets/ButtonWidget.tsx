"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Play, CheckCircle2, AlertCircle, Loader2, Zap } from "lucide-react";

interface ButtonWidgetProps {
  key?: any;
  title: string;
  brokerId: string;
  topic: string;
  payload?: any;
  buttonLabel?: string;
  variant?: "primary" | "danger" | "emerald";
}

export function ButtonWidget({
  title,
  brokerId,
  topic,
  payload = "TRIGGER",
  buttonLabel = "Dispatch Action",
  variant = "primary",
}: ButtonWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  const handleTrigger = async () => {
    if (!brokerId || !topic) {
      setFeedback({ text: "Missing broker or topic", error: true });
      return;
    }

    setLoading(true);
    setFeedback(null);

    let parsedPayload = payload;
    if (typeof payload === "string") {
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        parsedPayload = payload;
      }
    }

    try {
      await api.publish({
        broker_id: brokerId,
        topic,
        payload: parsedPayload,
        qos: 0,
        retain: false,
      });
      setFeedback({ text: "Command Dispatched!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ text: err.message || "Action Failed", error: true });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case "danger":
        return "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20";
      case "emerald":
        return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20";
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20";
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Action Area */}
      <div className="my-5 flex flex-col items-center gap-3">
        <button
          onClick={handleTrigger}
          disabled={loading}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${getButtonStyles()} disabled:opacity-50`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{loading ? "Publishing..." : buttonLabel}</span>
        </button>

        {feedback && (
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${
              feedback.error ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {feedback.error ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Target Topic Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Target:</span>
        <span className="font-mono text-slate-600 font-medium truncate max-w-[160px]" title={topic}>
          {topic}
        </span>
      </div>
    </div>
  );
}

