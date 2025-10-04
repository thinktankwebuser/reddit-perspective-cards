/**
 * Topic Detail Page
 * Shows full perspective notes and links for a single topic
 */

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import TopicCard from '@/components/TopicCard';
import { Button } from '@/components/ui/button';
import { getTopicData } from '@/lib/data';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export default async function TopicPage({
  params,
}: {
  params: { slug: string };
}) {
  const topic = await getTopicData(params.slug);

  if (!topic) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Topic Not Found
            </h1>
            <p className="text-muted-foreground">
              The topic you're looking for doesn't exist or hasn't been set up yet.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to all topics
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Link */}
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to all topics
          </Link>
        </Button>

        {/* Topic Card (larger for detail view) */}
        <div className="max-w-2xl">
          <TopicCard {...topic} />
        </div>

        {/* Additional Info */}
        {topic.last_updated && (
          <div className="mt-6 text-sm text-muted-foreground">
            Last updated: {new Date(topic.last_updated).toLocaleString()}
          </div>
        )}
      </div>
    </main>
  );
}
