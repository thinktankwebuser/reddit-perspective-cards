/**
 * Shared TypeScript types for Reddit Perspective Cards
 */

export interface Topic {
  id: string;
  slug: string;
  title: string;
  description?: string;
  subreddit_allowlist: string[];
  keywords?: string[];
  created_at: string;
  last_fetched_at?: string;
}

export interface Post {
  id: string;
  reddit_id: string;
  topic_id: string;
  subreddit: string;
  title: string;
  url: string;
  author: string;
  score: number;
  created_utc: string;
  preview_excerpt?: string;
  fetched_at: string;
}

export interface TopicNotes {
  topic_id: string;
  consensus_text: string;
  contrast_text: string;
  timeline_text: string;
  source_ids: string[];
  raw_llm_response?: any;
  updated_at: string;
}

// API Response Types

export interface TopicCardData {
  slug: string;
  title: string;
  last_updated: string;
  notes: {
    consensus: string;
    contrast: string;
    timeline: string;
  };
  links: Array<{
    title: string;
    url: string;
    score: number;
  }>;
}

export interface TopicsResponse {
  topics: TopicCardData[];
}

export interface WorkerJobResult {
  status: 'ok' | 'partial';
  topics_updated: number;
  posts_fetched: number;
  notes_generated: number;
  errors: string[];
}
