from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from pathlib import Path
import json
from typing import Optional

from ..middleware.auth import require_auth
from ..config import settings
from ..utils.logger import logger

router = APIRouter(prefix="/api/settings", tags=["settings"])


# Data models for request/response
class LoggingSettings(BaseModel):
    level: str
    enable_file: bool


class GeneralSettings(BaseModel):
    timezone: str


class APISettings(BaseModel):
    github_token: str
    tmdb_api_key: str


class PlexInstance(BaseModel):
    id: str
    name: str
    url: str
    token: str
    server_name: str = "Plex Server"


class PlexSettings(BaseModel):
    instances: list[PlexInstance] = []


class OverseerrSettings(BaseModel):
    url: str
    api_key: str
    email_domain: str


class UploaderSettings(BaseModel):
    base_url: str


class VpnProxySettings(BaseModel):
    url: str
    api_key: str


class PosterizarrInstance(BaseModel):
    id: str
    name: str
    url: str
    api_key: str


class PosterizarrSettings(BaseModel):
    instances: list[PosterizarrInstance] = []


class NfsMountInstance(BaseModel):
    id: str
    name: str
    url: str
    api_key: str


class NfsMountSettings(BaseModel):
    instances: list[NfsMountInstance] = []


class ArrInstance(BaseModel):
    id: str
    name: str
    type: str  # "sonarr" or "radarr"
    url: str
    api_key: str
    access_url: str = ""


class ArrSettings(BaseModel):
    instances: list[ArrInstance] = []


class ExternalApp(BaseModel):
    id: str
    name: str
    url: str
    icon: str = ""  # lucide icon name or URL to image
    group: str = ""  # optional group name for categorization


class ExternalAppsSettings(BaseModel):
    apps: list[ExternalApp] = []
    group_order: list[str] = []


class SettingsResponse(BaseModel):
    logging: LoggingSettings
    general: GeneralSettings
    api: APISettings
    plex: Optional[PlexSettings] = None
    overseerr: Optional[OverseerrSettings] = None
    uploader: Optional[UploaderSettings] = None
    vpn_proxy: Optional[VpnProxySettings] = None
    posterizarr: Optional[PosterizarrSettings] = None
    nfs_mount: Optional[NfsMountSettings] = None
    arr: Optional[ArrSettings] = None
    external_apps: Optional[ExternalAppsSettings] = None


class SettingsUpdate(BaseModel):
    logging: Optional[LoggingSettings] = None
    general: Optional[GeneralSettings] = None
    api: Optional[APISettings] = None
    plex: Optional[PlexSettings] = None
    overseerr: Optional[OverseerrSettings] = None
    uploader: Optional[UploaderSettings] = None
    vpn_proxy: Optional[VpnProxySettings] = None
    posterizarr: Optional[PosterizarrSettings] = None
    nfs_mount: Optional[NfsMountSettings] = None
    arr: Optional[ArrSettings] = None
    external_apps: Optional[ExternalAppsSettings] = None


def get_config_path():
    """Get path to config.json"""
    return Path(__file__).parent.parent.parent / "data" / "config.json"


def load_config():
    """Load current configuration from config.json"""
    config_path = get_config_path()
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_config(config_data):
    """Save configuration to config.json"""
    config_path = get_config_path()
    config_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info(f"Saving config to {config_path}")
    try:
        with open(config_path, "w") as f:
            json.dump(config_data, f, indent=2)
        logger.info(f"Config saved successfully to {config_path}")
    except Exception as e:
        logger.error(f"Failed to save config: {e}")
        raise


