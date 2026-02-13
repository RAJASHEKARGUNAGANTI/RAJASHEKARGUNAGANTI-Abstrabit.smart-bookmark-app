"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, LogOut, X } from "lucide-react";

export default function Header({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [liveActive, setLiveActive] = useState(false);
  const [isLiveWindow, setIsLiveWindow] = useState(false);

  // Check if this is a live window on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isLive = params.get("live") === "true";
    setIsLiveWindow(isLive);

    // Update localStorage
    if (isLive) {
      localStorage.setItem("bookmark_live_active", "true");
      setLiveActive(true);
    }
  }, []);

  // Sync live state across tabs using localStorage
  useEffect(() => {
    const checkLiveStatus = () => {
      const isActive = localStorage.getItem("bookmark_live_active") === "true";
      setLiveActive(isActive);
    };

    // Check initial state
    checkLiveStatus();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "bookmark_live_active") {
        checkLiveStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also poll every 500ms to catch same-tab updates
    const interval = setInterval(checkLiveStatus, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  };

  const toggleLive = () => {
    if (!liveActive) {
      const width = 500;
      const height = 700;
      const left = window.screenX + window.outerWidth;
      const top = window.screenY;
      
      // Open new window with ?live=true parameter
      const liveUrl = `${window.location.origin}${window.location.pathname}?live=true`;
      window.open(
        liveUrl,
        "_blank",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      localStorage.setItem("bookmark_live_active", "true");
      setLiveActive(true);
    }
  };

  const exitLive = () => {
    if (isLiveWindow) {
      // If this is the live window, close it
      window.close();
    } else {
      // If this is the main window, just deactivate
      localStorage.removeItem("bookmark_live_active");
      setLiveActive(false);
    }
  };

  // Listen for when live window closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLiveWindow) {
        localStorage.removeItem("bookmark_live_active");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isLiveWindow]);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Smart Bookmark</h1>
          {isLiveWindow && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              Live Window
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {liveActive ? (
            <button
              type="button"
              onClick={exitLive}
              className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-200"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              {isLiveWindow ? "Close Live" : "Exit Live"}
              <X className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleLive}
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-green-50 hover:text-green-700"
            >
              <Radio className="h-4 w-4" />
              Go Live
            </button>
          )}
          <span className="text-sm text-gray-600">{userEmail}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}