"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Toaster, toast } from "react-hot-toast";
import { 
  Search, 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Hash,
  Filter,
  Clock,
  Save,
  Bookmark as BookmarkIcon
} from "lucide-react";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  description: string | null;
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
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [showHashtagFilter, setShowHashtagFilter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribingRef = useRef(false);

  // Fix hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract hashtags from text
  const extractHashtags = (text: string): string[] => {
    if (!text) return [];
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? [...new Set(matches)] : [];
  };

  // Get all unique hashtags from all bookmarks
  const allHashtags = useCallback(() => {
    const tags = new Set<string>();
    bookmarks.forEach(bookmark => {
      if (bookmark.description) {
        extractHashtags(bookmark.description).forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [bookmarks]);

  // Filter bookmarks based on search query and selected hashtag
  const filteredBookmarks = useCallback(() => {
    let filtered = bookmarks;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bookmark => 
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.url.toLowerCase().includes(query) ||
        (bookmark.description && bookmark.description.toLowerCase().includes(query))
      );
    }

    // Filter by selected hashtag
    if (selectedHashtag) {
      filtered = filtered.filter(bookmark => 
        bookmark.description && extractHashtags(bookmark.description).includes(selectedHashtag)
      );
    }

    return filtered;
  }, [bookmarks, searchQuery, selectedHashtag]);

  // Toggle card expansion
  const toggleCardExpansion = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Check if description needs truncation
  const needsTruncation = (description: string | null): boolean => {
    if (!description) return false;
    return description.length > 150;
  };

  // Render description with highlighted hashtags
  const renderDescription = (description: string | null, bookmarkId: string) => {
    if (!description) return null;
    
    const isExpanded = expandedCards.has(bookmarkId);
    const shouldTruncate = needsTruncation(description) && !isExpanded;
    const displayText = shouldTruncate ? description.slice(0, 150) + "..." : description;
    
    const parts = displayText.split(/(#[\w]+)/g);
    return (
      <div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {parts.map((part, index) => {
            if (part.startsWith('#')) {
              return (
                <span
                  key={index}
                  className="text-blue-600 font-medium cursor-pointer hover:text-blue-700 hover:underline transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHashtag(part);
                    setShowHashtagFilter(true);
                    toast.success(`Filtering by ${part}`);
                  }}
                >
                  {part}
                </span>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </p>
        {needsTruncation(description) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCardExpansion(bookmarkId);
            }}
            className="flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                Show less
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Show more
              </>
            )}
          </button>
        )}
      </div>
    );
  };

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
      toast.error("Failed to fetch bookmarks");
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

  // MODE 3: Webhook - Realtime + Broadcast
  useEffect(() => {
    if (syncMode !== "webhook") {
      if (channelRef.current) {
        addDebugLog("Switching away from webhook - cleaning up");
        const channelToRemove = channelRef.current;
        supabaseRef.current.removeChannel(channelToRemove);
        channelRef.current = null;
        isSubscribingRef.current = false;
      }
      return;
    }

    if (isSubscribingRef.current) {
      addDebugLog("Already subscribing, skipping...");
      return;
    }

    isSubscribingRef.current = true;
    const supabase = supabaseRef.current;
    
    addDebugLog("Webhook mode: Starting setup...");
    onConnectionStatusChange("connecting");

    const channelName = `bookmarks-sync-${userId}`;
    
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
          broadcast: { self: true },
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
    const description = formData.get("description") as string;

    try {
      addDebugLog(`➕ Adding: ${title}`);
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add bookmark");
      }

      formRef.current?.reset();
      setShowAddForm(false);
      addDebugLog("✅ Added successfully");
      toast.success("Bookmark added successfully!");
      
      broadcastUpdate("insert");

      if (syncMode !== "webhook") {
        await fetchBookmarks();
      }
    } catch (err: any) {
      addDebugLog(`❌ Error: ${err.message}`);
      console.error("Failed to add bookmark:", err);
      toast.error(err.message || "Failed to add bookmark");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditDescription(bookmark.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
    setEditDescription("");
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim() || !editUrl.trim()) {
      toast.error("Title and URL cannot be empty");
      return;
    }

    setEditLoading(true);
    try {
      addDebugLog(`✏️ Updating: ${id}`);
      const res = await fetch("/api/bookmarks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: editTitle, url: editUrl, description: editDescription }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update bookmark");
      }

      cancelEdit();
      addDebugLog("✅ Updated successfully");
      toast.success("Bookmark updated successfully!");
      
      broadcastUpdate("update");

      if (syncMode !== "webhook") {
        await fetchBookmarks();
      }
    } catch (err: any) {
      addDebugLog(`❌ Error: ${err.message}`);
      console.error("Failed to update bookmark:", err);
      toast.error(err.message || "Failed to update bookmark");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
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
      toast.success("Bookmark deleted successfully!");
      
      broadcastUpdate("delete");

      if (syncMode !== "webhook") {
        await fetchBookmarks();
      }
    } catch (err: any) {
      addDebugLog(`❌ Error: ${err.message}`);
      console.error("Failed to delete bookmark:", err);
      toast.error(err.message || "Failed to delete bookmark");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Debug Panel */}
      {syncMode === "webhook" && (
        <div className="mb-6 rounded-xl bg-gray-900 p-4 border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2">
              <Filter size={16} />
              Webhook Debug Console
            </h3>
            <button
              onClick={() => setDebugInfo([])}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 text-xs font-mono text-gray-300 max-h-40 overflow-y-auto bg-gray-950 rounded-lg p-3">
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

      {/* Search and Filter Bar */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-md border border-gray-100">
        <div className="flex flex-col gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search bookmarks by title, URL, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Filter Toggle and Active Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowHashtagFilter(!showHashtagFilter)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                showHashtagFilter
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Hash size={16} />
              {showHashtagFilter ? 'Hide Filters' : 'Show Filters'}
              {allHashtags().length > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  showHashtagFilter ? 'bg-blue-700' : 'bg-gray-200'
                }`}>
                  {allHashtags().length}
                </span>
              )}
            </button>

            {selectedHashtag && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-500 rounded-lg shadow-sm">
                <Hash size={14} className="text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">
                  {selectedHashtag}
                </span>
                <button
                  onClick={() => {
                    setSelectedHashtag(null);
                    toast.success("Filter cleared");
                  }}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          
          {/* Hashtag Filter Pills - Collapsible */}
          {showHashtagFilter && allHashtags().length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
              {allHashtags().map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedHashtag(tag);
                    toast.success(`Filtering by ${tag}`);
                  }}
                  className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium transition-all ${
                    selectedHashtag === tag
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  <Hash size={14} />
                  {tag.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Bookmark Section - Collapsible */}
      <div className="mb-8 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md overflow-hidden">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full p-6 flex items-center justify-between hover:bg-blue-100/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg group-hover:scale-110 transition-transform shadow-md">
                <BookmarkIcon size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">Add New Bookmark</span>
            </div>
            <Plus size={28} className="text-blue-600 group-hover:rotate-90 transition-transform" />
          </button>
        ) : (
          <form
            ref={formRef}
            onSubmit={handleAdd}
            className="p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <BookmarkIcon size={24} className="text-blue-600" />
                Add New Bookmark
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  formRef.current?.reset();
                }}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-3">
              <input
                type="text"
                name="title"
                placeholder="Title"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <input
                type="url"
                name="url"
                placeholder="https://example.com"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <textarea
                name="description"
                placeholder="Description (use #hashtags for easy filtering)..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Add Bookmark
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bookmark Grid */}
      {filteredBookmarks().length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center border border-gray-200 shadow-md">
          <BookmarkIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">
            {searchQuery || selectedHashtag 
              ? "No bookmarks match your search criteria." 
              : "No bookmarks yet. Add one above!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookmarks().map((bookmark) => (
            <div
              key={bookmark.id}
              className="rounded-xl bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
              style={{ height: expandedCards.has(bookmark.id) ? 'auto' : '320px' }}
            >
              {editingId === bookmark.id ? (
                /* Edit Mode */
                <div className="p-6 flex flex-col gap-3 h-full">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                    aria-label="Edit title"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://example.com"
                    aria-label="Edit URL"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (use #hashtags for easy filtering)..."
                    aria-label="Edit description"
                    rows={3}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none flex-1"
                  />
                  <div className="flex gap-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => handleUpdate(bookmark.id)}
                      disabled={editLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {editLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 font-medium transition-all hover:bg-gray-200"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex flex-col h-full">
                  {/* Card Header */}
                  <div className="p-6 pb-4 border-b border-gray-100">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">
                      {bookmark.title}
                    </h3>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors group"
                    >
                      <ExternalLink size={14} className="group-hover:scale-110 transition-transform" />
                      <span className="truncate">{bookmark.url}</span>
                    </a>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 pt-4 flex-1 overflow-hidden">
                    {bookmark.description && (
                      <>
                        {renderDescription(bookmark.description, bookmark.id)}
                        
                        {/* Hashtag Pills */}
                        {extractHashtags(bookmark.description).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {extractHashtags(bookmark.description).map(tag => (
                              <span
                                key={tag}
                                onClick={() => {
                                  setSelectedHashtag(tag);
                                  setShowHashtagFilter(true);
                                  toast.success(`Filtering by ${tag}`);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full cursor-pointer hover:bg-blue-200 transition-all hover:scale-105 font-medium shadow-sm"
                              >
                                <Hash size={12} />
                                {tag.slice(1)}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="py-2 px-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={14} />
                      {mounted && new Date(bookmark.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(bookmark)}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-blue-600 transition-all hover:bg-blue-50 font-medium"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this bookmark?")) {
                            handleDelete(bookmark.id);
                          }
                        }}
                        disabled={deletingId === bookmark.id}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 transition-all hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {deletingId === bookmark.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Trash2 size={14} />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
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

// "use client";

// import { createClient } from "@/lib/supabase/client";
// import { useEffect, useRef, useState, useCallback } from "react";
// import { RealtimeChannel } from "@supabase/supabase-js";
// import { Toaster, toast } from "react-hot-toast";

// type Bookmark = {
//   id: string;
//   url: string;
//   title: string;
//   description: string | null;
//   created_at: string;
//   user_id: string;
// };

// type SyncMode = "normal" | "time" | "webhook";

// export default function Dashboard({
//   initialBookmarks,
//   userId,
//   syncMode,
//   onConnectionStatusChange,
// }: {
//   initialBookmarks: Bookmark[];
//   userId: string;
//   syncMode: SyncMode;
//   onConnectionStatusChange: (status: "connected" | "disconnected" | "connecting") => void;
// }) {
//   const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
//   const [loading, setLoading] = useState(false);
//   const [deletingId, setDeletingId] = useState<string | null>(null);
//   const [editingId, setEditingId] = useState<string | null>(null);
//   const [editTitle, setEditTitle] = useState("");
//   const [editUrl, setEditUrl] = useState("");
//   const [editDescription, setEditDescription] = useState("");
//   const [editLoading, setEditLoading] = useState(false);
//   const [mounted, setMounted] = useState(false);
//   const [debugInfo, setDebugInfo] = useState<string[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
//   const formRef = useRef<HTMLFormElement>(null);
//   const supabaseRef = useRef(createClient());
//   const channelRef = useRef<RealtimeChannel | null>(null);
//   const isSubscribingRef = useRef(false);

//   // Fix hydration
//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   // Extract hashtags from text
//   const extractHashtags = (text: string): string[] => {
//     if (!text) return [];
//     const hashtagRegex = /#[\w]+/g;
//     const matches = text.match(hashtagRegex);
//     return matches ? [...new Set(matches)] : [];
//   };

//   // Get all unique hashtags from all bookmarks
//   const allHashtags = useCallback(() => {
//     const tags = new Set<string>();
//     bookmarks.forEach(bookmark => {
//       if (bookmark.description) {
//         extractHashtags(bookmark.description).forEach(tag => tags.add(tag));
//       }
//     });
//     return Array.from(tags).sort();
//   }, [bookmarks]);

//   // Filter bookmarks based on search query and selected hashtag
//   const filteredBookmarks = useCallback(() => {
//     let filtered = bookmarks;

//     // Filter by search query
//     if (searchQuery.trim()) {
//       const query = searchQuery.toLowerCase();
//       filtered = filtered.filter(bookmark => 
//         bookmark.title.toLowerCase().includes(query) ||
//         bookmark.url.toLowerCase().includes(query) ||
//         (bookmark.description && bookmark.description.toLowerCase().includes(query))
//       );
//     }

//     // Filter by selected hashtag
//     if (selectedHashtag) {
//       filtered = filtered.filter(bookmark => 
//         bookmark.description && extractHashtags(bookmark.description).includes(selectedHashtag)
//       );
//     }

//     return filtered;
//   }, [bookmarks, searchQuery, selectedHashtag]);

//   // Render description with highlighted hashtags
//   const renderDescription = (description: string | null) => {
//     if (!description) return null;
    
//     const parts = description.split(/(#[\w]+)/g);
//     return (
//       <p className="text-sm text-gray-600 mt-2">
//         {parts.map((part, index) => {
//           if (part.startsWith('#')) {
//             return (
//               <span
//                 key={index}
//                 className="text-blue-600 font-medium cursor-pointer hover:underline"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setSelectedHashtag(part);
//                   toast.success(`Filtering by ${part}`);
//                 }}
//               >
//                 {part}
//               </span>
//             );
//           }
//           return <span key={index}>{part}</span>;
//         })}
//       </p>
//     );
//   };

//   // Add debug log
//   const addDebugLog = useCallback((message: string) => {
//     const timestamp = new Date().toLocaleTimeString();
//     console.log(`[${timestamp}] ${message}`);
//     setDebugInfo(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
//   }, []);

//   const fetchBookmarks = useCallback(async () => {
//     addDebugLog("Fetching bookmarks from API...");
//     const res = await fetch("/api/bookmarks");
//     if (res.ok) {
//       const data = await res.json();
//       setBookmarks(data);
//       addDebugLog(`Fetched ${data.length} bookmarks`);
//     } else {
//       addDebugLog(`Failed to fetch bookmarks: ${res.status}`);
//       toast.error("Failed to fetch bookmarks");
//     }
//   }, [addDebugLog]);

//   // MODE 1: Normal - Tab Visibility Change
//   useEffect(() => {
//     if (syncMode !== "normal") return;
    
//     addDebugLog("Normal mode activated");
//     onConnectionStatusChange("disconnected");

//     const handleVisibilityChange = () => {
//       if (!document.hidden) {
//         addDebugLog("Tab became visible - fetching");
//         fetchBookmarks();
//       }
//     };

//     const handleFocus = () => {
//       addDebugLog("Tab gained focus - fetching");
//       fetchBookmarks();
//     };

//     document.addEventListener("visibilitychange", handleVisibilityChange);
//     window.addEventListener("focus", handleFocus);

//     return () => {
//       addDebugLog("Normal mode deactivated");
//       document.removeEventListener("visibilitychange", handleVisibilityChange);
//       window.removeEventListener("focus", handleFocus);
//     };
//   }, [syncMode, fetchBookmarks, onConnectionStatusChange, addDebugLog]);

//   // MODE 2: Time-Based - Poll every 3 seconds
//   useEffect(() => {
//     if (syncMode !== "time") return;
    
//     addDebugLog("Time-based mode activated (3s polling)");
//     onConnectionStatusChange("connected");

//     const interval = setInterval(() => {
//       addDebugLog("Polling...");
//       fetchBookmarks();
//     }, 3000);

//     return () => {
//       addDebugLog("Time-based mode deactivated");
//       clearInterval(interval);
//     };
//   }, [syncMode, fetchBookmarks, onConnectionStatusChange, addDebugLog]);

//   // MODE 3: Webhook - Realtime + Broadcast
//   useEffect(() => {
//     if (syncMode !== "webhook") {
//       if (channelRef.current) {
//         addDebugLog("Switching away from webhook - cleaning up");
//         const channelToRemove = channelRef.current;
//         supabaseRef.current.removeChannel(channelToRemove);
//         channelRef.current = null;
//         isSubscribingRef.current = false;
//       }
//       return;
//     }

//     if (isSubscribingRef.current) {
//       addDebugLog("Already subscribing, skipping...");
//       return;
//     }

//     isSubscribingRef.current = true;
//     const supabase = supabaseRef.current;
    
//     addDebugLog("Webhook mode: Starting setup...");
//     onConnectionStatusChange("connecting");

//     const channelName = `bookmarks-sync-${userId}`;
    
//     const existingChannels = supabase.getChannels();
//     existingChannels.forEach(ch => {
//       if (ch.topic === channelName) {
//         addDebugLog(`Removing existing channel: ${channelName}`);
//         supabase.removeChannel(ch);
//       }
//     });

//     addDebugLog(`Creating channel: ${channelName}`);

//     const channel = supabase
//       .channel(channelName, {
//         config: {
//           broadcast: { self: true },
//         },
//       })
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "bookmarks",
//           filter: `user_id=eq.${userId}`,
//         },
//         (payload) => {
//           addDebugLog(`🔔 Realtime event: ${payload.eventType}`);

//           if (payload.eventType === "INSERT") {
//             const newBookmark = payload.new as Bookmark;
//             addDebugLog(`📥 INSERT: ${newBookmark.title}`);
//             setBookmarks((prev) => {
//               if (prev.some((b) => b.id === newBookmark.id)) {
//                 addDebugLog("⚠️ Duplicate bookmark, skipping");
//                 return prev;
//               }
//               return [newBookmark, ...prev];
//             });
//           } else if (payload.eventType === "UPDATE") {
//             const updated = payload.new as Bookmark;
//             addDebugLog(`✏️ UPDATE: ${updated.title}`);
//             setBookmarks((prev) =>
//               prev.map((b) => (b.id === updated.id ? updated : b))
//             );
//           } else if (payload.eventType === "DELETE") {
//             const oldBookmark = payload.old as { id: string };
//             addDebugLog(`🗑️ DELETE: ${oldBookmark.id}`);
//             setBookmarks((prev) =>
//               prev.filter((b) => b.id !== oldBookmark.id)
//             );
//           }
//         }
//       )
//       .on(
//         "broadcast",
//         { event: "bookmark-update" },
//         (payload: any) => {
//           addDebugLog(`📡 Broadcast: ${payload.payload.type}`);
//         }
//       )
//       .subscribe((status, err) => {
//         addDebugLog(`Status: ${status}`);
        
//         if (err) {
//           addDebugLog(`❌ Error: ${err.message}`);
//           console.error("Realtime subscription error:", err);
//         }

//         if (status === "SUBSCRIBED") {
//           onConnectionStatusChange("connected");
//           addDebugLog("✅ Connected!");
//         } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
//           onConnectionStatusChange("disconnected");
//           addDebugLog("❌ Connection failed");
//         } else if (status === "CLOSED") {
//           onConnectionStatusChange("disconnected");
//           addDebugLog("Connection closed");
//         } else {
//           onConnectionStatusChange("connecting");
//         }
//       });

//     channelRef.current = channel;

//     return () => {
//       addDebugLog("🧹 Cleanup: Removing channel");
//       isSubscribingRef.current = false;
      
//       if (channelRef.current) {
//         const channelToRemove = channelRef.current;
//         channelRef.current = null;
        
//         setTimeout(() => {
//           supabase.removeChannel(channelToRemove);
//         }, 0);
//       }
//     };
//   }, [syncMode, userId, onConnectionStatusChange, addDebugLog]);

//   // Broadcast update
//   const broadcastUpdate = useCallback((type: string) => {
//     if (channelRef.current && syncMode === "webhook") {
//       addDebugLog(`📤 Broadcasting: ${type}`);
//       channelRef.current.send({
//         type: "broadcast",
//         event: "bookmark-update",
//         payload: { type, timestamp: Date.now() },
//       });
//     }
//   }, [syncMode, addDebugLog]);

//   const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setLoading(true);

//     const formData = new FormData(e.currentTarget);
//     const title = formData.get("title") as string;
//     const url = formData.get("url") as string;
//     const description = formData.get("description") as string;

//     try {
//       addDebugLog(`➕ Adding: ${title}`);
//       const res = await fetch("/api/bookmarks", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ title, url, description }),
//       });

//       if (!res.ok) {
//         const data = await res.json();
//         throw new Error(data.error || "Failed to add bookmark");
//       }

//       formRef.current?.reset();
//       addDebugLog("✅ Added successfully");
//       toast.success("Bookmark added successfully!");
      
//       broadcastUpdate("insert");

//       if (syncMode !== "webhook") {
//         await fetchBookmarks();
//       }
//     } catch (err: any) {
//       addDebugLog(`❌ Error: ${err.message}`);
//       console.error("Failed to add bookmark:", err);
//       toast.error(err.message || "Failed to add bookmark");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const startEdit = (bookmark: Bookmark) => {
//     setEditingId(bookmark.id);
//     setEditTitle(bookmark.title);
//     setEditUrl(bookmark.url);
//     setEditDescription(bookmark.description || "");
//   };

//   const cancelEdit = () => {
//     setEditingId(null);
//     setEditTitle("");
//     setEditUrl("");
//     setEditDescription("");
//   };

//   const handleUpdate = async (id: string) => {
//     if (!editTitle.trim() || !editUrl.trim()) {
//       toast.error("Title and URL cannot be empty");
//       return;
//     }

//     setEditLoading(true);
//     try {
//       addDebugLog(`✏️ Updating: ${id}`);
//       const res = await fetch("/api/bookmarks", {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id, title: editTitle, url: editUrl, description: editDescription }),
//       });

//       if (!res.ok) {
//         const data = await res.json();
//         throw new Error(data.error || "Failed to update bookmark");
//       }

//       cancelEdit();
//       addDebugLog("✅ Updated successfully");
//       toast.success("Bookmark updated successfully!");
      
//       broadcastUpdate("update");

//       if (syncMode !== "webhook") {
//         await fetchBookmarks();
//       }
//     } catch (err: any) {
//       addDebugLog(`❌ Error: ${err.message}`);
//       console.error("Failed to update bookmark:", err);
//       toast.error(err.message || "Failed to update bookmark");
//     } finally {
//       setEditLoading(false);
//     }
//   };

//   const handleDelete = async (id: string) => {
//     if (!confirm("Are you sure you want to delete this bookmark?")) {
//       return;
//     }

//     setDeletingId(id);
//     try {
//       addDebugLog(`🗑️ Deleting: ${id}`);
//       const res = await fetch("/api/bookmarks", {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id }),
//       });

//       if (!res.ok) {
//         const data = await res.json();
//         throw new Error(data.error || "Failed to delete bookmark");
//       }

//       addDebugLog("✅ Deleted successfully");
//       toast.success("Bookmark deleted successfully!");
      
//       broadcastUpdate("delete");

//       if (syncMode !== "webhook") {
//         await fetchBookmarks();
//       }
//     } catch (err: any) {
//       addDebugLog(`❌ Error: ${err.message}`);
//       console.error("Failed to delete bookmark:", err);
//       toast.error(err.message || "Failed to delete bookmark");
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   return (
//     <>
//       <Toaster 
//         position="top-right"
//         toastOptions={{
//           duration: 3000,
//           style: {
//             background: '#363636',
//             color: '#fff',
//           },
//           success: {
//             iconTheme: {
//               primary: '#10b981',
//               secondary: '#fff',
//             },
//           },
//           error: {
//             iconTheme: {
//               primary: '#ef4444',
//               secondary: '#fff',
//             },
//           },
//         }}
//       />

//       {/* Debug Panel */}
//       {syncMode === "webhook" && (
//         <div className="mb-4 rounded-lg bg-gray-900 p-4 border border-gray-700">
//           <div className="flex items-center justify-between mb-2">
//             <h3 className="text-sm font-semibold text-green-400">
//               🔍 Webhook Debug Console
//             </h3>
//             <button
//               onClick={() => setDebugInfo([])}
//               className="text-xs text-gray-400 hover:text-gray-200"
//             >
//               Clear
//             </button>
//           </div>
//           <div className="space-y-1 text-xs font-mono text-gray-300 max-h-40 overflow-y-auto bg-gray-950 rounded p-2">
//             {debugInfo.length === 0 ? (
//               <p className="text-gray-500">No logs yet...</p>
//             ) : (
//               debugInfo.map((log, i) => (
//                 <div key={i} className="py-0.5">
//                   {log}
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       )}

//       {/* Search and Filter Bar */}
//       <div className="mb-6 rounded-xl bg-white p-4 shadow-sm border border-gray-200">
//         <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
//           <div className="flex-1">
//             <input
//               type="text"
//               placeholder="Search bookmarks by title, URL, or description..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
//             />
//           </div>
//           {selectedHashtag && (
//             <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
//               <span className="text-sm text-blue-700 font-medium">
//                 {selectedHashtag}
//               </span>
//               <button
//                 onClick={() => {
//                   setSelectedHashtag(null);
//                   toast.success("Filter cleared");
//                 }}
//                 className="text-blue-600 hover:text-blue-800"
//               >
//                 ✕
//               </button>
//             </div>
//           )}
//         </div>
        
//         {/* Hashtag Filter Pills */}
//         {allHashtags().length > 0 && (
//           <div className="mt-3 flex flex-wrap gap-2">
//             <span className="text-xs text-gray-500 font-medium">Quick filters:</span>
//             {allHashtags().map(tag => (
//               <button
//                 key={tag}
//                 onClick={() => {
//                   setSelectedHashtag(tag);
//                   toast.success(`Filtering by ${tag}`);
//                 }}
//                 className={`text-xs px-2 py-1 rounded-full transition-colors ${
//                   selectedHashtag === tag
//                     ? 'bg-blue-600 text-white'
//                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                 }`}
//               >
//                 {tag}
//               </button>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Add Bookmark Form */}
//       <form
//         ref={formRef}
//         onSubmit={handleAdd}
//         className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-gray-200"
//       >
//         <h2 className="mb-4 text-lg font-semibold text-gray-900">
//           Add Bookmark
//         </h2>
//         <div className="flex flex-col gap-3">
//           <div className="flex flex-col gap-3 sm:flex-row">
//             <input
//               type="text"
//               name="title"
//               placeholder="Title"
//               required
//               className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
//             />
//             <input
//               type="url"
//               name="url"
//               placeholder="https://example.com"
//               required
//               className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
//             />
//           </div>
//           <textarea
//             name="description"
//             placeholder="Description (use #hashtags for easy filtering)..."
//             rows={2}
//             className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
//           />
//           <button
//             type="submit"
//             disabled={loading}
//             className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {loading ? "Adding..." : "Add Bookmark"}
//           </button>
//         </div>
//       </form>

//       {/* Bookmark List */}
//       {filteredBookmarks().length === 0 ? (
//         <div className="rounded-xl bg-white p-12 text-center border border-gray-200 shadow-sm">
//           <p className="text-gray-500">
//             {searchQuery || selectedHashtag 
//               ? "No bookmarks match your search criteria." 
//               : "No bookmarks yet. Add one above!"}
//           </p>
//         </div>
//       ) : (
//         <div className="space-y-3">
//           {filteredBookmarks().map((bookmark) => (
//             <div
//               key={bookmark.id}
//               className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm transition-colors hover:bg-gray-50"
//             >
//               {editingId === bookmark.id ? (
//                 /* Edit Mode */
//                 <div className="flex flex-col gap-3">
//                   <input
//                     type="text"
//                     value={editTitle}
//                     onChange={(e) => setEditTitle(e.target.value)}
//                     placeholder="Title"
//                     aria-label="Edit title"
//                     className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
//                   />
//                   <input
//                     type="url"
//                     value={editUrl}
//                     onChange={(e) => setEditUrl(e.target.value)}
//                     placeholder="https://example.com"
//                     aria-label="Edit URL"
//                     className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
//                   />
//                   <textarea
//                     value={editDescription}
//                     onChange={(e) => setEditDescription(e.target.value)}
//                     placeholder="Description (use #hashtags for easy filtering)..."
//                     aria-label="Edit description"
//                     rows={2}
//                     className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
//                   />
//                   <div className="flex gap-2">
//                     <button
//                       type="button"
//                       onClick={() => handleUpdate(bookmark.id)}
//                       disabled={editLoading}
//                       className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                       {editLoading ? "Saving..." : "Save"}
//                     </button>
//                     <button
//                       type="button"
//                       onClick={cancelEdit}
//                       className="rounded-lg bg-gray-100 px-4 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-200"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 /* View Mode */
//                 <div>
//                   <div className="flex items-start justify-between">
//                     <div className="min-w-0 flex-1">
//                       <h3 className="truncate font-medium text-gray-900">
//                         {bookmark.title}
//                       </h3>
//                       <a
//                         href={bookmark.url}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="truncate text-sm text-blue-600 hover:underline block"
//                       >
//                         {bookmark.url}
//                       </a>
//                       {bookmark.description && renderDescription(bookmark.description)}
//                       {bookmark.description && extractHashtags(bookmark.description).length > 0 && (
//                         <div className="flex flex-wrap gap-1 mt-2">
//                           {extractHashtags(bookmark.description).map(tag => (
//                             <span
//                               key={tag}
//                               onClick={() => {
//                                 setSelectedHashtag(tag);
//                                 toast.success(`Filtering by ${tag}`);
//                               }}
//                               className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full cursor-pointer hover:bg-blue-200 transition-colors"
//                             >
//                               {tag}
//                             </span>
//                           ))}
//                         </div>
//                       )}
//                       {mounted && (
//                         <p className="text-xs text-gray-400 mt-2">
//                           {new Date(bookmark.created_at).toLocaleString()}
//                         </p>
//                       )}
//                     </div>
//                     <div className="ml-4 flex shrink-0 gap-1">
//                       <button
//                         type="button"
//                         onClick={() => startEdit(bookmark)}
//                         className="rounded-lg px-3 py-1.5 text-sm text-blue-600 transition-colors hover:bg-blue-50"
//                       >
//                         Edit
//                       </button>
//                       <button
//                         type="button"
//                         onClick={() => handleDelete(bookmark.id)}
//                         disabled={deletingId === bookmark.id}
//                         className="rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
//                       >
//                         {deletingId === bookmark.id ? "..." : "Delete"}
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </>
//   );
// }