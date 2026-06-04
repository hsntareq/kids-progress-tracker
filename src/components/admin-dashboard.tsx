"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import NotificationCenter from "@/components/notifications";
import {
  ShieldAlert,
  BarChart3,
  Users,
  Settings,
  User,
  LogOut,
  Menu,
  Home,
  Activity,
  Award
} from "lucide-react";

export default function AdminDashboard() {
  const { user, profile, logout, memberships, switchProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("page") || "overview") as "overview" | "customers" | "settings" | "profile";

  const setActiveTab = (tab: "overview" | "customers" | "settings" | "profile") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", tab);
    router.push(`/dashboard?${params.toString()}`);
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Safe checks: only show content if logged in admin
  if (!user || profile?.activeRole !== "admin") {
    return null;
  }

  // Mock Admin Customers list
  const mockCustomers = [
    { name: "John Smith", email: "john@mail.com", family: "Smith Family", status: "Active" },
    { name: "Sarah Connor", email: "sarah@mail.com", family: "Resistance Group", status: "Active" },
    { name: "Bruce Wayne", email: "bruce@mail.com", family: "Wayne Manor", status: "Active" },
  ];

  return (
    <div className="ui-app-bg min-h-screen flex flex-col md:flex-row">
      {/* Mobile Navbar */}
      <header className="md:hidden border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">Quest</span>
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-red-700">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 cursor-pointer flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </button>
          <NotificationCenter />
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-64 border-r border-slate-200/80 bg-white/90 backdrop-blur-md p-6 fixed md:sticky top-[60px] md:top-0 h-[calc(100vh-60px)] md:h-screen z-30 transition-all`}
      >
        {/* Brand Header */}
        <div className="hidden md:flex flex-col gap-1 mb-8">
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-red-700">
            System Control
          </span>
          <h2 className="text-xl font-bold text-slate-900 ui-title leading-tight">
            Admin Panel
          </h2>
        </div>

        {/* Switcher selector */}
        {memberships && memberships.length > 1 && (
          <div className="mb-6 px-1 flex flex-col gap-1.5 enter-fade">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Switch Role/Family
            </label>
            <select
              value={memberships.findIndex(m => m.role === profile?.activeRole && m.familyId === profile?.familyId)}
              onChange={(e) => {
                const index = parseInt(e.target.value, 10);
                if (index >= 0 && index < memberships.length) {
                  const selected = memberships[index];
                  switchProfile(selected.role, selected.familyId);
                }
              }}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-red-500 transition-all cursor-pointer"
            >
              {memberships.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m.role === "admin" ? "🛡️ System Admin" : `${m.role === "parent" ? "👨‍👩‍👧 Parent" : "👶 Kid"} - ${m.familyName}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => {
              setActiveTab("overview");
              setMobileMenuOpen(false);
            }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-red-50 border-l-4 border-red-600 text-red-800 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
            }`}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("customers");
              setMobileMenuOpen(false);
            }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "customers"
                ? "bg-red-50 border-l-4 border-red-600 text-red-800 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
            }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>Customers</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("settings");
              setMobileMenuOpen(false);
            }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-red-50 border-l-4 border-red-600 text-red-800 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("profile");
              setMobileMenuOpen(false);
            }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-red-50 border-l-4 border-red-600 text-red-800 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
            }`}
          >
            <User className="w-4 h-4 flex-shrink-0" />
            <span>Profile</span>
          </button>
        </nav>

        <div className="border-t border-slate-100 pt-6 flex flex-col gap-4 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center border border-red-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {profile?.displayName || "System Admin"}
              </p>
              <p className="text-xs text-slate-500 truncate">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="ui-button-secondary ui-focus w-full py-2.5 text-xs font-bold hover:border-red-200 hover:bg-red-50 hover:text-red-700 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto space-y-6 md:space-y-8 overflow-y-auto">
        {/* Desktop Topbar */}
        <div className="hidden md:flex justify-end items-center gap-4 border-b border-slate-100/60 pb-4 mb-2">
          <NotificationCenter />
        </div>
        {/* Dynamic Tab Render */}
        {activeTab === "overview" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Header */}
            <section className="ui-panel p-6 md:p-8 bg-gradient-to-br from-red-50/50 to-orange-50/30">
              <p className="text-xs uppercase tracking-wider font-bold text-red-800">
                System Administrator
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 ui-title mt-1">
                Admin Console
              </h2>
              <p className="mt-2 text-slate-600 max-w-2xl leading-relaxed text-sm md:text-base">
                Welcome to the administration control panel. You can audit registered customer profiles,
                monitor overall database usage, and adjust global configuration metrics.
              </p>
            </section>

            {/* Quick Metrics */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="ui-panel p-5 bg-white flex flex-col justify-between min-h-[120px]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Households
                  </span>
                  <Home className="w-5 h-5 text-slate-400" />
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-extrabold text-slate-900 ui-title">
                    {mockCustomers.length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Registered parent groups
                  </p>
                </div>
              </div>

              <div className="ui-panel p-5 bg-white flex flex-col justify-between min-h-[120px]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Active Children
                  </span>
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-extrabold text-slate-900 ui-title">
                    8
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Quest solving kid profiles
                  </p>
                </div>
              </div>

              <div className="ui-panel p-5 bg-white flex flex-col justify-between min-h-[120px]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    DB Server Health
                  </span>
                  <Activity className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold text-emerald-800 flex items-center gap-1.5">
                    Operational
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    All firestore APIs online
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "customers" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 ui-title">
                Customer Audits
              </h3>
              <p className="text-xs text-slate-500">
                Oversee parent and kid users in the system
              </p>
            </div>

            {/* Customers table */}
            <div className="ui-panel p-4 bg-white overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Parent Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Household</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mockCustomers.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-bold text-slate-800">{cust.name}</td>
                      <td className="py-4 px-4 text-slate-500">{cust.email}</td>
                      <td className="py-4 px-4 font-semibold text-slate-600">{cust.family}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="ui-pill bg-green-50 text-green-700 border border-green-200">
                          {cust.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 ui-title">
                Global Configurations
              </h3>
              <p className="text-xs text-slate-500">
                Manage global application system configurations
              </p>
            </div>

            {/* Settings Card */}
            <div className="ui-panel p-6 bg-white space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">New Sign-ups Registration</h4>
                    <p className="text-xs text-slate-500">Allow new users to register parent accounts</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">🔓 Open</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Google Auth Sign-in</h4>
                    <p className="text-xs text-slate-500">Enable Google SSO provider</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">⚡ Enabled</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Database Auto-Backups</h4>
                    <p className="text-xs text-slate-500">Automated hourly backup triggers</p>
                  </div>
                  <span className="text-sm font-bold text-teal-700">🕒 Hourly</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 ui-title">
                Admin Account
              </h3>
              <p className="text-xs text-slate-500">
                View administrator profile credentials
              </p>
            </div>

            {/* Profile Info Card */}
            <div className="ui-panel p-6 md:p-8 bg-white space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800">{profile?.displayName || "System Admin"}</h4>
                  <p className="text-sm text-slate-500">{profile?.email}</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t border-slate-100">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Administrative Tier
                  </span>
                  <span className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>Super Administrator</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Role Category
                  </span>
                  <span className="text-sm font-semibold text-slate-700 capitalize">
                    {profile?.activeRole}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
