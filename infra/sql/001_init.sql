-- Reddit Perspective Cards Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Topics table
-- Stores configured topics to track
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subreddit_allowlist JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["machinelearning", "artificial"]
  keywords JSONB DEFAULT '[]'::jsonb,                       -- For LLM context, not strict filtering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ
);

-- Posts table
-- Stores Reddit posts fetched for each topic
-- NOTE: Each post belongs to ONE topic (reddit_id is globally unique)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reddit_id TEXT UNIQUE NOT NULL,                           -- e.g., "t3_abc123"
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subreddit TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,                                        -- Permalink to Reddit
  author TEXT,
  score INT NOT NULL DEFAULT 0,
  created_utc TIMESTAMPTZ NOT NULL,
  preview_excerpt TEXT,                                     -- ≤300 chars, from selftext or title
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topic notes table
-- Stores LLM-generated perspective summaries
CREATE TABLE topic_notes (
  topic_id UUID PRIMARY KEY REFERENCES topics(id) ON DELETE CASCADE,
  consensus_text TEXT NOT NULL DEFAULT '',                  -- ≤160 chars
  contrast_text TEXT NOT NULL DEFAULT '',                   -- ≤160 chars
  timeline_text TEXT NOT NULL DEFAULT '',                   -- ≤12 words
  source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,            -- ["reddit_id1", "reddit_id2"]
  raw_llm_response JSONB,                                   -- Full LLM output for debugging
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_posts_topic_score ON posts(topic_id, score DESC);  -- Composite for common query
CREATE INDEX idx_posts_created_utc ON posts(created_utc DESC);
CREATE INDEX idx_topics_slug ON topics(slug);
-- Note: reddit_id already indexed via UNIQUE constraint

-- Sample seed data
INSERT INTO topics (slug, title, description, subreddit_allowlist, keywords) VALUES
  (
    'ai-safety',
    'AI Safety & Alignment',
    'Discussions on AGI risks, alignment research, and AI safety developments',
    '["artificial", "machinelearning", "ControlProblem", "singularity"]'::jsonb,
    '["alignment", "safety", "AGI", "existential", "superintelligence", "RLHF"]'::jsonb
  ),
  (
    'climate-tech',
    'Climate Tech Innovations',
    'Climate solutions, renewable energy, and environmental technology',
    '["ClimateActionPlan", "climatechange", "environment", "renewableenergy"]'::jsonb,
    '["carbon", "renewable", "solar", "wind", "geoengineering", "emissions"]'::jsonb
  );

-- Row Level Security (RLS) - Optional for production
-- For MVP, we use service_role key which bypasses RLS
-- Uncomment to enable public read access:

-- ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE topic_notes ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Public read topics" ON topics FOR SELECT USING (true);
-- CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
-- CREATE POLICY "Public read notes" ON topic_notes FOR SELECT USING (true);

-- Verification queries (run after setup)
-- SELECT COUNT(*) FROM topics;          -- Should return: 2
-- SELECT COUNT(*) FROM posts;           -- Should return: 0 (until first fetch)
-- SELECT COUNT(*) FROM topic_notes;     -- Should return: 0 (until first notes generation)
