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

  // Arc calculations (240 degree gauge: from 150 deg to 390 deg)
  const radius = 68;
  const center = 85;
  const strokeWidth = 10;
  const startAngle = 150;
  const totalAngle = 240;

  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    x: number,
    y: number,
    r: number,
    startA: number,
    endA: number
  ) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  const bgArc = useMemo(() => {
    return describeArc(center, center, radius, startAngle, startAngle + totalAngle);
  }, []);

  const progressArc = useMemo(() => {
    const endA = startAngle + totalAngle * Math.max(0.001, percentage);
    return describeArc(center, center, radius, startAngle, endA);
  }, [percentage]);

  const colorClass = isDanger
    ? "text-rose-600"
    : isWarning
    ? "text-amber-600"
    : "text-blue-600";

  const strokeColor = isDanger
    ? "#f43f5e"
    : isWarning
    ? "#f59e0b"
    : "#2563eb";

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
          width="170"
          height="125"
          viewBox="0 0 170 125"
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
        <div className="absolute top-12 flex flex-col items-center">
          <span
            className={`text-2xl font-extrabold font-mono tracking-tight ${colorClass}`}
          >
            {hasValue ? currentVal.toFixed(1) : "--"}
          </span>
          <span className="text-xs text-slate-400 font-semibold">{unit}</span>
        </div>

        {/* Range and Thresholds matching reference screenshot */}
        <div className="text-center -mt-1 space-y-0.5">
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
