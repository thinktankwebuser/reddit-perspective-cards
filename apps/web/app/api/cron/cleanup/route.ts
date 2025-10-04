/**
 * Cleanup cron endpoint
 * Called weekly by Vercel Cron to trigger cleanup of old posts
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Trigger Fly.io worker cleanup endpoint
  const workerUrl = process.env.FLY_WORKER_URL;
  const workerToken = process.env.WORKER_AUTH_TOKEN;

  if (!workerUrl || !workerToken) {
    console.error('Missing FLY_WORKER_URL or WORKER_AUTH_TOKEN');
    return NextResponse.json(
      { error: 'Worker configuration missing' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${workerUrl}/run/cleanup`, {
      method: 'POST',
      headers: {
        'X-Worker-Token': workerToken,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cleanup worker error:', data);
      return NextResponse.json(
        { error: 'Cleanup request failed', details: data },
        { status: response.status }
      );
    }

    console.log('Cleanup triggered successfully:', data);
    return NextResponse.json({
      status: 'cleanup_complete',
      result: data,
    });
  } catch (error) {
    console.error('Error triggering cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to trigger cleanup', details: String(error) },
      { status: 500 }
    );
  }
}
