-- Fix hybrid search function to handle NULL values properly
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
      COALESCE(b.rank, 0::float) as bm25_rank,
      COALESCE(s.similarity, 0::float) as semantic_similarity,
      -- RRF score: 1 / (k + rank), k=60 is standard
      (COALESCE(1.0 / (60 + b.bm25_position), 0::float) + COALESCE(1.0 / (60 + s.semantic_position), 0::float)) as rrf_score
    FROM bm25_results b
    FULL OUTER JOIN semantic_results s ON b.id = s.id
    LEFT JOIN posts p ON COALESCE(b.id, s.id) = p.id
  )
  SELECT
    combined.id,
    combined.reddit_id,
    combined.title,
    combined.url,
    combined.score,
    combined.subreddit,
    combined.created_utc,
    combined.preview_excerpt,
    combined.bm25_rank,
    combined.semantic_similarity,
    combined.rrf_score
  FROM combined
  ORDER BY rrf_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
