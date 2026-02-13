"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";

type SyncMode = "normal" | "time" | "webhook";
type ConnectionStatus = "connected" | "disconnected" | "connecting";
type Theme = "light" | "dark";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  created_at: string;
  user_id: string;
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncMode, setSyncMode] = useState<SyncMode>(() => {
    if (typeof window === "undefined") return "normal";
    const savedMode = localStorage.getItem("bookmark_sync_mode");
    if (savedMode && ["normal", "time", "webhook"].includes(savedMode)) {
      return savedMode as SyncMode;
    }
    return "normal";
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("bookmark_theme") as Theme) || "light";
  });

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Load initial bookmarks
      const { data: bookmarksData } = await supabase
        .from("bookmarks")
        .select("*")
        .order("created_at", { ascending: false });

      setBookmarks(bookmarksData || []);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleSyncModeChange = (mode: SyncMode) => {
    setSyncMode(mode);
    localStorage.setItem("bookmark_sync_mode", mode);
    console.log("Sync mode changed to:", mode);
  };

  const handleConnectionStatusChange = (status: ConnectionStatus) => {
    setConnectionStatus(status);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("bookmark_theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
        <div className="text-lg text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <Header
        userEmail={user.email ?? ""}
        syncMode={syncMode}
        onSyncModeChange={handleSyncModeChange}
        connectionStatus={connectionStatus}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Dashboard
          initialBookmarks={bookmarks}
          syncMode={syncMode}
          onConnectionStatusChange={handleConnectionStatusChange}
        />
      </main>
    </div>
  );
}
