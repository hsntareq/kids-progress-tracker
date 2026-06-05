"use client";

import React, { useState } from "react";
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { User, Users } from "lucide-react";

export default function LoginPage() {
  const { showToast } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [authRole, setAuthRole] = useState<"parent" | "child">("parent");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail({
          email,
          password,
          displayName,
          role: authRole,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const errorVal = err as Error;
      let message = errorVal.message || "An unexpected error occurred.";
      if (message.includes("auth/invalid-credential")) {
        message = "Invalid email or password.";
      } else if (message.includes("auth/email-already-in-use")) {
        message = "This email is already registered.";
      } else if (message.includes("auth/weak-password")) {
        message = "Password should be at least 6 characters.";
      }
      setAuthError(message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      await signInWithGoogle();
      showToast("Google login successful! Welcome.", "success");
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      const errorVal = err as Error;
      setAuthError(errorVal.message || "Google Authentication failed.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <div className="ui-app-bg min-h-screen flex items-center justify-center p-4 md:p-8">
      <main className="ui-panel w-full max-w-md p-6 md:p-8 enter-rise">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
            Family Quest MVP
          </p>
          <h1 className="ui-title mt-2 text-3xl font-bold text-slate-900">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isLogin
              ? "Sign in to track tasks and milestones"
              : "Set up your family profile"}
          </p>
        </div>

        {/* Auth Toggle */}
        <div className="flex border border-slate-200 rounded-xl p-1 mb-6 bg-slate-100/50">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              isLogin
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => {
              setIsLogin(true);
              setAuthError(null);
            }}
            type="button"
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              !isLogin
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => {
              setIsLogin(false);
              setAuthError(null);
            }}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm leading-relaxed enter-fade">
            <span className="font-semibold">Error:</span> {authError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleAuth}>
          {/* Role Switcher (only for Signup) */}
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Are you a Parent or a Kid?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`py-2.5 px-3 text-sm font-semibold border rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    authRole === "parent"
                      ? "border-teal-600 bg-teal-50/50 text-teal-800"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                  onClick={() => setAuthRole("parent")}
                >
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span>Parent</span>
                </button>
                <button
                  type="button"
                  className={`py-2.5 px-3 text-sm font-semibold border rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    authRole === "child"
                      ? "border-teal-600 bg-teal-50/50 text-teal-800"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                  onClick={() => setAuthRole("child")}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>Kid</span>
                </button>
              </div>
              {authRole === "child" && (
                <p className="text-xs text-teal-600 font-semibold leading-relaxed mt-1">
                  ✨ Note: If you have an invitation, you can accept it on the next screen. Otherwise, you can set up a new family group.
                </p>
              )}
            </div>
          )}

          {/* Name Field (only for Signup) */}
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Name
              </label>
              <input
                className="ui-input w-full"
                type="text"
                placeholder="e.g. John Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Email Address
            </label>
            <input
              className="ui-input w-full"
              type="email"
              placeholder="e.g. mail@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Password
            </label>
            <input
              className="ui-input w-full"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            className="ui-button-primary ui-focus w-full py-3 mt-4 text-center text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            type="submit"
            disabled={authSubmitting}
          >
            {authSubmitting ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-3 text-xs text-slate-400 font-bold uppercase tracking-wider">
            OR
          </span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {/* Google Auth Button */}
        <button
          className="ui-button-secondary ui-focus w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          onClick={handleGoogleAuth}
          disabled={authSubmitting}
          type="button"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M5.26620003,9.76451675 C6.19875003,6.93867623 8.85732146,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0272727,0 12,0 C7.30909091,0 3.25454545,2.69090909 1.25454545,6.61818182 L5.26620003,9.76451675 Z"
            />
            <path
              fill="#4285F4"
              d="M16.0407143,15.1195833 C15.0116071,15.845947 13.5683929,16.2727273 12,16.2727273 C8.85732146,16.2727273 6.19875003,14.243142 5.26620003,11.4173014 L1.25454545,14.5636364 C3.25454545,18.4909091 7.30909091,21.1818182 12,21.1818182 C14.9454545,21.1818182 17.6181818,20.1454545 19.6545455,18.3636364 L16.0407143,15.1195833 Z"
            />
            <path
              fill="#34A853"
              d="M19.6545455,18.3636364 C19.6545455,18.3636364 19.6545455,18.3636364 19.6545455,18.3636364 C22.3454545,15.9818182 24,12.2727273 24,8.18181818 C24,7.49090909 23.9090909,6.85454545 23.7636364,6.21818182 L12,6.21818182 L12,10.9090909 L18.7272727,10.9090909 C18.4,12.6 17.4363636,14.0727273 16.0407143,15.1195833 L19.6545455,18.3636364 Z"
            />
            <path
              fill="#FBBC05"
              d="M5.26620003,9.76451675 C5.01160714,10.2727273 4.90909091,10.8272727 4.90909091,11.4173014 C4.90909091,12.0073301 5.01160714,12.5618755 5.26620003,13.0700862 L1.25454545,16.2164211 C0.45454545,14.7727273 0,13.1454545 0,11.4173014 C0,9.6891483 0.45454545,8.0618755 1.25454545,6.61818182 L5.26620003,9.76451675 Z"
            />
          </svg>
          Google
        </button>
      </main>
    </div>
  );
}
