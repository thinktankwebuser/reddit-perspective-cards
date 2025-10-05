/**
 * Search Comparison Page
 * Side-by-side comparison of BM25 vs Semantic search
 * Week 2: RAG Learning - See the difference!
 */

'use client';

import { useState, useEffect } from 'react';
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
  const [showComparison, setShowComparison] = useState(false);

  // Auto-demo on first load
  useEffect(() => {
    const demoQuery = 'machine learning career';
    setQuery(demoQuery);
    handleSearch(demoQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

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
              <h1 className="text-4xl font-bold mb-2">Search Reddit Posts</h1>
              <p className="text-muted-foreground">Compare BM25 (keyword) vs Semantic (vector) vs Hybrid (RRF) search results side-by-side</p>
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

        {/* How it Works Section */}
        <div className="mb-8 bg-muted/30 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            How Search Algorithms Work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-blue-900">BM25 (Keyword)</h3>
              </div>
              <p className="text-gray-600 text-xs mb-2">
                Traditional search that matches exact keywords and phrases
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✓ Fast and precise</li>
                <li>✓ Best for specific terms</li>
                <li>✗ Misses synonyms</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-purple-900">Semantic (Vector)</h3>
              </div>
              <p className="text-gray-600 text-xs mb-2">
                AI-powered search that understands meaning and context
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✓ Understands intent</li>
                <li>✓ Finds similar concepts</li>
                <li>✗ Can be less precise</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-green-600" />
                <h3 className="font-bold text-green-900">Hybrid (RRF)</h3>
              </div>
              <p className="text-gray-600 text-xs mb-2">
                Combines both approaches using Reciprocal Rank Fusion
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✓ Best of both worlds</li>
                <li>✓ Balanced results</li>
                <li>✓ Production-ready</li>
              </ul>
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
            'machine learning career',
            'Python programming tips',
            'cybersecurity best practices',
            'JavaScript frameworks comparison',
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

        {/* Toggle for comparison view */}
        {hasSearched && !loading && (bm25Results.length > 0 || semanticResults.length > 0 || hybridResults.length > 0) && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {showComparison ? '📊 Comparison Mode Active' : '🎯 Showing Best Results (Hybrid)'}
                </p>
                <p className="text-xs text-gray-600">
                  {showComparison
                    ? 'See how BM25 (keyword), Semantic (AI), and Hybrid (combined) differ'
                    : 'Hybrid combines keyword + AI search for optimal results'}
                </p>
              </div>
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="ml-4 px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {showComparison ? 'Show Hybrid Only' : 'Compare All 3 →'}
              </button>
            </div>
          </div>
        )}

        {/* Results Display */}
        {hasSearched && !loading && (bm25Results.length > 0 || semanticResults.length > 0 || hybridResults.length > 0) && (
          <>
            {!showComparison ? (
              /* Hybrid Only View (Default) */
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-bold">Best Results</h2>
                  <span className="text-sm text-gray-500">({hybridResults.length} results)</span>
                </div>
                <div className="space-y-4">
                  {hybridResults.map((post, idx) => (
                    <SearchResultCard key={post.id} post={post} mode="hybrid" rank={idx} showExcerpt={true} />
                  ))}
                </div>
                {hybridResults.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No results found</p>
                )}
              </div>
            ) : (
              /* Comparison View (All 3 Algorithms) */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* BM25 Results */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Hash className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-bold">BM25</h2>
                    <span className="text-sm text-gray-500">({bm25Results.length})</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-4">
                    Keyword matching
                  </p>
                  <div className="space-y-3">
                    {bm25Results.map((post, idx) => (
                      <SearchResultCard key={post.id} post={post} mode="bm25" rank={idx} showExcerpt={false} />
                    ))}
                  </div>
                  {bm25Results.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No matches</p>
                  )}
                </div>

                {/* Semantic Results */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h2 className="text-xl font-bold">Semantic</h2>
                    <span className="text-sm text-gray-500">({semanticResults.length})</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-4">
                    AI-powered meaning
                  </p>
                  <div className="space-y-3">
                    {semanticResults.map((post, idx) => (
                      <SearchResultCard key={post.id} post={post} mode="semantic" rank={idx} showExcerpt={false} />
                    ))}
                  </div>
                  {semanticResults.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No matches</p>
                  )}
                </div>

                {/* Hybrid Results */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-green-600" />
                    <h2 className="text-xl font-bold">Hybrid</h2>
                    <span className="text-sm text-gray-500">({hybridResults.length})</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-4">
                    Combined (RRF)
                  </p>
                  <div className="space-y-3">
                    {hybridResults.map((post, idx) => (
                      <SearchResultCard key={post.id} post={post} mode="hybrid" rank={idx} showExcerpt={false} />
                    ))}
                  </div>
                  {hybridResults.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No matches</p>
                  )}
                </div>
              </div>
            )}
          </>
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
