# Analytics Guide - Phase 8

## Overview

Analytics implementation to understand user behavior and make data-driven decisions about product features.

## What We Track

### 1. **Automatic Page Views** (Vercel Analytics)
- Homepage visits
- Topic detail page visits
- Page load times
- Geographic distribution
- Device types (mobile/desktop/tablet)

### 2. **Custom Events**

#### `homepage_view`
**When:** User lands on homepage
**Data:**
- `topic_count` - Number of topics displayed

**Use Case:** Understand traffic volume and topic density correlation

---

#### `topic_card_click`
**When:** User clicks on a topic card title/link
**Data:**
- `slug` - Topic identifier (e.g., "ai-ml")
- `title` - Topic title

**Use Case:**
- Which topics are most interesting to users
- Card engagement rate
- Topic discovery patterns

**Key Metrics:**
```
Click-through Rate (CTR) = topic_card_clicks / homepage_views
Popular Topics = topic_card_clicks grouped by slug
```

---

#### `reddit_link_click`
**When:** User clicks a Reddit thread link
**Data:**
- `topic` - Parent topic slug
- `post_title` - Reddit post title
- `score` - Reddit upvote score
- `subreddit` - Source subreddit

**Use Case:**
- Are users actually going to Reddit? (validation of concept)
- Which types of posts get clicked (high score vs low score)
- Which subreddits drive engagement

**Key Metrics:**
```
Reddit CTR = reddit_link_clicks / topic_card_clicks
Average Post Score Clicked = AVG(score) for clicked links
Top Subreddits = reddit_link_clicks grouped by subreddit
```

---

#### `perspective_notes_view`
**When:** Topic card becomes 50% visible in viewport
**Data:**
- `topic` - Topic slug
- `has_content` - Boolean (true if notes exist)

**Use Case:**
- Are users scrolling to see all topics?
- Visibility of perspective notes
- Engagement depth

**Key Metrics:**
```
Scroll Depth = perspective_notes_view / topic_count
Notes Coverage = % of topics with has_content=true
```

---

#### `empty_notes_view`
**When:** Topic card with no notes becomes visible
**Data:**
- `topic` - Topic slug

**Use Case:**
- Identify "zero-result" topics (need better keywords or more posts)
- Quality control for LLM generation
- Topic curation priorities

**Key Metrics:**
```
Empty Note Rate = empty_notes_view / perspective_notes_view
Topics Needing Attention = topics with highest empty_notes_view
```

---

## Viewing Analytics

### Vercel Dashboard (Automatic)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Analytics" tab
4. View:
   - Page views over time
   - Top pages
   - Geographic distribution
   - Device breakdown

### Custom Events (Vercel Analytics)

1. In Vercel Dashboard → Analytics
2. Scroll to "Custom Events"
3. See event counts and properties

**Example queries you can run:**
- "Which topic gets clicked most?" → Filter by `topic_card_click` event
- "What's the Reddit CTR?" → Compare `topic_card_click` vs `reddit_link_click`
- "Which subreddits are popular?" → Group `reddit_link_click` by `subreddit`

---

## Key Questions to Answer

### Week 1: Validation

**Do users engage with the MVP?**
- Metric: `homepage_view` count
- Target: >50 unique visitors

**Do users click on topics?**
- Metric: CTR = `topic_card_click` / `homepage_view`
- Target: >20% (industry standard for content cards)

**Do users go to Reddit?**
- Metric: Reddit CTR = `reddit_link_click` / `topic_card_click`
- Target: >30% (validates the "gateway to Reddit" concept)

---

### Week 2-3: Optimization

**Which topics are most popular?**
- Metric: `topic_card_click` grouped by `topic`
- Action: Add more topics in popular categories

**Which topics have empty notes?**
- Metric: `empty_notes_view` events
- Action: Improve keywords, add more subreddits, or remove topic

**Are all topics getting seen?**
- Metric: `perspective_notes_view` count per topic
- Action: If some topics never viewed → reorder grid, reduce total topics

---

### Month 2: Feature Decisions

**Do we need search?**
- If topics >12 AND scroll depth <50% → Yes, add search
- If topics ≤12 OR scroll depth >70% → No, current UX works

**Do we need categories?**
- If topic count >20 → Yes, add filtering
- If users click diverse topics → No, browsing works

**Which subreddits should we expand?**
- Metric: `reddit_link_click` grouped by `subreddit`
- Action: Add more topics from high-engagement subreddits

---

## Analytics Implementation Details

### Architecture

