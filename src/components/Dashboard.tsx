"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  created_at: string;
  user_id: string;
};

type SyncMode = "normal" | "time" | "webhook";

export default function Dashboard({
  initialBookmarks,
  userId,
  syncMode,
  onConnectionStatusChange,
}: {
  initialBookmarks: Bookmark[];
  userId: string;
  syncMode: SyncMode;
  onConnectionStatusChange: (status: "connected" | "disconnected" | "connecting") => void;
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribingRef = useRef(false); // Prevent duplicate subscriptions

  // Fix hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Add debug log
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setDebugInfo(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
  }, []);

  const fetchBookmarks = useCallback(async () => {
    addDebugLog("Fetching bookmarks from API...");
    const res = await fetch("/api/bookmarks");
    if (res.ok) {
      const data = await res.json();
      setBookmarks(data);
      addDebugLog(`Fetched ${data.length} bookmarks`);
    } else {
      addDebugLog(`Failed to fetch bookmarks: ${res.status}`);
    }
  }, [addDebugLog]);

  // MODE 1: Normal - Tab Visibility Change
  useEffect(() => {
    if (syncMode !== "normal") return;
    
    addDebugLog("Normal mode activated");
    onConnectionStatusChange("disconnected");

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        addDebugLog("Tab became visible - fetching");
        fetchBookmarks();
      }
    };

    const handleFocus = () => {
      addDebugLog("Tab gained focus - fetching");
      fetchBookmarks();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      addDebugLog("Normal mode deactivated");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [syncMode, fetchBookmarks, onConnectionStatusChange, addDebugLog]);

  // MODE 2: Time-Based - Poll every 3 seconds
  useEffect(() => {
    if (syncMode !== "time") return;
    
    addDebugLog("Time-based mode activated (3s polling)");
    onConnectionStatusChange("connected");

    const interval = setInterval(() => {
      addDebugLog("Polling...");
      fetchBookmarks();
    }, 3000);

    return () => {
      addDebugLog("Time-based mode deactivated");
      clearInterval(interval);
    };
  }, [syncMode, fetchBookmarks, onConnectionStatusChange, addDebugLog]);

  // MODE 3: Webhook - Realtime + Broadcast (FIXED VERSION)
  useEffect(() => {
    if (syncMode !== "webhook") {
      // Clean up existing channel if switching modes
      if (channelRef.current) {
        addDebugLog("Switching away from webhook - cleaning up");
        const channelToRemove = channelRef.current;
        supabaseRef.current.removeChannel(channelToRemove);
        channelRef.current = null;
        isSubscribingRef.current = false;
      }
      return;
    }

    // Prevent duplicate subscriptions
    if (isSubscribingRef.current) {
      addDebugLog("Already subscribing, skipping...");
      return;
    }

    isSubscribingRef.current = true;
    const supabase = supabaseRef.current;
    
    addDebugLog("Webhook mode: Starting setup...");
    onConnectionStatusChange("connecting");

    // Use a single, stable channel name per user
    const channelName = `bookmarks-sync-${userId}`;
    
    // First, remove any existing channel with this name
    const existingChannels = supabase.getChannels();
    existingChannels.forEach(ch => {
      if (ch.topic === channelName) {
        addDebugLog(`Removing existing channel: ${channelName}`);
        supabase.removeChannel(ch);
      }
    });

    addDebugLog(`Creating channel: ${channelName}`);

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true }, // Receive our own broadcasts
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          addDebugLog(`🔔 Realtime event: ${payload.eventType}`);

          if (payload.eventType === "INSERT") {
            const newBookmark = payload.new as Bookmark;
            addDebugLog(`📥 INSERT: ${newBookmark.title}`);
            setBookmarks((prev) => {
              if (prev.some((b) => b.id === newBookmark.id)) {
                addDebugLog("⚠️ Duplicate bookmark, skipping");
                return prev;
              }
              return [newBookmark, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Bookmark;
            addDebugLog(`✏️ UPDATE: ${updated.title}`);
            setBookmarks((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b))
            );
          } else if (payload.eventType === "DELETE") {
            const oldBookmark = payload.old as { id: string };
            addDebugLog(`🗑️ DELETE: ${oldBookmark.id}`);
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== oldBookmark.id)
            );
          }
        }
      )
      .on(
        "broadcast",
        { event: "bookmark-update" },
        (payload: any) => {
          addDebugLog(`📡 Broadcast: ${payload.payload.type}`);
        }
      )
      .subscribe((status, err) => {
        addDebugLog(`Status: ${status}`);
        
        if (err) {
          addDebugLog(`❌ Error: ${err.message}`);
          console.error("Realtime subscription error:", err);
        }

        if (status === "SUBSCRIBED") {
          onConnectionStatusChange("connected");
          addDebugLog("✅ Connected!");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onConnectionStatusChange("disconnected");
          addDebugLog("❌ Connection failed");
        } else if (status === "CLOSED") {
          onConnectionStatusChange("disconnected");
          addDebugLog("Connection closed");
        } else {
          onConnectionStatusChange("connecting");
        }
      });

    channelRef.current = channel;

    return () => {
      addDebugLog("🧹 Cleanup: Removing channel");
      isSubscribingRef.current = false;
      
      if (channelRef.current) {
        const channelToRemove = channelRef.current;
        channelRef.current = null;
        
        // Use a timeout to ensure proper cleanup
        setTimeout(() => {
          supabase.removeChannel(channelToRemove);
        }, 0);
      }
    };
  }, [syncMode, userId, onConnectionStatusChange, addDebugLog]);

  // Broadcast update
  const broadcastUpdate = useCallback((type: string) => {
    if (channelRef.current && syncMode === "webhook") {
      addDebugLog(`📤 Broadcasting: ${type}`);
      channelRef.current.send({
        type: "broadcast",
        event: "bookmark-update",
        payload: { type, timestamp: Date.now() },
      });
    }
  }, [syncMode, addDebugLog]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const url = formData.get("url") as string;

    try {
      addDebugLog(`➕ Adding: ${title}`);
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add bookmark");
      }

      formRef.current?.reset();
      addDebugLog("✅ Added successfully");
      
      broadcastUpdate("insert");

      if (syncMode !== "webhook") {
        await fetchBookmarks();
      }
    } catch (err: any) {
      addDebugLog(`❌ Error: ${err.message}`);
      console.error("Failed to add bookmark:", err);
      alert("Failed to add bookmark. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim() || !editUrl.trim()) {
      alert("Title and URL cannot be empty");
      return;
    }

    setEditLoading(true);
    try {
      addDebugLog(`✏️ Updating: ${id}`);
      const res = await fetch("/api/bookmarks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: editTitle, url: editUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update bookmark");
      }

      cancelEdit();
      addDebugLog("✅ Updated successfully");
      
      broadcastUpdate("update");

      if (syncMode !== "webhook") {
        await fetchBookmarks();
      }
    } catch (err: any) {
      addDebugLog(`❌ Error: ${err.message}`);
      console.error("Failed to update bookmark:", err);
      alert("Failed to update bookmark. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bookmark?")) {
      return;
    }

    setDeletingId(id);
    try {
      addDebugLog(`🗑️ Deleting: ${id}`);
      const res = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete bookmark");
      }

      addDebugLog("✅ Deleted successfully");
      
      broadcastUpdate("delete");

      if (syncMode !== "webhook") {
        await fetchBookmarks();
      }
    } catch (err: any) {
      addDebugLog(`❌ Error: ${err.message}`);
      console.error("Failed to delete bookmark:", err);
      alert("Failed to delete bookmark. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Debug Panel */}
      {syncMode === "webhook" && (
        <div className="mb-4 rounded-lg bg-gray-900 p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-green-400">
              🔍 Webhook Debug Console
            </h3>
            <button
              onClick={() => setDebugInfo([])}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 text-xs font-mono text-gray-300 max-h-40 overflow-y-auto bg-gray-950 rounded p-2">
            {debugInfo.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              debugInfo.map((log, i) => (
                <div key={i} className="py-0.5">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Bookmark Form */}
      <form
        ref={formRef}
        onSubmit={handleAdd}
        className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-gray-200"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Add Bookmark
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="title"
            placeholder="Title"
            required
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="url"
            name="url"
            placeholder="https://example.com"
            required
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </div>
      </form>

      {/* Bookmark List */}
      {bookmarks.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center border border-gray-200 shadow-sm">
          <p className="text-gray-500">No bookmarks yet. Add one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm transition-colors hover:bg-gray-50"
            >
              {editingId === bookmark.id ? (
                /* Edit Mode */
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                    aria-label="Edit title"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://example.com"
                    aria-label="Edit URL"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdate(bookmark.id)}
                      disabled={editLoading}
                      className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editLoading ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg bg-gray-100 px-4 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-gray-900">
                      {bookmark.title}
                    </h3>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-blue-600 hover:underline"
                    >
                      {bookmark.url}
                    </a>
                    {mounted && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(bookmark.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(bookmark)}
                      className="rounded-lg px-3 py-1.5 text-sm text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(bookmark.id)}
                      disabled={deletingId === bookmark.id}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === bookmark.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
