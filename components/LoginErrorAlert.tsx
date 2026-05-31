"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function LoginErrorAlert() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const errorParam = searchParams.get("error");
  const callbackParam = searchParams.get("callbackUrl");
  
  const [visible, setVisible] = useState(false);
  const [alertType, setAlertType] = useState<"error" | "info">("info");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    // If user is already logged in, do not show "Sign In Required" message
    if (session) {
      setVisible(false);
      return;
    }

    if (errorParam) {
      setVisible(true);
      setAlertType("error");
      setAlertTitle("Login Attempt Failed");
      
      switch (errorParam) {
        case "OAuthCallback":
          setAlertMessage("Google authentication was cancelled or failed to complete. Please try signing in again.");
          break;
        case "AccessDenied":
          setAlertMessage("Access Denied: You do not have permissions to access Nitech Estimates. Please verify your account or contact the administrator.");
          break;
        case "Configuration":
          setAlertMessage("Internal Configuration Error: The server has an OAuth credential issue. Please contact support.");
          break;
        case "Verification":
          setAlertMessage("Verification Error: Your email verification link is expired or invalid.");
          break;
        case "Signin":
        default:
          setAlertMessage("Failed to sign in. Please verify your credentials and try again.");
          break;
      }
    } else if (callbackParam) {
      setVisible(true);
      setAlertType("info");
      setAlertTitle("Sign In Required");
      setAlertMessage("Please sign in with Google to unlock and access the Nitech Estimate Builder.");
    } else {
      setVisible(false);
    }
  }, [errorParam, callbackParam, session]);

  const handleDismiss = () => {
    setVisible(false);
    // Clear query parameters from URL dynamically without full page reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      url.searchParams.delete("callbackUrl");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  };

  if (!visible) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 px-4 animate-slide-down">
      <div 
        className={`relative overflow-hidden flex items-start gap-4 p-4 rounded-2xl backdrop-blur-2xl border transition-all duration-300 ${
          alertType === "error" 
            ? "bg-red-500/10 border-red-500/40 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.25)] animate-shake animate-glow-pulse"
            : "bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.25)] border-t-amber-500/20"
        }`}
      >
        {/* Glow indicator line */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${alertType === "error" ? "bg-red-500" : "bg-amber-500"}`} />

        {/* Alert Icon */}
        <div 
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
            alertType === "error" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
          }`}
        >
          {alertType === "error" ? (
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 pr-6 pl-1 text-left">
          <h4 className={`text-base font-bold tracking-tight mb-0.5 ${alertType === "error" ? "text-red-200" : "text-amber-200"}`}>
            {alertTitle}
          </h4>
          <p className={`text-sm font-semibold leading-relaxed ${alertType === "error" ? "text-red-100/90" : "text-amber-100/90"}`}>
            {alertMessage}
          </p>
        </div>

        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className={`absolute top-3.5 right-3.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
            alertType === "error" 
              ? "text-red-400 hover:text-red-100 hover:bg-red-500/10" 
              : "text-amber-400 hover:text-amber-100 hover:bg-amber-500/10"
          }`}
          aria-label="Dismiss Alert"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
