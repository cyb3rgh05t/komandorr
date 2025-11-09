# CHANGELOG.md

# [1.5.1](https://github.com/cyb3rgh05t/komandorr/compare/v1.5.0...v1.5.1) (2025-11-09)

### Features

• **ui: group-based filtering across all pages**
◦ Added group tabs to Monitor page with service filtering by selected group
◦ Added group tabs to Traffic page with service filtering by selected group
◦ Added group tabs to Services page with service filtering by selected group
◦ Tabs display group name and service count for each group
◦ Only visible when multiple groups exist
◦ Consistent tab styling across Dashboard, Monitor, Traffic, and Services pages

• **ux: background refresh improvements**
◦ Dashboard now preserves scroll position during automatic 30-second updates
◦ Dashboard maintains active group tab selection during background refresh
◦ Monitor preserves scroll position during automatic 10-second updates
◦ Monitor maintains active group tab selection during background refresh
◦ Traffic preserves scroll position during automatic 10-second updates
◦ Traffic maintains active group tab selection during background refresh
◦ Services preserves scroll position during automatic 30-second updates
◦ Services maintains active group tab selection during background refresh
◦ All pages update seamlessly without disrupting user's current view or context
◦ Loading states only shown on initial load, not during auto-refresh

### Changed

• **navigation: improved user experience**
◦ All pages now support consistent group-based filtering
◦ Auto-refresh intervals maintained: Dashboard/Services (30s), Monitor/Traffic (10s)
◦ Scroll position and tab context preserved across all pages

# [1.5.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.4.2...v1.5.0) (2025-11-09)

### Features

• **dashboard: comprehensive UI/UX improvements**
◦ Created dedicated `DashboardServiceCard` component for dashboard-specific service display
◦ Added horizontal stats bar layout with individual stat boxes (Response Time, Last Check, Upload/Download Speed)
◦ Removed Service ID display from dashboard cards for cleaner appearance
◦ Integrated real-time traffic data directly into dashboard service cards
◦ Stats now display with proper labels above values for consistent card sizing
◦ Added conditional rendering for traffic data (only shows when available)
◦ Created `DashboardTrafficChart` component with enhanced multi-service bandwidth visualization

- Traffic chart displays all active services with distinct colored wave lines
- Toggle between upload/download bandwidth views with pill-style switcher
- Last 60 data points with auto-scaling Y-axis and labeled values
- Service legend with color indicators and current bandwidth values
- 10 distinct colors for different services (blue, green, amber, red, violet, pink, cyan, emerald, orange, indigo)
- Gradient area fills under each service line for better visibility
- Auto-refresh every 30 seconds with dashboard traffic data
- Dedicated refresh button with spinning animation
- Total bandwidth display showing aggregate upload/download speed
- Sleek dark theme with thinner lines (1.2px) for professional appearance
- Subtle gradients (12% opacity) and minimal grid lines
- Y-axis labels with compact spacing for easy value reading
- Responsive legend grid layout (1-4 columns based on screen size)
- Service cards with hover effects and smooth transitions
- **Group-based filtering**: Chart positioned below group tabs and filters traffic by active group
- Dynamic filtering shows only services in the selected group tab
- Automatic refresh maintains group context
- **Ultra-thin lines**: Reduced to 0.25px for sleek, modern appearance matching design specifications

◦ **Dashboard Customization**: Added comprehensive visibility and appearance controls

- New "Customize" button with Settings icon in dashboard header
- Modal popup interface with backdrop blur and smooth animations
- Toggle visibility of Statistics Card, Traffic Chart, and Service Cards independently
- **Chart Line Thickness Control**: Interactive slider to adjust traffic chart line width (0.1px - 2px)
  - Real-time preview with current value display
  - Color-coded slider progress bar
  - Dynamic drop shadow scaling based on thickness
  - Smooth transitions when changing values
- Settings persist in localStorage across sessions
- Eye/EyeOff icons indicate current visibility state (green/gray)
- iOS-style toggle switches replace checkboxes for modern appearance
- Organized layout with divider separating visibility and appearance settings
- Fully translated (English/German) with dashboard.customize, dashboardVisibility, showStatsCard, showTrafficChart, showServiceCards, chartLineThickness, thin, thick keys

