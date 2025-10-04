# Next Steps: Getting the MVP Running

## Phase 0: Setup Infrastructure (1-2 hours)

### 1. Install Dependencies

```bash
# Install Next.js dependencies
cd apps/web
npm install

# Install Python dependencies
cd ../workers
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set Up Supabase

1. Create account at https://supabase.com
2. Create new project: `reddit-perspective-cards`
3. Go to **SQL Editor** → **New Query**
4. Copy/paste contents of `infra/sql/001_init.sql`
5. Click **Run**
6. Verify tables created:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
   Should return: `topics`, `posts`, `topic_notes`

7. Get credentials:
   - Dashboard → Settings → API
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Set Up Reddit API

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill form:
   - Name: `Reddit Perspective Cards`
   - Type: **Script**
   - Redirect URI: `http://localhost:8000`
4. Click "Create app"
5. Copy:
   - Client ID (under app name, 14 chars)
   - Secret (click "edit" to see, ~27 chars)

### 4. Set Up OpenAI

1. Go to https://platform.openai.com/api-keys
2. Create new secret key: `reddit-perspective-cards`
3. Copy key (starts with `sk-...`)
4. Set usage limit: Settings → Billing → $5/month (optional but recommended)

### 5. Configure Environment Variables

**Python Worker (`apps/workers/.env`):**
```bash
cp .env.example .env
# Edit .env with your values:
REDDIT_CLIENT_ID=your_14_char_id
REDDIT_CLIENT_SECRET=your_27_char_secret
REDDIT_USER_AGENT=PerspectiveCards/0.1 by /u/yourusername
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
WORKER_AUTH_TOKEN=$(openssl rand -hex 32)
```

**Next.js (`apps/web/.env.local`):**
```bash
cp .env.example .env.local
# Edit .env.local:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
FLY_WORKER_URL=http://localhost:8080  # For now, will update after Fly.io deploy
WORKER_AUTH_TOKEN=<same_as_worker>
CRON_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_URL=http://localhost:3000
```

---

## Phase 1: Test Locally (30 minutes)

### Test Breakpoint 1.1: Python Worker Locally

```bash
cd apps/workers
source venv/bin/activate

# Test fetcher
python fetcher.py
# Expected: "✅ Fetcher complete: 2 topics, ~30+ posts"

# Verify in Supabase:
# Go to Table Editor → posts → Should see rows

# Test notes worker
python notes.py
# Expected: "✅ Notes generation complete: 2/2 topics"

# Verify in Supabase:
# Go to Table Editor → topic_notes → Should see 2 rows with consensus/contrast/timeline

# Test full worker
uvicorn main:app --reload --port 8080
# In another terminal:
curl http://localhost:8080/health
# Should return: {"status":"ok",...}

curl -X POST http://localhost:8080/run/hourly \
  -H "X-Worker-Token: your_token_from_env"
# Should return: {"status":"ok","topics_updated":2,...}
```

**Pass Criteria:**
- ✅ At least 10 posts per topic in database
- ✅ Notes generated with consensus/contrast/timeline
- ✅ No errors in logs

### Test Breakpoint 1.2: Next.js Locally

```bash
cd apps/web
npm run dev
# Visit http://localhost:3000

# Check browser:
# - Should see "Reddit Perspective Cards" title
# - Should see 2 topic cards (ai-safety, climate-tech)
# - Each card should have:
#   ✅ Title
#   ✅ 3 notes (Consensus, Contrast, Timeline)
#   ✅ 3-4 post links
# - Click a card → should navigate to /topic/ai-safety
# - Click a post link → should open Reddit in new tab
```

**Pass Criteria:**
- ✅ Homepage renders with 2 topics
- ✅ Notes are visible and non-empty
- ✅ Links work and open Reddit
- ✅ No console errors

---

## Phase 2: Deploy to Fly.io (1 hour)

### Deploy Worker

```bash
cd apps/workers

# Install Fly CLI (if not installed)
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch
# Prompts:
# - App name: reddit-perspective-worker (or auto-generate)
# - Region: iad (or closest to you)
# - PostgreSQL? No
# - Redis? No
# - Deploy now? No

# Set secrets
fly secrets set \
  REDDIT_CLIENT_ID="your_id" \
  REDDIT_CLIENT_SECRET="your_secret" \
  REDDIT_USER_AGENT="PerspectiveCards/0.1 by /u/yourname" \
  OPENAI_API_KEY="sk-..." \
  SUPABASE_URL="https://xxxxx.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  WORKER_AUTH_TOKEN="your_token"

# Deploy
fly deploy

# Get URL
fly info
# Copy "Hostname": your-worker.fly.dev

# Test
curl https://your-worker.fly.dev/health
# Should return: {"status":"ok"}

curl -X POST https://your-worker.fly.dev/run/hourly \
  -H "X-Worker-Token: your_token"
# Should return: {"status":"ok",...}
```

