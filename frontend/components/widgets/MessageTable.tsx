"use client";

import { useState } from "react";
import { useAppStore, LiveMessage } from "@/lib/store";
import { Pause, Play, Trash2, Radio, Download } from "lucide-react";

export function MessageTable() {
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
    const csvContent = [headers.join(","), ...rows.map((r: any) => `"${r[0]}","${r[1]}","${r[2]}","${r[3]}"`)].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `live_stream_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm col-span-3 flex flex-col h-96">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-800">Live Message Stream</h3>
          <span className="text-xs text-slate-400 font-mono">({displayMessages.length} received)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={displayMessages.length === 0}
            title="Download visible stream as CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleTogglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isPaused
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? "Resume Stream" : "Pause Stream"}
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto mt-2 text-xs">
        {displayMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <Radio className="w-8 h-8 text-slate-300 animate-bounce" />
            <span>Listening for incoming MQTT packets...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 bg-white">
                <th className="py-2 px-3 font-semibold">Timestamp</th>
                <th className="py-2 px-3 font-semibold">Topic</th>
                <th className="py-2 px-3 font-semibold">Extracted Value</th>
                <th className="py-2 px-3 font-semibold">Raw Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {displayMessages.map((msg: any, i: number) => {
                const isAlert = !!msg.alert;
                return (
                  <tr
                    key={`${msg.ts}-${i}`}
                    className={`transition-colors ${
                      isAlert
                        ? msg.alert === "high"
                          ? "bg-rose-50/70 hover:bg-rose-100/70"
                          : "bg-amber-50/70 hover:bg-amber-100/70"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(msg.ts).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 font-medium text-blue-600 truncate max-w-xs" title={msg.topic}>
                      <span className="flex items-center gap-1.5">
                        {isAlert && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              msg.alert === "high" ? "bg-rose-500" : "bg-amber-500"
                            }`}
                          />
                        )}
                        {msg.topic}
                      </span>
                    </td>
                    <td className={`py-2 px-3 font-semibold ${isAlert ? (msg.alert === "high" ? "text-rose-700" : "text-amber-700") : "text-slate-800"}`}>
                      {msg.value !== null && msg.value !== undefined ? msg.value : "--"}
                    </td>
                    <td className="py-2 px-3 text-slate-500 max-w-md truncate" title={JSON.stringify(msg.payload)}>
                      {typeof msg.payload === "object" ? JSON.stringify(msg.payload) : String(msg.payload)}
                    </td>
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
