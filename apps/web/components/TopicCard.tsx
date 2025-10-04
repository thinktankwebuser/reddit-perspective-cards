/**
 * TopicCard Component
 * Displays a topic with perspective notes and post links
 */

import Link from 'next/link';
import { ArrowUpIcon, ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TopicCardData } from '@/lib/types';

export interface TopicCardProps extends TopicCardData {}

export default function TopicCard({
  slug,
  title,
  notes,
  links,
}: TopicCardProps) {
  const hasNotes = notes.consensus || notes.contrast || notes.timeline;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <Link href={`/topic/${slug}`}>
          <CardTitle className="hover:text-primary transition-colors cursor-pointer">
            {title}
          </CardTitle>
        </Link>
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
              <div className="space-y-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Timeline
                </Badge>
                <p className="text-sm text-muted-foreground italic">{notes.timeline}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No perspective notes available yet.
          </p>
        )}

        {/* Links Section */}
        {links && links.length > 0 ? (
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Top Posts
            </p>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
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
            <p className="text-xs text-muted-foreground italic">No posts available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
