"use client";

import { useMemo } from "react";
import { useAppStore, topicMatches } from "@/lib/store";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";

interface GaugeWidgetProps {
  key?: any;
  title: string;
  topic: string;
  unit?: string;
  min?: number;
  max?: number;
  warningThreshold?: number;
  dangerThreshold?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GaugeWidget({
  title,
  topic,
  unit = "",
  min = 0,
  max = 100,
  warningThreshold,
  dangerThreshold,
  onEdit,
  onDelete,
}: GaugeWidgetProps) {
  const topicState = useAppStore((state: any) => {
    if (state.topicData[topic]) return state.topicData[topic];
    for (const key of Object.keys(state.topicData)) {
      if (topicMatches(topic, key)) {
        return state.topicData[key];
      }
    }
    return null;
  });

  const rawValue = useMemo(() => {
    if (
      topicState?.latestValue !== null &&
      topicState?.latestValue !== undefined &&
      !isNaN(Number(topicState.latestValue))
    ) {
      return Number(topicState.latestValue);
    }
    const p = topicState?.latestPayload;
    if (p === null || p === undefined) return null;

    // Recursive deep extractor handling double-encoded raw payloads
    function deepExtract(raw: any): number | null {
      if (raw === null || raw === undefined) return null;
      if (typeof raw === "number" && !isNaN(raw)) return raw;
      if (typeof raw === "string") {
        const n = Number(raw);
        if (!isNaN(n)) return n;
        try {
          return deepExtract(JSON.parse(raw));
        } catch {
          return null;
        }
      }
      if (typeof raw === "object") {
        if ("raw" in raw) {
          const r = deepExtract(raw.raw);
          if (r !== null) return r;
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
          if (k in raw && raw[k] !== null && raw[k] !== undefined) {
            const v = typeof raw[k] === "number" ? raw[k] : Number(raw[k]);
            if (!isNaN(v)) return v;
          }
        }
        for (const v of Object.values(raw as Record<string, any>)) {
          if (typeof v === "number" && !isNaN(v)) return v;
          if (typeof v === "string" && !isNaN(Number(v))) return Number(v);
        }
      }
      return null;
    }

    return deepExtract(p);
  }, [topicState]);

  const hasValue = rawValue !== null && rawValue !== undefined;
  const currentVal = hasValue ? Number(rawValue) : min;

  // Compute percentage clamped between 0 and 1
  const span = max - min || 1;
  const clampedVal = Math.min(Math.max(currentVal, min), max);
  const percentage = (clampedVal - min) / span;

  // Thresholds calculation
  const warnLimit =
    warningThreshold !== undefined
      ? warningThreshold
      : Math.round((min + span * 0.75) * 10) / 10;
  const dangerLimit =
    dangerThreshold !== undefined
      ? dangerThreshold
      : Math.round((min + span * 0.9) * 10) / 10;

  const isDanger = currentVal >= dangerLimit;
  const isWarning = !isDanger && currentVal >= warnLimit;

  // Radial Gauge Geometry:
  // Upward-facing arch (speedometer style) with opening at 6 o'clock (the bottom).
  // Total angle = 240 degrees (leaves 120 degree opening at the bottom).
  // Start angle = 240 deg (bottom-left at 8 o'clock), sweeping clockwise through 0/360 deg (top) to 480/120 deg (bottom-right at 4 o'clock).
  const cx = 90;
  const cy = 68;
  const radius = 54;
  const strokeWidth = 9;
  const startAngle = 240;
  const totalAngle = 240;

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    r: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    centerX: number,
    centerY: number,
    r: number,
    startA: number,
    endA: number
  ) => {
    const start = polarToCartesian(centerX, centerY, r, startA);
    const end = polarToCartesian(centerX, centerY, r, endA);
    const delta = endA - startA;
    const largeArcFlag = delta > 180 ? 1 : 0;
    // sweep-flag = 1 for clockwise progression
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  };

  const bgArc = useMemo(() => {
    return describeArc(cx, cy, radius, startAngle, startAngle + totalAngle);
  }, [cx, cy, radius, startAngle, totalAngle]);

  const progressArc = useMemo(() => {
    const clampedPct = Math.max(0.001, Math.min(1, percentage));
    const endA = startAngle + totalAngle * clampedPct;
    return describeArc(cx, cy, radius, startAngle, endA);
  }, [percentage, cx, cy, radius, startAngle, totalAngle]);

  const colorClass = isDanger
    ? "text-rose-600"
    : isWarning
    ? "text-amber-500"
    : "text-emerald-600";

  const strokeColor = isDanger
    ? "#f43f5e"
    : isWarning
    ? "#f59e0b"
    : "#10b981";

  return (
    <div
      className={`bg-white border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between group ${
        isDanger
          ? "border-rose-300 ring-2 ring-rose-100 bg-rose-50/10"
          : isWarning
          ? "border-amber-300 bg-amber-50/10"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {(isDanger || isWarning) && (
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                isDanger ? "text-rose-500 animate-bounce" : "text-amber-500"
              }`}
            />
          )}
        </div>
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
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* SVG Radial Gauge */}
      <div className="flex flex-col items-center justify-center my-2 relative">
        <svg
          width="180"
          height="112"
          viewBox="0 0 180 112"
          className="overflow-visible"
        >
          {/* Background Track */}
          <path
            d={bgArc}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active Fill Track */}
          {hasValue && (
            <path
              d={progressArc}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          )}
        </svg>

        {/* Center Value */}
        <div className="absolute top-9 left-0 right-0 flex flex-col items-center pointer-events-none">
          <span
            className={`text-2xl font-extrabold font-mono tracking-tight ${colorClass}`}
          >
            {hasValue ? currentVal.toFixed(1) : "--"}
          </span>
          <span className="text-xs text-slate-400 font-semibold">{unit}</span>
        </div>

        {/* Range and Thresholds placed cleanly beneath the open gauge arch */}
        <div className="text-center mt-1.5 space-y-0.5">
          <div className="text-[11px] text-slate-500 font-medium font-mono">
            Range: {min} – {max} {unit}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Warning: {warnLimit} | Critical: {dangerLimit}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span
          className="font-mono truncate max-w-[140px] text-slate-400"
          title={topic}
        >
          {topic}
        </span>
        <span className="font-semibold">
          {isDanger ? (
            <span className="text-rose-600">Critical High</span>
          ) : isWarning ? (
            <span className="text-amber-600">Warning</span>
          ) : (
            <span className="text-emerald-600">Normal</span>
          )}
        </span>
      </div>
    </div>
  );
}
