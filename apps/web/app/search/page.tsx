/**
 * Search Page
 * Full-text search over Reddit posts
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Loader2, Search } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import SearchResultCard from '@/components/SearchResultCard';

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

  const handleSearch = async (searchQuery?: string) => {
    const trimmedQuery = (searchQuery ?? query).trim();

    // Clear previous error first
    setError(null);

    if (!trimmedQuery || trimmedQuery.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
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

        {/* Educational Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔍</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">
                Want to see how different search algorithms work?
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Compare BM25 (keyword matching) vs Semantic (AI-powered meaning) vs Hybrid (best of both) search side-by-side
              </p>
              <Link
                href="/search/compare"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Try Search Comparison
                <Search className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <SearchInput
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          loading={loading}
          hasSearched={hasSearched}
          suggestions={[
            'How to get started with Python?',
            'What is machine learning?',
            'Career advice for developers',
            'How to negotiate salary?',
          ]}
          placeholder="e.g., How to negotiate salary?"
        />

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
            <SearchResultCard
              key={post.id}
              post={post}
              showExcerpt={true}
              showDevScore={true}
            />
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
