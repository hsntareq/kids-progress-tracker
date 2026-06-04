"use client";

import React, { Suspense } from "react";
import { useAuth } from "@/components/auth-provider";
import ParentDashboard from "@/components/parent-dashboard";
import ChildDashboard from "@/components/child-dashboard";
import AdminDashboard from "@/components/admin-dashboard";

function DashboardContent() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="ui-app-bg min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">Loading Family Quest...</p>
        </div>
      </div>
    );
  }

  if (profile.activeRole === "parent") {
    return <ParentDashboard />;
  }

  if (profile.activeRole === "child") {
    return <ChildDashboard />;
  }

  if (profile.activeRole === "admin") {
    return <AdminDashboard />;
  }

  // Fallback for unknown role
  return (
    <div className="ui-app-bg min-h-screen flex items-center justify-center p-4">
      <div className="ui-panel max-w-md w-full p-8 text-center enter-rise">
        <h2 className="text-2xl font-bold text-slate-800 ui-title">Access Denied</h2>
        <p className="mt-4 text-slate-600">
          Your profile does not have a recognized user role. Please contact support.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="ui-app-bg min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">Loading Family Quest...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
