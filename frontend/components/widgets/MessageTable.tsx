"use client";

import { useState } from "react";
import { useAppStore, LiveMessage } from "@/lib/store";
import { Pause, Play, Download, Radio, Activity } from "lucide-react";

interface MessageTableProps {
  title?: string;
  subtitle?: string;
  maxHeight?: string;
  showStatusPill?: boolean;
}

export function MessageTable({
  title = "Recent Device Activity",
  subtitle = "Live telemetric packet stream across monitored devices & topics",
  maxHeight = "h-96",
  showStatusPill = true,
}: MessageTableProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [frozenMessages, setFrozenMessages] = useState<LiveMessage[]>([]);
  const liveMessages = useAppStore((state: any) => state.messages);

  const displayMessages = isPaused ? frozenMessages : liveMessages;

  const handleTogglePause = () => {
    if (!isPaused) {
      setFrozenMessages([...liveMessages]);
    }
    setIsPaused(!isPaused);
  };

  const handleExportCsv = () => {
    if (displayMessages.length === 0) return;
    const headers = ["Timestamp", "Topic", "Extracted Value", "Raw Payload"];
    const rows = displayMessages.map((m: any) => [
      m.ts,
      m.topic,
      m.value !== null && m.value !== undefined ? m.value : "",
      JSON.stringify(m.payload).replace(/"/g, '""'),
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r: any) => `"${r[0]}","${r[1]}","${r[2]}","${r[3]}"`),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `live_stream_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col ${maxHeight}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-medium">
              {displayMessages.length} packets
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={displayMessages.length === 0}
            title="Download visible stream as CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleTogglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              isPaused
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Pause className="w-3.5 h-3.5 text-slate-600" />
            )}
            {isPaused ? "Resume Stream" : "Pause"}
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto mt-3 text-xs">
        {displayMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-8">
            <Radio className="w-8 h-8 text-blue-500 animate-pulse" />
            <span className="font-medium text-slate-500">
              Listening for incoming MQTT packets...
            </span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 bg-white">
                <th className="py-2.5 px-3 font-bold">Timestamp</th>
                <th className="py-2.5 px-3 font-bold">Device / Topic</th>
                <th className="py-2.5 px-3 font-bold">Extracted Reading</th>
                <th className="py-2.5 px-3 font-bold">Payload Data</th>
                {showStatusPill && (
                  <th className="py-2.5 px-3 font-bold text-right">Status</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {displayMessages.map((msg: any, i: number) => {
                const isAlert = !!msg.alert;
                return (
                  <tr
                    key={`${msg.ts}-${i}`}
                    className={`transition-colors ${
                      isAlert
                        ? msg.alert === "high"
                          ? "bg-rose-50/60 hover:bg-rose-100/60"
                          : "bg-amber-50/60 hover:bg-amber-100/60"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(msg.ts).toLocaleTimeString()}
                    </td>
                    <td
                      className="py-2.5 px-3 font-medium text-blue-600 truncate max-w-xs"
                      title={msg.topic}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isAlert
                              ? msg.alert === "high"
                                ? "bg-rose-500 animate-ping"
                                : "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        <span className="font-semibold text-slate-800">
                          {msg.topic}
                        </span>
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 font-bold ${
                        isAlert
                          ? msg.alert === "high"
                            ? "text-rose-600 font-extrabold"
                            : "text-amber-600 font-extrabold"
                          : "text-slate-900"
                      }`}
                    >
                      {msg.value !== null && msg.value !== undefined
                        ? msg.value
                        : "--"}
                    </td>
                    <td
                      className="py-2.5 px-3 text-slate-500 max-w-md truncate"
                      title={
                        typeof msg.payload === "object"
                          ? JSON.stringify(msg.payload)
                          : String(msg.payload)
                      }
                    >
                      {typeof msg.payload === "object"
                        ? JSON.stringify(msg.payload)
                        : String(msg.payload)}
                    </td>
                    {showStatusPill && (
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isAlert
                              ? msg.alert === "high"
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isAlert ? `${msg.alert} alert` : "online"}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
