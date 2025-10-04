"""
Cleanup Worker
Implements post retention policy (delete posts older than 30 days)
"""

import os
import logging
from datetime import datetime, timedelta, timezone
from supabase import create_client
from dotenv import load_dotenv
import sentry_sdk

load_dotenv()

# Initialize Sentry
if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        environment=os.getenv("FLY_REGION", "development"),
        traces_sample_rate=0.1,
    )

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

logger = logging.getLogger(__name__)

RETENTION_DAYS = 30


def cleanup_old_posts() -> dict:
    """
    Delete posts older than RETENTION_DAYS

    Returns:
        Dict with cleanup metrics
    """
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
        cutoff_iso = cutoff_date.isoformat()

        logger.info(f"Starting cleanup: deleting posts older than {cutoff_iso}")

        # Delete posts older than cutoff date
        # ON DELETE CASCADE will also clean up orphaned topic_notes if needed
        result = supabase.table("posts").delete().lt(
            "created_utc", cutoff_iso
        ).execute()

        deleted_count = len(result.data) if result.data else 0

        logger.info(f"Cleanup complete: {deleted_count} posts deleted")

        return {
            "status": "ok",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_iso
        }

    except Exception as e:
        logger.error(f"Cleanup failed: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        return {
            "status": "error",
            "error": str(e),
            "deleted_count": 0
        }


if __name__ == "__main__":
    # For local testing
    result = cleanup_old_posts()
    print(f"\nCleanup Result: {result}")
