-- Fix BM25 to ACTUALLY use OR logic (plainto_tsquery still uses AND)
-- We need to manually construct OR queries

CREATE OR REPLACE FUNCTION search_posts(search_query text)
RETURNS TABLE (
  id uuid,
  reddit_id text,
  title text,
  url text,
  score int,
  subreddit text,
  created_utc timestamptz,
  preview_excerpt text,
  rank real
) AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Convert search query to OR-based tsquery
  -- Replace spaces with ' | ' (OR operator) instead of ' & ' (AND operator)
  ts_query := to_tsquery('english', replace(plainto_tsquery('english', search_query)::text, ' & ', ' | '));

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
    ts_rank(p.search_vector, ts_query) as rank
  FROM posts p
  WHERE p.search_vector @@ ts_query
  ORDER BY rank DESC, p.score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Test: Should now return results
-- SELECT title, rank FROM search_posts('machine learning career') LIMIT 5;
-- SELECT title, rank FROM search_posts('Python programming tips') LIMIT 5;
