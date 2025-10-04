/**
 * TopicCard Component
 * Displays a topic with perspective notes and post links
 */

'use client';

import Link from 'next/link';
import { ArrowUpIcon, ExternalLinkIcon, ArrowRightIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TopicCardData } from '@/lib/types';
import { trackTopicCardClick, trackRedditLinkClick, trackPerspectiveNotesView, trackEmptyNotesView } from '@/lib/analytics';
import { useEffect, useRef } from 'react';

export interface TopicCardProps extends TopicCardData {}

export default function TopicCard({
  slug,
  title,
  notes,
  links,
  last_updated,
}: TopicCardProps) {
  const hasNotes = notes.consensus || notes.contrast || notes.timeline;
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  // Track perspective notes visibility using Intersection Observer
  useEffect(() => {
    if (!cardRef.current || hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            if (hasNotes) {
              trackPerspectiveNotesView(slug, true);
            } else {
              trackEmptyNotesView(slug);
            }
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% visible
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [slug, hasNotes]);

  // Handle topic card click
  const handleCardClick = () => {
    trackTopicCardClick(slug, title);
  };

  // Handle Reddit link click
  const handleLinkClick = (link: { title: string; score: number; url: string }) => {
    // Extract subreddit from URL
    const match = link.url.match(/reddit\.com\/r\/([^\/]+)/);
    const subreddit = match ? match[1] : 'unknown';
    trackRedditLinkClick(slug, link.title, link.score, subreddit);
  };

  // Parse timeline arrows into visual steps
  const formatTimeline = (timeline: string) => {
    const steps = timeline.split('→').map(s => s.trim());
    return steps;
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Updated just now';
    if (diffHours < 24) return `Updated ${diffHours}h ago`;
    if (diffDays === 1) return 'Updated yesterday';
    return `Updated ${diffDays}d ago`;
  };

  // Extract unique subreddits from links
  const getSubreddits = () => {
    if (!links || links.length === 0) return [];
    const subreddits = links
      .map(link => {
        const match = link.url.match(/reddit\.com\/r\/([^\/]+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    return [...new Set(subreddits)].slice(0, 3); // Max 3 unique
  };

  const subreddits = getSubreddits();

  return (
    <Card ref={cardRef} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <Link href={`/topic/${slug}`} onClick={handleCardClick}>
          <CardTitle className="hover:text-primary transition-colors cursor-pointer mb-2">
            {title}
          </CardTitle>
        </Link>
        {/* Context Line */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {last_updated && <span>{formatTimeAgo(last_updated)}</span>}
          {subreddits.length > 0 && (
            <>
              <span>·</span>
              <span>Sources: {subreddits.map(s => `r/${s}`).join(', ')}</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Notes Section */}
        {hasNotes ? (
          <div className="space-y-3">
            {notes.consensus && (
              <div className="space-y-1">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Consensus
                </Badge>
                <p className="text-sm text-muted-foreground">{notes.consensus}</p>
              </div>
            )}

            {notes.contrast && (
              <div className="space-y-1">
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  Contrast
                </Badge>
                <p className="text-sm text-muted-foreground">{notes.contrast}</p>
              </div>
            )}

            {notes.timeline && (
              <div className="space-y-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Timeline
                </Badge>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {formatTimeline(notes.timeline).map((step, idx, arr) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="bg-muted/50 px-2 py-1 rounded">{step}</span>
                      {idx < arr.length - 1 && <ArrowRightIcon className="w-3 h-3 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              No summary right now — check the top threads directly below.
            </p>
          </div>
        )}

        {/* Links Section */}
        {links && links.length > 0 ? (
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <span>🧵</span>
              <span>Dive into the top threads</span>
            </p>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleLinkClick(link)}
                  className="flex items-start gap-2 text-sm text-primary hover:underline group"
                >
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-0.5">
                    <ArrowUpIcon className="w-3 h-3" />
                    <span className="font-mono">{link.score}</span>
                  </div>
                  <span className="flex-1">{link.title}</span>
                  <ExternalLinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground italic">No threads available yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
