"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import {
  Plus,
  X,
  Bookmark as BookmarkIcon
} from "lucide-react";
import SearchFilterBar from "./SearchFilterBar";
import BookmarkCard from "./BookmarkCard";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  created_at: string;
  user_id: string;
};

type SyncMode = "normal" | "time" | "webhook";

function extractHashtags(text: string): string[] {
  if (!text) return [];
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? [...new Set(matches)] : [];
}

export default function Dashboard({
  initialBookmarks,
  syncMode,
  onConnectionStatusChange,
}: {
  initialBookmarks: Bookmark[];
  syncMode: SyncMode;
  onConnectionStatusChange: (status: "connected" | "disconnected" | "connecting") => void;
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [showHashtagFilter, setShowHashtagFilter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allHashtags = useCallback(() => {
    const tags = new Set<string>();
    bookmarks.forEach(bookmark => {
      if (bookmark.description) {
        extractHashtags(bookmark.description).forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [bookmarks]);

  const filteredBookmarks = useCallback(() => {
    let filtered = bookmarks;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bookmark =>
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.url.toLowerCase().includes(query) ||
        (bookmark.description && bookmark.description.toLowerCase().includes(query))
      );
    }

    if (selectedHashtag) {
      filtered = filtered.filter(bookmark =>
        bookmark.description && extractHashtags(bookmark.description).includes(selectedHashtag)
      );
    }

    return filtered;
  }, [bookmarks, searchQuery, selectedHashtag]);

  const fetchBookmarks = useCallback(async () => {
    const res = await fetch("/api/bookmarks");
    if (res.ok) {
      const data = await res.json();
      setBookmarks(data);
    } else {
      toast.error("Failed to fetch bookmarks");
    }
  }, []);

  // MODE 1: Normal - Tab Visibility Change
  useEffect(() => {
    if (syncMode !== "normal") return;

    onConnectionStatusChange("disconnected");

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBookmarks();
      }
    };

    const handleFocus = () => {
      fetchBookmarks();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [syncMode, fetchBookmarks, onConnectionStatusChange]);

  // MODE 2: Time-Based - Poll every 3 seconds
  useEffect(() => {
    if (syncMode !== "time") return;

    onConnectionStatusChange("connected");

    const interval = setInterval(() => {
      fetchBookmarks();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [syncMode, fetchBookmarks, onConnectionStatusChange]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const url = formData.get("url") as string;
    const description = formData.get("description") as string;

    try {
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
      toast.success("Bookmark added successfully!");
      await fetchBookmarks();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add bookmark";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (updated: Bookmark) => {
    const res = await fetch("/api/bookmarks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updated.id,
        title: updated.title,
        url: updated.url,
        description: updated.description,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update bookmark");
    }

    toast.success("Bookmark updated successfully!");
    await fetchBookmarks();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete bookmark");
      }

      toast.success("Bookmark deleted successfully!");
      await fetchBookmarks();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete bookmark";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleHashtagSelect = (tag: string | null) => {
    setSelectedHashtag(tag);
    if (tag) {
      setShowHashtagFilter(true);
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

      {/* Search and Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedHashtag={selectedHashtag}
        onHashtagSelect={handleHashtagSelect}
        allHashtags={allHashtags()}
        showHashtagFilter={showHashtagFilter}
        onToggleHashtagFilter={() => setShowHashtagFilter(!showHashtagFilter)}
      />

      {/* Add Bookmark Section - Collapsible */}
      <div className="mb-8 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 border-2 border-blue-200 dark:border-slate-600 shadow-md overflow-hidden transition-colors">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full p-6 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-slate-700/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg group-hover:scale-110 transition-transform shadow-md">
                <BookmarkIcon size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800 dark:text-white">Add New Bookmark</span>
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
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <BookmarkIcon size={24} className="text-blue-600" />
                Add New Bookmark
              </h2>
              <button
                title="cancel"
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  formRef.current?.reset();
                }}
                className="p-2 hover:bg-white/50 dark:hover:bg-slate-600/50 rounded-lg transition-colors"
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
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <input
                type="url"
                name="url"
                placeholder="https://example.com"
                required
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <textarea
                name="description"
                placeholder="Description (use #hashtags for easy filtering)..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
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
        <div className="rounded-xl bg-white dark:bg-slate-800 p-12 text-center border border-gray-200 dark:border-slate-700 shadow-md transition-colors">
          <BookmarkIcon size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {searchQuery || selectedHashtag
              ? "No bookmarks match your search criteria."
              : "No bookmarks yet. Add one above!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookmarks().map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              mounted={mounted}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deletingId={deletingId}
              onHashtagSelect={(tag) => handleHashtagSelect(tag)}
            />
          ))}
        </div>
      )}
    </>
  );
}
