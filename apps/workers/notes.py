"""
Notes Worker
Generates perspective notes (Consensus, Contrast, Timeline) using LLM
"""

import os
import json
from datetime import datetime, timezone
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# LLM Prompts
SYSTEM_PROMPT = """You are a neutral research assistant analyzing Reddit discussions.

Given 3-4 top posts on a topic, produce:

1. **Consensus** (1 sentence, max 160 chars): What do these posts generally agree on?
2. **Contrast** (1 sentence, max 160 chars): What's the main disagreement or alternative view?
3. **Timeline** (max 12 words): Chronological progression of the discussion (earliest → latest).

Rules:
- Be factual, neutral, and concise
- Only use information from provided posts
- If posts lack substance or you're uncertain, return empty strings ("")
- Do not editorialize or add opinions
- Strictly enforce character/word limits
- Focus on the discussion themes, not just post titles"""


def format_posts_for_prompt(posts: list) -> tuple[str, list]:
    """
    Format posts for LLM prompt

    Returns:
        (formatted_string, source_ids)
    """
    formatted = ""
    source_ids = []

    for i, post in enumerate(posts, 1):
        formatted += f"{i}. [{post['score']} pts] {post['title']}\n"
        formatted += f"   r/{post['subreddit']} • {post['url']}\n"

        # Add excerpt if available
        if post.get('preview_excerpt'):
            excerpt = post['preview_excerpt'][:200]  # Truncate for context window
            formatted += f"   Excerpt: {excerpt}\n"

        formatted += "\n"
        source_ids.append(post['reddit_id'])

    return formatted, source_ids


def validate_notes(notes: dict) -> dict:
    """
    Validate and enforce length constraints on notes

    Returns:
        Validated notes dict
    """
    return {
        "consensus": notes.get("consensus", "")[:160],
        "contrast": notes.get("contrast", "")[:160],
        "timeline": notes.get("timeline", "")[:72],  # ~12 words
        "source_ids": notes.get("source_ids", [])
    }


def generate_notes_for_topic(topic: dict) -> bool:
    """
    Generate perspective notes for a single topic

    Args:
        topic: Topic dict with id, title, slug

    Returns:
        True if successful, False otherwise
    """
    print(f"🤖 Generating notes for: {topic['title']}")

    # Fetch top 4 posts by score (simple ranking for MVP)
    # TODO Phase 7: Add time decay formula
    try:
        posts_response = supabase.table("posts").select("*").eq(
            "topic_id", topic['id']
        ).order("score", desc=True).limit(4).execute()

        posts = posts_response.data
    except Exception as e:
        print(f"  ✗ Error fetching posts: {e}")
        return False

    if not posts or len(posts) < 2:
        print(f"  ⚠️  Insufficient posts ({len(posts) if posts else 0}) - skipping")
        return False

    # Format prompt
    posts_formatted, source_ids = format_posts_for_prompt(posts)
    user_prompt = f"Topic: {topic['title']}\n\nPosts:\n\n{posts_formatted}\nGenerate perspective notes following the schema."

    # Call LLM with structured output
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "topic_perspective_notes",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "consensus": {"type": "string"},
                            "contrast": {"type": "string"},
                            "timeline": {"type": "string"}
                        },
                        "required": ["consensus", "contrast", "timeline"],
                        "additionalProperties": False
                    }
                }
            },
            temperature=0.3,  # Lower temperature for consistency
        )

        # Parse response
        raw_response = response.choices[0].message.content
        notes = json.loads(raw_response)

        # Validate and enforce constraints
        validated_notes = validate_notes(notes)
        validated_notes["source_ids"] = source_ids  # Add actual source IDs

        # Store in database
        supabase.table("topic_notes").upsert({
            "topic_id": topic['id'],
            "consensus_text": validated_notes["consensus"],
            "contrast_text": validated_notes["contrast"],
            "timeline_text": validated_notes["timeline"],
            "source_ids": source_ids,  # Pass list directly, Supabase handles JSONB conversion
            "raw_llm_response": notes,  # Supabase JSONB handles dict directly
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, on_conflict="topic_id").execute()

        print(f"  ✓ Notes generated successfully")
        print(f"    Consensus: {validated_notes['consensus'][:60]}...")
        return True

    except json.JSONDecodeError as e:
        print(f"  ✗ Failed to parse LLM response: {e}")
        return False
    except Exception as e:
        print(f"  ✗ LLM error: {e}")
        return False


def run_notes_worker() -> dict:
    """
    Main notes worker entrypoint
    Generates notes for all topics

    Returns:
        Dict with metrics
    """
    print("=" * 50)
    print("🧠 Starting notes generation...")
    print("=" * 50)

    # Fetch all topics
    try:
        topics_response = supabase.table("topics").select("*").execute()
        topics = topics_response.data
    except Exception as e:
        raise Exception(f"Failed to load topics from database: {e}")

    if not topics:
        print("⚠️  No topics found in database")
        return {"notes_generated": 0}

    # Process each topic
    notes_generated = 0
    for topic in topics:
        try:
            success = generate_notes_for_topic(topic)
            if success:
                notes_generated += 1
        except Exception as e:
            print(f"✗ Error processing topic {topic['slug']}: {e}")
            continue

    print("=" * 50)
    print(f"✅ Notes generation complete: {notes_generated}/{len(topics)} topics")
    print("=" * 50)

    return {"notes_generated": notes_generated}


if __name__ == "__main__":
    # For local testing
    result = run_notes_worker()
    print(f"\nResult: {result}")
