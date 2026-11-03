"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api, clearToken } from "@/lib/api";

export function Topbar() {
  const router = useRouter();
  const wsConnected = useAppStore((state: any) => state.wsConnected);
  const activeAlerts = useAppStore((state: any) => state.activeAlerts || {});
  const alertCount = Object.keys(activeAlerts).length;
  const [userEmail, setUserEmail] = useState<string>("");

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
        {/* Live WebSocket Status Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
            wsConnected
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
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
          {wsConnected ? "Live Connected" : "Connecting..."}
        </div>

        {/* Active Threshold Alert Pill */}
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>{alertCount} Active Alert{alertCount > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {userEmail && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <UserIcon className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-700">{userEmail}</span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors title='Log out'"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
