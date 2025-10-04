# Phase 7: Hardening - Implementation Summary

## Overview

Successfully implemented production-grade hardening for the Reddit Perspective Cards MVP, including error monitoring, retry logic, structured logging, and data retention policies.

## What Was Implemented

### 1. Error Monitoring (Sentry)

**Frontend (Next.js):**
- Added `@sentry/nextjs` package
- Created `lib/sentry.ts` with initialization logic
- Integrated error tracking in data fetching (`lib/data.ts`)
- Configured performance monitoring (10% sample rate)
- Release tracking via Git commit SHA

**Backend (Python Worker):**
- Added `sentry-sdk` to requirements
- Sentry integration in all worker modules:
  - `main.py` - FastAPI integration
  - `notes.py` - LLM error tracking
  - `cleanup.py` - Cleanup job monitoring
- Environment-based configuration (Fly.io region detection)

### 2. Retry Logic & Error Handling

**OpenAI API Calls:**
- Added `tenacity` library for exponential backoff retry
- Retry configuration:
  - Max attempts: 3
  - Backoff: 2s → 4s → 8s (exponential)
  - Timeout: 30 seconds per request
- Automatic error capture to Sentry on final failure

**Benefits:**
- Resilient to temporary API outages
- Rate limit handling with smart backoff
- Better success rate for AI note generation

### 3. Structured Logging

**JSON Log Format:**
```json
{
  "timestamp": "2025-01-15T12:00:00Z",
  "level": "INFO",
  "message": "Fetch phase complete: 24 posts from 6 topics",
  "module": "main"
}
```

**Implementation:**
- Custom `JsonFormatter` class in `main.py`
- Consistent logging across all worker modules
- Exception traces included in error logs
- Easy parsing for log aggregation tools

**Log Levels:**
- `INFO` - Normal operations (job start/complete, metrics)
- `WARNING` - Rate limits, retries, degraded performance
- `ERROR` - Job failures, API errors, database errors

### 4. Post Retention Policy (30 Days)

**New Components:**
- `cleanup.py` - Cleanup worker module
- `/run/cleanup` endpoint in main worker API
- Weekly cron job in `vercel.json` (Sundays 3 AM UTC)
- `/api/cron/cleanup/route.ts` - Vercel cron trigger

**Cleanup Logic:**
- Deletes posts older than 30 days
- Uses `created_utc` timestamp for filtering
- Returns metrics (deleted count, cutoff date)
- Includes error handling and Sentry monitoring

### 5. Alerting Infrastructure

**Documentation Created:**
- `docs/ALERTING.md` - Comprehensive setup guide
- Sentry configuration steps
- Vercel cron monitoring
- Fly.io health checks and alerts
- Recommended alert thresholds

**Alert Categories:**
- **Critical** - Worker down, database failures, invalid API keys
- **Warning** - Cron skipped, low success rate, high retries
- **Info** - Daily summaries, cleanup completion

## Files Modified

### Frontend (Next.js)
- `apps/web/lib/sentry.ts` - **NEW** - Sentry configuration
- `apps/web/lib/data.ts` - Added error tracking
- `apps/web/app/layout.tsx` - Sentry initialization
- `apps/web/app/api/cron/cleanup/route.ts` - **NEW** - Cleanup cron endpoint
- `apps/web/vercel.json` - Added weekly cleanup cron
- `apps/web/package.json` - Added `@sentry/nextjs`

### Backend (Python Worker)
- `apps/workers/main.py` - Structured logging, Sentry integration
- `apps/workers/notes.py` - Retry logic, error handling
- `apps/workers/cleanup.py` - **NEW** - Cleanup module
- `apps/workers/requirements.txt` - Added `tenacity` and `sentry-sdk`

### Documentation
- `docs/ALERTING.md` - **NEW** - Complete alerting guide
- `docs/PHASE7_SUMMARY.md` - **NEW** - This summary

## Environment Variables Required

### Vercel (Frontend)
```bash
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
```

### Fly.io (Backend)
```bash
fly secrets set SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
```

## How to Deploy

### 1. Install Dependencies

**Frontend:**
```bash
cd apps/web
npm install  # Installs @sentry/nextjs
```

**Backend (Fly.io will install automatically):**
- `tenacity==9.0.0`
- `sentry-sdk==2.19.2`

### 2. Configure Sentry

1. Create Sentry account at https://sentry.io
2. Create new project for "Reddit Perspective Cards"
3. Copy DSN from Settings → Client Keys
4. Add to environment variables:
   ```bash
   # Vercel
   vercel env add NEXT_PUBLIC_SENTRY_DSN

   # Fly.io
   fly secrets set SENTRY_DSN=<dsn>
   ```

### 3. Deploy Changes

**Frontend (Vercel):**
```bash
git add .
git commit -m "Add Phase 7 hardening: error monitoring, retry logic, cleanup"
git push origin main
# Vercel auto-deploys
```

**Backend (Fly.io):**
```bash
cd apps/workers
fly deploy
# Or wait for GitHub Actions to deploy automatically
```

### 4. Verify Deployment

**Test Sentry:**
```bash
# Check Sentry dashboard for errors
# Trigger test error in logs
```

**Test Cleanup Endpoint:**
```bash
curl -X POST https://reddit-perspective-worker.fly.dev/run/cleanup \
  -H "X-Worker-Token: $WORKER_AUTH_TOKEN"
```

**Check Logs:**
```bash
# Fly.io
fly logs

# Vercel
vercel logs
```

## Monitoring Checklist

- [ ] Sentry DSN configured for frontend (Vercel)
- [ ] Sentry DSN configured for backend (Fly.io)
- [ ] Verify errors appear in Sentry dashboard
- [ ] Test OpenAI retry logic (simulate API failure)
- [ ] Verify structured logs in Fly.io dashboard
- [ ] Check weekly cleanup cron is scheduled (Vercel dashboard)
- [ ] Set up cron monitoring (Healthchecks.io or Cronitor)
- [ ] Configure Slack/email alerts
- [ ] Test cleanup endpoint manually

## Success Metrics

**Error Handling:**
- ✅ OpenAI API calls retry automatically (3 attempts)
- ✅ All errors captured to Sentry
- ✅ Structured logs for easy debugging

**Data Management:**
- ✅ Posts older than 30 days auto-deleted weekly
- ✅ Cleanup job runs Sundays at 3 AM UTC
- ✅ Metrics tracked (deleted count, cutoff date)

**Observability:**
- ✅ JSON-formatted logs for parsing
- ✅ Performance traces (10% sample rate)
- ✅ Release tracking via Git commit SHA
- ✅ Environment tagging (dev/production)

## What's Next: Phase 8

With hardening complete, the recommended next phase is:

**Phase 8: Performance Optimization (Optional)**
- Add caching for topic data
- Optimize database queries
- Implement CDN for static assets
- Add Redis for rate limiting

**Alternative: Phase 9: Search**
- Only needed when >20 topics
- Implement client-side filtering
- Add search bar to homepage

See `NEXT_STEPS.md` for the complete roadmap.
