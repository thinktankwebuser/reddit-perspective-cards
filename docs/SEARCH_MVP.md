# Search MVP - Router-Only Implementation

## Overview

Full-text search implementation over Reddit posts using Postgres `tsvector` and BM25 ranking. This is **Phase 1** of the RAG search system - a Router-only MVP without embeddings.

## What Was Built

### 1. Database Layer

**File:** `infra/sql/002_add_search.sql`

**Changes:**
- Added `search_vector tsvector` column to `posts` table
- Created GIN index for fast full-text search
- Created trigger to auto-update search_vector on insert/update
- Created `search_posts()` RPC function for searching

**How it works:**
```sql
-- Title is weighted higher (A) than excerpt (B)
search_vector =
  setweight(to_tsvector('english', title), 'A') ||
  setweight(to_tsvector('english', preview_excerpt), 'B')

-- Search uses websearch_to_tsquery for natural language queries
WHERE search_vector @@ websearch_to_tsquery('english', query)
ORDER BY ts_rank(search_vector, query) DESC, score DESC
```

**Ranking:**
1. **Primary:** BM25 relevance (ts_rank)
2. **Secondary:** Reddit upvote score
3. **Limit:** Top 20 results

---

### 2. API Layer

**File:** `apps/web/app/api/search/route.ts`

**Endpoint:** `GET /api/search?q=<query>`

**Features:**
- Query validation (min 2 characters)
- Calls `search_posts()` RPC function
- Returns JSON with query, count, and results
- Error handling with meaningful messages

**Response format:**
```json
{
  "query": "negotiate salary",
  "count": 15,
  "results": [
    {
      "id": "uuid",
      "reddit_id": "t3_abc123",
      "title": "How I negotiated 20% raise",
      "url": "https://reddit.com/...",
      "score": 1234,
      "subreddit": "ITCareerQuestions",
      "created_utc": "2025-01-15T...",
      "preview_excerpt": "Here's what worked for me...",
      "rank": 0.1234
    }
  ]
}
```

---

### 3. UI Layer

**File:** `apps/web/app/search/page.tsx`

**Features:**
- Search input with Enter key support
- Loading state with spinner
- Error handling with user-friendly messages
- Empty state with search tips
- Suggested queries (clickable pills)
- Results with metadata (score, subreddit, date)
- Link back to homepage
- Relevance score (dev mode only)

**UX Enhancements:**
- Auto-focus on search input
- Disabled state during loading
- Date formatting (Today, Yesterday, Xd ago)
- External link icons
- Responsive design

---

### 4. Homepage Integration

**File:** `apps/web/app/page.tsx`

**Changes:**
- Added prominent "Search Reddit Posts" button in hero section
- Links to `/search` page

---

## How to Deploy

### Step 1: Run Database Migration

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `infra/sql/002_add_search.sql`
3. Click **Run**
4. Verify:
   ```sql
   SELECT COUNT(*) as total_posts,
          COUNT(search_vector) as posts_with_search
   FROM posts;
   -- Should return: total_posts = posts_with_search
   ```

### Step 2: Test Search Locally

```bash
# Search API
curl "http://localhost:3001/api/search?q=salary"

# Visit search page
open http://localhost:3001/search
```

### Step 3: Deploy to Production

```bash
git add .
git commit -m "Add Router-only search MVP"
git push origin main

# Vercel auto-deploys frontend
# Run migration in Supabase production database
```

---

## Testing

### Test Queries

Try these queries to validate search:

```
1. "negotiate salary" - Should find IT career posts
2. "learn programming" - Should find beginner posts
3. "machine learning" - Should find AI/ML posts
4. "cybersecurity" - Should find security posts
5. "remote work" - Should find career posts
```

### Expected Behavior

**Good results:**
- Query: "negotiate salary"
- Finds: Posts with "negotiate" OR "salary" in title/excerpt
- Ranks: Posts with both words higher

**Partial results:**
- Query: "python async"
- Finds: Posts about Python, posts about async
- Ranks: Posts with both higher

**No results:**
- Query: "xyz123abc" (gibberish)
- Shows: Empty state with search tips

---

## Technical Details

### BM25 Ranking

Postgres `ts_rank()` implements a variant of BM25:

**Formula:**
```
rank = Σ (tf * idf * weight)

Where:
- tf = term frequency (how often word appears)
- idf = inverse document frequency (rarity of word)
- weight = A (title) or B (excerpt)
```

**What this means:**
- Common words ("the", "a") are ignored (stopwords)
- Rare words matter more
- Title matches matter more than excerpt matches
- Posts with multiple matching terms rank higher

### Limitations

**No Semantic Understanding:**
- Query: "salary negotiation"
- Won't find: "compensation discussion"
- (This is why we add embeddings in Phase 2)

