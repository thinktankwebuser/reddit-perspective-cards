/**
 * GET /api/topic/[slug]
 * Returns a single topic with notes and links
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTopicData } from '@/lib/data';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    const topic = await getTopicData(slug);

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error('Unexpected error in /api/topic/[slug]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
