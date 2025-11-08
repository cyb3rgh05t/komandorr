# Changelog

All notable changes to Komandorr are documented here.

This file mirrors the main [CHANGELOG.md](https://github.com/cyb3rgh05t/komandorr/blob/main/CHANGELOG.md) from the repository.

---

## [1.4.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.3.2...v1.4.0) (2025-01-08)

### Features

#### VOD Streams: Plex Integration

- Added new "VOD Streams" sidebar tab for monitoring Plex Media Server activities
- Implemented Plex server configuration in Settings page with URL and token input
- Added validation for Plex server connection before saving configuration
- Real-time display of Plex downloads, streams, and transcode activities
- Activity cards show progress bars, type badges (download/stream/transcode/pause), and titles
- Monitor-style header with search functionality, LIVE indicator, and refresh button
- Auto-refresh every 10 seconds for real-time activity updates
- Three stat cards: Total activities, Online (downloads), Problem (errors)
- Pagination support (10 items per page) for large activity lists
- "Not configured" state with direct link to Settings when Plex is not set up
- Bilingual support (English/German) for all UI elements

#### Plex Backend: Comprehensive API

- Created `/api/plex/config` endpoints (GET/POST) for Plex server configuration management
- Added `/api/plex/validate` endpoint for testing Plex connection before saving
- Implemented `/api/plex/activities` endpoint fetching from both `/activities` (downloads) and `/status/sessions` (streams)
- Added `/api/downloads` alias endpoint for compatibility
- JSON file storage for Plex configuration at `backend/data/plex_config.json`
- Debug endpoint `/api/plex/debug/raw-activities` for troubleshooting
- Proper error handling and logging for all Plex operations

#### Traffic Monitoring: Dashboard Integration

- Added traffic data display to Dashboard service cards
- Shows upload/download speeds with color-coded icons (blue for upload, green for download)
- Auto-refresh traffic data every 30 seconds
- Traffic only displays when bandwidth > 0 for cleaner UI
- Maintains separate layouts for Dashboard (inline cards) and Services page (ServiceCard component)

#### Search Functionality: VOD Streams

- Implemented real-time search filtering for VOD activities
- Search by title, subtitle, or activity type
- Auto-reset to page 1 when search query changes
- Clear search button when no results found
- Different empty state messages for no activities vs. no search results

#### Settings Page: Plex Configuration

- Added Plex Server Settings section below Authentication settings
- Server URL and token input fields with validation
- Visual feedback: green button for validated connection, red for failed
- Loading spinner during validation process
- Help text for finding Plex token
- Theme-compatible button styling (smaller size, proper colors)

### Fixed

#### Timezone: Configuration Bug

- Fixed timezone always showing UTC in About page
- Removed conflicting `@property timezone` that was checking for TZ environment variable
- Now correctly reads TIMEZONE from .env file (e.g., Europe/Berlin)
- Backend properly returns configured timezone via `/api/config` endpoint
- Frontend dateUtils correctly fetches and caches timezone for all date formatting

#### Settings: Duplicate Authentication Section

- Removed duplicate Authentication Settings section that appeared after Plex settings
- Proper order: Authentication → Plex → Language → Theme

#### Plex Settings: Button Sizing

- Changed buttons from flex-1 (full width) to fixed width with px-6 padding
- Reduced button height (py-2 instead of py-3) and font size (text-sm)
- Smaller icons (16px instead of 20px, h-4 w-4 spinner)

### Changed

#### dateUtils: Improved Timezone Fetching

- Added caching mechanism to prevent multiple simultaneous timezone fetches
- Console logging of loaded timezone for debugging
- Proper async handling with promise reuse during concurrent requests

### Technical

#### Service Layer: Plex Abstraction

- Created `frontend/src/services/plexService.js` with clean API methods
- Methods: testPlexConnection, getPlexConfig, savePlexConfig, fetchPlexActivities
- Normalized data structure from different Plex endpoints
- Proper error handling and user-friendly error messages

#### Translations: Comprehensive Coverage

- Added `vodStreams` section to en.json and de.json
- Added `plex` section with server settings, validation, and status messages
- All UI elements fully translated in English and German

#### Dependencies: Pydantic Settings

- Added pydantic-settings package for proper configuration management
- Required for Pydantic v2 BaseSettings functionality

---

## [1.3.2](https://github.com/cyb3rgh05t/komandorr/compare/v1.3.1...v1.3.2) (2025-01-06)

### Features

#### Service Types: Added Server Type

- Added "Server" as a new service type option in Add/Edit Service modal
- Server type available for traffic monitoring without health checks
- Added translations for server type in English and German

---

## [1.3.1](https://github.com/cyb3rgh05t/komandorr/compare/v1.3.0...v1.3.1) (2025-01-06)

### Features

#### UI: Logo Integration

- Added Komandorr logo to sidebar, loading screen, and README
- Integrated favicon.png for browser tabs
- Sidebar logo displays at 48px height with auto-width
- Loading screen logo displays at 64px height
- README logo displays centered at 400px width

#### UI: Refresh Button Improvements

- Added smooth spin animation to all refresh buttons
- Renamed "Check Now" buttons to "Refresh" across all pages
- Added 500ms transition duration for smooth rotation
- Implemented disabled state during refresh operations

---

For the complete changelog history, visit the [main CHANGELOG.md](https://github.com/cyb3rgh05t/komandorr/blob/main/CHANGELOG.md) file.
