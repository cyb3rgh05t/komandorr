# Plex Invite System - Documentation

## Overview

Komandorr v2.4.1 includes a comprehensive Plex invite management system similar to Wizarr and Streamarr. This feature allows you to create and manage invite codes for inviting new users to your Plex server with granular control over permissions, library access, and user expiration dates.

## Features

### ✨ Core Features

- **Invite Code Generation**: Automatically generates unique 8-character invite codes
- **Usage Limits**: Set maximum number of times an invite can be used (1-100 or unlimited)
- **Expiration**: Set expiration dates for invites (or never expire)
- **Permission Control**: Fine-grained control over user permissions:
  - Downloads/Sync
  - Live TV/Channels
  - Plex Home vs Friend invitations
- **Library Access**: Control which Plex libraries users can access (Movies, TV Shows, Music, or All)
- **User Management**: Comprehensive user account management with individual expiration dates
- **OAuth Redemption**: Wizarr-style OAuth flow for seamless Plex account integration
- **Re-invitation Support**: Users can be re-invited after removal without errors
- **User Tracking**: Track all users who redeemed invites with profile pictures and metadata
- **Multi-Badge Status System**: Visual status indicators showing multiple states simultaneously
- **Statistics Dashboard**: View invite usage statistics and user metrics
- **User Refresh**: Update user information from Plex server on-demand
- **User Removal**: Remove users from Plex server directly from the dashboard
- **Automatic Cleanup**: Orphaned invites are automatically deleted when last user is removed

### 🎨 Status Badges

Invites can display multiple status badges simultaneously for better clarity:

- **Active** (Green): Invite is usable and not expired/exhausted
- **Redeemed** (Green): Invite has been claimed by at least one user
  - Can also show **Expired** (Red) or **Used Up** (Orange) when applicable
- **Expired** (Red): Invite has passed its expiration date
- **Used Up** (Orange): Invite has reached its maximum usage limit
- **Disabled** (Gray): Invite has been manually disabled

**Badge Priority**: Disabled > Redeemed (with additional badges) > Expired/Used Up > Active

### 🔍 Filtering & Search

The Invites Manager provides powerful filtering options:

- **All**: Show all invites regardless of status
- **Active**: Only active, non-expired, non-exhausted invites
- **Redeemed**: Invites that have been claimed by users
- **Expired**: Invites past their expiration date
- **Used Up**: Invites that reached their usage limit
- **Disabled**: Manually disabled invites

Additional features:

- **Search**: Filter by invite code, description, or user details
- **Real-time Counts**: Each filter tab shows the number of matching invites
- **Active Invites Card**: Displays redeemed count separately

### 🎯 Use Cases

- Share your Plex server with friends and family
- Create temporary invites for trial access
- Manage library access per invite
- Set individual user expiration dates
- Track server growth and user acquisition
- Bulk user management with search and filtering
- Re-invite previously removed users without conflicts

## Installation & Setup

### Prerequisites

1. **Plex Server** configured in Komandorr (`/settings` → Plex Configuration)
2. **Python Dependencies**: Install `plexapi` library for full functionality

```bash
cd backend
pip install plexapi
```

### Database Migration

The invite system tables will be created automatically on first run. The system adds two new tables:

- `invites`: Stores invite codes and settings
- `plex_users`: Tracks users created via invites

## Usage Guide

### Creating Invites

1. Navigate to **Invites** in the sidebar
2. Click **"Create Invite"**
3. Configure your invite:

   - **Usage Limit**: How many times the invite can be used (leave empty for unlimited)
   - **Expires In**: Number of days until expiration (leave empty for never)
   - **Permissions**: Select which features to grant
   - **Libraries**: Choose which libraries to share

4. Click **"Create Invite"**
5. Copy the generated invite link

### Sharing Invites

Once created, you can share invites in two ways:

1. **Copy Invite Link**: Click the clipboard icon to copy the full URL
   - Format: `https://your-domain.com/invite/ABC12345`
2. **Share Just the Code**: Users can enter the code manually on the invite page

### Redeeming Invites

Users redeem invites through the public invite page:

1. Visit the invite URL or go to `/invite/CODE`
2. Enter their email address
3. Click "Redeem Invite"
4. They'll receive a Plex invitation email

### Managing Invites

From the Invites page, you can:

- **View All Invites**: See active, expired, and disabled invites
- **Track Usage**: See how many times each invite has been used
- **View Users**: See which users redeemed each invite
- **Delete Invites**: Remove unused or expired invites

## API Endpoints

### Admin Endpoints (Require Authentication)

#### Create Invite

```http
POST /api/invites/
Content-Type: application/json

{
  "usage_limit": 5,
  "expires_in_days": 30,
  "allow_sync": true,
  "allow_channels": false,
  "allow_camera_upload": false,
  "plex_home": false,
  "libraries": "all"
}
```

#### List Invites

```http
GET /api/invites/
GET /api/invites/?include_inactive=true
```

#### Get Invite Stats

```http
GET /api/invites/stats
```

