/**
 * Analytics utilities for tracking user behavior
 * Uses Vercel Analytics for custom events
 */

import { track } from '@vercel/analytics';

/**
 * Track when a user clicks on a topic card
 */
export function trackTopicCardClick(topicSlug: string, topicTitle: string) {
  track('topic_card_click', {
    slug: topicSlug,
    title: topicTitle,
  });
}

/**
 * Track when a user clicks a Reddit link
 */
export function trackRedditLinkClick(
  topicSlug: string,
  postTitle: string,
  postScore: number,
  subreddit: string
) {
  track('reddit_link_click', {
    topic: topicSlug,
    post_title: postTitle,
    score: postScore,
    subreddit: subreddit,
  });
}

/**
 * Track when perspective notes are visible (user scrolled to them)
 */
export function trackPerspectiveNotesView(topicSlug: string, hasNotes: boolean) {
  track('perspective_notes_view', {
    topic: topicSlug,
    has_content: hasNotes,
  });
}

/**
 * Track when a topic has no notes (empty state)
 */
export function trackEmptyNotesView(topicSlug: string) {
  track('empty_notes_view', {
    topic: topicSlug,
  });
}

/**
 * Track homepage load with topic count
 */
export function trackHomepageView(topicCount: number) {
  track('homepage_view', {
    topic_count: topicCount,
  });
}
