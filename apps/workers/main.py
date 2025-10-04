"""
FastAPI worker for Reddit Perspective Cards
Handles hourly fetching and notes generation
"""

import os
from datetime import datetime, timezone
from fastapi import FastAPI, Header, HTTPException
from dotenv import load_dotenv

from fetcher import run_fetcher
from notes import run_notes_worker

load_dotenv()

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
        fetch_result = run_fetcher()
        results["topics_updated"] = fetch_result.get("topics_processed", 0)
        results["posts_fetched"] = fetch_result.get("posts_processed", 0)
    except Exception as e:
        error_msg = f"Fetcher error: {str(e)}"
        print(f"ERROR: {error_msg}")
        results["errors"].append(error_msg)
        results["status"] = "partial"

    # Phase 2: Generate notes (even if fetcher had errors)
    try:
        notes_result = run_notes_worker()
        results["notes_generated"] = notes_result.get("notes_generated", 0)
    except Exception as e:
        error_msg = f"Notes worker error: {str(e)}"
        print(f"ERROR: {error_msg}")
        results["errors"].append(error_msg)
        results["status"] = "partial"

    # Return results
    if results["errors"]:
        return results  # 200 with partial status

    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
