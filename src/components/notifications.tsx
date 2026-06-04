"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./auth-provider";
import { Bell, Mail } from "lucide-react";

export default function NotificationCenter() {
  const { pendingInvite, acceptChildInvite, rejectChildInvite } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await acceptChildInvite();
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await rejectChildInvite();
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const hasNotifications = !!pendingInvite;
  const notificationCount = hasNotifications ? 1 : 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100/80 rounded-xl focus:outline-none ui-focus transition-all duration-200 cursor-pointer flex items-center justify-center text-slate-700 hover:text-slate-900"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {hasNotifications && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {notificationCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 ui-panel p-4 z-50 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xl rounded-2xl enter-rise">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <h3 className="font-bold text-slate-800 text-sm ui-title">Notifications</h3>
            {hasNotifications && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                New Action Required
              </span>
            )}
          </div>

          <div className="space-y-3">
            {!hasNotifications ? (
              <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                <Bell className="w-8 h-8 text-slate-300 opacity-60 mb-1" />
                <span>All caught up! No new notifications.</span>
              </div>
            ) : (
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/50 to-violet-50/40 rounded-xl border border-indigo-100/50 enter-fade flex flex-col gap-3">
                <div className="flex gap-3">
                  <Mail className="w-6 h-6 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">Family Quest Invitation</h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                      You have been invited to join the <strong>{pendingInvite.familyName}</strong> family group as a Child.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="px-3.5 py-2 text-[11px] font-bold border border-slate-200/80 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="px-4 py-2 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {actionLoading ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Accept & Join"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
