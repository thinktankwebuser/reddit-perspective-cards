/**
 * Search Comparison Page
 * Side-by-side comparison of BM25 vs Semantic search
 * Week 2: RAG Learning - See the difference!
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, ExternalLink, ArrowUp, Home, Sparkles, Hash } from 'lucide-react';

interface SearchResult {
  id: string;
  reddit_id: string;
  title: string;
  url: string;
  score: number;
  subreddit: string;
  created_utc: string;
  preview_excerpt: string;
  rank?: number;
  similarity?: number;
}

interface SearchResponse {
  query: string;
  mode: string;
  count: number;
  results: SearchResult[];
}

export default function SearchComparePage() {
  const [query, setQuery] = useState('');
  const [bm25Results, setBm25Results] = useState<SearchResult[]>([]);
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    const trimmedQuery = query.trim();

    setError(null);

    if (!trimmedQuery || trimmedQuery.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Fetch both BM25 and Semantic results in parallel
      const [bm25Res, semanticRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&mode=bm25`),
        fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&mode=semantic`),
      ]);

      if (!bm25Res.ok || !semanticRes.ok) {
        throw new Error('Search failed');
      }

      const bm25Data: SearchResponse = await bm25Res.json();
      const semanticData: SearchResponse = await semanticRes.json();

      setBm25Results(bm25Data.results);
      setSemanticResults(semanticData.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setBm25Results([]);
      setSemanticResults([]);
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

  const ResultCard = ({ post, mode, rank }: { post: SearchResult; mode: 'bm25' | 'semantic'; rank: number }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      {/* Rank badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-gray-500">#{rank + 1}</span>
        {mode === 'bm25' && post.rank && (
          <span className="text-xs text-blue-600">BM25: {post.rank.toFixed(3)}</span>
        )}
        {mode === 'semantic' && post.similarity && (
          <span className="text-xs text-purple-600">Similarity: {post.similarity.toFixed(3)}</span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm mb-2 text-gray-900 line-clamp-2">
        {post.title}
      </h3>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1">
          <ArrowUp className="w-3 h-3" />
          {post.score.toLocaleString()}
        </span>
        <span>r/{post.subreddit}</span>
        <span>{formatDate(post.created_utc)}</span>
      </div>

      {/* Link */}
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        View on Reddit
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Search Comparison</h1>
              <p className="text-muted-foreground">Compare BM25 (keyword) vs Semantic (vector) search results</p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
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
              placeholder="e.g., How to learn Python?"
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
                  Comparing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Compare
                </>
              )}
            </button>
          </div>

          {/* Search Tips */}
          {!hasSearched && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">Try these queries to see the difference:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'How to get started with Python?',
                  'What is machine learning?',
                  'Career advice for developers',
                  'Learning resources for beginners',
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Comparing search algorithms...</p>
          </div>
        )}

        {/* Side-by-Side Results */}
        {hasSearched && !loading && (bm25Results.length > 0 || semanticResults.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BM25 Results */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold">BM25 (Keyword Search)</h2>
                <span className="text-sm text-gray-500">({bm25Results.length} results)</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Matches exact keywords and phrases in post titles and excerpts
              </p>
              <div className="space-y-3">
                {bm25Results.map((post, idx) => (
                  <ResultCard key={post.id} post={post} mode="bm25" rank={idx} />
                ))}
              </div>
              {bm25Results.length === 0 && (
                <p className="text-sm text-gray-500 italic">No keyword matches found</p>
              )}
            </div>

            {/* Semantic Results */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-bold">Semantic (Vector Search)</h2>
                <span className="text-sm text-gray-500">({semanticResults.length} results)</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Understands meaning and finds conceptually similar posts
              </p>
              <div className="space-y-3">
                {semanticResults.map((post, idx) => (
                  <ResultCard key={post.id} post={post} mode="semantic" rank={idx} />
                ))}
              </div>
              {semanticResults.length === 0 && (
                <p className="text-sm text-gray-500 italic">No semantic matches found</p>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {hasSearched && !loading && bm25Results.length === 0 && semanticResults.length === 0 && !error && (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-sm text-muted-foreground">
              Try different keywords or a more general query
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
