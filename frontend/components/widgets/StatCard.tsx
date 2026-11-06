"use client";

import { useAppStore, topicMatches } from "@/lib/store";
import {
  Activity,
  Clock,
  AlertTriangle,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  Droplets,
  Gauge,
  Wifi,
} from "lucide-react";

interface StatCardProps {
  key?: any;
  title: string;
  topic: string;
  unit?: string;
  iconType?: "temp" | "humidity" | "pressure" | "devices" | "generic";
  onEdit?: () => void;
  onDelete?: () => void;
}

export function StatCard({
  title,
  topic,
  unit = "",
  iconType,
  onEdit,
  onDelete,
}: StatCardProps) {
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

  // Helper: deeply extract numeric metric from any payload shape
  function extractMetric(raw: any): any {
    if (raw === null || raw === undefined) return undefined;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const num = Number(raw);
      if (!isNaN(num)) return num;
      try {
        return extractMetric(JSON.parse(raw));
      } catch {
        return undefined;
      }
    }
    if (typeof raw === "object") {
      if ("raw" in raw) {
        const inner = extractMetric(raw.raw);
        if (inner !== undefined) return inner;
      }
      for (const k of [
        "value",
        "temp",
        "temperature",
        "reading",
        "val",
        "data",
        "metric",
        "humidity",
        "pressure",
        "current",
        "voltage",
        "level",
        "speed",
      ]) {
        if (k in raw && raw[k] !== undefined && raw[k] !== null) {
          const v = typeof raw[k] === "number" ? raw[k] : Number(raw[k]);
          if (!isNaN(v)) return v;
        }
      }
      for (const v of Object.values(raw as Record<string, any>)) {
        if (typeof v === "number" && !isNaN(v)) return v;
        if (typeof v === "string" && !isNaN(Number(v))) return Number(v);
      }
    }
    return undefined;
  }

  if (
    topicState?.latestValue !== null &&
    topicState?.latestValue !== undefined &&
    !isNaN(Number(topicState.latestValue))
  ) {
    displayValue = topicState.latestValue;
  } else if (
    topicState?.latestPayload !== undefined &&
    topicState?.latestPayload !== null
  ) {
    const extracted = extractMetric(topicState.latestPayload);
    if (extracted !== undefined) {
      displayValue = extracted;
    } else {
      const p = topicState.latestPayload;
      if (typeof p === "string" && p.length < 60) displayValue = p;
      else if (
        typeof p === "object" &&
        p !== null &&
        "raw" in p &&
        typeof p.raw === "string" &&
        p.raw.length < 60
      )
        displayValue = p.raw;
      else displayValue = "--";
    }
  }

  // Calculate delta trend from ringBuffer
  let deltaText: string | null = null;
  let deltaDirection: "up" | "down" | "flat" | null = null;
  if (
    typeof displayValue === "number" &&
    topicState?.ringBuffer &&
    topicState.ringBuffer.length > 1
  ) {
    const prevEntry =
      topicState.ringBuffer[topicState.ringBuffer.length - 2]?.value;
    if (prevEntry !== null && prevEntry !== undefined && !isNaN(Number(prevEntry))) {
      const diff = Math.round((displayValue - Number(prevEntry)) * 10) / 10;
      if (diff > 0) {
        deltaDirection = "up";
        deltaText = `+${diff} ${unit}`;
      } else if (diff < 0) {
        deltaDirection = "down";
        deltaText = `${diff} ${unit}`;
      } else {
        deltaDirection = "flat";
        deltaText = `0 ${unit}`;
      }
    }
  }

  const formattedTs = topicState?.latestTs
    ? new Date(topicState.latestTs).toLocaleTimeString()
    : "No data yet";

  const alert = topicState?.latestAlert;
  const isAlert = !!alert;

  // Auto-detect icon type and styling
  const lowerTitle = (title + " " + topic).toLowerCase();
  let resolvedIcon = <Activity className="w-4 h-4 text-blue-600" />;
  let iconBg = "bg-blue-50";
  let valueColor = "text-slate-900";

  if (iconType === "temp" || lowerTitle.includes("temp")) {
    resolvedIcon = <Thermometer className="w-4 h-4 text-rose-600" />;
    iconBg = "bg-rose-50";
    valueColor = "text-rose-600";
  } else if (iconType === "humidity" || lowerTitle.includes("humid")) {
    resolvedIcon = <Droplets className="w-4 h-4 text-blue-600" />;
    iconBg = "bg-blue-50";
    valueColor = "text-blue-600";
  } else if (
    iconType === "pressure" ||
    lowerTitle.includes("press") ||
    lowerTitle.includes("bar")
  ) {
    resolvedIcon = <Gauge className="w-4 h-4 text-emerald-600" />;
    iconBg = "bg-emerald-50";
    valueColor = "text-emerald-600";
  } else if (
    iconType === "devices" ||
    lowerTitle.includes("device") ||
    lowerTitle.includes("online")
  ) {
    resolvedIcon = <Wifi className="w-4 h-4 text-indigo-600" />;
    iconBg = "bg-indigo-50";
    valueColor = "text-indigo-600";
  }

  return (
    <div
      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
        isAlert
          ? alert === "high"
            ? "border-rose-300 ring-2 ring-rose-100 bg-rose-50/20"
            : "border-amber-300 ring-2 ring-amber-100 bg-amber-50/20"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isAlert
                ? alert === "high"
                  ? "bg-rose-100 text-rose-600"
                  : "bg-amber-100 text-amber-600"
                : iconBg
            }`}
          >
            {resolvedIcon}
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {title}
            </span>
            <span className="text-[11px] text-slate-400 font-mono truncate max-w-[120px] block" title={topic}>
              {topic}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {deltaText && (
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-semibold font-mono ${
                deltaDirection === "up"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : deltaDirection === "down"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {deltaDirection === "up" && <TrendingUp className="w-3 h-3" />}
              {deltaDirection === "down" && <TrendingDown className="w-3 h-3" />}
              {deltaDirection === "flat" && <Minus className="w-3 h-3" />}
              {deltaText}
            </span>
          )}

          {isAlert && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse ${
                alert === "high"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {alert}
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
                  <Pencil className="w-3 h-3" />
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
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="my-4">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-extrabold tracking-tight font-mono ${valueColor}`}
          >
            {typeof displayValue === "number"
              ? displayValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })
              : displayValue}
          </span>
          {unit && (
            <span className="text-sm font-bold text-slate-500 uppercase">
              {unit}
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{formattedTs}</span>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Live
        </span>
      </div>
    </div>
  );
}
