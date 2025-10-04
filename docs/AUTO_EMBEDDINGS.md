# Auto-Embedding System

Automated background processing to generate embeddings for posts without them.

## How It Works

Instead of running manual scripts, embeddings are generated automatically:

1. **Edge Function** (`supabase/functions/embed-posts/index.ts`)
   - Processes 10 posts per invocation (60s timeout limit)
   - Generates embeddings using OpenAI API
   - Updates database with embeddings

2. **Scheduled Job** (pg_cron)
   - Runs every 10 minutes
   - Calls Edge Function if posts need embedding
   - Fully automated, no manual intervention

3. **Backfill** (One-time)
   - Use `scripts/embed-posts.ts` to embed existing 720 posts
   - Only needed once for historical data

---

## Setup Instructions

### Step 1: Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set OpenAI API key as secret
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Deploy the function
supabase functions deploy embed-posts
```

### Step 2: Enable pg_cron (Optional)

**Note:** pg_cron requires Supabase Pro plan or contacting support.

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to call Edge Function every 10 minutes
SELECT cron.schedule(
  'auto-embed-posts',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/embed-posts',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )
  $$
);
```

### Step 3: Backfill Existing Posts (One-time)

```bash
# Run the manual script for 720 existing posts
export OPENAI_API_KEY=sk-your-key-here
cd apps/web
npx tsx ../../scripts/embed-posts.ts
```

**Expected:**
- Time: ~3-4 minutes
- Cost: ~$0.0014
- Result: All 720 posts have embeddings

---

## Alternative: Manual Trigger (Free Tier)

If you don't have pg_cron (Pro plan), you can trigger manually:

### Option A: HTTP Endpoint

```bash
# Call the Edge Function directly
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/embed-posts \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Option B: GitHub Actions (Recommended)

Create `.github/workflows/embed-posts.yml`:

```yaml
name: Auto-Embed Posts

on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:         # Manual trigger

jobs:
  embed:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            https://your-project-ref.supabase.co/functions/v1/embed-posts \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

**Advantages:**
- ✅ Free (GitHub Actions has generous free tier)
- ✅ Runs automatically every 10 minutes
- ✅ No Supabase Pro plan needed
- ✅ Logs visible in GitHub Actions UI

---

## Cost Analysis

**Embedding costs:**
- OpenAI text-embedding-3-small: $0.02 / 1M tokens
- Average post: ~100 tokens
- Cost per post: ~$0.000002

**For 100 new posts/day:**
- Daily: $0.0002
- Monthly: $0.006 (~less than 1 cent)

**Edge Function costs:**
- Supabase free tier: 500K invocations/month
- 10-min schedule: ~4,320 invocations/month
- Cost: $0 (well within free tier)

**Total monthly cost: <$0.01** ✅

---

## Monitoring

### Check Embedding Status

```sql
SELECT
  COUNT(*) as total_posts,
  COUNT(embedding) as posts_with_embedding,
  COUNT(*) - COUNT(embedding) as posts_needing_embedding
FROM posts;
```

### View Edge Function Logs

```bash
supabase functions logs embed-posts
```

Or in Supabase Dashboard → Edge Functions → embed-posts → Logs

---

## Troubleshooting

**Q: Posts aren't getting embedded automatically**
- Check Edge Function logs for errors
- Verify OpenAI API key is set: `supabase secrets list`
- Verify pg_cron schedule is active: `SELECT * FROM cron.job;`

**Q: "OpenAI API error: Unauthorized"**
- Run: `supabase secrets set OPENAI_API_KEY=sk-your-new-key`
- Redeploy: `supabase functions deploy embed-posts`

**Q: "Function timeout after 60s"**
- Reduce BATCH_SIZE in `supabase/functions/embed-posts/index.ts`
- Default is 10 posts/invocation (safe for 60s limit)

**Q: I'm on Supabase free tier, can't use pg_cron**
- Use GitHub Actions workflow (see "Alternative: Manual Trigger" above)
- Or call Edge Function manually after adding posts

---

## Summary

**Manual approach (old):**
- ❌ Run script every time posts are added
- ❌ Requires remembering to run it
- ❌ Requires local OpenAI API key

**Automated approach (new):**
- ✅ Set up once, works forever
- ✅ Processes new posts automatically
- ✅ OpenAI API key stored securely in Supabase
- ✅ Free tier friendly (use GitHub Actions)
- ✅ Logs and monitoring built-in

**Recommendation:** Use GitHub Actions workflow for fully automated, free solution!
