import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/layout/Toaster";

export const metadata: Metadata = {
  title: "Lansub MQTT - Realtime Dashboard",
  description: "High-performance realtime MQTT monitoring and control dashboard",
};

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
