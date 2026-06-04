"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
    } else if (profile) {
      if (profile.activeRole === "parent") {
        if (!profile.familyId) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      } else if (profile.activeRole === "child") {
        router.push("/dashboard");
      }
    }
  }, [user, profile, loading, router]);

  return (
    <div className="ui-app-bg min-h-screen flex items-center justify-center">
      <div className="text-center animate-pulse">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-slate-700 font-medium">Loading Family Quest...</p>
      </div>
    </div>
  );
}
