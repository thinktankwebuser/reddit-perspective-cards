/**
 * Embedding Worker
 * Generates OpenAI embeddings for all posts in the database
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... tsx scripts/embed-posts.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Configuration
const BATCH_SIZE = 100; // Process 100 posts at a time
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions, $0.02/1M tokens
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials. Check .env.local');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY environment variable');
  console.error('Usage: OPENAI_API_KEY=sk-... tsx scripts/embed-posts.ts');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface Post {
  id: string;
  title: string;
  preview_excerpt: string | null;
}

async function fetchPostsWithoutEmbeddings(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, preview_excerpt')
    .is('embedding', null);

  if (error) {
    throw new Error(`Failed to fetch posts: ${error.message}`);
  }

  return data || [];
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

async function updatePostEmbedding(postId: string, embedding: number[]): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ embedding })
    .eq('id', postId);

  if (error) {
    throw new Error(`Failed to update post ${postId}: ${error.message}`);
  }
}

function estimateCost(totalPosts: number, avgTokensPerPost: number = 100): void {
  const totalTokens = totalPosts * avgTokensPerPost;
  const costPerMillionTokens = 0.02;
  const estimatedCost = (totalTokens / 1_000_000) * costPerMillionTokens;

  console.log('\n💰 Cost Estimate:');
  console.log(`   Posts: ${totalPosts}`);
  console.log(`   Avg tokens/post: ${avgTokensPerPost}`);
  console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
  console.log(`   Estimated cost: $${estimatedCost.toFixed(4)}`);
}

async function processBatch(posts: Post[], batchNum: number, totalBatches: number): Promise<void> {
  console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${posts.length} posts)`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const text = `${post.title}\n\n${post.preview_excerpt || ''}`.trim();

    try {
      // Generate embedding
      const embedding = await generateEmbedding(text);

      // Update database
      await updatePostEmbedding(post.id, embedding);

      // Progress indicator
      const progress = ((i + 1) / posts.length * 100).toFixed(0);
      process.stdout.write(`\r   Progress: ${i + 1}/${posts.length} (${progress}%)`);

      // Rate limiting: OpenAI has 3,000 RPM limit for tier 1
      // Sleep 20ms between requests to stay under limit
      await new Promise(resolve => setTimeout(resolve, 20));
    } catch (error) {
      console.error(`\n❌ Failed to process post ${post.id}:`, error);
      throw error;
    }
  }

  console.log(' ✅');
}

async function main() {
  console.log('🚀 Starting embedding generation...\n');

  // Fetch posts without embeddings
  console.log('📥 Fetching posts without embeddings...');
  const posts = await fetchPostsWithoutEmbeddings();

  if (posts.length === 0) {
    console.log('✅ All posts already have embeddings!');
    return;
  }

  console.log(`📊 Found ${posts.length} posts to embed`);

  // Show cost estimate
  estimateCost(posts.length);

  // Confirm before proceeding
  console.log('\n⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Process in batches
  const batches: Post[][] = [];
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    batches.push(posts.slice(i, i + BATCH_SIZE));
  }

  const startTime = Date.now();

  for (let i = 0; i < batches.length; i++) {
    await processBatch(batches[i], i + 1, batches.length);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  console.log(`\n✅ Successfully embedded ${posts.length} posts in ${duration}s`);

  // Verify
  console.log('\n🔍 Verifying...');
  const { data: verifyData } = await supabase
    .from('posts')
    .select('id')
    .is('embedding', null);

  const remaining = verifyData?.length || 0;
  if (remaining === 0) {
    console.log('✅ All posts have embeddings!');
  } else {
    console.log(`⚠️  ${remaining} posts still missing embeddings`);
  }
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
