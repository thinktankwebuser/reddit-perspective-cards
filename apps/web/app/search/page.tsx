/**
 * Search Page
 * Full-text search over Reddit posts
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, ExternalLink, ArrowUp, Home } from 'lucide-react';

interface SearchResult {
  id: string;
  reddit_id: string;
  title: string;
  url: string;
  score: number;
  subreddit: string;
  created_utc: string;
  preview_excerpt: string;
  rank: number;
}

interface SearchResponse {
  query: string;
  count: number;
  results: SearchResult[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data: SearchResponse = await res.json();
      setResults(data.results);
      setResultCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setResults([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">Search Reddit</h1>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
          <p className="text-muted-foreground">
            Search across 6 curated IT & Tech subreddits
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="e.g., How to negotiate salary?"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>

          {/* Search Tips */}
          {!hasSearched && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">Try searching for:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'negotiate salary',
                  'learn programming',
                  'cybersecurity career',
                  'machine learning projects',
                  'remote work advice',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setQuery(suggestion);
                      setTimeout(handleSearch, 100);
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

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results Count */}
        {hasSearched && !loading && !error && (
          <div className="mb-4 text-sm text-muted-foreground">
            {resultCount > 0 ? (
              <>
                Found <span className="font-semibold">{resultCount}</span> result
                {resultCount !== 1 ? 's' : ''} for "{query}"
              </>
            ) : (
              <>No results found for "{query}"</>
            )}
          </div>
        )}

        {/* Empty State */}
        {hasSearched && !loading && resultCount === 0 && !error && (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Try different keywords or check your spelling
            </p>
            <div className="text-xs text-muted-foreground">
              <p>Tips:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Use general terms like "salary" instead of specific numbers</li>
                <li>Try synonyms (e.g., "job" vs "career")</li>
                <li>Search for topics, not specific post titles</li>
              </ul>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-4">
          {results.map((post) => (
            <div
              key={post.id}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white"
            >
              {/* Title */}
              <h3 className="font-semibold text-lg mb-2 text-gray-900">
                {post.title}
              </h3>

              {/* Excerpt */}
              {post.preview_excerpt && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {post.preview_excerpt}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1 font-medium">
                  <ArrowUp className="w-3 h-3" />
                  {post.score.toLocaleString()}
                </span>
                <span className="font-medium">r/{post.subreddit}</span>
                <span>{formatDate(post.created_utc)}</span>
              </div>

              {/* Link */}
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View on Reddit
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Debug: Relevance Score (remove in production) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 text-xs text-gray-400">
                  Relevance: {post.rank.toFixed(4)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Searching...</p>
          </div>
        )}
      </div>
    </main>
  );
}
