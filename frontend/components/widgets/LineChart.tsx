"use client";

import { useMemo, useState, useEffect } from "react";
import { useAppStore, topicMatches } from "@/lib/store";
import { api } from "@/lib/api";
import { TrendingUp, RefreshCw, Download } from "lucide-react";

interface LineChartProps {
  key?: any;
  title: string;
  topicId?: string;
  topic: string;
  unit?: string;
}

export function LineChart({ title, topicId, topic, unit = "" }: LineChartProps) {
  const [range, setRange] = useState<"1h" | "24h" | "7d">("1h");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!topicId) return;
    setExporting(true);
    try {
      await api.exportTopicHistoryCsv(topicId, range);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };
  const topicState = useAppStore((state: any) => {
    if (state.topicData[topic]) return state.topicData[topic];
    for (const key of Object.keys(state.topicData)) {
      if (topicMatches(topic, key)) {
        return state.topicData[key];
      }
    }
    return null;
  });
  const seedHistory = useAppStore((state: any) => state.seedHistory);

  // Load historical points when topicId is provided
  useEffect(() => {
    if (!topicId) return;
    setLoadingHistory(true);
    api.getTopicHistory(topicId, range, 200)
      .then((messages: any[]) => {
        const points = messages
          .filter((m: any) => m.value !== null && m.value !== undefined)
          .map((m: any) => ({ ts: m.ts, value: Number(m.value) }));
        seedHistory(topic, points);
      })
      .catch((err: any) => console.error("Failed to load topic history:", err))
      .finally(() => setLoadingHistory(false));
  }, [topicId, range, topic, seedHistory]);

  const data = useMemo(() => {
    const rawBuffer = topicState?.ringBuffer || [];
    return rawBuffer
      .filter((p: any) => p.value !== null && p.value !== undefined && !isNaN(p.value))
      .map((p: any) => ({ value: p.value as number, ts: p.ts }));
  }, [topicState?.ringBuffer]);

  // Compute SVG dimensions and path
  const { path, areaPath, min, max, latest } = useMemo(() => {
    if (data.length === 0) {
      return { path: "", areaPath: "", min: 0, max: 0, latest: 0 };
    }

    const values = data.map((d: any) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const spread = maxVal - minVal === 0 ? 1 : maxVal - minVal;
    const latestVal = values[values.length - 1];

    const width = 450;
    const height = 140;
    const padding = 10;

    const points = data.map((d: any, index: number) => {
      const x = padding + (index / (data.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((d.value - minVal) / spread) * (height - 2 * padding);
      return { x, y };
    });

    const lineCmd = points.reduce((acc: string, curr: any, idx: number) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, "");

    const areaCmd = points.length > 0
      ? `${lineCmd} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
      : "";

    return {
      path: lineCmd,
      areaPath: areaCmd,
      min: minVal,
      max: maxVal,
      latest: latestVal,
    };
  }, [data]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm col-span-2 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {unit && <span className="text-xs font-medium text-slate-400">({unit})</span>}
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-sm">
            {topic}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range selectors */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            {(["1h", "24h", "7d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  range === r ? "bg-white text-blue-600 shadow-sm" : "hover:text-slate-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {topicId && (
            <button
              onClick={handleExport}
              disabled={exporting}
              title="Download History as CSV"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{exporting ? "..." : "CSV"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Callouts */}
      <div className="flex items-center gap-6 my-2 text-xs">
        <div>
          <span className="text-slate-400 block">Latest</span>
          <span className="text-lg font-bold font-mono text-slate-900">
            {data.length ? latest.toFixed(1) : "--"}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Min</span>
          <span className="font-semibold font-mono text-slate-700">
            {data.length ? min.toFixed(1) : "--"}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Max</span>
          <span className="font-semibold font-mono text-slate-700">
            {data.length ? max.toFixed(1) : "--"}
          </span>
        </div>
        <div className="ml-auto text-slate-400 flex items-center gap-1 text-[11px]">
          <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          <span>{data.length} pts</span>
        </div>
      </div>

      {/* SVG Sparkline / Area Chart */}
      <div className="w-full h-36 relative mt-2 rounded-lg bg-slate-50/50 border border-slate-100 overflow-hidden flex items-center justify-center">
        {data.length > 1 ? (
          <svg viewBox="0 0 450 140" className="w-full h-full preserve-3d">
            <defs>
              <linearGradient id={`grad-${topic}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#grad-${topic})`} />
            <path d={path} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {loadingHistory && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />}
            <span>{loadingHistory ? "Loading history..." : "Waiting for live data points..."}</span>
          </div>
        )}
      </div>
    </div>
  );
}
