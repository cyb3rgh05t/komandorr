# CHANGELOG.md

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
