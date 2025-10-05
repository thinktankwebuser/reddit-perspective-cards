/**
 * SearchInput Component
 * Reusable search input with suggestions
 */

'use client';

import { Search, Loader2 } from 'lucide-react';

interface SearchInputProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: (searchQuery?: string) => void;
  loading: boolean;
  hasSearched: boolean;
  suggestions: string[];
  placeholder?: string;
  buttonText?: string;
  loadingText?: string;
}

export default function SearchInput({
  query,
  setQuery,
  onSearch,
  loading,
  hasSearched,
  suggestions,
  placeholder = 'e.g., How to negotiate salary?',
  buttonText = 'Search',
  loadingText = 'Searching...',
}: SearchInputProps) {
  return (
    <div className="mb-8">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={loading}
          autoFocus
        />
        <button
          onClick={() => onSearch()}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {loadingText}
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              {buttonText}
            </>
          )}
        </button>
      </div>

      {/* Search Tips */}
      {suggestions.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  onSearch(suggestion);
                }}
                className="px-3 py-1 bg-muted hover:bg-muted/80 rounded-full text-xs"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
