from fastapi import APIRouter
from datetime import datetime
import httpx
from app.utils.logger import logger

router = APIRouter()

GITHUB_API_URL = "https://api.github.com/repos/cyb3rgh05t/komandorr/releases"


@router.get("/api/releases")
async def get_releases():
    """Fetch releases from GitHub and format them"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(GITHUB_API_URL, timeout=10.0)
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

        return {"success": True, "releases": formatted_releases}

    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch releases from GitHub: {e}")
        return {"success": False, "error": "Failed to fetch releases from GitHub"}
    except Exception as e:
        logger.error(f"Error processing releases: {e}")
        return {"success": False, "error": "Error processing releases"}
