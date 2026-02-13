"use client";

import { Search, Hash, X } from "lucide-react";
import { toast } from "react-hot-toast";

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  selectedHashtag,
  onHashtagSelect,
  allHashtags,
  showHashtagFilter,
  onToggleHashtagFilter,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedHashtag: string | null;
  onHashtagSelect: (tag: string | null) => void;
  allHashtags: string[];
  showHashtagFilter: boolean;
  onToggleHashtagFilter: () => void;
}) {
  return (
    <div className="mb-6 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-md border border-gray-100 dark:border-slate-700 transition-colors">
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search bookmarks by title, URL, or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        {/* Filter Toggle and Active Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onToggleHashtagFilter}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              showHashtagFilter
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <Hash size={16} />
            {showHashtagFilter ? 'Hide Filters' : 'Show Filters'}
            {allHashtags.length > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                showHashtagFilter ? 'bg-blue-700' : 'bg-gray-200 dark:bg-slate-600'
              }`}>
                {allHashtags.length}
              </span>
            )}
          </button>

          {selectedHashtag && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 rounded-lg shadow-sm">
              <Hash size={14} className="text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                {selectedHashtag}
              </span>
              <button
                title="clear"
                onClick={() => {
                  onHashtagSelect(null);
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
        {showHashtagFilter && allHashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
            {allHashtags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  onHashtagSelect(tag);
                  toast.success(`Filtering by ${tag}`);
                }}
                className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium transition-all ${
                  selectedHashtag === tag
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 hover:scale-105'
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
  );
}
