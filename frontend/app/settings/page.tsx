"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { api } from "@/lib/api";
import { useToastStore } from "@/lib/toast-store";
import { useAppStore } from "@/lib/store";
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Lock,
  Server,
  Radio,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Info,
} from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [brokerCount, setBrokerCount] = useState(0);
  const [topicCount, setTopicCount] = useState(0);
  const wsConnected = useAppStore((state: any) => state.wsConnected);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    api.getMe()
      .then((data: any) => setUser(data))
      .catch(() => {});

    api.getBrokers()
      .then((b: any[]) => setBrokerCount(b.length))
      .catch(() => {});

    api.getTopics()
      .then((t: any[]) => setTopicCount(t.length))
      .catch(() => {});
  }, []);

  const handleChangePassword = async (e: any) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword !== confirmPassword) {
      setMsg({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    setUpdating(true);
    try {
      const res = await api.updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setMsg({ type: "success", text: res.message || "Password updated successfully!" });
      addToast({
        title: "Security Updated",
        message: "Your account password was successfully updated.",
        type: "success",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-8 mt-16 max-w-5xl space-y-8">
          <div>
            <div className="flex items-center gap-2.5">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Settings & Profile
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage your user account credentials, security, and quick system links.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left 2 Cols: User Profile & Change Password */}
            <div className="md:col-span-2 space-y-6">
              {/* Profile Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                    {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">User Account</h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {user?.email || "Loading..."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block mb-1">Account Role</span>
                    <span className="font-bold text-slate-800">Administrator</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block mb-1">Created At</span>
                    <span className="font-mono text-slate-800">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Change Password Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-5">
                  <Lock className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Change Password
                  </h3>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {msg && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                        msg.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {msg.type === "success" ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <span>{msg.text}</span>
                    </div>
                  )}

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={updating || !currentPassword || !newPassword}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Quick Links & System Info */}
            <div className="space-y-6">
              {/* Quick Links */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Management Links
                </h3>

                <Link
                  href="/devices"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Server className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                        Devices & Brokers
                      </div>
                      <div className="text-[11px] text-slate-400">{brokerCount} configured</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/settings/topics"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Radio className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                        Topics & Thresholds
                      </div>
                      <div className="text-[11px] text-slate-400">{topicCount} subscribed</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/rules"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                        Rules & Alarms
                      </div>
                      <div className="text-[11px] text-slate-400">Automated fail-safes</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* System Info */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Info className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    System Information
                  </h3>
                </div>

                <div className="text-xs space-y-2 font-mono">
                  <div className="flex justify-between py-1 text-slate-600 border-b border-slate-50">
                    <span className="text-slate-400 font-sans">Version:</span>
                    <span className="font-bold text-slate-800">1.0.0 (MVP)</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600 border-b border-slate-50">
                    <span className="text-slate-400 font-sans">WebSocket:</span>
                    <span
                      className={`font-semibold ${
                        wsConnected ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {wsConnected ? "Live Connected" : "Disconnected"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600 border-b border-slate-50">
                    <span className="text-slate-400 font-sans">Protocols:</span>
                    <span className="text-slate-800">MQTT 3.1.1, 5.0</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span className="text-slate-400 font-sans">Backend:</span>
                    <span className="text-slate-800">FastAPI / Python 3.12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

