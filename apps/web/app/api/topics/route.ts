/**
 * GET /api/topics
 * Returns all topics with notes and top post links
 */

import { NextResponse } from 'next/server';
import { getTopicsData } from '@/lib/data';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export async function GET() {
  try {
    const topics = await getTopicsData();
    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Unexpected error in /api/topics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
