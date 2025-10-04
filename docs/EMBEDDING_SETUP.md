# Quick Setup: Automated Embeddings

## Problem
Running `scripts/embed-posts.ts` manually every time is tedious.

## Solution
Automated background processing using Supabase Edge Functions + GitHub Actions.

---

## Setup (5 minutes)

### 1. Deploy Edge Function

```bash
# Install Supabase CLI (if not already)
npm install -g supabase

# Login
supabase login

# Link to your project (get ref from Supabase Dashboard URL)
supabase link --project-ref your-project-ref

# Set OpenAI API key as secret
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Deploy the function
supabase functions deploy embed-posts
```

### 2. Add GitHub Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

1. **SUPABASE_URL**: `https://your-project-ref.supabase.co`
2. **SUPABASE_ANON_KEY**: (from Supabase Dashboard → Settings → API → anon public)

### 3. Enable GitHub Actions

The workflow `.github/workflows/auto-embed-posts.yml` will automatically:
- Run every 10 minutes
- Check for posts without embeddings
- Generate embeddings for up to 10 posts per run
- Repeat until all posts have embeddings

### 4. Backfill Existing 720 Posts (One-time)

```bash
export OPENAI_API_KEY=sk-your-key-here
cd apps/web
npx tsx ../../scripts/embed-posts.ts
```

This takes ~3 minutes and costs ~$0.0014.

---

## Done!

From now on:
- ✅ New posts automatically get embeddings within 10 minutes
- ✅ No manual intervention needed
- ✅ Completely free (GitHub Actions free tier)
- ✅ View logs in GitHub Actions tab

---

## Testing

### Manual trigger:
GitHub → Actions → "Auto-Embed Posts" → Run workflow

### Check status:
```sql
SELECT
  COUNT(*) as total,
  COUNT(embedding) as with_embedding
FROM posts;
```

### View logs:
```bash
supabase functions logs embed-posts
```

---

## Cost
- **OpenAI**: ~$0.000002 per post
- **Edge Function**: Free (within Supabase free tier)
- **GitHub Actions**: Free (generous free tier)
- **Total for 100 new posts/month**: < $0.01
