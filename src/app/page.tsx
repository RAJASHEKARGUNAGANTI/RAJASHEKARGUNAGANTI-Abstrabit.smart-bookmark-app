"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";

type SyncMode = "normal" | "time" | "webhook";
type ConnectionStatus = "connected" | "disconnected" | "connecting";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncMode, setSyncMode] = useState<SyncMode>("webhook");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    // Load saved sync mode from localStorage
    const savedMode = localStorage.getItem("bookmark_sync_mode");
    if (savedMode && ["normal", "time", "webhook"].includes(savedMode)) {
      setSyncMode(savedMode as SyncMode);
    }
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        userEmail={user.email ?? ""}
        syncMode={syncMode}
        onSyncModeChange={handleSyncModeChange}
        connectionStatus={connectionStatus}
      />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Dashboard
          initialBookmarks={bookmarks}
          userId={user.id}
          syncMode={syncMode}
          onConnectionStatusChange={handleConnectionStatusChange}
        />
      </main>
    </div>
  );
}