@router.get("", response_model=SettingsResponse)
async def get_settings(username: str = Depends(require_auth)):
    """Get current application settings"""
    config_data = load_config()

    # Get logging settings from config or defaults
    logging_config = config_data.get("logging", {})
    logging_settings = LoggingSettings(
        level=logging_config.get("level", settings.LOG_LEVEL),
        enable_file=logging_config.get("enable_file", settings.LOG_ENABLE_FILE),
    )

    # Get general settings from config or defaults
    general_config = config_data.get("general", {})
    general_settings = GeneralSettings(
        timezone=general_config.get("timezone", settings.TZ)
    )

    # Get API settings from config or defaults
    api_config = config_data.get("api", {})
    api_settings = APISettings(
        github_token=api_config.get("github_token", settings.GITHUB_TOKEN),
        tmdb_api_key=api_config.get("tmdb_api_key", settings.TMDB_API_KEY),
    )

    # Get Plex settings from config or defaults (multi-instance with backward compat)
    plex_config = config_data.get("plex", {})
    plex_instances = []
    if "instances" in plex_config:
        plex_instances = [PlexInstance(**inst) for inst in plex_config["instances"]]
    elif plex_config.get("server_url") or plex_config.get("server_token"):
        # Backward compat: old single-server format
        plex_instances = [
            PlexInstance(
                id="plex-default",
                name=plex_config.get("server_name", settings.PLEX_SERVER_NAME),
                url=plex_config.get("server_url", settings.PLEX_SERVER_URL),
                token=plex_config.get("server_token", settings.PLEX_SERVER_TOKEN),
                server_name=plex_config.get("server_name", settings.PLEX_SERVER_NAME),
            )
        ]
    plex_settings = PlexSettings(instances=plex_instances)

    # Get VoDWisharr settings from config or defaults
    overseerr_config = config_data.get("overseerr", {})
    overseerr_settings = None
    if overseerr_config or settings.OVERSEERR_URL:
        overseerr_settings = OverseerrSettings(
            url=overseerr_config.get("url", settings.OVERSEERR_URL),
            api_key=overseerr_config.get("api_key", settings.OVERSEERR_API_KEY),
            email_domain=overseerr_config.get(
                "email_domain", settings.DEFAULT_EMAIL_DOMAIN
            ),
        )

    # Get Uploader settings from config or fallback to runtime/env
    uploader_config = config_data.get("uploader", {})
    uploader_settings = UploaderSettings(
        base_url=uploader_config.get(
            "base_url", getattr(settings, "UPLOADER_BASE_URL", "")
        )
    )

    # Get VPN Proxy Manager settings from config or defaults
    vpn_proxy_config = config_data.get("vpn_proxy", {})
    vpn_proxy_settings = VpnProxySettings(
        url=vpn_proxy_config.get("url", getattr(settings, "VPN_PROXY_URL", "")),
        api_key=vpn_proxy_config.get(
            "api_key", getattr(settings, "VPN_PROXY_API_KEY", "")
        ),
    )

    # Get Posterizarr settings from config or defaults (multi-instance with backward compat)
    posterizarr_config = config_data.get("posterizarr", {})
    posterizarr_instances = []
    if "instances" in posterizarr_config:
        posterizarr_instances = [
            PosterizarrInstance(**inst) for inst in posterizarr_config["instances"]
        ]
    elif posterizarr_config.get("url") or posterizarr_config.get("api_key"):
        # Backward compat: old single-instance format
        posterizarr_instances = [
            PosterizarrInstance(
                id="posterizarr-default",
                name="Posterizarr",
                url=posterizarr_config.get(
                    "url", getattr(settings, "POSTERIZARR_URL", "")
                ),
                api_key=posterizarr_config.get(
                    "api_key", getattr(settings, "POSTERIZARR_API_KEY", "")
                ),
            )
        ]
    posterizarr_settings = PosterizarrSettings(instances=posterizarr_instances)

    # Get NFS Mount Manager settings from config or defaults
    nfs_mount_config = config_data.get("nfs_mount", {})
    nfs_mount_instances = []
    if "instances" in nfs_mount_config:
        nfs_mount_instances = [
            NfsMountInstance(**inst) for inst in nfs_mount_config["instances"]
        ]
    elif nfs_mount_config.get("url") or nfs_mount_config.get("api_key"):
        # Backward compat: old single-manager format
        nfs_mount_instances = [
            NfsMountInstance(
                id="nfs-default",
                name="NFS Mount Manager",
                url=nfs_mount_config.get("url", ""),
                api_key=nfs_mount_config.get("api_key", ""),
            )
        ]
    nfs_mount_settings = NfsMountSettings(instances=nfs_mount_instances)

    # Get *arr settings from config - support both old and legacy formats
    arr_config = config_data.get("arr", {})
    arr_settings = None

    def _build_instances_from_old_format(old_cfg: dict) -> list[ArrInstance]:
        instances: list[ArrInstance] = []
        if "sonarr" in old_cfg:
            sonarr = old_cfg["sonarr"]
            if sonarr.get("url") or sonarr.get("api_key"):
                instances.append(
                    ArrInstance(
                        id="sonarr-default",
                        name="Sonarr",
                        type="sonarr",
                        url=sonarr.get("url", ""),
                        api_key=sonarr.get("api_key", ""),
                    )
                )
        if "radarr" in old_cfg:
            radarr = old_cfg["radarr"]
            if radarr.get("url") or radarr.get("api_key"):
                instances.append(
                    ArrInstance(
                        id="radarr-default",
                        name="Radarr",
                        type="radarr",
                        url=radarr.get("url", ""),
                        api_key=radarr.get("api_key", ""),
                    )
                )
        return instances

    if arr_config:
        # New format under arr.instances
        if "instances" in arr_config:
            instances = [
                ArrInstance(**instance) for instance in arr_config["instances"]
            ]
            arr_settings = ArrSettings(instances=instances)
        else:
            # Old arr.sonarr/arr.radarr format
            instances = _build_instances_from_old_format(arr_config)
            if instances:
                arr_settings = ArrSettings(instances=instances)
    else:
        # Legacy top-level "instances" (incorrect placement) fallback
        if "instances" in config_data and isinstance(config_data["instances"], list):
            try:
                instances = [ArrInstance(**i) for i in config_data["instances"]]
                arr_settings = ArrSettings(instances=instances)
            except Exception:
                pass

    # Get external apps settings from config
    external_apps_config = config_data.get("external_apps", {})
    external_apps_settings = ExternalAppsSettings(
        apps=[ExternalApp(**app) for app in external_apps_config.get("apps", [])],
        group_order=external_apps_config.get("group_order", []),
    )

    return SettingsResponse(
        logging=logging_settings,
        general=general_settings,
        api=api_settings,
        plex=plex_settings,
        overseerr=overseerr_settings,
        uploader=uploader_settings,
        vpn_proxy=vpn_proxy_settings,
        posterizarr=posterizarr_settings,
        nfs_mount=nfs_mount_settings,
        arr=arr_settings,
        external_apps=external_apps_settings,
    )


