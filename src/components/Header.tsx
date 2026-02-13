"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, LogOut } from "lucide-react";

export default function Header({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [liveActive, setLiveActive] = useState(false);

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
      window.open(
        window.location.href,
        "_blank",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      setLiveActive(true);
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Smart Bookmark</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLive}
            disabled={liveActive}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              liveActive
                ? "bg-green-100 text-green-800 cursor-default"
                : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700"
            }`}
          >
            <Radio className={`h-4 w-4 ${liveActive ? "animate-pulse" : ""}`} />
            {liveActive ? "Live" : "Go Live"}
          </button>
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
