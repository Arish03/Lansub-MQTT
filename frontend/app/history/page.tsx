"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { LineChart } from "@/components/widgets/LineChart";
import { api } from "@/lib/api";
import { Clock, Download, RefreshCw, Radio, Filter, AlertCircle } from "lucide-react";

export default function HistoryPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [range, setRange] = useState<"1h" | "24h" | "7d">("1h");
  const [historyPoints, setHistoryPoints] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.getTopics()
      .then((data: any[]) => {
        setTopics(data);
        if (data.length > 0) {
          setSelectedTopicId(data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load topics:", err))
      .finally(() => setLoadingTopics(false));
  }, []);

  useEffect(() => {
    if (!selectedTopicId) {
      setHistoryPoints([]);
      return;
    }

    setLoadingHistory(true);
    api.getTopicHistory(selectedTopicId, range, 200)
      .then((res: any[]) => {
        setHistoryPoints(res || []);
      })
      .catch((err) => {
        console.error("Failed to load topic history:", err);
        setHistoryPoints([]);
      })
      .finally(() => setLoadingHistory(false));
  }, [selectedTopicId, range]);

  const selectedTopic = topics.find((t: any) => t.id === selectedTopicId);

  const handleExportCsv = async () => {
    if (!selectedTopicId) return;
    setExporting(true);
    try {
      await api.exportTopicHistoryCsv(selectedTopicId, range);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-8 mt-16 max-w-7xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Telemetry History
                </h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Explore, analyze, and export historical time-series data for specific topics.
              </p>
            </div>

            {selectedTopic && (
              <button
                onClick={handleExportCsv}
                disabled={exporting || historyPoints.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting ? "Generating..." : "Download Full CSV"}</span>
              </button>
            )}
          </div>

          {/* Topic & Range Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Filter className="w-4 h-4 text-slate-400" />
                Select Topic:
              </div>
              {loadingTopics ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <span>Loading topics...</span>
                </div>
              ) : topics.length === 0 ? (
                <span className="text-xs text-rose-500">
                  No topics registered yet. Go to Topics settings to add one.
                </span>
              ) : (
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 flex-1 max-w-md"
                >
                  {topics.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.pattern} {t.label ? `(${t.label})` : ""} {t.unit ? `[${t.unit}]` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Time range selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              {(["1h", "24h", "7d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    range === r
                      ? "bg-white text-blue-600 font-bold shadow-sm"
                      : "hover:text-slate-900"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Display */}
          {selectedTopic ? (
            <div className="space-y-6">
              <div className="w-full">
                <LineChart
                  key={`${selectedTopic.id}-${range}`}
                  title={`${selectedTopic.label || selectedTopic.pattern} Trend`}
                  topicId={selectedTopic.id}
                  topic={selectedTopic.pattern}
                  unit={selectedTopic.unit || ""}
                />
              </div>

              {/* Data Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Historical Records ({historyPoints.length} points)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Chronological log for {selectedTopic.pattern} over the last {range}
                    </p>
                  </div>
                  {loadingHistory && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching records...</span>
                    </div>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {historyPoints.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No historical records found for this time range.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold sticky top-0 bg-white">
                          <th className="py-2.5 px-3">Timestamp (UTC)</th>
                          <th className="py-2.5 px-3">Extracted Value</th>
                          <th className="py-2.5 px-3">Raw Payload</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {historyPoints.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                              {new Date(item.ts).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {item.value !== null && item.value !== undefined
                                ? `${item.value} ${selectedTopic.unit || ""}`
                                : "--"}
                            </td>
                            <td
                              className="py-2 px-3 text-slate-500 max-w-md truncate"
                              title={
                                typeof item.payload === "object"
                                  ? JSON.stringify(item.payload)
                                  : String(item.payload)
                              }
                            >
                              {typeof item.payload === "object"
                                ? JSON.stringify(item.payload)
                                : String(item.payload)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
              <Radio className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No topic selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Please select a telemetry topic from the filter above to visualize historical readings.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

