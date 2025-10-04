"""
Reddit Post Fetcher
Fetches posts from configured subreddits using PRAW
"""

import os
import time
from datetime import datetime, timezone
from functools import wraps
import praw
from praw.exceptions import RedditAPIException
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Initialize Reddit client
reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT")
)

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)


def rate_limit_handler(func):
    """Decorator for exponential backoff on rate limits"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except RedditAPIException as e:
                if 'RATELIMIT' in str(e).upper():
                    wait = (2 ** attempt) * 60  # 1min, 2min, 4min
                    print(f"⚠️  Rate limited. Waiting {wait}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait)
                else:
                    raise
        raise Exception("Max retries exceeded for rate limit")
    return wrapper


@rate_limit_handler
def fetch_posts_for_subreddit(subreddit_name: str, limit: int = 50):
    """Fetch new posts from a subreddit"""
    subreddit = reddit.subreddit(subreddit_name)
    return list(subreddit.new(limit=limit))


def extract_preview_excerpt(post) -> str:
    """
    Extract preview excerpt from post (≤300 chars)
    Handles different post types (text, link, image)
    """
    # Text post with selftext
    if hasattr(post, 'selftext') and post.selftext and post.selftext.strip():
        text = post.selftext.strip()
        return text[:300] if len(text) > 300 else text

    # Fallback to title
    return post.title[:300] if len(post.title) > 300 else post.title


def fetch_topic_posts(topic: dict) -> int:
    """
    Fetch posts for a single topic

    Args:
        topic: Topic dict with id, slug, subreddit_allowlist

    Returns:
        Number of posts inserted
    """
    print(f"📥 Fetching posts for: {topic['title']}")

    subreddits = topic.get('subreddit_allowlist', [])
    if not subreddits:
        print(f"⚠️  No subreddits configured for {topic['slug']}")
        return 0

    posts_processed = 0

    # NOTE: We use loose filtering (fetch ALL posts from subreddits).
    # Keywords in topic config are for LLM context only, not strict post filtering.

    # Fetch from each subreddit
    for subreddit_name in subreddits:
        try:
            print(f"  → r/{subreddit_name}...")
            submissions = fetch_posts_for_subreddit(subreddit_name, limit=50)

            for post in submissions:
                try:
                    # Upsert post (conflict on reddit_id = updates existing, no duplicate)
                    supabase.table("posts").upsert({
                        "reddit_id": post.id,
                        "topic_id": topic['id'],
                        "subreddit": post.subreddit.display_name,
                        "title": post.title,
                        "url": f"https://reddit.com{post.permalink}",
                        "author": str(post.author) if post.author else "[deleted]",
                        "score": post.score,
                        "created_utc": datetime.fromtimestamp(post.created_utc, tz=timezone.utc).isoformat(),
                        "preview_excerpt": extract_preview_excerpt(post),
                    }, on_conflict="reddit_id").execute()

                    posts_processed += 1

                except Exception as e:
                    # Log but continue processing other posts
                    print(f"    ⚠️  Error storing post {post.id}: {e}")
                    continue

            # Rate limit protection: sleep between subreddit requests
            time.sleep(2)

        except Exception as e:
            print(f"  ✗ Error fetching r/{subreddit_name}: {e}")
            continue

    # Update topic's last_fetched_at
    try:
        supabase.table("topics").update({
            "last_fetched_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", topic['id']).execute()
    except Exception as e:
        print(f"  ⚠️  Error updating last_fetched_at: {e}")

    print(f"✓ Processed {posts_processed} posts for {topic['slug']}")
    return posts_processed


def run_fetcher() -> dict:
    """
    Main fetcher entrypoint
    Fetches posts for all configured topics

    Returns:
        Dict with metrics
    """
    print("=" * 50)
    print("🚀 Starting Reddit fetcher...")
    print("=" * 50)

    # Fetch all topics
    try:
        topics_response = supabase.table("topics").select("*").execute()
        topics = topics_response.data
    except Exception as e:
        raise Exception(f"Failed to load topics from database: {e}")

    if not topics:
        print("⚠️  No topics found in database")
        return {"topics_processed": 0, "posts_processed": 0}

    # Process each topic
    total_posts = 0
    for topic in topics:
        try:
            posts_count = fetch_topic_posts(topic)
            total_posts += posts_count
        except Exception as e:
            print(f"✗ Error processing topic {topic['slug']}: {e}")
            continue

    print("=" * 50)
    print(f"✅ Fetcher complete: {len(topics)} topics, {total_posts} posts")
    print("=" * 50)

    return {
        "topics_processed": len(topics),
        "posts_processed": total_posts
    }


if __name__ == "__main__":
    # For local testing
    result = run_fetcher()
    print(f"\nResult: {result}")
