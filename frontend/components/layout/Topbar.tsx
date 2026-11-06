"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User as UserIcon, AlertTriangle, Settings as SettingsIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api, clearToken } from "@/lib/api";

export function Topbar() {
  const router = useRouter();
  const wsConnected = useAppStore((state: any) => state.wsConnected);
  const activeAlerts = useAppStore((state: any) => state.activeAlerts || {});
  const messages = useAppStore((state: any) => state.messages || []);
  const alertCount = Object.keys(activeAlerts).length;
  const [userEmail, setUserEmail] = useState<string>("");

  // Get last message timestamp for "Last update: X"
  const latestTs = messages.length > 0 ? messages[0].ts : null;
  const lastUpdateText = latestTs
    ? new Date(latestTs).toLocaleTimeString()
    : "Waiting for stream...";

  useEffect(() => {
    api.getMe()
      .then((user: any) => setUserEmail(user.email))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 flex items-center justify-between px-8 z-20">
      <div className="flex items-center gap-3">
        {/* Live Status + Last Update Badge matching reference */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700">
          <span className="relative flex h-2 w-2">
            {wsConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                wsConnected ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></span>
          </span>
          <span className="font-semibold text-slate-900">
            {wsConnected ? "Live" : "Offline"}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-mono text-[11px]">
            Last update: {lastUpdateText}
          </span>
        </div>

        {/* Active Threshold Alert Pill */}
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>
              {alertCount} Active Alert{alertCount > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {userEmail && (
          <Link
            href="/settings"
            className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-slate-700">{userEmail}</span>
          </Link>
        )}

        <Link
          href="/settings"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </Link>

        <button
          onClick={handleLogout}
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          title="Log out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
