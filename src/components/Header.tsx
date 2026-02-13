"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, LogOut, X, Wifi, WifiOff, Clock, Eye, Zap } from "lucide-react";

type SyncMode = "normal" | "time" | "webhook";
type ConnectionStatus = "connected" | "disconnected" | "connecting";

export default function Header({ 
  userEmail,
  syncMode,
  onSyncModeChange,
  connectionStatus,
}: { 
  userEmail: string;
  syncMode: SyncMode;
  onSyncModeChange: (mode: SyncMode) => void;
  connectionStatus: ConnectionStatus;
}) {
  const router = useRouter();
  const [liveActive, setLiveActive] = useState(false);
  const [isLiveWindow, setIsLiveWindow] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);

  // Check if this is a live window on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isLive = params.get("live") === "true";
    setIsLiveWindow(isLive);

    if (isLive) {
      localStorage.setItem("bookmark_live_active", "true");
      setLiveActive(true);
    }
  }, []);

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
      
      // Open live window with ?live=true parameter
      const liveUrl = `${window.location.origin}${window.location.pathname}?live=true`;
      
      const liveWindow = window.open(
        liveUrl,
        "bookmarkLiveWindow", // Named window
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
      // If this is the live window, close it
      window.close();
    } else {
      // If this is the main window, just deactivate
      localStorage.removeItem("bookmark_live_active");
      setLiveActive(false);
      
      // Try to close the live window
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
        return <Zap className="h-4 w-4" />;
    }
  };

  const getModeLabel = (mode: SyncMode) => {
    switch (mode) {
      case "normal":
        return "Normal";
      case "time":
        return "Time-Based";
      case "webhook":
        return "Webhook Live";
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
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Smart Bookmark</h1>
          {isLiveWindow && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 animate-pulse">
              🔴 Live Window
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Sync Mode Selector */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
              {getModeIcon(syncMode)}
              <select
                value={syncMode}
                onChange={(e) => onSyncModeChange(e.target.value as SyncMode)}
                className="appearance-none bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer pr-6"
              >
                <option value="normal">Normal (Tab Shift)</option>
                <option value="time">Time-Based (3s)</option>
                <option value="webhook">Webhook Live</option>
              </select>
              <button
                type="button"
                onClick={() => setShowModeInfo(!showModeInfo)}
                className="text-gray-400 hover:text-gray-600"
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
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
                        <Eye className="h-4 w-4" />
                        Normal (Tab Shift)
                      </div>
                      <p className="text-xs text-gray-600">
                        Updates when you switch to the tab. Low battery usage, minimal API calls.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
                        <Clock className="h-4 w-4" />
                        Time-Based (3s)
                      </div>
                      <p className="text-xs text-gray-600">
                        Polls for updates every 3 seconds. Consistent updates, higher battery usage.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-green-700 mb-1">
                        <Zap className="h-4 w-4" />
                        Webhook Live ⭐
                      </div>
                      <p className="text-xs text-gray-600">
                        Instant real-time updates via WebSocket. Recommended for best experience.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModeInfo(false)}
                    className="mt-3 w-full text-xs text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Connection Status */}
          {getConnectionIcon()}

          {/* Live Button */}
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

          <span className="text-sm text-gray-600 hidden sm:inline">{userEmail}</span>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { Radio, LogOut, X, Wifi, WifiOff, Clock, Eye, Zap } from "lucide-react";

// type SyncMode = "normal" | "time" | "webhook";
// type ConnectionStatus = "connected" | "disconnected" | "connecting";

// export default function Header({ 
//   userEmail,
//   syncMode,
//   onSyncModeChange,
//   connectionStatus,
// }: { 
//   userEmail: string;
//   syncMode: SyncMode;
//   onSyncModeChange: (mode: SyncMode) => void;
//   connectionStatus: ConnectionStatus;
// }) {
//   const router = useRouter();
//   const [liveActive, setLiveActive] = useState(false);
//   const [isLiveWindow, setIsLiveWindow] = useState(false);
//   const [showModeInfo, setShowModeInfo] = useState(false);

//   // Check if this is a live window on mount
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const isLive = params.get("live") === "true";
//     setIsLiveWindow(isLive);

//     if (isLive) {
//       localStorage.setItem("bookmark_live_active", "true");
//       setLiveActive(true);
//     }
//   }, []);

//   // Sync live state across tabs
//   useEffect(() => {
//     const checkLiveStatus = () => {
//       const isActive = localStorage.getItem("bookmark_live_active") === "true";
//       setLiveActive(isActive);
//     };

//     checkLiveStatus();

//     const handleStorageChange = (e: StorageEvent) => {
//       if (e.key === "bookmark_live_active") {
//         checkLiveStatus();
//       }
//     };

//     window.addEventListener("storage", handleStorageChange);
//     const interval = setInterval(checkLiveStatus, 500);

//     return () => {
//       window.removeEventListener("storage", handleStorageChange);
//       clearInterval(interval);
//     };
//   }, []);

//   const handleSignOut = async () => {
//     await fetch("/api/auth/signout", { method: "POST" });
//     router.push("/login");
//   };

//   const toggleLive = () => {
//     if (!liveActive) {
//       const width = 500;
//       const height = 700;
//       const left = window.screenX + window.outerWidth;
//       const top = window.screenY;
      
//       const liveUrl = `${window.location.origin}${window.location.pathname}?live=true`;
//       window.open(
//         liveUrl,
//         "_blank",
//         `width=${width},height=${height},left=${left},top=${top}`
//       );
      
//       localStorage.setItem("bookmark_live_active", "true");
//       setLiveActive(true);
//     }
//   };

//   const exitLive = () => {
//     if (isLiveWindow) {
//       window.close();
//     } else {
//       localStorage.removeItem("bookmark_live_active");
//       setLiveActive(false);
//     }
//   };

//   useEffect(() => {
//     const handleBeforeUnload = () => {
//       if (isLiveWindow) {
//         localStorage.removeItem("bookmark_live_active");
//       }
//     };

//     window.addEventListener("beforeunload", handleBeforeUnload);
//     return () => window.removeEventListener("beforeunload", handleBeforeUnload);
//   }, [isLiveWindow]);

//   const getModeIcon = (mode: SyncMode) => {
//     switch (mode) {
//       case "normal":
//         return <Eye className="h-4 w-4" />;
//       case "time":
//         return <Clock className="h-4 w-4" />;
//       case "webhook":
//         return <Zap className="h-4 w-4" />;
//     }
//   };

//   const getModeLabel = (mode: SyncMode) => {
//     switch (mode) {
//       case "normal":
//         return "Normal";
//       case "time":
//         return "Time-Based";
//       case "webhook":
//         return "Webhook Live";
//     }
//   };

//   const getConnectionIcon = () => {
//     if (syncMode === "normal") return null;
    
//     if (connectionStatus === "connected") {
//       return <Wifi className="h-4 w-4 text-green-600" />;
//     } else if (connectionStatus === "connecting") {
//       return <Wifi className="h-4 w-4 text-yellow-600 animate-pulse" />;
//     } else {
//       return <WifiOff className="h-4 w-4 text-red-600" />;
//     }
//   };

//   return (
//     <header className="border-b border-gray-200 bg-white">
//       <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
//         <div className="flex items-center gap-3">
//           <h1 className="text-xl font-bold text-gray-900">Smart Bookmark</h1>
//           {isLiveWindow && (
//             <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
//               Live Window
//             </span>
//           )}
//         </div>

//         <div className="flex items-center gap-3">
//           {/* Sync Mode Selector */}
//           <div className="relative">
//             <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
//               {getModeIcon(syncMode)}
//               <select
//                 value={syncMode}
//                 onChange={(e) => onSyncModeChange(e.target.value as SyncMode)}
//                 className="appearance-none bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer pr-6"
//               >
//                 <option value="normal">Normal (Tab Shift)</option>
//                 <option value="time">Time-Based (3s)</option>
//                 <option value="webhook">Webhook Live</option>
//               </select>
//               <button
//                 type="button"
//                 onClick={() => setShowModeInfo(!showModeInfo)}
//                 className="text-gray-400 hover:text-gray-600"
//                 title="Info about sync modes"
//               >
//                 <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//               </button>
//             </div>

//             {/* Info Popup */}
//             {showModeInfo && (
//               <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50">
//                 <div className="space-y-3">
//                   <div>
//                     <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
//                       <Eye className="h-4 w-4" />
//                       Normal (Tab Shift)
//                     </div>
//                     <p className="text-xs text-gray-600">
//                       Updates when you switch to the tab. Low battery usage, minimal API calls.
//                     </p>
//                   </div>
//                   <div>
//                     <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
//                       <Clock className="h-4 w-4" />
//                       Time-Based (3s)
//                     </div>
//                     <p className="text-xs text-gray-600">
//                       Polls for updates every 3 seconds. Consistent updates, higher battery usage.
//                     </p>
//                   </div>
//                   <div>
//                     <div className="flex items-center gap-2 font-semibold text-green-700 mb-1">
//                       <Zap className="h-4 w-4" />
//                       Webhook Live ⭐
//                     </div>
//                     <p className="text-xs text-gray-600">
//                       Instant real-time updates via WebSocket. Recommended for best experience.
//                     </p>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => setShowModeInfo(false)}
//                   className="mt-3 w-full text-xs text-gray-500 hover:text-gray-700"
//                 >
//                   Close
//                 </button>
//               </div>
//             )}
//           </div>

//           {/* Connection Status */}
//           {getConnectionIcon()}

//           {/* Live Button */}
//           {liveActive ? (
//             <button
//               type="button"
//               onClick={exitLive}
//               className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-200"
//             >
//               <Radio className="h-4 w-4 animate-pulse" />
//               {isLiveWindow ? "Close Live" : "Exit Live"}
//               <X className="h-3 w-3" />
//             </button>
//           ) : (
//             <button
//               type="button"
//               onClick={toggleLive}
//               className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-green-50 hover:text-green-700"
//             >
//               <Radio className="h-4 w-4" />
//               Go Live
//             </button>
//           )}

//           <span className="text-sm text-gray-600">{userEmail}</span>

//           <button
//             type="button"
//             onClick={handleSignOut}
//             className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
//           >
//             <LogOut className="h-4 w-4" />
//             Sign out
//           </button>
//         </div>
//       </div>
//     </header>
//   );
// }