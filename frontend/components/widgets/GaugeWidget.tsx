"use client";

import { useMemo } from "react";
import { useAppStore, topicMatches } from "@/lib/store";
import { Gauge, AlertTriangle } from "lucide-react";

interface GaugeWidgetProps {
  key?: any;
  title: string;
  topic: string;
  unit?: string;
  min?: number;
  max?: number;
  warningThreshold?: number;
  dangerThreshold?: number;
}

export function GaugeWidget({
  title,
  topic,
  unit = "",
  min = 0,
  max = 100,
  warningThreshold,
  dangerThreshold,
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

  const rawValue = topicState?.latestValue;
  const hasValue = rawValue !== null && rawValue !== undefined && !isNaN(Number(rawValue));
  const currentVal = hasValue ? Number(rawValue) : min;

  // Compute percentage clamped between 0 and 1
  const span = max - min || 1;
  const clampedVal = Math.min(Math.max(currentVal, min), max);
  const percentage = (clampedVal - min) / span;

  // Thresholds calculation
  const warnLimit = warningThreshold !== undefined ? warningThreshold : min + span * 0.75;
  const dangerLimit = dangerThreshold !== undefined ? dangerThreshold : min + span * 0.90;

  const isDanger = currentVal >= dangerLimit;
  const isWarning = !isDanger && currentVal >= warnLimit;

  // Arc calculations (240 degree gauge: from 150 deg to 390 deg)
  const radius = 68;
  const center = 85;
  const strokeWidth = 10;
  const startAngle = 150;
  const totalAngle = 240;

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
  };

  const bgArc = useMemo(() => {
    return describeArc(center, center, radius, startAngle, startAngle + totalAngle);
  }, []);

  const progressArc = useMemo(() => {
    const endA = startAngle + totalAngle * Math.max(0.001, percentage);
    return describeArc(center, center, radius, startAngle, endA);
  }, [percentage]);

  const colorClass = isDanger
    ? "text-rose-500"
    : isWarning
    ? "text-amber-500"
    : "text-blue-600";

  const strokeColor = isDanger
    ? "#f43f5e"
    : isWarning
    ? "#f59e0b"
    : "#2563eb";

  return (
    <div className={`bg-white border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between ${
      isDanger
        ? "border-rose-300 ring-2 ring-rose-100"
        : isWarning
        ? "border-amber-300"
        : "border-slate-200 hover:border-slate-300"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {(isDanger || isWarning) && (
            <AlertTriangle className={`w-3.5 h-3.5 ${isDanger ? "text-rose-500 animate-bounce" : "text-amber-500"}`} />
          )}
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {/* SVG Radial Gauge */}
      <div className="flex flex-col items-center justify-center my-1 relative">
        <svg width="170" height="130" viewBox="0 0 170 130" className="overflow-visible">
          {/* Background Track */}
          <path
            d={bgArc}
            fill="none"
            stroke="#e2e8f0"
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
        <div className="absolute top-14 flex flex-col items-center">
          <span className={`text-2xl font-bold font-mono tracking-tight ${colorClass}`}>
            {hasValue ? currentVal.toFixed(1) : "--"}
          </span>
          <span className="text-xs text-slate-400 font-medium">{unit}</span>
        </div>

        {/* Range Labels */}
        <div className="w-full flex justify-between px-3 text-[11px] font-mono text-slate-400 -mt-2">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-mono truncate max-w-[140px] text-slate-400" title={topic}>
          {topic}
        </span>
        <span className="font-medium">
          {isDanger ? (
            <span className="text-rose-600 font-semibold">Critical High</span>
          ) : isWarning ? (
            <span className="text-amber-600 font-semibold">Warning</span>
          ) : (
            <span className="text-slate-400">Normal</span>
          )}
        </span>
      </div>
    </div>
  );
}

