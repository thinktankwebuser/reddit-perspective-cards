# Reddit Perspective Cards

MVP application that shows **Perspective Cards** for selected Reddit topics. Each card displays LLM-generated summaries (Consensus, Contrast, Timeline) alongside relevant post links.

## Architecture

- **UI/API**: Next.js 14 (App Router) on Vercel
- **Workers**: Python FastAPI on Fly.io
- **Database**: Supabase Postgres
- **LLM**: OpenAI GPT-4o-mini

## Project Structure

```
reddit-perspective-cards/
├── apps/
│   ├── web/              # Next.js frontend + API routes
│   └── workers/          # Python worker (fetcher + notes generator)
├── infra/
│   └── sql/              # Database schema
└── packages/
    └── shared/           # Shared TypeScript types
```

## Setup

### Prerequisites

- Node.js 18+ and npm/pnpm
- Python 3.11+
- Reddit account (for API credentials)
- OpenAI API key
- Supabase account
- Vercel account
- Fly.io account

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd reddit-perspective-cards

# Install Next.js dependencies
cd apps/web
npm install

# Install Python dependencies
cd ../workers
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set Up Services

**Supabase:**
- Create project at https://supabase.com
- Run `infra/sql/001_init.sql` in SQL Editor
- Copy Project URL and service_role key

**Reddit API:**
- Create app at https://www.reddit.com/prefs/apps
- Type: Script
- Copy client ID and secret

**OpenAI:**
- Create API key at https://platform.openai.com
- Set usage limits (recommended: $5/month for testing)

### 3. Configure Environment Variables

**Vercel (.env.local for local dev):**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FLY_WORKER_URL=https://your-worker.fly.dev
WORKER_AUTH_TOKEN=<generate with: openssl rand -hex 32>
CRON_SECRET=<generate with: openssl rand -hex 32>
NEXT_PUBLIC_URL=http://localhost:3000
```

**Fly.io (set via fly secrets set):**
```bash
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_secret
REDDIT_USER_AGENT=PerspectiveCards/0.1 by /u/yourusername
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WORKER_AUTH_TOKEN=<same as Vercel>
```

### 4. Deploy

**Fly.io Worker:**
```bash
cd apps/workers
fly launch  # Follow prompts
fly secrets set REDDIT_CLIENT_ID=... # (set all secrets)
fly deploy
fly info  # Note the hostname
```

**Vercel:**
```bash
cd apps/web
vercel link
vercel env add SUPABASE_URL production  # (add all env vars)
vercel --prod
```

### 5. Test

```bash
# Test worker health
curl https://your-worker.fly.dev/health

# Test manual fetch
curl -X POST https://your-worker.fly.dev/run/hourly \
  -H "X-Worker-Token: your_token"

# Test Next.js API
curl https://your-app.vercel.app/api/topics
```

## Development

**Next.js (local):**
```bash
cd apps/web
npm run dev
# Visit http://localhost:3000
```

**Python Worker (local):**
```bash
cd apps/workers
source venv/bin/activate
uvicorn main:app --reload --port 8080
# Visit http://localhost:8080/docs
```

## Phased Implementation

See design doc for detailed phase breakdown with test checkpoints:
- **Phase 0**: Infrastructure setup (1-2h)
- **Phase 1**: Fetcher implementation (3-4h)
- **Phase 2**: Notes worker (3-4h)
- **Phase 3**: Worker integration (2-3h)
- **Phase 4**: API routes (2-3h)
- **Phase 5**: UI (4-5h)
- **Phase 6**: Cron integration (1h)
- **Phase 7**: Hardening (2-3h)

## Monitoring & Hardening

### Phase 7: Production Hardening ✅

The MVP now includes enterprise-grade error monitoring and reliability features:

**Error Monitoring (Sentry):**
- Frontend error tracking with Next.js integration
- Backend error tracking with FastAPI integration
- Performance monitoring (10% sample rate)
- Release tracking via Git commit SHA

**Retry Logic:**
- OpenAI API calls retry automatically (3 attempts with exponential backoff)
- 30-second timeout per request
- Automatic Sentry capture on final failure

**Structured Logging:**
- JSON-formatted logs for easy parsing
- Consistent log levels (INFO, WARNING, ERROR)
- Exception traces included

**Data Retention:**
- Posts older than 30 days auto-deleted weekly
- Cleanup cron runs Sundays at 3 AM UTC
- Metrics tracked (deleted count, cutoff date)

### Setup Instructions

1. **Configure Sentry** (see `docs/ALERTING.md`):
   ```bash
   # Vercel
   vercel env add NEXT_PUBLIC_SENTRY_DSN

   # Fly.io
   fly secrets set SENTRY_DSN=<your-dsn>
   ```

2. **View Logs**:
   ```bash
   # Vercel (structured logs)
   vercel logs --follow

   # Fly.io (JSON format)
   fly logs
   fly logs | grep '"level":"ERROR"'
   ```

3. **Test Cleanup**:
   ```bash
   curl -X POST https://your-worker.fly.dev/run/cleanup \
     -H "X-Worker-Token: $WORKER_AUTH_TOKEN"
   ```

See full documentation:
- `docs/ALERTING.md` - Complete alerting setup guide
- `docs/PHASE7_SUMMARY.md` - Implementation details

## License

MIT
