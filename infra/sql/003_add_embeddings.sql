-- Add Vector Embeddings for Semantic Search
-- Week 2: Semantic Search with pgvector
-- Run this in Supabase SQL Editor after 002_add_search.sql

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to posts table (1536 dimensions for text-embedding-3-small)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Create HNSW index for fast vector similarity search
-- HNSW (Hierarchical Navigable Small World) is better than IVFFlat for small datasets
-- Uses cosine distance for similarity
CREATE INDEX IF NOT EXISTS idx_posts_embedding_hnsw
ON posts USING hnsw (embedding vector_cosine_ops);

-- 4. Create semantic search RPC function
CREATE OR REPLACE FUNCTION search_posts_semantic(
  query_embedding vector(1536),
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  reddit_id text,
  title text,
  url text,
  score int,
  subreddit text,
  created_utc timestamptz,
  preview_excerpt text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.reddit_id,
    p.title,
    p.url,
    p.score,
    p.subreddit,
    p.created_utc,
    p.preview_excerpt,
    -- Cosine similarity (1 - cosine_distance)
    1 - (p.embedding <=> query_embedding) as similarity
  FROM posts p
  WHERE p.embedding IS NOT NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Create hybrid search RPC function (combines BM25 + Vector)
-- Using Reciprocal Rank Fusion (RRF) algorithm
CREATE OR REPLACE FUNCTION search_posts_hybrid(
  search_query text,
  query_embedding vector(1536),
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  reddit_id text,
  title text,
  url text,
  score int,
  subreddit text,
  created_utc timestamptz,
  preview_excerpt text,
  bm25_rank float,
  semantic_similarity float,
  rrf_score float
) AS $$
BEGIN
  RETURN QUERY
  WITH bm25_results AS (
    SELECT
      p.id,
      p.reddit_id,
      p.title,
      p.url,
      p.score,
      p.subreddit,
      p.created_utc,
      p.preview_excerpt,
      ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) as rank,
      ROW_NUMBER() OVER (ORDER BY ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) DESC) as bm25_position
    FROM posts p
    WHERE p.search_vector @@ websearch_to_tsquery('english', search_query)
  ),
  semantic_results AS (
    SELECT
      p.id,
      1 - (p.embedding <=> query_embedding) as similarity,
      ROW_NUMBER() OVER (ORDER BY p.embedding <=> query_embedding) as semantic_position
    FROM posts p
    WHERE p.embedding IS NOT NULL
    ORDER BY p.embedding <=> query_embedding
    LIMIT 100
  ),
  combined AS (
    SELECT
      COALESCE(b.id, s.id) as id,
      COALESCE(b.reddit_id, p.reddit_id) as reddit_id,
      COALESCE(b.title, p.title) as title,
      COALESCE(b.url, p.url) as url,
      COALESCE(b.score, p.score) as score,
      COALESCE(b.subreddit, p.subreddit) as subreddit,
      COALESCE(b.created_utc, p.created_utc) as created_utc,
      COALESCE(b.preview_excerpt, p.preview_excerpt) as preview_excerpt,
      COALESCE(b.rank, 0) as bm25_rank,
      COALESCE(s.similarity, 0) as semantic_similarity,
      -- RRF score: 1 / (k + rank), k=60 is standard
      COALESCE(1.0 / (60 + b.bm25_position), 0) + COALESCE(1.0 / (60 + s.semantic_position), 0) as rrf_score
    FROM bm25_results b
    FULL OUTER JOIN semantic_results s ON b.id = s.id
    LEFT JOIN posts p ON COALESCE(b.id, s.id) = p.id
  )
  SELECT * FROM combined
  ORDER BY rrf_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Verification queries
-- Check if pgvector is enabled
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check embedding column
-- SELECT COUNT(*) as total_posts,
--        COUNT(embedding) as posts_with_embedding
-- FROM posts;

-- Test semantic search (after embeddings are generated)
-- SELECT title, similarity
-- FROM search_posts_semantic('[0.1, 0.2, ...]'::vector(1536), 5);
