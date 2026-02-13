"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState, useCallback } from "react";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  created_at: string;
  user_id: string;
};

export default function Dashboard({
  initialBookmarks,
  userId,
}: {
  initialBookmarks: Bookmark[];
  userId: string;
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const supabaseRef = useRef(createClient());

  const fetchBookmarks = useCallback(async () => {
    const res = await fetch("/api/bookmarks");
    if (res.ok) {
      const data = await res.json();
      setBookmarks(data);
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function subscribe() {
      if (channel) supabase.removeChannel(channel);

      channel = supabase
        .channel("bookmarks-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookmarks",
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newBookmark = payload.new as Bookmark;
              if (newBookmark.user_id !== userId) return;
              setBookmarks((prev) => {
                if (prev.some((b) => b.id === newBookmark.id)) return prev;
                return [newBookmark, ...prev];
              });
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as Bookmark;
              if (updated.user_id !== userId) return;
              setBookmarks((prev) =>
                prev.map((b) => (b.id === updated.id ? updated : b))
              );
            } else if (payload.eventType === "DELETE") {
              const oldBookmark = payload.old as { id: string };
              setBookmarks((prev) =>
                prev.filter((b) => b.id !== oldBookmark.id)
              );
            }
          }
        )
        .subscribe();
    }

    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      subscribe();
    });

    return () => {
      authListener.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  // Poll every 3 seconds for live cross-window sync
  useEffect(() => {
    const interval = setInterval(fetchBookmarks, 3000);
    return () => clearInterval(interval);
  }, [fetchBookmarks]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const url = formData.get("url") as string;

    try {
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
      await fetchBookmarks();
    } catch (err) {
      console.error("Failed to add bookmark:", err);
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
    setEditLoading(true);
    try {
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
      await fetchBookmarks();
    } catch (err) {
      console.error("Failed to update bookmark:", err);
    } finally {
      setEditLoading(false);
    }
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

      await fetchBookmarks();
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
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
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
                      className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
                      className="rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
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
