"use client";

import { useMemo, useState } from "react";
import { useAppStore, topicMatches } from "@/lib/store";
import { Download, RefreshCw } from "lucide-react";

export interface SeriesConfig {
  topic: string;
  label: string;
  color: string;
  unit?: string;
}

interface MultiLineChartProps {
  title?: string;
  series: SeriesConfig[];
}

export function MultiLineChart({
  title = "Real-time Sensor Data",
  series,
}: MultiLineChartProps) {
  const [range, setRange] = useState<"1h" | "24h" | "7d">("1h");
  const topicData = useAppStore((state: any) => state.topicData || {});

  // Extract numeric points for each series
  const seriesPoints = useMemo(() => {
    return series.map((s) => {
      // Find matching topic state
      let tState = topicData[s.topic];
      if (!tState) {
        for (const k of Object.keys(topicData)) {
          if (topicMatches(s.topic, k)) {
            tState = topicData[k];
            break;
          }
        }
      }

      const ringBuffer = tState?.ringBuffer || [];
      const points = ringBuffer
        .filter((p: any) => p.value !== null && p.value !== undefined && !isNaN(Number(p.value)))
        .map((p: any) => ({
          value: Number(p.value),
          ts: p.ts,
        }));

      return {
        ...s,
        points,
      };
    });
  }, [series, topicData]);

  // Overall min and max across all series for unified scaling
  const { allPointsCount, globalMin, globalMax, formattedTimestamps } = useMemo(() => {
    let allVals: number[] = [];
    let tsList: string[] = [];

    seriesPoints.forEach((sp) => {
      sp.points.forEach((pt) => {
        allVals.push(pt.value);
        tsList.push(pt.ts);
      });
    });

    if (allVals.length === 0) {
      return { allPointsCount: 0, globalMin: 0, globalMax: 100, formattedTimestamps: [] };
    }

    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const padding = max - min === 0 ? 10 : (max - min) * 0.1;

    // Pick 5 timestamps for x-axis
    const uniqueTs = Array.from(new Set(tsList)).sort();
    const step = Math.max(1, Math.floor(uniqueTs.length / 5));
    const sampleTs: string[] = [];
    for (let i = 0; i < uniqueTs.length; i += step) {
      sampleTs.push(new Date(uniqueTs[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (sampleTs.length >= 5) break;
    }

    return {
      allPointsCount: allVals.length,
      globalMin: Math.floor(min - padding),
      globalMax: Math.ceil(max + padding),
      formattedTimestamps: sampleTs,
    };
  }, [seriesPoints]);

  // Compute SVG paths for each series
  const svgWidth = 600;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 30;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const spread = globalMax - globalMin || 1;

  const paths = useMemo(() => {
    return seriesPoints.map((sp) => {
      if (sp.points.length === 0) return { ...sp, path: "", latest: null };

      const pts = sp.points.map((p, idx) => {
        const x = padLeft + (idx / Math.max(1, sp.points.length - 1)) * chartW;
        const y = padTop + chartH - ((p.value - globalMin) / spread) * chartH;
        return { x, y };
      });

      const lineCmd = pts.reduce((acc, curr, idx) => {
        return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
      }, "");

      return {
        ...sp,
        path: lineCmd,
        latest: sp.points[sp.points.length - 1].value,
      };
    });
  }, [seriesPoints, globalMin, spread, chartW, chartH]);

  // CSV Export
  const handleExportCsv = () => {
    const rows: string[] = ["Timestamp," + series.map((s) => `"${s.label} (${s.unit || ""})"`).join(",")];
    const tsMap: Record<string, Record<string, number | string>> = {};

    seriesPoints.forEach((sp) => {
      sp.points.forEach((p) => {
        if (!tsMap[p.ts]) tsMap[p.ts] = {};
        tsMap[p.ts][sp.topic] = p.value;
      });
    });

    Object.keys(tsMap)
      .sort()
      .forEach((ts) => {
        const row = [ts];
        series.forEach((s) => {
          row.push(tsMap[ts][s.topic] !== undefined ? String(tsMap[ts][s.topic]) : "");
        });
        rows.push(row.join(","));
      });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sensor_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Combined multi-sensor continuous telemetry curve
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {(["1h", "24h", "7d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  range === r
                    ? "bg-white text-blue-600 shadow-sm font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            disabled={allPointsCount === 0}
            title="Download Telemetry CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full h-64 relative bg-slate-50/60 rounded-xl border border-slate-100 overflow-hidden flex items-center justify-center">
        {allPointsCount > 1 ? (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padTop + chartH * (1 - pct);
              const val = Math.round(globalMin + spread * pct);
              return (
                <g key={pct}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* X-axis time marks */}
            {formattedTimestamps.map((ts, idx) => {
              const x = padLeft + (idx / Math.max(1, formattedTimestamps.length - 1)) * chartW;
              return (
                <text
                  key={idx}
                  x={x}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {ts}
                </text>
              );
            })}

            {/* Render each series path */}
            {paths.map((sp) =>
              sp.path ? (
                <path
                  key={sp.topic}
                  d={sp.path}
                  fill="none"
                  stroke={sp.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null
            )}
          </svg>
        ) : (
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>Waiting for telemetry stream...</span>
          </div>
        )}
      </div>

      {/* Legend below chart matching reference screenshot */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-6 flex-wrap">
        {paths.map((sp) => (
          <div key={sp.topic} className="flex items-center gap-2 text-xs font-semibold">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: sp.color }}
            />
            <span className="text-slate-700">{sp.label}</span>
            {sp.latest !== null && sp.latest !== undefined && (
              <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                {sp.latest} {sp.unit || ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
