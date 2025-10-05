/**
 * Homepage
 * Displays grid of topic cards
 */

import Link from 'next/link';
import { Search } from 'lucide-react';
import TopicCard from '@/components/TopicCard';
import AnalyticsPageView from '@/components/AnalyticsPageView';
import { getTopicsData } from '@/lib/data';
import type { TopicCardData } from '@/lib/types';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export default async function HomePage() {
  const topics = await getTopicsData();

  return (
    <main className="min-h-screen bg-background">
      <AnalyticsPageView topicCount={topics.length} />
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero Section */}
        <header className="mb-12 text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-5xl font-bold tracking-tight">
              Reddit Perspective Cards
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8">
            Reddit in 30 seconds: the gist, both sides, and the key threads.
          </p>

          {/* How Perspective Cards Work */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-8 text-left mb-12">
            <h2 className="text-2xl font-bold mb-4 text-center">
              📋 How Perspective Cards Work
            </h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              We track discussions across multiple subreddits and use AI to extract:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-5 border border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">⏱</span>
                  <span className="inline-block px-3 py-1 rounded bg-green-50 text-green-700 border border-green-200 text-sm font-bold">
                    Consensus
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">What most people agree on</p>
              </div>
              <div className="bg-white rounded-lg p-5 border border-orange-200">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">⚖️</span>
                  <span className="inline-block px-3 py-1 rounded bg-orange-50 text-orange-700 border border-orange-200 text-sm font-bold">
                    Contrast
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Key disagreements & debates</p>
              </div>
              <div className="bg-white rounded-lg p-5 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">📈</span>
                  <span className="inline-block px-3 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-sm font-bold">
                    Timeline
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">How the story evolved</p>
              </div>
            </div>
          </div>

          {/* Advanced Search Section */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-2">
              <Search className="w-6 h-6" />
              Advanced Reddit Search
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              <strong className="text-foreground">Better than Reddit's default search.</strong> We use 3 algorithms to find what you're actually looking for:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-xs">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="font-bold text-blue-900 mb-2">🔤 BM25 (Keyword)</div>
                <p className="text-muted-foreground">Advanced keyword ranking - better than Reddit's basic search</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="font-bold text-purple-900 mb-2">🧠 Semantic (AI)</div>
                <p className="text-muted-foreground">Understands meaning - finds posts Reddit's search misses</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="font-bold text-green-900 mb-2">⚡ Hybrid (RRF)</div>
                <p className="text-muted-foreground">Combines both for optimal results</p>
              </div>
            </div>
            <Link
              href="/search/compare"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg text-lg font-semibold"
            >
              <Search className="w-5 h-5" />
              Try Advanced Search
            </Link>
          </div>
        </header>

        {/* Topics Grid */}
        {topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic: TopicCardData) => (
              <TopicCard key={topic.slug} {...topic} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No topics available yet. Check back soon!
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Data sourced from Reddit. Summaries generated by AI.{' '}
            <a
              href="https://github.com"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
