from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class InviteCreate(BaseModel):
    """Model for creating a new invite"""

    custom_code: Optional[str] = None  # Optional custom invite code
    usage_limit: Optional[int] = None  # null = unlimited
    expires_in_days: Optional[int] = None  # null = never expires
    allow_sync: bool = False
    allow_camera_upload: bool = False
    allow_channels: bool = False
    plex_home: bool = False
    libraries: str = "all"  # "all" or "1,2,3" (comma-separated library IDs)


class InviteUpdate(BaseModel):
    """Model for updating an existing invite"""

    usage_limit: Optional[int] = None
    expires_at: Optional[datetime] = None
    allow_sync: Optional[bool] = None
    allow_camera_upload: Optional[bool] = None
    allow_channels: Optional[bool] = None
    plex_home: Optional[bool] = None
    libraries: Optional[str] = None
    is_active: Optional[bool] = None


class Invite(BaseModel):
    """Model representing an invite"""

    id: int
    code: str
    created_at: datetime
    created_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    usage_limit: Optional[int] = None
    used_count: int = 0
    allow_sync: bool = False
    allow_camera_upload: bool = False
    allow_channels: bool = False
    plex_home: bool = False
    libraries: str = "all"
    is_active: bool = True
    plex_server: str = "Plex Server"

    # Computed fields
    is_expired: bool = False
    is_exhausted: bool = False

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat() + "Z" if v else None}


class PlexUser(BaseModel):
    """Model representing a Plex user created via invite"""

    id: int
    email: str
    username: Optional[str] = None
    plex_id: Optional[str] = None
    thumb: Optional[str] = None
    invite_id: int
    created_at: datetime
    last_seen: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat() + "Z" if v else None}


class InviteWithUsers(Invite):
    """Invite model with associated users"""

    users: List[PlexUser] = []


class RedeemInviteRequest(BaseModel):
    """Request model for redeeming an invite"""

    code: str
    email: EmailStr


class ValidateInviteResponse(BaseModel):
    """Response for invite validation"""

    valid: bool
    message: str
    invite: Optional[Invite] = None
    plex_server_name: Optional[str] = None


class InviteStatsResponse(BaseModel):
    """Statistics about invites"""

    total_invites: int
    active_invites: int
    used_up_invites: int
    total_redemptions: int
    total_users: int
    active_users: int
