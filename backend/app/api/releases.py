from fastapi import APIRouter
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import httpx
from app.utils.logger import logger
from app.config import settings

router = APIRouter()

GITHUB_API_URL = "https://api.github.com/repos/cyb3rgh05t/komandorr/releases"

# Cache for releases
releases_cache: Dict[str, Any] = {
    "data": None,
    "timestamp": None,
}
CACHE_DURATION = timedelta(hours=1)  # Cache for 1 hour


@router.get("/api/releases")
async def get_releases():
    """Fetch releases from GitHub and format them"""
    # Check cache first
    now = datetime.now()

    if releases_cache["data"] and releases_cache["timestamp"]:
        if now - releases_cache["timestamp"] < CACHE_DURATION:
            return releases_cache["data"]

    try:
        headers = {}
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

        async with httpx.AsyncClient() as client:
            response = await client.get(GITHUB_API_URL, headers=headers, timeout=10.0)
            response.raise_for_status()
            releases_data = response.json()

        # Process and format releases
        formatted_releases = []
        for release in releases_data[:10]:  # Get top 10 releases
            published_date = datetime.fromisoformat(
                release["published_at"].replace("Z", "+00:00")
            )
            days_ago = (datetime.now(published_date.tzinfo) - published_date).days

            formatted_releases.append(
                {
                    "version": release["tag_name"],
                    "html_url": release["html_url"],
                    "days_ago": days_ago,
                    "is_prerelease": release.get("prerelease", False),
                    "published_at": release["published_at"],
                }
            )

        result = {"success": True, "releases": formatted_releases}

        # Update cache
        releases_cache["data"] = result
        releases_cache["timestamp"] = now

        return result

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 403:
            logger.warning("GitHub API rate limit exceeded for releases")
            # Return cached data if available
            if releases_cache["data"]:
                return releases_cache["data"]
        logger.error(f"Failed to fetch releases from GitHub: {e}")
        return {"success": False, "error": "Failed to fetch releases from GitHub"}
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch releases from GitHub: {e}")
        return {"success": False, "error": "Failed to fetch releases from GitHub"}
    except Exception as e:
        logger.error(f"Error processing releases: {e}")
        return {"success": False, "error": "Error processing releases"}
