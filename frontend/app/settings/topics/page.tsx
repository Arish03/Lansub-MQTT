"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyTopicsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/topics");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}
