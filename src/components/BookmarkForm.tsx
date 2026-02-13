"use client";

import { useRef, useState } from "react";

export default function BookmarkForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    } catch (err) {
      console.error("Failed to add bookmark:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
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
  );
}
