/**
 * Supabase Edge Function: Auto-Embed Posts
 * Automatically generates embeddings for posts without them
 *
 * Triggered by:
 * - HTTP endpoint: POST /functions/v1/embed-posts
 * - pg_cron schedule (every 10 minutes)
 *
 * Deploy:
 *   supabase functions deploy embed-posts
 *
 * Set secrets:
 *   supabase secrets set OPENAI_API_KEY=sk-...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BATCH_SIZE = 10; // Process 10 posts per invocation (Edge Functions have 60s timeout)

interface Post {
  id: string;
  title: string;
  preview_excerpt: string | null;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  try {
    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch posts without embeddings (limit to BATCH_SIZE)
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, preview_excerpt')
      .is('embedding', null)
      .limit(BATCH_SIZE);

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No posts need embedding',
          processed: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${posts.length} posts...`);

    // Process each post
    let processed = 0;
    let failed = 0;

    for (const post of posts) {
      try {
        const text = `${post.title}\n\n${post.preview_excerpt || ''}`.trim();
        const embedding = await generateEmbedding(text);

        const { error: updateError } = await supabase
          .from('posts')
          .update({ embedding })
          .eq('id', post.id);

        if (updateError) {
          console.error(`Failed to update post ${post.id}:`, updateError);
          failed++;
        } else {
          processed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} posts, ${failed} failed`,
        processed,
        failed,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
