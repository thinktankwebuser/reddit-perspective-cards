/**
 * Search API
 * Full-text search over Reddit posts using Postgres tsvector
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  // Validate query
  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  // Minimum length check
  if (query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    // Call Postgres RPC function for full-text search
    const { data, error } = await supabase.rpc('search_posts', {
      search_query: query,
    });

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      );
    }

    // Return results
    return NextResponse.json({
      query: query,
      count: data?.length || 0,
      results: data || [],
    });
  } catch (err) {
    console.error('Search exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
