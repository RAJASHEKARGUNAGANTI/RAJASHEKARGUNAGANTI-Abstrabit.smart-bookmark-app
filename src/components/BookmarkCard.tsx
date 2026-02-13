"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  X,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Hash,
  Clock,
  Save,
} from "lucide-react";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  created_at: string;
  user_id: string;
};

function extractHashtags(text: string): string[] {
  if (!text) return [];
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? [...new Set(matches)] : [];
}

export default function BookmarkCard({
  bookmark,
  mounted,
  onEdit,
  onDelete,
  deletingId,
  onHashtagSelect,
}: {
  bookmark: Bookmark;
  mounted: boolean;
  onEdit: (bookmark: Bookmark) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  deletingId: string | null;
  onHashtagSelect: (tag: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const needsTruncation = (description: string | null): boolean => {
    if (!description) return false;
    return description.length > 150;
  };

  const startEdit = () => {
    setIsEditing(true);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditDescription(bookmark.description || "");
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditUrl("");
    setEditDescription("");
  };

  const handleUpdate = async () => {
    if (!editTitle.trim() || !editUrl.trim()) {
      toast.error("Title and URL cannot be empty");
      return;
    }

    setEditLoading(true);
    try {
      await onEdit({
        ...bookmark,
        title: editTitle,
        url: editUrl,
        description: editDescription,
      });
      cancelEdit();
    } catch {
      // Error handled by parent
    } finally {
      setEditLoading(false);
    }
  };

  const renderDescription = (description: string | null) => {
    if (!description) return null;

    const shouldTruncate = needsTruncation(description) && !isExpanded;
    const displayText = shouldTruncate ? description.slice(0, 150) + "..." : description;

    const parts = displayText.split(/(#[\w]+)/g);
    return (
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {parts.map((part, index) => {
            if (part.startsWith('#')) {
              return (
                <span
                  key={index}
                  className="text-blue-600 font-medium cursor-pointer hover:text-blue-700 hover:underline transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHashtagSelect(part);
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
              setIsExpanded(!isExpanded);
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

  return (
    <div
      className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
      style={{ height: isExpanded ? 'auto' : '320px' }}
    >
      {isEditing ? (
        /* Edit Mode */
        <div className="p-6 flex flex-col gap-3 h-full">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title"
            aria-label="Edit title"
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://example.com"
            aria-label="Edit URL"
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Description (use #hashtags for easy filtering)..."
            aria-label="Edit description"
            rows={3}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none flex-1"
          />
          <div className="flex gap-2 mt-auto">
            <button
              type="button"
              onClick={handleUpdate}
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
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 dark:bg-slate-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 font-medium transition-all hover:bg-gray-200 dark:hover:bg-slate-500"
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
          <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight">
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
                {renderDescription(bookmark.description)}

                {/* Hashtag Pills */}
                {extractHashtags(bookmark.description).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {extractHashtags(bookmark.description).map(tag => (
                      <span
                        key={tag}
                        onClick={() => onHashtagSelect(tag)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-all hover:scale-105 font-medium shadow-sm"
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
          <div className="py-2 px-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Clock size={14} />
              {mounted && new Date(bookmark.created_at).toLocaleDateString()}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={startEdit}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-blue-600 transition-all hover:bg-blue-50 font-medium"
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this bookmark?")) {
                    onDelete(bookmark.id);
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
  );
}
