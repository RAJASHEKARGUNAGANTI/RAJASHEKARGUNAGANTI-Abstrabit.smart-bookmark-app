"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  created_at: string;
  user_id: string;
};

export default function BookmarkList({
  initialBookmarks,
  userId,
}: {
  initialBookmarks: Bookmark[];
  userId: string;
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  // Sync with server-rendered data when it changes
  useEffect(() => {
    setBookmarks(initialBookmarks);
  }, [initialBookmarks]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`bookmarks-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newBookmark = payload.new as Bookmark;
          setBookmarks((prev) => {
            if (prev.some((b) => b.id === newBookmark.id)) {
              return prev;
            }
            return [newBookmark, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldBookmark = payload.old as { id: string };
          setBookmarks((prev) =>
            prev.filter((b) => b.id !== oldBookmark.id)
          );
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

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
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (bookmarks.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center border border-gray-200 shadow-sm">
        <p className="text-gray-500">No bookmarks yet. Add one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="flex items-center justify-between rounded-xl bg-white p-4 border border-gray-200 shadow-sm transition-colors hover:bg-gray-50"
        >
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
          <button
            onClick={() => handleDelete(bookmark.id)}
            disabled={deletingId === bookmark.id}
            className="ml-4 shrink-0 rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {deletingId === bookmark.id ? "..." : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}
