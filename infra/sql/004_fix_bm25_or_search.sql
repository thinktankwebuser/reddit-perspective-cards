-- Fix BM25 to use OR instead of AND for better user experience
-- This makes BM25 search less strict - matches ANY word instead of ALL words

-- Update the search_posts function to use OR logic
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
    ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM posts p
  WHERE p.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, p.score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Test queries that should now work:
-- SELECT * FROM search_posts('machine learning career');  -- Should find posts with ANY of these words
-- SELECT * FROM search_posts('Python programming');       -- Should find posts with Python OR programming
-- SELECT * FROM search_posts('cybersecurity threats');    -- Should find posts with cybersecurity OR threats
