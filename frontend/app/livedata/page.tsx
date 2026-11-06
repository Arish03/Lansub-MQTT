"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MessageTable } from "@/components/widgets/MessageTable";
import { wsClient } from "@/lib/ws-client";
import { Radio } from "lucide-react";

export default function LiveDataPage() {
  useEffect(() => {
    wsClient.connect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-8 mt-16 max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Live Data Stream
                </h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Continuous real-time packet inspection, metric extraction, and device events.
              </p>
            </div>
          </div>

          <MessageTable
            title="Active MQTT Stream"
            subtitle="Raw packet payloads and decoded telemetry across all active subscriptions"
            maxHeight="h-[calc(100vh-220px)]"
            showStatusPill={true}
          />
        </main>
      </div>
    </div>
  );
}

