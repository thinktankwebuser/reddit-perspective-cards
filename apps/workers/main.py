"""
FastAPI worker for Reddit Perspective Cards
Handles hourly fetching and notes generation
"""

import os
import logging
import json
from datetime import datetime, timezone
from fastapi import FastAPI, Header, HTTPException
from dotenv import load_dotenv
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from fetcher import run_fetcher
from notes import run_notes_worker
from cleanup import cleanup_old_posts

load_dotenv()

# Configure structured JSON logging
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger = logging.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Initialize Sentry for error monitoring
if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        environment=os.getenv("FLY_REGION", "development"),
        traces_sample_rate=0.1,
        integrations=[FastApiIntegration()],
    )

app = FastAPI(title="Reddit Perspective Cards Worker")

WORKER_AUTH_TOKEN = os.getenv("WORKER_AUTH_TOKEN")


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "reddit-perspective-worker"
    }


@app.post("/run/hourly")
def run_hourly_job(x_worker_token: str = Header(None)):
    """
    Hourly job: fetch Reddit posts + generate perspective notes

    Headers:
        X-Worker-Token: Authentication token

    Returns:
        Job status with metrics
    """
    # Auth check
    if not WORKER_AUTH_TOKEN:
        raise HTTPException(500, "WORKER_AUTH_TOKEN not configured")

    if x_worker_token != WORKER_AUTH_TOKEN:
        raise HTTPException(401, "Unauthorized: Invalid token")

    # Run sequential jobs with error handling
    results = {
        "status": "ok",
        "topics_updated": 0,
        "posts_fetched": 0,
        "notes_generated": 0,
        "errors": []
    }

    # Phase 1: Fetch posts
    try:
        logger.info("Starting Reddit fetch phase")
        fetch_result = run_fetcher()
        results["topics_updated"] = fetch_result.get("topics_processed", 0)
        results["posts_fetched"] = fetch_result.get("posts_processed", 0)
        logger.info(f"Fetch phase complete: {results['posts_fetched']} posts from {results['topics_updated']} topics")
    except Exception as e:
        error_msg = f"Fetcher error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        sentry_sdk.capture_exception(e)
        results["errors"].append(error_msg)
        results["status"] = "partial"

    # Phase 2: Generate notes (even if fetcher had errors)
    try:
        logger.info("Starting notes generation phase")
        notes_result = run_notes_worker()
        results["notes_generated"] = notes_result.get("notes_generated", 0)
        logger.info(f"Notes phase complete: {results['notes_generated']} topics processed")
    except Exception as e:
        error_msg = f"Notes worker error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        sentry_sdk.capture_exception(e)
        results["errors"].append(error_msg)
        results["status"] = "partial"

    # Return results
    if results["errors"]:
        return results  # 200 with partial status

    return results


@app.post("/run/cleanup")
def run_cleanup_job(x_worker_token: str = Header(None)):
    """
    Cleanup job: delete posts older than 30 days

    Headers:
        X-Worker-Token: Authentication token

    Returns:
        Cleanup status with metrics
    """
    # Auth check
    if not WORKER_AUTH_TOKEN:
        raise HTTPException(500, "WORKER_AUTH_TOKEN not configured")

    if x_worker_token != WORKER_AUTH_TOKEN:
        raise HTTPException(401, "Unauthorized: Invalid token")

    try:
        logger.info("Starting cleanup job")
        result = cleanup_old_posts()
        logger.info(f"Cleanup complete: {result.get('deleted_count', 0)} posts deleted")
        return result
    except Exception as e:
        logger.error(f"Cleanup job failed: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        raise HTTPException(500, f"Cleanup failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