```
User Action
    ↓
Client Component (TopicCard, AnalyticsPageView)
    ↓
lib/analytics.ts helper functions
    ↓
@vercel/analytics track() function
    ↓
Vercel Analytics Dashboard
```

### Files Modified

- `apps/web/lib/analytics.ts` - Helper functions for tracking
- `apps/web/components/TopicCard.tsx` - Click and visibility tracking
- `apps/web/components/AnalyticsPageView.tsx` - Page view tracking
- `apps/web/app/layout.tsx` - Vercel Analytics component
- `apps/web/package.json` - Added `@vercel/analytics` dependency

### Performance Impact

**Bundle size:** +3.7 KB gzipped (Analytics library)
**Runtime cost:** ~0ms (events sent asynchronously)
**Privacy:** Vercel Analytics is GDPR compliant, no cookies required

---

## Debugging Analytics

### Test Locally

```bash
cd apps/web
npm run dev

# Visit http://localhost:3000
# Open browser console
# Click on topics and links
# You should see: "track called with: <event_name>"
```

**Note:** Events sent in development mode go to Vercel Analytics, but may be filtered. Deploy to production for accurate tracking.

### Verify in Production

1. Deploy to Vercel
2. Visit your production site
3. Click around for 2-3 minutes
4. Go to Vercel Dashboard → Analytics
5. Check "Custom Events" section (may take 1-2 hours to appear)

---

## Privacy & Legal

### What We Store

- Event names (e.g., "topic_card_click")
- Event properties (topic slug, post title, score, subreddit)
- Timestamp
- **No personal data** (no names, emails, IPs stored in custom events)

### Compliance

- **GDPR:** Vercel Analytics uses no cookies, requires no consent banner
- **CCPA:** Users can opt out via Vercel's global opt-out
- **Reddit API:** We only track clicks to Reddit (doesn't violate ToS)

### User Privacy

All analytics are **aggregate only**:
- We can see "200 clicks on ai-ml topic"
- We **cannot** see "User X clicked ai-ml 5 times"

No user tracking, no profiles, no cross-site tracking.

---

## Cost

Vercel Analytics pricing (as of 2025):

- **Hobby plan:** 2,500 events/month free
- **Pro plan:** 100,000 events/month included, then $10 per 100k

**Estimated usage:**
```
100 visitors/day × 5 events/visitor = 500 events/day
500 × 30 days = 15,000 events/month

Cost: Free (under 100k on Pro plan)
```

---

## Recommended Dashboards

### Daily Monitoring (Quick Glance)

Check these metrics every day:
1. Page views (trend up?)
2. Topic card clicks (which topics?)
3. Reddit link clicks (are users engaging?)

### Weekly Deep Dive

Every Monday, analyze:
1. Top 3 topics by clicks → Consider adding similar topics
2. Topics with >50% empty notes → Fix or remove
3. Reddit CTR trend → Should be >30%, if dropping investigate

### Monthly Strategic Review

First of each month:
1. Total unique visitors (growth?)
2. Topic engagement distribution (all topics getting attention?)
3. Feature decision metrics (need search/categories?)

---

## Next Steps After Analytics

Once you have 1-2 weeks of data:

### If Reddit CTR >40%
✅ Users love going to Reddit
→ **Action:** Focus on content quality (better topics, better keywords)

### If Reddit CTR <20%
⚠️ Users not clicking through
→ **Action:** Investigate UX (are links visible? Are summaries too good?)

### If Certain Topics Dominate
✅ Clear user preferences
→ **Action:** Add 6 more topics in winning categories

### If Empty Notes >30%
⚠️ LLM generation issues
→ **Action:** Improve prompts, add more source posts per topic

### If Scroll Depth <50%
⚠️ Too many topics or poor layout
→ **Action:** Reduce topics to 6-8, or add categories

---

## FAQ

**Q: When will I see data?**
A: Page views appear immediately. Custom events may take 1-2 hours to show in dashboard.

**Q: Can I export data?**
A: Yes, Vercel Analytics has CSV export (Pro plan required).

**Q: How do I A/B test?**
A: Add custom events with variant names, e.g., `track('cta_click', { variant: 'A' })`. Compare event counts.

**Q: Can I track conversions?**
A: Yes, create a custom event like `track('newsletter_signup')` and measure conversion rate.

**Q: Does this slow down my site?**
A: No, analytics are loaded asynchronously and don't block page render.

---

## Support

- **Vercel Analytics Docs:** https://vercel.com/docs/analytics
- **Vercel Support:** support@vercel.com
- **This Project:** See `docs/PHASE8_SUMMARY.md` for implementation details
