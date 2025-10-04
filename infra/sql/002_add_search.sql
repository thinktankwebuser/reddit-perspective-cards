-- Add Full-Text Search to Reddit Perspective Cards
-- Run this in Supabase SQL Editor after 001_init.sql

-- 1. Add search_vector column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING gin(search_vector);

-- 3. Create trigger function to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION posts_search_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Weight title higher (A) than preview_excerpt (B)
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.preview_excerpt, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to fire before insert or update
DROP TRIGGER IF EXISTS posts_search_trigger ON posts;
CREATE TRIGGER posts_search_trigger
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION posts_search_update();

-- 5. Backfill search_vector for existing posts
UPDATE posts SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(preview_excerpt, '')), 'B')
WHERE search_vector IS NULL;

-- 6. Create RPC function for searching posts
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
    ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) as rank
  FROM posts p
  WHERE p.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC, p.score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- 7. Test the search function
-- SELECT * FROM search_posts('negotiate salary');
-- SELECT * FROM search_posts('machine learning career');
-- SELECT * FROM search_posts('cybersecurity threats');

-- Verification queries
-- Check if search_vector is populated
-- SELECT COUNT(*) as total_posts,
--        COUNT(search_vector) as posts_with_search
-- FROM posts;

-- Test search ranking
-- SELECT title, rank
-- FROM search_posts('programming interview')
-- LIMIT 5;
