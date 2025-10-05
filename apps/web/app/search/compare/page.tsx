/**
 * Search Comparison Page
 * Side-by-side comparison of BM25 vs Semantic search
 * Week 2: RAG Learning - See the difference!
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Sparkles, Hash, Loader2, Search } from 'lucide-react';
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
  const [hybridResults, setHybridResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showHybrid, setShowHybrid] = useState(false);

  const handleSearch = async (searchQuery?: string) => {
    const trimmedQuery = (searchQuery ?? query).trim();

    setError(null);

    if (!trimmedQuery || trimmedQuery.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Fetch BM25, Semantic, and Hybrid results in parallel
      const [bm25Res, semanticRes, hybridRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&mode=bm25`),
        fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&mode=semantic`),
        fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&mode=hybrid`),
      ]);

      if (!bm25Res.ok || !semanticRes.ok || !hybridRes.ok) {
        throw new Error('Search failed');
      }

      const bm25Data: SearchResponse = await bm25Res.json();
      const semanticData: SearchResponse = await semanticRes.json();
      const hybridData: SearchResponse = await hybridRes.json();

      setBm25Results(bm25Data.results);
      setSemanticResults(semanticData.results);
      setHybridResults(hybridData.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setBm25Results([]);
      setSemanticResults([]);
      setHybridResults([]);
    } finally {
      setLoading(false);
    }
  };


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
            'Learning resources for beginners',
          ]}
          placeholder="e.g., How to learn Python?"
          buttonText="Compare"
          loadingText="Comparing..."
        />

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

        {/* Toggle for 2-column vs 3-column view */}
        {hasSearched && !loading && (bm25Results.length > 0 || semanticResults.length > 0 || hybridResults.length > 0) && (
          <div className="mb-6 flex justify-center">
            <button
              onClick={() => setShowHybrid(!showHybrid)}
              className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
            >
              {showHybrid ? 'Hide Hybrid Results' : 'Show Hybrid Results'}
            </button>
          </div>
        )}

        {/* Side-by-Side Results */}
        {hasSearched && !loading && (bm25Results.length > 0 || semanticResults.length > 0 || hybridResults.length > 0) && (
          <div className={`grid grid-cols-1 ${showHybrid ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
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
                  <SearchResultCard key={post.id} post={post} mode="bm25" rank={idx} showExcerpt={false} />
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
                  <SearchResultCard key={post.id} post={post} mode="semantic" rank={idx} showExcerpt={false} />
                ))}
              </div>
              {semanticResults.length === 0 && (
                <p className="text-sm text-gray-500 italic">No semantic matches found</p>
              )}
            </div>

            {/* Hybrid Results (conditionally shown) */}
            {showHybrid && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-bold">Hybrid (RRF Fusion)</h2>
                  <span className="text-sm text-gray-500">({hybridResults.length} results)</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Combines keyword and semantic search using Reciprocal Rank Fusion
                </p>
                <div className="space-y-3">
                  {hybridResults.map((post, idx) => (
                    <SearchResultCard key={post.id} post={post} mode="hybrid" rank={idx} showExcerpt={false} />
                  ))}
                </div>
                {hybridResults.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No hybrid matches found</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {hasSearched && !loading && bm25Results.length === 0 && semanticResults.length === 0 && hybridResults.length === 0 && !error && (
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
