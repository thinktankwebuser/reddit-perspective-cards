# Remaining Setup Steps for Automated Embeddings

## ✅ Completed:
1. Database migration (003_add_embeddings.sql) - **DONE** in Supabase
2. Edge Function deployed - **DONE** via `supabase functions deploy`
3. OpenAI API key set as secret - **DONE** via `supabase secrets set`
4. Code committed locally - **DONE**

---

## ⏳ Remaining Steps (5 minutes):

### Step 1: Push GitHub Workflow

The commit is ready but needs to be pushed manually:

```bash
git push origin main
```

**Note:** You may need to authorize GitHub with `workflow` scope if pushing via CLI fails.

**Alternative:** Push from GitHub Desktop or VS Code Git integration.

---

### Step 2: Add GitHub Secrets

Go to: `https://github.com/thinktankwebuser/reddit-perspective-cards/settings/secrets/actions`

Add these 2 secrets:

**Secret 1:**
- Name: `SUPABASE_URL`
- Value: `https://YOUR_PROJECT_REF.supabase.co`
  (Find in: Supabase Dashboard → Settings → API → Project URL)

**Secret 2:**
- Name: `SUPABASE_ANON_KEY`
- Value: Your anon public key
  (Find in: Supabase Dashboard → Settings → API → Project API keys → anon public)

---

### Step 3: Test GitHub Actions (Optional)

After pushing and adding secrets:

1. Go to: `https://github.com/thinktankwebuser/reddit-perspective-cards/actions`
2. Click "Auto-Embed Posts" workflow
3. Click "Run workflow" button (manual trigger)
4. Check logs to verify it works

Expected output:
```
Response: {"success":true,"message":"Processed 10 posts, 0 failed","processed":10,"failed":0}
Processed: 10 posts
Failed: 0 posts
```

---

### Step 4: Run One-Time Backfill for 720 Posts

From terminal:

```bash
export OPENAI_API_KEY=sk-your-key-here
cd apps/web
npx tsx ../../scripts/embed-posts.ts
```

**This takes ~3 minutes and costs ~$0.0014**

Expected output:
```
🚀 Starting embedding generation...
📥 Fetching posts without embeddings...
📊 Found 720 posts to embed

💰 Cost Estimate:
   Posts: 720
   Avg tokens/post: 100
   Total tokens: 72,000
   Estimated cost: $0.0014

⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...

📦 Batch 1/8 (100 posts)
   Progress: 100/100 (100%) ✅
...
📦 Batch 8/8 (20 posts)
   Progress: 20/20 (100%) ✅

✅ Successfully embedded 720 posts in 180.5s

🔍 Verifying...
✅ All posts have embeddings!
```

---

### Step 5: Verify Everything Works

```sql
-- In Supabase SQL Editor:
SELECT
  COUNT(*) as total_posts,
  COUNT(embedding) as posts_with_embedding
FROM posts;

-- Should return: total_posts = 720, posts_with_embedding = 720
```

---

## After Setup is Complete:

The system will automatically:
- ✅ Run every 10 minutes via GitHub Actions
- ✅ Check for posts without embeddings
- ✅ Generate embeddings for up to 10 posts per run
- ✅ Fully automated, no manual intervention needed

**Cost:** <$0.01/month for 100 new posts/month

---

## Then Continue to Week 2 Development:

1. Update `/api/search` endpoint with mode parameter (BM25 | Semantic | Hybrid)
2. Add semantic search logic to API
3. Build side-by-side comparison UI

**Estimated time:** 1-2 hours

This is where you'll see the real RAG learning: comparing BM25 vs Semantic results side-by-side!
