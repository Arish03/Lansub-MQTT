"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  Clock,
  Cpu,
  ShieldAlert,
  Settings,
  Activity,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

export function Sidebar() {
  const pathname = usePathname();
  const wsConnected = useAppStore((state: any) => state.wsConnected);
  const brokerStatuses = useAppStore((state: any) => state.brokerStatuses || {});
  
  // Determine if any broker is connected or default to wsConnected
  const hasConnectedBroker =
    Object.values(brokerStatuses).some((s) => s === "connected") || wsConnected;

  const sections = [
    {
      title: "Monitoring",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Live Data", href: "/livedata", icon: Radio },
        { name: "History", href: "/history", icon: Clock },
      ],
    },
    {
      title: "Management",
      items: [
        { name: "Devices", href: "/devices", icon: Cpu },
        { name: "Rules & Alarms", href: "/rules", icon: ShieldAlert },
      ],
    },
    {
      title: "Account",
      items: [
        { name: "Settings", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <span className="font-semibold text-slate-900 tracking-tight text-base block leading-tight">
            Lansub MQTT
          </span>
          <span className="text-[11px] font-medium text-slate-500 tracking-wide uppercase">
            Realtime Core
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-blue-600" : "text-slate-400"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* MQTT Status Indicator Card */}
      <div className="p-3 mx-3 mb-2 rounded-xl border border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {hasConnectedBroker && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                hasConnectedBroker ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></span>
          </span>
          <span className="text-xs font-semibold text-slate-800">
            MQTT Status
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 ml-4">
          {hasConnectedBroker ? "Connected to broker" : "Disconnected"}
        </p>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>Version 1.0.0</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
            MVP
          </span>
        </div>
      </div>
    </aside>
  );
}