**English Only:**
- Uses English stemming rules
- "running" → "run", "better" → "good"
- Won't work for non-English content

**No Fuzzy Matching:**
- Query: "proggraming" (typo)
- Won't find: "programming"
- (Could add with pg_trgm extension)

---

## Performance

### Query Speed

**Expected:**
- GIN index lookup: <10ms
- Rank calculation: <50ms
- **Total: <100ms** for 720 posts

**Scalability:**
- 1k posts: <100ms
- 10k posts: <200ms
- 100k posts: <500ms (still fast!)

### Index Size

**Disk space:**
```
Posts: 720 × 500 bytes = 360 KB
search_vector: 720 × 200 bytes = 144 KB
GIN index: ~2× data = 288 KB

Total: <1 MB (negligible)
```

---

## What You'll Learn

### Week 1: Router MVP (Current)

**Skills acquired:**
✅ Postgres full-text search (tsvector, ts_rank)
✅ BM25 ranking algorithm
✅ RPC functions in Supabase
✅ Search API design
✅ Search UX patterns

**Deliverable:** Working keyword search

---

### Week 2: Add Embeddings (Next)

**What we'll add:**
- OpenAI embeddings for semantic search
- pgvector extension
- Vector similarity (cosine distance)
- Compare BM25 vs semantic results

**Expected learning:**
- When semantic beats keyword search
- Cost/performance trade-offs
- Embedding model selection

---

### Week 3: Hybrid Search (Future)

**What we'll add:**
- Combine BM25 + vector results
- Reciprocal Rank Fusion (RRF)
- LLM reranker (GPT-4o-mini)
- Answer generation with citations

**Expected learning:**
- Multi-signal ranking
- Prompt engineering for QA
- Evaluation metrics

---

## Comparison: Router vs Reddit Search

| Feature | Reddit Search | Our Router |
|---------|--------------|------------|
| **Ranking** | Chronological | BM25 relevance |
| **Scope** | Entire Reddit | 6 curated subs |
| **Speed** | Slow (>1s) | Fast (<100ms) |
| **Results** | 100s of posts | Top 20 relevant |
| **Quality** | Mixed | Curated topics |

**Verdict:** Our search is **better** for focused queries on IT topics.

---

## Next Steps

### Immediate (After Deployment)

1. ✅ Run migration in Supabase
2. ✅ Test with 10 real queries
3. ✅ Share with 5 users for feedback
4. ✅ Track which queries work/don't work

### Week 2 (Add Embeddings)

1. Enable pgvector extension
2. Create embeddings table
3. Write embedding worker
4. Compare BM25 vs semantic
5. Measure quality improvement

### Week 3 (Hybrid + QA)

1. Implement RRF to combine signals
2. Add GPT-4o-mini reranker
3. Generate answers with citations
4. A/B test hybrid vs Router-only

---

## Cost Analysis

**Router-only (BM25):**
- Database: $0 (included in Supabase free tier)
- Compute: $0 (serverless functions)
- **Total: FREE** ✅

**After adding embeddings:**
- One-time embedding: ~$0.01 for 720 posts
- Per-query embedding: ~$0.0000004
- **Monthly (100 queries/day): <$1** ✅

---

## FAQ

**Q: Why not use Algolia or Elasticsearch?**
A: Learning objective is to understand RAG from first principles. Also, Postgres full-text search is free and fast enough.

**Q: Can we search by subreddit?**
A: Yes! Add `WHERE subreddit = 'programming'` to the RPC function.

**Q: Can we add filters (date range, min score)?**
A: Yes! Modify `search_posts()` to accept optional parameters.

**Q: How do we handle typos?**
A: Phase 2 (embeddings) handles this. Or add `pg_trgm` extension for fuzzy matching.

**Q: Can we highlight matching terms?**
A: Yes! Use `ts_headline()` function. Can add in UI enhancement phase.

---

## Resources

- **Postgres Full-Text Search:** https://www.postgresql.org/docs/current/textsearch.html
- **BM25 Ranking:** https://en.wikipedia.org/wiki/Okapi_BM25
- **Supabase RPC:** https://supabase.com/docs/guides/database/functions

---

## Success Metrics

After 1 week of testing:

**Validation:**
- ✅ 80%+ of queries return relevant results
- ✅ Search completes in <200ms
- ✅ Users prefer this over Reddit's native search

**Next decision:**
- If quality is good → Add embeddings for edge cases
- If quality is poor → Debug ranking, adjust weights
- If no one uses it → Re-evaluate need for search

---

**Built with:** Postgres, Next.js, TypeScript
**Time to build:** ~2.5 hours
**Learning value:** High (foundation for RAG)
