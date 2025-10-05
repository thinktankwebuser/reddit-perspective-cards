/**
 * SearchResultCard Component
 * Displays a single search result with metadata
 */

'use client';

import { ExternalLink, ArrowUp } from 'lucide-react';

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
  bm25_rank?: number;
  semantic_similarity?: number;
  rrf_score?: number;
}

interface SearchResultCardProps {
  post: SearchResult;
  mode?: 'bm25' | 'semantic' | 'hybrid';
  rank?: number;
  showExcerpt?: boolean;
  showDevScore?: boolean;
}

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

export default function SearchResultCard({
  post,
  mode,
  rank,
  showExcerpt = true,
  showDevScore = false,
}: SearchResultCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white">
      {/* Rank badge (comparison mode) */}
      {mode && rank !== undefined && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-gray-500">#{rank + 1}</span>
          {mode === 'bm25' && post.rank && (
            <span className="text-xs text-blue-600">BM25: {post.rank.toFixed(3)}</span>
          )}
          {mode === 'semantic' && post.similarity && (
            <span className="text-xs text-purple-600">Similarity: {post.similarity.toFixed(3)}</span>
          )}
          {mode === 'hybrid' && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-green-600">RRF: {post.rrf_score?.toFixed(4)}</span>
              {post.bm25_rank !== undefined && post.bm25_rank > 0 && (
                <span className="text-xs text-blue-500">BM25: {post.bm25_rank.toFixed(3)}</span>
              )}
              {post.semantic_similarity !== undefined && post.semantic_similarity > 0 && (
                <span className="text-xs text-purple-500">Sim: {post.semantic_similarity.toFixed(3)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <h3 className={`font-semibold mb-2 text-gray-900 ${mode ? 'text-sm line-clamp-2' : 'text-lg'}`}>
        {post.title}
      </h3>

      {/* Excerpt (optional) */}
      {showExcerpt && post.preview_excerpt && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {post.preview_excerpt}
        </p>
      )}

      {/* Metadata */}
      <div className={`flex items-center gap-4 text-xs text-gray-500 mb-2 ${mode ? 'gap-3' : 'gap-4'}`}>
        <span className={`flex items-center gap-1 ${mode ? '' : 'font-medium'}`}>
          <ArrowUp className="w-3 h-3" />
          {post.score.toLocaleString()}
        </span>
        <span className={mode ? '' : 'font-medium'}>r/{post.subreddit}</span>
        <span>{formatDate(post.created_utc)}</span>
      </div>

      {/* Link */}
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-primary hover:underline ${mode ? 'text-xs' : 'text-sm'}`}
      >
        View on Reddit
        <ExternalLink className="w-3 h-3" />
      </a>

      {/* Debug: Relevance Score (development only) */}
      {showDevScore && process.env.NODE_ENV === 'development' && post.rank && (
        <div className="mt-2 text-xs text-gray-400">
          Relevance: {post.rank.toFixed(4)}
        </div>
      )}
    </div>
  );
}
