"use client";

import React from "react";
import { useToastStore, Toast } from "@/lib/toast-store";
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from "lucide-react";

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  const getIcon = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
      case "error":
        return <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;
    }
  };

  const getBorderColor = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return "border-l-emerald-500 bg-white";
      case "warning":
        return "border-l-amber-500 bg-white";
      case "error":
        return "border-l-rose-500 bg-white";
      case "info":
      default:
        return "border-l-blue-500 bg-white";
    }
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border border-slate-200/80 border-l-4 shadow-lg shadow-slate-900/5 transition-all duration-300 animate-in slide-in-from-right-5 fade-in ${getBorderColor(
            toast.type
          )}`}
        >
          {getIcon(toast.type)}
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-sm font-semibold text-slate-900 leading-tight">
              {toast.title}
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-100 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

