from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
import httpx
from datetime import datetime

from ..middleware.auth import require_auth
from ..config import settings
from ..utils.logger import logger

router = APIRouter(prefix="/api/arr-activity", tags=["arr-activity"])


async def fetch_arr_api(
    base_url: str, api_key: str, endpoint: str, params: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Generic function to fetch data from Sonarr/Radarr API

    Args:
        base_url: Base URL of the *arr instance (e.g., http://localhost:8989)
        api_key: API key for authentication
        endpoint: API endpoint path (e.g., /api/v3/queue)
        params: Optional query parameters

    Returns:
        JSON response from the API
    """
    if not base_url or not api_key:
        return {"error": "Service not configured", "records": [], "totalRecords": 0}

    try:
        # Clean up base URL
        base_url = base_url.rstrip("/")
        endpoint = endpoint.lstrip("/")
        url = f"{base_url}/{endpoint}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                url,
                headers={"X-Api-Key": api_key},
                params=params or {},
            )

            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(
                    f"*arr API request failed: {url} - Status {response.status_code}"
                )
                return {
                    "error": f"API returned status {response.status_code}",
                    "records": [],
                    "totalRecords": 0,
                }

    except httpx.TimeoutException:
        logger.error(f"Timeout fetching from {base_url}/{endpoint}")
        return {"error": "Request timeout", "records": [], "totalRecords": 0}
    except Exception as e:
        logger.error(f"Error fetching from {base_url}/{endpoint}: {str(e)}")
        return {"error": str(e), "records": [], "totalRecords": 0}


def load_arr_config():
    """Load Sonarr/Radarr configuration from config.json. Supports both old and new format."""
    from pathlib import Path
    import json

    config_path = Path(__file__).parent.parent.parent / "data" / "config.json"
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
                arr_config = config.get("arr", {})

                # Return instances in new format
                instances = []

                # New format under arr.instances
                if isinstance(arr_config, dict) and "instances" in arr_config:
                    instances = arr_config["instances"]
                else:
                    # Legacy top-level instances fallback
                    if "instances" in config and isinstance(config["instances"], list):
                        instances = config["instances"]
                    else:
                        # Migrate old arr.sonarr/arr.radarr format
                        if isinstance(arr_config, dict):
                            if "sonarr" in arr_config:
                                sonarr = arr_config["sonarr"]
                                if sonarr.get("url") or sonarr.get("api_key"):
                                    instances.append(
                                        {
                                            "id": "sonarr-default",
                                            "name": "Sonarr",
                                            "type": "sonarr",
                                            "url": sonarr.get("url", ""),
                                            "api_key": sonarr.get("api_key", ""),
                                        }
                                    )
                            if "radarr" in arr_config:
                                radarr = arr_config["radarr"]
                                if radarr.get("url") or radarr.get("api_key"):
                                    instances.append(
                                        {
                                            "id": "radarr-default",
                                            "name": "Radarr",
                                            "type": "radarr",
                                            "url": radarr.get("url", ""),
                                            "api_key": radarr.get("api_key", ""),
                                        }
                                    )

                return {"instances": instances}
        except Exception as e:
            logger.error(f"Error loading arr config: {str(e)}")
    return {"instances": []}


@router.get("/queue")
async def get_combined_queue(username: str = Depends(require_auth)):
    """
    Get combined download queue from all configured *arr services

    Returns queue items from all configured instances with:
    - Active downloads
    - Queued items
    - Status information
    """
    arr_config = load_arr_config()
    instances = arr_config.get("instances", [])

    result = {}

    # Fetch queue for each instance
    for instance in instances:
        instance_id = instance.get("id", "")
        instance_type = instance.get("type", "")
        url = instance.get("url", "")
        api_key = instance.get("api_key", "")

        # Determine endpoint parameters based on type
        params = {"pageSize": 100}
        if instance_type == "sonarr":
            params["includeUnknownSeriesItems"] = True
        elif instance_type == "radarr":
            params["includeUnknownMovieItems"] = True

        data = await fetch_arr_api(url, api_key, "api/v3/queue", params)

        result[instance_id] = {
            "name": instance.get("name", ""),
            "type": instance_type,
            "enabled": bool(url and api_key),
            "records": data.get("records", []),
            "totalRecords": data.get("totalRecords", 0),
            "error": data.get("error"),
        }

    return result


@router.get("/queue/status")
async def get_queue_status(username: str = Depends(require_auth)):
    """
    Get queue status summary from all configured *arr services

    Returns counts and status for queue items
    """
    arr_config = load_arr_config()
    instances = arr_config.get("instances", [])

    result = {}
    total_count = 0
    has_errors = False
    has_warnings = False

    # Fetch status for each instance
    for instance in instances:
        instance_id = instance.get("id", "")
        url = instance.get("url", "")
        api_key = instance.get("api_key", "")

        status = await fetch_arr_api(url, api_key, "api/v3/queue/status")

        result[instance_id] = {
            "name": instance.get("name", ""),
            "type": instance.get("type", ""),
            **status,
        }

        # Aggregate counts
        total_count += status.get("totalCount", 0)
        has_errors = has_errors or status.get("errors", False)
        has_warnings = has_warnings or status.get("warnings", False)

    return {
        "instances": result,
        "combined": {
            "totalCount": total_count,
            "errors": has_errors,
            "warnings": has_warnings,
        },
    }


@router.get("/history")
async def get_recent_history(
    page: int = 1,
    page_size: int = 50,
    username: str = Depends(require_auth),
):
    """
    Get recent download/import history from all configured *arr services

    Returns recently completed items from all instances
    """
    arr_config = load_arr_config()
    instances = arr_config.get("instances", [])

    result = {}

    # Fetch history for each instance
    for instance in instances:
        instance_id = instance.get("id", "")
        url = instance.get("url", "")
        api_key = instance.get("api_key", "")

        history = await fetch_arr_api(
            url,
            api_key,
            "api/v3/history",
            {
                "page": page,
                "pageSize": page_size,
                "sortKey": "date",
                "sortDirection": "descending",
            },
        )

        result[instance_id] = {
            "name": instance.get("name", ""),
            "type": instance.get("type", ""),
            "enabled": bool(url and api_key),
            "records": history.get("records", []),
            "totalRecords": history.get("totalRecords", 0),
            "error": history.get("error"),
        }

    return result


@router.get("/system/status")
async def get_system_status(username: str = Depends(require_auth)):
    """
    Get system status from all configured *arr services

    Returns version, status, and availability info
    """
    arr_config = load_arr_config()
    instances = arr_config.get("instances", [])

    result = {}

    # Fetch system status for each instance
    for instance in instances:
        instance_id = instance.get("id", "")
        url = instance.get("url", "")
        api_key = instance.get("api_key", "")

        status = await fetch_arr_api(url, api_key, "api/v3/system/status")

        result[instance_id] = {
            "name": instance.get("name", ""),
            "type": instance.get("type", ""),
            "enabled": bool(url and api_key),
            "configured_url": url,
            "status": status,
        }

    return result