#### Update Invite

```http
PUT /api/invites/{invite_id}
Content-Type: application/json

{
  "is_active": false
}
```

#### Delete Invite

```http
DELETE /api/invites/{invite_id}
```

#### List Plex Users

```http
GET /api/invites/users
```

### Public Endpoints (No Authentication)

#### Validate Invite

```http
POST /api/invites/validate?code=ABC12345
```

#### Redeem Invite

```http
POST /api/invites/redeem
Content-Type: application/json

{
  "code": "ABC12345",
  "email": "user@example.com"
}
```

## Configuration

### Environment Variables

No additional environment variables are required. The invite system uses your existing Plex configuration.

### Permissions

The invite system integrates with Komandorr's existing authentication:

- Viewing/Creating/Managing invites requires admin authentication
- Redeeming invites is public (no authentication needed)

## Database Schema

### Invites Table

| Column              | Type     | Description                        |
| ------------------- | -------- | ---------------------------------- |
| id                  | Integer  | Primary key                        |
| code                | String   | Unique invite code (8 chars)       |
| created_at          | DateTime | When the invite was created        |
| created_by          | String   | Admin username who created it      |
| expires_at          | DateTime | When the invite expires (nullable) |
| usage_limit         | Integer  | Max uses (null = unlimited)        |
| used_count          | Integer  | Times redeemed                     |
| allow_sync          | Boolean  | Allow downloads/sync               |
| allow_camera_upload | Boolean  | Allow camera uploads               |
| allow_channels      | Boolean  | Allow Live TV                      |
| plex_home           | Boolean  | Plex Home vs Friend                |
| libraries           | String   | Library access ("all" or "1,2,3")  |
| is_active           | Boolean  | Whether invite is active           |

### Plex Users Table

| Column     | Type     | Description              |
| ---------- | -------- | ------------------------ |
| id         | Integer  | Primary key              |
| email      | String   | User's email (unique)    |
| username   | String   | Plex username            |
| plex_id    | String   | Plex user ID             |
| invite_id  | Integer  | Foreign key to invites   |
| created_at | DateTime | When user was created    |
| last_seen  | DateTime | Last activity (nullable) |
| is_active  | Boolean  | Whether user is active   |

## PlexAPI Integration

### Current Implementation

The current implementation includes the API structure for Plex invitations but requires the PlexAPI library for full functionality.

### Setting Up PlexAPI

To enable actual Plex user invitations:

1. Install PlexAPI:

```bash
pip install plexapi
```

2. The system will automatically use PlexAPI to:
   - Invite users via email (`inviteFriend`)
   - Create Plex Home members (`createExistingUser`)
   - Set library permissions
   - Configure download/sync settings

### Invitation Methods

The system supports two types of Plex invitations:

#### 1. Friend Invitation (Default)

- Users receive an email invitation
- Must have/create a Plex account
- Recommended for most use cases

#### 2. Plex Home (Advanced)

- Adds users directly to your Plex Home
- Requires Plex Pass
- Managed users under your account
- Enable with `plex_home: true`

## Security Considerations

### Best Practices

1. **Set Usage Limits**: Prevent invite code sharing by limiting uses
2. **Set Expiration**: Use time-limited invites for temporary access
3. **Monitor Usage**: Regularly review invite statistics
4. **Disable Old Invites**: Deactivate unused invites
5. **Library Access**: Only share necessary libraries

### Privacy

- Email addresses are stored securely
- Invite codes are randomly generated (uppercase + digits)
- User tracking respects privacy

## Troubleshooting

### Common Issues

**Invite validation fails**

- Check that the invite code is correct (case-insensitive)
- Verify the invite hasn't expired or reached usage limit
- Ensure the invite is active

**User doesn't receive Plex invitation**

- Check spam folder
- Verify Plex server configuration
- Ensure PlexAPI is installed
- Check Plex server logs

**Cannot create invites**

- Ensure Plex server is configured in settings
- Verify admin authentication
- Check server logs for errors

### Debug Mode

Enable debug logging in your backend:

```bash
# In .env or environment
LOG_LEVEL=DEBUG
```

Check logs at `backend/logs/komandorr.log`

## Roadmap / Future Enhancements

- [ ] Email notifications when invites are redeemed
- [ ] Invite templates for common configurations
- [ ] Bulk invite creation
- [ ] User activity tracking
- [ ] Integration with Plex webhooks
- [ ] Custom invite landing pages
- [ ] QR code generation for invites
- [ ] Discord/Telegram bot integration

## Credits

Inspired by:

- [Streamarr](https://github.com/nickelsh1ts/streamarr) - Full-featured media server management
- [Wizarr](https://github.com/wizarrrr/wizarr) - Automatic user invitation system

## Support

For issues or questions:

1. Check the [GitHub Issues](https://github.com/cyb3rgh05t/komandorr/issues)
2. Review the main Komandorr documentation
3. Check Plex server configuration

## License

This feature is part of Komandorr and follows the same license as the main project.
