/**
 * Data fetching utilities
 * Shared between API routes and Server Components
 */

import { supabase } from './supabase';
import type { TopicCardData } from '@/lib/types';

/**
 * Fetch all topics with notes and links
 * Optimized to avoid N+1 queries
 */
export async function getTopicsData(): Promise<TopicCardData[]> {
  // Fetch all topics with their notes
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select(`
      id,
      slug,
      title,
      last_fetched_at,
      topic_notes!topic_notes_topic_id_fkey (
        consensus_text,
        contrast_text,
        timeline_text,
        source_ids,
        updated_at
      )
    `)
    .order('title', { ascending: true });

  if (topicsError || !topics) {
    console.error('Error fetching topics:', topicsError);
    return [];
  }

  // Collect all source IDs from all topics
  const allSourceIds = topics
    .flatMap((topic) => {
      const notes = topic.topic_notes as any;
      return (notes?.source_ids as string[]) || [];
    })
    .filter(Boolean);

  // Fetch all posts in a single query
  let postsMap = new Map<string, { title: string; url: string; score: number }>();

  if (allSourceIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('reddit_id, title, url, score')
      .in('reddit_id', allSourceIds);

    if (posts) {
      posts.forEach((post) => {
        postsMap.set(post.reddit_id, {
          title: post.title,
          url: post.url,
          score: post.score,
        });
      });
    }
  }

  // Build response with links from the map
  const enrichedTopics: TopicCardData[] = topics.map((topic) => {
    const notes = topic.topic_notes as any;  // One-to-one relationship, not an array
    const sourceIds = (notes?.source_ids as string[]) || [];

    // Get posts for this topic from the map, maintaining order
    const links = sourceIds
      .map((id) => postsMap.get(id))
      .filter(Boolean) as Array<{ title: string; url: string; score: number }>;

    return {
      slug: topic.slug,
      title: topic.title,
      last_updated: topic.last_fetched_at || notes?.updated_at || '',
      notes: {
        consensus: notes?.consensus_text || '',
        contrast: notes?.contrast_text || '',
        timeline: notes?.timeline_text || '',
      },
      links,
    };
  });

  return enrichedTopics;
}

/**
 * Fetch a single topic by slug
 */
export async function getTopicData(slug: string): Promise<TopicCardData | null> {
  const { data: topics, error: topicError } = await supabase
    .from('topics')
    .select(`
      id,
      slug,
      title,
      last_fetched_at,
      topic_notes!topic_notes_topic_id_fkey (
        consensus_text,
        contrast_text,
        timeline_text,
        source_ids,
        updated_at
      )
    `)
    .eq('slug', slug)
    .limit(1);

  if (topicError || !topics || topics.length === 0) {
    console.error('Error fetching topic:', topicError);
    return null;
  }

  const topic = topics[0];
  const notes = topic.topic_notes as any;  // One-to-one relationship, not an array
  const sourceIds = (notes?.source_ids as string[]) || [];

  let links: Array<{ title: string; url: string; score: number }> = [];

  if (sourceIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('reddit_id, title, url, score')
      .in('reddit_id', sourceIds);

    // Build map and maintain source_ids order (same as getTopicsData)
    if (posts) {
      const postsMap = new Map(posts.map((p) => [p.reddit_id, p]));
      links = sourceIds
        .map((id) => postsMap.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map(({ title, url, score }) => ({ title, url, score }));
    }
  }

  return {
    slug: topic.slug,
    title: topic.title,
    last_updated: topic.last_fetched_at || notes?.updated_at || '',
    notes: {
      consensus: notes?.consensus_text || '',
      contrast: notes?.contrast_text || '',
      timeline: notes?.timeline_text || '',
    },
    links,
  };
}
