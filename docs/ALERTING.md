# Alerting & Monitoring Setup

## Overview

Phase 7 hardening includes comprehensive error monitoring and alerting for the Reddit Perspective Cards MVP.

## 1. Sentry Error Monitoring

### Setup Steps

1. **Create Sentry Account**
   - Sign up at https://sentry.io
   - Create a new project for "Reddit Perspective Cards"
   - Select "Next.js" for frontend and "Python/FastAPI" for backend

2. **Get DSN Keys**
   - Frontend DSN: From Sentry dashboard → Settings → Client Keys (DSN)
   - Backend DSN: Same DSN can be used for both (or create separate projects)

3. **Configure Environment Variables**

   **Vercel (Frontend):**
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
   ```

   **Fly.io (Backend):**
   ```bash
   fly secrets set SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
   ```

### What's Monitored

**Frontend (Next.js):**
- Database query failures
- API route errors
- Data fetching errors
- Performance metrics (10% sample rate)

**Backend (Python Worker):**
- Reddit API failures
- OpenAI API failures
- Database write errors
- Job execution failures
- Performance traces (10% sample rate)

### Sentry Features Enabled

- **Error Tracking**: Automatic capture of all exceptions
- **Retry Logic**: OpenAI calls retry 3 times with exponential backoff (2s, 4s, 8s)
- **Structured Logging**: JSON format logs for easy parsing
- **Release Tracking**: Frontend tracks Git commit SHA for version identification
- **Environment Tagging**: Separate dev/production error streams

## 2. Vercel Cron Monitoring

### Cron Jobs Configured

1. **Daily Fetch & Notes** - `0 12 * * *` (12:00 PM UTC daily)
   - Endpoint: `/api/cron/trigger`
   - Triggers: Fetch Reddit posts + Generate AI notes
   - Expected duration: 2-5 minutes

2. **Weekly Cleanup** - `0 3 * * 0` (3:00 AM UTC Sundays)
   - Endpoint: `/api/cron/cleanup`
   - Triggers: Delete posts older than 30 days
   - Expected duration: <1 minute

### Vercel Cron Logs

Monitor cron executions in Vercel dashboard:
1. Go to your project → Deployments → Functions
2. Filter by `/api/cron/trigger` or `/api/cron/cleanup`
3. Check for failures or timeouts

### Setting Up Alerts

Vercel doesn't have built-in cron alerts, so use one of these options:

**Option A: Healthchecks.io (Recommended)**
1. Sign up at https://healthchecks.io
2. Create checks for:
   - "Daily Fetch" - Expected every 24 hours
   - "Weekly Cleanup" - Expected every 7 days
3. Add ping URL to cron endpoints (see code modification below)

**Option B: Cronitor**
1. Sign up at https://cronitor.io
2. Import cron schedule from `vercel.json`
3. Configure Slack/email notifications

**Option C: Custom Slack Webhook**
1. Create Slack webhook
2. Add `SLACK_WEBHOOK_URL` to Vercel env vars
3. Send notifications on job failures

## 3. Fly.io Worker Monitoring

### Fly.io Logs

View real-time logs:
```bash
fly logs -a reddit-perspective-worker
```

View logs in Fly.io dashboard:
- Go to https://fly.io/dashboard/[org]/reddit-perspective-worker
- Click "Logs" tab
- Structured JSON logs for easy filtering

### Fly.io Health Checks

Configured in `fly.toml`:
```toml
[[services.http_checks]]
  interval = "30s"
  timeout = "5s"
  grace_period = "10s"
  method = "GET"
  path = "/health"
```

### Fly.io Alerts

Set up Slack notifications:
1. Go to Fly.io dashboard → Settings → Webhooks
2. Add Slack webhook URL
3. Configure alerts for:
   - App crashed
   - Health check failed
   - Deployment failed

## 4. Structured Logging Format

All worker logs are JSON-formatted for easy parsing:

```json
{
  "timestamp": "2025-01-15T12:00:00.000Z",
  "level": "INFO",
  "message": "Fetch phase complete: 24 posts from 6 topics",
  "module": "main"
}
```

### Log Levels

- **INFO**: Normal operations (job start/complete, metrics)
- **WARNING**: Rate limits, retries, degraded performance
- **ERROR**: Job failures, API errors, database errors

### Viewing Logs

**Fly.io (Structured JSON):**
```bash
# All logs
fly logs

# Only errors
fly logs | grep '"level":"ERROR"'

# Filter by module
fly logs | grep '"module":"fetcher"'
```

## 5. Recommended Alert Configuration

### Critical Alerts (Immediate Action)

1. **Worker Down** - Fly.io health check fails
   - Channel: Slack + Email
   - Response: Check Fly.io logs, restart app if needed

2. **Database Connection Failed**
   - Channel: Slack + Email
   - Response: Check Supabase status, verify credentials

3. **OpenAI API Key Invalid/Expired**
   - Channel: Slack + Email
   - Response: Rotate API key in Fly.io secrets

### Warning Alerts (Monitor)

1. **Cron Job Skipped** - No execution in 25 hours
   - Channel: Slack
   - Response: Check Vercel cron logs

2. **Low Success Rate** - <50% topics processed
   - Channel: Slack
   - Response: Check Reddit API quota, Sentry errors

3. **High Retry Rate** - OpenAI retries >20% of requests
   - Channel: Slack
   - Response: Check OpenAI API status

### Info Notifications (Optional)

1. **Cleanup Complete** - Weekly cleanup summary
2. **Daily Summary** - Posts fetched, notes generated

## 6. Testing Alerts

### Test Sentry Integration

**Frontend:**
```bash
# Add to app/page.tsx temporarily
throw new Error("Sentry test error");
```

**Backend:**
```bash
# SSH into Fly.io
fly ssh console

# Trigger test error
python3 -c "import sentry_sdk; sentry_sdk.init(dsn='...'); sentry_sdk.capture_message('Test alert')"
```

### Test Cron Jobs

**Manual trigger via curl:**
```bash
# Daily job (requires CRON_SECRET)
curl https://your-app.vercel.app/api/cron/trigger \
  -H "Authorization: Bearer $CRON_SECRET"

# Cleanup job
curl https://your-app.vercel.app/api/cron/cleanup \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 7. Environment Variables Summary

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel | Frontend error tracking |
| `SENTRY_DSN` | Fly.io | Backend error tracking |
| `CRON_SECRET` | Vercel | Secure cron endpoints |
| `SLACK_WEBHOOK_URL` | Vercel/Fly.io | (Optional) Slack notifications |

## 8. Next Steps

1. **Set up Sentry**
   - Create account and get DSN
   - Add to Vercel and Fly.io env vars
   - Verify errors appear in dashboard

2. **Configure Cron Monitoring**
   - Choose monitoring service (Healthchecks.io recommended)
   - Set up daily/weekly checks
   - Configure Slack/email notifications

3. **Test Alert Flow**
   - Trigger test errors in Sentry
   - Verify Slack notifications work
   - Confirm cron monitoring pings

4. **Document Runbook** (Phase 8)
   - Create incident response procedures
   - Document common errors and fixes
   - Set up on-call rotation (if team grows)