• **services: enhanced service card design**
◦ Redesigned `ServiceCard` component with modern badge-based layout
◦ Added Service ID display with copy-to-clipboard functionality
◦ Conditional icon display (only renders if service has custom icon)
◦ Improved action button layout with primary "Check Now" button
◦ Consistent badge styling across all service information

• **about: improved release section**
◦ Limited release display to 5 most recent releases for better performance
◦ Added "View All Releases" button in section header (right-aligned)
◦ Button only appears when more than 5 releases are available
◦ Direct link to GitHub releases page for full release history
◦ Added translations for "View All Releases" (English/German)

• **about: enhanced documentation access**
◦ Added direct link to documentation site (https://cyb3rgh05t.github.io/komandorr)
◦ Separated "Documentation" and "API Documentation" links for clarity
◦ Both links open in new tabs with proper external link icons

• **ui: improved consistency and polish**
◦ Added skeleton loading animations across all pages (Dashboard, Monitor, Traffic, Services)
◦ Standardized content width across all pages (removed inconsistent max-width constraints)
◦ All icons now use solid colors (removed opacity/fade effects)
◦ Consistent badge styling: `px-2.5 py-1 bg-theme-hover border border-theme rounded-md`
◦ Progress bars now use solid theme colors throughout

• **vodstreams: comprehensive timestamp tracking system**
◦ Implemented localStorage-based activity timestamp tracking with persistence
◦ Added live timer badges showing elapsed time for active downloads
◦ Smart tracking logic: starts immediately for new activities (<2%), waits for 1% progress change for in-progress activities
◦ Timer states: undefined (new) → null (waiting) → number (tracking with timestamp)
◦ Fixed timer reset issues on page refresh with proper state management
◦ Added "Tracking..." state for activities waiting to start timing
◦ Real-time timer updates with live elapsed time display

### Bug Fixes

• **dashboard: fixed missing Search icon import**
◦ Re-added Search icon to imports after cleanup
◦ Fixed ReferenceError when rendering search bar

• **traffic: fixed refresh button functionality**
◦ Updated `fetchTrafficData` to accept `isManualRefresh` parameter
◦ Fixed refresh button not showing animation during manual refresh
◦ Prevented automatic interval updates from clearing refresh state

• **backend: added traffic_history to API response**
◦ Modified `/traffic/summary` endpoint to include `traffic_history` field
◦ Limited history to last 60 data points to optimize response size
◦ Fixed dashboard traffic chart showing no data

### Documentation

• **docs: improved styling and readability**
◦ Darkened primary navbar color from `#e97b2e` to `#c05d1a` for better contrast
◦ Updated accent color from `#ff8c42` to `#d9681f` for more professional appearance
◦ Fixed badge rendering in documentation home page
◦ Converted markdown badge syntax to proper HTML with alignment attributes
◦ Added CSS improvements for center-aligned content and badge spacing
◦ Better visual hierarchy and spacing throughout documentation

### Internationalization

• **locales: added new translation keys**
◦ Added "documentation" key to English and German locales
◦ Added "viewAllReleases" key for release section button
◦ Added "trafficChart" key for dashboard traffic overview
◦ Added "noData" and "noActiveTraffic" keys for traffic chart empty states
◦ English: "Documentation", "View All Releases", "Traffic Overview", "No traffic data available", "No active traffic"
◦ German: "Dokumentation", "Alle Releases anzeigen", "Traffic-Übersicht", "Keine Traffic-Daten verfügbar", "Kein aktiver Traffic"

# [1.4.2](https://github.com/cyb3rgh05t/komandorr/compare/v1.4.1...v1.4.2) (2025-11-08)

### Bug Fixes

• **version: hardcoded fallback causing false update alerts**
◦ Removed hardcoded version fallback from '1.4.0' to 'unknown'
◦ Fixed "Update Available" badge showing incorrectly when on latest version
◦ Version now properly read from release.txt in Docker containers

• **monitoring: timezone issues in service check timestamps**
◦ Changed backend to use UTC timestamps (`datetime.now(timezone.utc)`) for all service checks
◦ Fixed "Last Check" showing incorrect times (e.g., "1h ago" when just checked)
◦ Improved `formatDistanceToNow()` with validation and edge case handling
◦ Added null/undefined checks and invalid date handling
◦ Timestamps now consistent across all timezones in Docker deployments

### Features

• **debug: version troubleshooting endpoint**
◦ Added `/api/version/debug` endpoint for diagnosing version detection issues
◦ Shows environment type (docker/local), file paths, existence, and content
◦ Helps troubleshoot path issues in containerized deployments

### Documentation

• **docs: cleaner appearance and proper branding**
◦ Removed all emoji characters from documentation files
◦ Copied logo.png and favicon.png from frontend to docs/images
◦ Updated mkdocs.yml to use separate favicon.png file
◦ Replaced emoji bullets with plain text throughout documentation
◦ Changed 'Made with ❤️' to 'Made with love'

# [1.4.1](https://github.com/cyb3rgh05t/komandorr/compare/v1.4.0...v1.4.1) (2025-11-08)

### Bug Fixes

• **traffic: timestamp display and timezone handling**
◦ Fixed traffic `last_updated` timestamp not being loaded correctly from JSON storage
◦ Added proper datetime deserialization for traffic metrics and history on service load
◦ Changed backend to use UTC timestamps (`datetime.now(timezone.utc)`) for consistency
◦ Updated frontend to display timestamps in 24-hour format (DD/MM/YYYY, HH:MM:SS)
◦ Timestamps now automatically convert from UTC to user's local timezone
◦ Added "Never" fallback when no traffic data has been received
◦ Created `formatDateTime()` helper function for consistent datetime formatting across Traffic page

# [1.4.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.3.2...v1.4.0) (2025-11-08)

### Features

• **vod streams: plex integration**
◦ Added new "VOD Streams" sidebar tab for monitoring Plex Media Server activities
◦ Implemented Plex server configuration in Settings page with URL and token input
◦ Added validation for Plex server connection before saving configuration
◦ Real-time display of Plex downloads, streams, and transcode activities
◦ Activity cards show progress bars, type badges (download/stream/transcode/pause), and titles
◦ Monitor-style header with search functionality, LIVE indicator, and refresh button
◦ Auto-refresh every 10 seconds for real-time activity updates
◦ Three stat cards: Total activities, Online (downloads), Problem (errors)
◦ Pagination support (10 items per page) for large activity lists
◦ "Not configured" state with direct link to Settings when Plex is not set up
◦ Bilingual support (English/German) for all UI elements

• **plex backend: comprehensive api**
◦ Created `/api/plex/config` endpoints (GET/POST) for Plex server configuration management
◦ Added `/api/plex/validate` endpoint for testing Plex connection before saving
◦ Implemented `/api/plex/activities` endpoint fetching from both `/activities` (downloads) and `/status/sessions` (streams)
◦ Added `/api/downloads` alias endpoint for compatibility
◦ JSON file storage for Plex configuration at `backend/data/plex_config.json`
◦ Debug endpoint `/api/plex/debug/raw-activities` for troubleshooting
◦ Proper error handling and logging for all Plex operations

• **traffic monitoring: dashboard integration**
◦ Added traffic data display to Dashboard service cards
◦ Shows upload/download speeds with color-coded icons (blue for upload, green for download)
◦ Auto-refresh traffic data every 30 seconds
◦ Traffic only displays when bandwidth > 0 for cleaner UI
◦ Maintains separate layouts for Dashboard (inline cards) and Services page (ServiceCard component)

• **search functionality: vod streams**
◦ Implemented real-time search filtering for VOD activities
◦ Search by title, subtitle, or activity type
◦ Auto-reset to page 1 when search query changes
◦ Clear search button when no results found
◦ Different empty state messages for no activities vs. no search results

• **settings page: plex configuration**
◦ Added Plex Server Settings section below Authentication settings
◦ Server URL and token input fields with validation
◦ Visual feedback: green button for validated connection, red for failed
◦ Loading spinner during validation process
◦ Help text for finding Plex token
◦ Theme-compatible button styling (smaller size, proper colors)

### Fixed

• **timezone: configuration bug**
◦ Fixed timezone always showing UTC in About page
◦ Removed conflicting `@property timezone` that was checking for TZ environment variable
◦ Now correctly reads TIMEZONE from .env file (e.g., Europe/Berlin)
◦ Backend properly returns configured timezone via `/api/config` endpoint
◦ Frontend dateUtils correctly fetches and caches timezone for all date formatting

• **settings: duplicate authentication section**
◦ Removed duplicate Authentication Settings section that appeared after Plex settings
◦ Proper order: Authentication → Plex → Language → Theme

• **plex settings: button sizing**
◦ Changed buttons from flex-1 (full width) to fixed width with px-6 padding
◦ Reduced button height (py-2 instead of py-3) and font size (text-sm)
◦ Smaller icons (16px instead of 20px, h-4 w-4 spinner)

### Changed

• **dateUtils: improved timezone fetching**
◦ Added caching mechanism to prevent multiple simultaneous timezone fetches
◦ Console logging of loaded timezone for debugging
◦ Proper async handling with promise reuse during concurrent requests

### Technical

• **service layer: plex abstraction**
◦ Created `frontend/src/services/plexService.js` with clean API methods
◦ Methods: testPlexConnection, getPlexConfig, savePlexConfig, fetchPlexActivities
◦ Normalized data structure from different Plex endpoints
◦ Proper error handling and user-friendly error messages

• **translations: comprehensive coverage**
◦ Added `vodStreams` section to en.json and de.json
◦ Added `plex` section with server settings, validation, and status messages
◦ All UI elements fully translated in English and German

• **dependencies: pydantic settings**
◦ Added pydantic-settings package for proper configuration management
◦ Required for Pydantic v2 BaseSettings functionality

# [1.3.2](https://github.com/cyb3rgh05t/komandorr/compare/v1.3.1...v1.3.2) (2025-11-06)

### Features

• **service types: added server type**
◦ Added "Server" as a new service type option in Add/Edit Service modal
◦ Server type available for traffic monitoring without health checks
◦ Added translations for server type in English and German

### Changed

• Updated service type dropdown to include server option
• Enhanced service type flexibility for different monitoring scenarios

# [1.3.1](https://github.com/cyb3rgh05t/komandorr/compare/v1.3.0...v1.3.1) (2025-11-06)

### Features

• **ui: logo integration**
◦ Added Komandorr logo to sidebar, loading screen, and README
◦ Integrated favicon.png for browser tabs
◦ Sidebar logo displays at 48px height with auto-width
◦ Loading screen logo displays at 64px height
◦ README logo displays centered at 400px width

• **ui: refresh button improvements**
◦ Added smooth spin animation to all refresh buttons
◦ Renamed "Check Now" buttons to "Refresh" across all pages
◦ Added 500ms transition duration for smooth rotation
◦ Implemented disabled state during refresh operations

• **ui: loading improvements**
◦ Replaced in-app LoadingScreen with themed Loader2 spinner
◦ LoadingScreen now only used for initial app startup
◦ Added minimum display time (1 second) for smooth UX
◦ Implemented 300ms transition delay before hiding loading screen
◦ Monitor and Services pages now use simple Loader2 component

• **ui: consistent page padding**
◦ Unified all page containers to use `px-4 py-6 space-y-6`
◦ Removed inconsistent padding across Dashboard, Traffic, and other pages
◦ All pages now have uniform spacing and alignment

• **logging: colored and consistent output**
◦ Implemented ColoredFormatter with ANSI color codes for different log levels
◦ Removed timestamps from console output for cleaner formatting
◦ All log messages now follow format: `LEVELNAME - message`
◦ Color scheme: DEBUG (Cyan), INFO (Green), WARNING (Yellow), ERROR (Red), CRITICAL (Magenta)
◦ Created custom UvicornFormatter to match application logging style
◦ Unified all uvicorn logs (startup, requests, errors) with consistent formatting

### Changed

• **traffic: header removal**
◦ Removed header section from Traffic page for cleaner layout
◦ Traffic page now directly displays summary cards

• **translations: updated labels**
◦ Updated German translation: "Jetzt prüfen" → "Aktualisieren"
◦ Updated English translation: "Check Now" → "Refresh"

### Fixed

• **ui: width consistency**
◦ Fixed inconsistent page widths between Dashboard and other pages
◦ Standardized container padding across all page components

# [1.3.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.2.2...v1.3.0) (2025-11-06)

### Features

• **ui: improved service card styling**
◦ Redesigned service cards with cleaner, more cohesive theme-based appearance
◦ Removed gradient-style colored backgrounds and borders
◦ Unified styling using `bg-theme-card` for consistent look across all themes
◦ Added subtle shadows for better depth perception
◦ Improved button hover states with theme-consistent backgrounds
◦ Reduced icon sizes (18px to 16px) for cleaner appearance
◦ Tightened button spacing for more compact design

• **themes: enhanced theme consistency**
◦ Fixed theme variable inconsistencies between `:root` and `[data-theme="dark"]`
◦ Unified background gradient application across default and dark themes
◦ Improved theme variable definitions for better cross-theme compatibility

### Changed

• **dashboard: service grouping improvements**
◦ Enhanced service grouping with tabbed interface for multiple groups
◦ Single group displays in simple grid layout without tabs
◦ Improved group header styling and count badges
◦ Better visual separation between grouped and ungrouped services

• **services: consistent card styling**
◦ Applied unified styling to ServiceCard component
◦ Improved icon container presentation with borders
◦ Enhanced badge styling for service descriptions and types
◦ Better visual hierarchy in service information display

# [1.2.2](https://github.com/cyb3rgh05t/komandorr/compare/v1.2.1...v1.2.2) (2025-11-06)

### Documentation

• **changelog: adopt vodwisharr format**
◦ Reformatted changelog to match vodwisharr style
◦ Added compare links in version headers
◦ Changed to bullet point format with `•` and `◦` symbols
◦ Categorized sections with prefixes (settings:, auth:, docker:, etc.)

• **traffic: improve agent documentation**
◦ Clarified systemd service WorkingDirectory configuration
◦ Added recommended directory structure examples
◦ Included common installation paths and best practices

# [1.2.1](https://github.com/cyb3rgh05t/komandorr/compare/v1.2.0...v1.2.1) (2025-11-06)

### Changed

• **settings: default theme and language**
◦ Default theme changed from Dark to Plex
◦ Default language set to English
◦ Authentication disabled by default

• **version: improved version management**
◦ Improved version reading from release.txt
◦ Fixed path resolution for both Docker and local development environments
◦ Better version comparison and update detection

### Fixed

• **auth: fix authentication bypass issues**
◦ Fixed login screen appearing briefly when authentication is disabled
◦ Frontend now checks auth status before showing login screen
◦ Proper auth bypass when ENABLE_AUTH=false

• **docker: container and deployment fixes**
◦ Removed problematic USER directive that caused permission errors
◦ Made logger fault-tolerant for permission issues
◦ Fixed release.txt copy in Docker build process
◦ Corrected path resolution in containerized environment

• **settings: timezone configuration**
◦ Unified timezone configuration (removed duplicate TIMEZONE variable)
◦ Backend now reads TZ environment variable directly
◦ Fixed UTC display issue in About page

# [1.2.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.1.1...v1.2.0) (2025-11-05)

### Features

• **traffic: complete traffic monitoring system**
◦ New Traffic page in sidebar with real-time bandwidth monitoring
◦ Traffic summary cards showing active services and current bandwidth usage
◦ Service-level traffic statistics with upload/download speeds
◦ Traffic monitoring agent script for remote servers (`traffic_agent.py`)
◦ API endpoints for traffic data collection and retrieval
◦ Traffic metrics models (TrafficMetrics, TrafficDataPoint, TrafficUpdate)
◦ Complete documentation (TRAFFIC_AGENT.md, TRAFFIC_SETUP.md, TRAFFIC_IMPLEMENTATION.md)

• **services: service ID management**
◦ Service ID display with copy-to-clipboard functionality in service cards
◦ Service ID visibility for easy agent configuration

## [1.1.1](https://github.com/cyb3rgh05t/komandorr/compare/v1.1.0...v1.1.1) (2024-XX-XX)

### Bug Fixes

• **version: version check improvements** ([commit](https://github.com/cyb3rgh05t/komandorr/commit/))

## [1.1.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.0.0...v1.1.0) (2024-XX-XX)

### Features

• **releases: add version check functionality** ([commit](https://github.com/cyb3rgh05t/komandorr/commit/))
◦ Release and version check functionality

# [1.0.0](https://github.com/cyb3rgh05t/komandorr/releases/tag/v1.0.0) (2024-XX-XX)

### Features

• **dashboard: initial release**
◦ Dashboard with service overview
◦ Service management (add, edit, delete services)
◦ Service monitoring with real-time status checks

• **docker: container support**
◦ Docker container support with compose configuration

• **ui: theme and language support**
◦ Multi-theme support (Dark, Plex, Jellyfin, Emby, etc.)
◦ Multi-language support (English, German)

• **auth: authentication system**
◦ Basic authentication support

• **settings: configuration management**
◦ Settings management interface
◦ About page with version information

• **github: integration**
◦ GitHub integration for update checks