**Pass Criteria:**
- ✅ Worker deploys successfully
- ✅ Health check returns 200
- ✅ Manual trigger works
- ✅ Database updates after trigger

---

## Phase 3: Deploy to Vercel (30 minutes)

### Deploy Next.js

```bash
cd apps/web

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Add environment variables
vercel env add SUPABASE_URL production
# Paste: https://xxxxx.supabase.co

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste: eyJ...

vercel env add FLY_WORKER_URL production
# Paste: https://your-worker.fly.dev

vercel env add WORKER_AUTH_TOKEN production
# Paste: your_token

vercel env add CRON_SECRET production
# Paste: your_cron_secret

vercel env add NEXT_PUBLIC_URL production
# Paste: https://your-app.vercel.app (you'll get this after deploy)

# Deploy
vercel --prod

# Copy URL from output
# Update NEXT_PUBLIC_URL:
vercel env rm NEXT_PUBLIC_URL production
vercel env add NEXT_PUBLIC_URL production
# Paste the URL you just got

# Redeploy
vercel --prod
```

**Pass Criteria:**
- ✅ Site loads at https://your-app.vercel.app
- ✅ Topic cards display correctly
- ✅ ISR caching works (fast subsequent loads)

---

## Phase 4: Test Cron Integration (Wait 1 hour)

### Verify Automated Updates

```bash
# Wait for top of the hour (e.g., 3:00 PM)

# Check Vercel logs
vercel logs --follow
# Should show: POST /api/cron/trigger at :00 minute

# Check Fly.io logs
fly logs
# Should show: "Hourly job started", "Fetching...", "Generating notes..."

# Check database
# Supabase → Table Editor → topics
# Verify last_fetched_at updated within last hour

# Check website
# Visit https://your-app.vercel.app
# Notes should be fresh (check if new posts appear)
```

**Pass Criteria:**
- ✅ Cron runs on schedule
- ✅ Worker executes successfully
- ✅ Database updates automatically
- ✅ UI reflects new data after 5 minutes (ISR revalidation)

---

## Phase 5: Add More Topics (Optional)

### Expand Beyond 2 Topics

```sql
-- In Supabase SQL Editor
INSERT INTO topics (slug, title, description, subreddit_allowlist, keywords) VALUES
  (
    'web-dev',
    'Web Development Trends',
    'Latest in frontend, backend, and full-stack development',
    '["webdev", "javascript", "reactjs", "nextjs"]'::jsonb,
    '["React", "TypeScript", "Tailwind", "performance"]'::jsonb
  ),
  (
    'startup-stories',
    'Startup Stories & Lessons',
    'Entrepreneurship, failures, and successes',
    '["startups", "Entrepreneur", "SideProject"]'::jsonb,
    '["founder", "product-market fit", "funding", "YC"]'::jsonb
  );
```

**Verify:**
- Wait for next cron run
- Check homepage → should see 4 topics

---

## Troubleshooting

### Worker not updating database
```bash
fly logs
# Look for errors
# Common issues:
# - Invalid Reddit credentials
# - OpenAI API quota exceeded
# - Supabase connection timeout
```

### Next.js build fails
```bash
# Check env vars are set:
vercel env ls

# Common issues:
# - Missing SUPABASE_URL
# - Invalid service_role key
```

### Cron not triggering
- Vercel Dashboard → Project → Settings → Cron Jobs
- Verify `vercel.json` is at repo root
- Check CRON_SECRET matches between Vercel and code

---

## Success Metrics

After completing all phases:
- ✅ 2+ topics displayed on homepage
- ✅ Each topic has perspective notes
- ✅ Each topic has 3-4 Reddit post links
- ✅ Hourly cron updates content automatically
- ✅ No errors in production logs
- ✅ Page load time < 2s (ISR caching)

---

## What's Next?

After MVP is running:
1. **Phase 6: Add more topics** (manually via SQL)
2. **Phase 7: Hardening** (better error handling, monitoring)
3. **Phase 8: Analytics** (track CTR, zero-result rate)
4. **Phase 9: Search** (add pgvector embeddings + semantic search)
5. **Phase 10: Admin UI** (manage topics without SQL)

---

**Ready to start?** Begin with Phase 0 (Setup Infrastructure).
