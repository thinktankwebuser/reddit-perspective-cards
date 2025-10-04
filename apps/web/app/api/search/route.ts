/**
 * Search API
 * Supports BM25, Semantic (vector), and Hybrid search modes
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

type SearchMode = 'bm25' | 'semantic' | 'hybrid';

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  return response.data[0].embedding;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  const mode = (request.nextUrl.searchParams.get('mode') || 'bm25') as SearchMode;

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

  // Validate mode
  if (!['bm25', 'semantic', 'hybrid'].includes(mode)) {
    return NextResponse.json(
      { error: 'Invalid mode. Must be: bm25, semantic, or hybrid' },
      { status: 400 }
    );
  }

  try {
    let data: SearchResult[] | null = null;
    let error: any = null;

    if (mode === 'bm25') {
      // BM25 full-text search (existing)
      const result = await supabase.rpc('search_posts', {
        search_query: query,
      });
      data = result.data;
      error = result.error;
    } else if (mode === 'semantic') {
      // Semantic vector search
      const embedding = await generateQueryEmbedding(query);
      const result = await supabase.rpc('search_posts_semantic', {
        query_embedding: embedding,
        match_count: 20,
      });
      data = result.data;
      error = result.error;
    } else if (mode === 'hybrid') {
      // Hybrid search (RRF fusion)
      const embedding = await generateQueryEmbedding(query);
      const result = await supabase.rpc('search_posts_hybrid', {
        search_query: query,
        query_embedding: embedding,
        match_count: 20,
      });
      data = result.data;
      error = result.error;
    }

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
      mode: mode,
      count: data?.length || 0,
      results: data || [],
    });
  } catch (err) {
    console.error('Search exception:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
