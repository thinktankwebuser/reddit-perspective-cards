/**
 * Client component to track page views
 * Must be separate from server components
 */

'use client';

import { useEffect } from 'react';
import { trackHomepageView } from '@/lib/analytics';

interface AnalyticsPageViewProps {
  topicCount: number;
}

export default function AnalyticsPageView({ topicCount }: AnalyticsPageViewProps) {
  useEffect(() => {
    trackHomepageView(topicCount);
  }, [topicCount]);

  return null; // This component renders nothing
}