@router.post("", response_model=SettingsResponse)
async def update_settings(
    updates: SettingsUpdate, username: str = Depends(require_auth)
):
    """Update application settings"""
    logger.info(f"POST /api/settings called by user: {username}")
    logger.info(f"Updates received: {updates.model_dump()}")
    config_data = load_config()

    # Update logging settings
    if updates.logging:
        config_data["logging"] = {
            "level": updates.logging.level,
            "enable_file": updates.logging.enable_file,
        }
        # Update runtime settings
        settings.LOG_LEVEL = updates.logging.level
        settings.LOG_ENABLE_FILE = updates.logging.enable_file

    # Update general settings
    if updates.general:
        config_data["general"] = {"timezone": updates.general.timezone}
        # Update runtime settings
        settings.TZ = updates.general.timezone

    # Update API settings
    if updates.api:
        config_data["api"] = {
            "github_token": updates.api.github_token,
            "tmdb_api_key": updates.api.tmdb_api_key,
        }
        # Update runtime settings
        settings.GITHUB_TOKEN = updates.api.github_token
        settings.TMDB_API_KEY = updates.api.tmdb_api_key

    # Update Plex settings (multi-instance)
    if updates.plex is not None:
        config_data["plex"] = {
            "instances": [
                {
                    "id": inst.id,
                    "name": inst.name,
                    "url": inst.url,
                    "token": inst.token,
                    "server_name": inst.server_name,
                }
                for inst in updates.plex.instances
            ]
        }
        # Update runtime settings from first instance (backward compat)
        if updates.plex.instances:
            first = updates.plex.instances[0]
            settings.PLEX_SERVER_URL = first.url
            settings.PLEX_SERVER_TOKEN = first.token
            settings.PLEX_SERVER_NAME = first.server_name
        else:
            settings.PLEX_SERVER_URL = ""
            settings.PLEX_SERVER_TOKEN = ""
            settings.PLEX_SERVER_NAME = "Plex Server"
        settings.PLEX_INSTANCES = [
            {
                "id": inst.id,
                "name": inst.name,
                "url": inst.url,
                "token": inst.token,
                "server_name": inst.server_name,
            }
            for inst in updates.plex.instances
        ]
        logger.info(f"Updated Plex instances: {len(updates.plex.instances)} instances")

    # Update VoDWisharr settings
    if updates.overseerr:
        config_data["overseerr"] = {
            "url": updates.overseerr.url,
            "api_key": updates.overseerr.api_key,
            "email_domain": updates.overseerr.email_domain,
        }
        # Update runtime settings
        settings.OVERSEERR_URL = updates.overseerr.url
        settings.OVERSEERR_API_KEY = updates.overseerr.api_key
        settings.DEFAULT_EMAIL_DOMAIN = updates.overseerr.email_domain

    # Update Uploader settings
    if updates.uploader is not None:
        config_data["uploader"] = {
            "base_url": updates.uploader.base_url,
        }
        # Update runtime settings
        settings.UPLOADER_BASE_URL = updates.uploader.base_url
        logger.info(f"Updated Uploader base_url to: {updates.uploader.base_url}")

    # Update VPN Proxy Manager settings
    if updates.vpn_proxy is not None:
        config_data["vpn_proxy"] = {
            "url": updates.vpn_proxy.url,
            "api_key": updates.vpn_proxy.api_key,
        }
        # Update runtime settings
        settings.VPN_PROXY_URL = updates.vpn_proxy.url
        settings.VPN_PROXY_API_KEY = updates.vpn_proxy.api_key
        logger.info(f"Updated VPN Proxy URL to: {updates.vpn_proxy.url}")

    # Update Posterizarr settings (multi-instance)
    if updates.posterizarr is not None:
        config_data["posterizarr"] = {
            "instances": [
                {
                    "id": inst.id,
                    "name": inst.name,
                    "url": inst.url,
                    "api_key": inst.api_key,
                }
                for inst in updates.posterizarr.instances
            ]
        }
        # Update runtime settings from first instance (backward compat)
        if updates.posterizarr.instances:
            first = updates.posterizarr.instances[0]
            settings.POSTERIZARR_URL = first.url
            settings.POSTERIZARR_API_KEY = first.api_key
        else:
            settings.POSTERIZARR_URL = ""
            settings.POSTERIZARR_API_KEY = ""
        settings.POSTERIZARR_INSTANCES = [
            {"id": inst.id, "name": inst.name, "url": inst.url, "api_key": inst.api_key}
            for inst in updates.posterizarr.instances
        ]
        logger.info(
            f"Updated Posterizarr instances: {len(updates.posterizarr.instances)} instances"
        )

    # Update NFS Mount Manager settings
    if updates.nfs_mount is not None:
        config_data["nfs_mount"] = {
            "instances": [
                {
                    "id": inst.id,
                    "name": inst.name,
                    "url": inst.url,
                    "api_key": inst.api_key,
                }
                for inst in updates.nfs_mount.instances
            ]
        }
        # Update runtime settings
        settings.NFS_MOUNT_INSTANCES = [
            {
                "id": inst.id,
                "name": inst.name,
                "url": inst.url,
                "api_key": inst.api_key,
            }
            for inst in updates.nfs_mount.instances
        ]
        logger.info(
            f"Updated NFS Mount instances: {len(updates.nfs_mount.instances)} instances"
        )

    # Update *arr settings
    if updates.arr is not None:
        config_data["arr"] = {
            "instances": [
                {
                    "id": instance.id,
                    "name": instance.name,
                    "type": instance.type,
                    "url": instance.url,
                    "api_key": instance.api_key,
                    "access_url": instance.access_url,
                }
                for instance in updates.arr.instances
            ]
        }
        # Remove legacy top-level instances if present
        if "instances" in config_data:
            try:
                del config_data["instances"]
                logger.info("Removed legacy top-level 'instances' array")
            except Exception:
                pass
        logger.info(f"Updated arr instances: {len(updates.arr.instances)} instances")

    # Update External Apps settings
    if updates.external_apps is not None:
        config_data["external_apps"] = {
            "apps": [
                {
                    "id": app.id,
                    "name": app.name,
                    "url": app.url,
                    "icon": app.icon,
                    "group": app.group,
                }
                for app in updates.external_apps.apps
            ],
            "group_order": updates.external_apps.group_order or [],
        }
        logger.info(f"Updated external apps: {len(updates.external_apps.apps)} apps")

    # Save to config.json
    logger.info("Calling save_config...")
    save_config(config_data)
    logger.info("Config saved, calling get_settings to return updated state...")

    # Return updated settings
    return await get_settings(username)
