"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, LogOut, X, Wifi, WifiOff, Clock, Eye, Zap, Sun, Moon, BookMarkedIcon } from "lucide-react";
type SyncMode = "normal" | "time" | "webhook";
type ConnectionStatus = "connected" | "disconnected" | "connecting";
type Theme = "light" | "dark";

export default function Header({
  userEmail,
  syncMode,
  onSyncModeChange,
  connectionStatus,
  theme,
  onThemeToggle,
}: {
  userEmail: string;
  syncMode: SyncMode;
  onSyncModeChange: (mode: SyncMode) => void;
  connectionStatus: ConnectionStatus;
  theme: Theme;
  onThemeToggle: () => void;
}) {
  const router = useRouter();
  const [isLiveWindow] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("live") === "true";
  });
  const [liveActive, setLiveActive] = useState(() => {
    if (typeof window === "undefined") return false;
    const isLive = new URLSearchParams(window.location.search).get("live") === "true";
    return isLive || localStorage.getItem("bookmark_live_active") === "true";
  });
  const [showModeInfo, setShowModeInfo] = useState(false);

  // Set localStorage on mount if this is a live window
  useEffect(() => {
    if (isLiveWindow) {
      localStorage.setItem("bookmark_live_active", "true");
    }
  }, [isLiveWindow]);

  // Sync live state across tabs
  useEffect(() => {
    const checkLiveStatus = () => {
      const isActive = localStorage.getItem("bookmark_live_active") === "true";
      setLiveActive(isActive);
    };

    checkLiveStatus();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "bookmark_live_active") {
        checkLiveStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
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

      const liveUrl = `${window.location.origin}${window.location.pathname}?live=true`;

      const liveWindow = window.open(
        liveUrl,
        "bookmarkLiveWindow",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (liveWindow) {
        localStorage.setItem("bookmark_live_active", "true");
        setLiveActive(true);
      } else {
        alert("Please allow popups for this site to use Live mode");
      }
    }
  };

  const exitLive = () => {
    if (isLiveWindow) {
      window.close();
    } else {
      localStorage.removeItem("bookmark_live_active");
      setLiveActive(false);

      try {
        const liveWindow = window.open("", "bookmarkLiveWindow");
        if (liveWindow) {
          liveWindow.close();
        }
      } catch (e) {
        console.log("Could not close live window:", e);
      }
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLiveWindow) {
        localStorage.removeItem("bookmark_live_active");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isLiveWindow]);

  const getModeIcon = (mode: SyncMode) => {
    switch (mode) {
      case "normal":
        return <Eye className="h-4 w-4" />;
      case "time":
        return <Clock className="h-4 w-4" />;
      case "webhook":
        return <Zap className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConnectionIcon = () => {
    if (syncMode === "normal") return null;

    if (connectionStatus === "connected") {
      return <Wifi className="h-4 w-4 text-green-600" />;
    } else if (connectionStatus === "connecting") {
      return <Wifi className="h-4 w-4 text-yellow-600 animate-pulse" />;
    } else {
      return <WifiOff className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-colors">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Logo and Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <BookMarkedIcon className="text-white text-lg font-bold" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">Smart Bookmark</h1>
          </div>
          {isLiveWindow && (
            <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-3 py-1 text-xs font-medium text-green-800 dark:text-green-300 animate-pulse">
              🔴 Live Window
            </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync Mode Selector */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 shadow-sm hover:border-gray-400 dark:hover:border-slate-500 transition-colors">
              {getModeIcon(syncMode)}
              <select
                title="types"
                value={syncMode}
                onChange={(e) => onSyncModeChange(e.target.value as SyncMode)}
                className="appearance-none bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer pr-7"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.25rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                }}
              >
                <option value="normal">Normal (Tab Shift)</option>
                <option value="time">Time-Based (3s)</option>
                <option value="webhook" disabled>Webhook Live (Coming Soon)</option>
              </select>
              <button
                type="button"
                onClick={() => setShowModeInfo(!showModeInfo)}
                className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Info about sync modes"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            {/* Info Popup */}
            {showModeInfo && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowModeInfo(false)}
                />
                {/* Popup */}
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl p-4 z-50">
                  <div className="space-y-3">
                    <div className="pb-3 border-b border-gray-100 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Sync Modes</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Choose how bookmarks sync across tabs</p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-1">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Normal (Tab Shift)</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                          Updates when you switch to the tab. Low battery usage, minimal API calls.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-1">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="text-sm">Time-Based (3s)</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                          Polls for updates every 3 seconds. Consistent updates, higher battery usage.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400 mb-1">
                          <Zap className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">Webhook Live</span>
                          <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                          Instant real-time updates via WebSocket. Currently under development.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModeInfo(false)}
                    className="mt-3 w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Connection Status */}
          {getConnectionIcon()}

          {/* Dark/Light Mode Toggle */}
          <button
            type="button"
            onClick={onThemeToggle}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 transition-all hover:bg-gray-100 dark:hover:bg-slate-600 hover:shadow-sm"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4 text-yellow-400" />
            )}
          </button>

          {/* Live Button */}
          {liveActive ? (
            <button
              type="button"
              onClick={exitLive}
              className="flex items-center gap-2 rounded-xl bg-green-100 dark:bg-green-900/40 px-3 sm:px-4 py-2 text-sm font-medium text-green-800 dark:text-green-300 transition-all hover:bg-green-200 dark:hover:bg-green-900/60 hover:shadow-md"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              <span className="hidden sm:inline">{isLiveWindow ? "Close Live" : "Exit Live"}</span>
              <X className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleLive}
              className="flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm"
            >
              <Radio className="h-4 w-4" />
              <span className="hidden sm:inline">Go Live</span>
            </button>
          )}

          {/* User Email */}
          <span className="text-sm text-gray-600 dark:text-gray-400 hidden lg:inline max-w-[150px] truncate" title={userEmail}>
            {userEmail}
          </span>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-700 hover:shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
