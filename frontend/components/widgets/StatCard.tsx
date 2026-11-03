"use client";

import { useAppStore, topicMatches } from "@/lib/store";
import { Activity, Clock, AlertTriangle, Pencil, Trash2 } from "lucide-react";

interface StatCardProps {
  key?: any;
  title: string;
  topic: string;
  unit?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function StatCard({ title, topic, unit = "", onEdit, onDelete }: StatCardProps) {
  const topicState = useAppStore((state: any) => {
    if (state.topicData[topic]) return state.topicData[topic];
    for (const key of Object.keys(state.topicData)) {
      if (topicMatches(topic, key)) {
        return state.topicData[key];
      }
    }
    return null;
  });

  let displayValue: any = "--";
  if (topicState?.latestValue !== null && topicState?.latestValue !== undefined) {
    displayValue = topicState.latestValue;
  } else if (topicState?.latestPayload !== undefined && topicState?.latestPayload !== null) {
    const p = topicState.latestPayload;
    if (typeof p === "number" || typeof p === "string") {
      displayValue = p;
    } else if (typeof p === "object") {
      let parsed = p;
      if (typeof p.raw === "string") {
        try {
          parsed = JSON.parse(p.raw);
        } catch {
          parsed = p.raw;
        }
      }
      if (typeof parsed === "object" && parsed !== null) {
        displayValue =
          parsed.value ??
          parsed.temp ??
          parsed.temperature ??
          parsed.reading ??
          parsed.val ??
          parsed.data ??
          parsed.metric ??
          (p.raw ? p.raw : JSON.stringify(p));
      } else {
        displayValue = parsed;
      }
    }
  }

  const formattedTs = topicState?.latestTs
    ? new Date(topicState.latestTs).toLocaleTimeString()
    : "No data yet";

  const alert = topicState?.latestAlert;
  const isAlert = !!alert;

  return (
    <div className={`bg-white border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between group ${
      isAlert
        ? alert === "high"
          ? "border-rose-300 ring-2 ring-rose-100 bg-rose-50/20"
          : "border-amber-300 ring-2 ring-amber-100 bg-amber-50/20"
        : "border-slate-200 hover:border-slate-300"
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {isAlert && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse ${
              alert === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
            }`}>
              <AlertTriangle className="w-3 h-3" />
              {alert} alert
            </span>
          )}
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
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isAlert
              ? alert === "high" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
              : "bg-blue-50 text-blue-600"
          }`}>
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <div className="my-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono">
            {typeof displayValue === "number" ? displayValue.toLocaleString() : displayValue}
          </span>
          {unit && (
            <span className="text-sm font-semibold text-slate-500 uppercase">
              {unit}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1 font-mono truncate" title={topic}>
          {topic}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{formattedTs}</span>
        </div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
          Live
        </span>
      </div>
    </div>
  );
}
