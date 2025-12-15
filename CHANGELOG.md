# CHANGELOG.md

# [2.5.0](https://github.com/cyb3rgh05t/komandorr/compare/v2.4.1...v2.5.0) (2025-12-15)

### 🚀 Performance: Enterprise-Grade Caching System

**Phase 1: Plex Activities Cache**

• **activities-cache: In-memory caching with 5s TTL**
◦ Reduces Plex API calls by 83% during active monitoring
◦ Module-level cache dictionary with timestamp-based expiry
◦ Automatic stale cache fallback on API errors
◦ Hit/miss tracking for cache performance monitoring
◦ Cache age reporting for debugging

**Phase 2: Watch History & Library Caching**

• **watch-history-cache: 5-minute database query cache**
◦ Reduces database queries by 80% for watch history endpoint
◦ Automatic invalidation on manual sync operations
◦ Prevents redundant database scans during dashboard loads

• **library-cache: 5-minute library type cache**
◦ Caches Plex library sections by server URL + token
◦ Eliminates repeated library API calls during invite workflows
◦ Improves invite creation and library selection performance

**Phase 3: Background Stats & Cache Warming**

• **stats-aggregation: Background statistics service**
◦ Pre-calculates dashboard stats every 60 seconds
◦ `/api/plex/stats/dashboard` returns instant cached results
◦ Aggregates service health, Plex library counts, and traffic stats
◦ Eliminates expensive multi-database queries on dashboard loads
◦ Background asyncio task integrated into FastAPI lifespan

• **cache-warming: Automatic cache refresh service**
◦ Proactively refreshes caches at 80% TTL threshold
◦ Prevents cold cache states during normal operation
◦ Checks every 2 seconds for stale caches
◦ Warms activities and watch history caches automatically
◦ Ensures consistent sub-second response times

• **redis-support: Optional distributed cache layer**
◦ Redis integration for multi-instance deployments
◦ Automatic fallback to in-memory cache if Redis unavailable
◦ Graceful degradation maintains system reliability
◦ Configurable via `REDIS_ENABLED` environment variable
◦ Full CRUD operations: set, get, delete, clear

**Cache Management Endpoints**

• **GET /api/plex/cache/stats** - Enhanced cache statistics
◦ Per-cache hit/miss rates and TTL information
◦ Background stats service status and last update time
◦ Redis connection status and key count
◦ Cache age tracking for debugging

• **POST /api/plex/cache/clear** - Clear all caches
◦ Invalidates activities, watch history, and library caches
◦ Resets hit/miss counters for fresh metrics
◦ Useful for testing and troubleshooting

• **POST /api/plex/cache/warm** - Manual cache warming
◦ Force-refreshes all cache layers on demand
◦ Useful after Plex server changes or updates
◦ Ensures caches contain latest data

• **GET /api/plex/stats/dashboard** - Pre-calculated stats
◦ Returns dashboard stats from background aggregation
◦ Sub-second response time vs 2-5s without caching
◦ Services online/offline counts
◦ Plex library totals (movies, shows, episodes, seasons)
◦ Traffic statistics (30-day total)

**Performance Impact**

• Plex activities endpoint: 5s → sub-second response (80% hit rate)
• Watch history endpoint: 2-3s → sub-second response (cached)
• Dashboard stats: 3-5s → <100ms response (pre-calculated)
• API call reduction: 83% fewer Plex API requests
• Database query reduction: 80% fewer watch history queries
• Cache hit rates: 80% during normal operation with rapid requests

### 📚 Documentation Updates

• **CACHE_IMPLEMENTATION.md** - Complete implementation details
◦ All three phases documented with code examples
◦ Architecture diagrams and data flow
◦ Performance benchmarks and metrics

• **PHASE3_QUICKSTART.md** - Quick start guide for Phase 3
◦ Redis setup instructions (optional)
◦ Environment variable configuration
◦ Testing procedures with curl examples
◦ Troubleshooting common issues

• **API Documentation** - New cache endpoints documented
◦ Complete endpoint reference in docs/api/plex.md
◦ Request/response examples
◦ Cache statistics interpretation guide

### 🔧 Technical Details

• In-memory cache dictionaries at module level
• Datetime-based TTL checking (no external dependencies)
• Background asyncio tasks with proper lifecycle management
• Graceful shutdown with task cancellation
• Thread-safe cache operations
• Comprehensive error handling with stale cache fallback
• Optional Redis with automatic failover

---

# [2.4.1](https://github.com/cyb3rgh05t/komandorr/compare/v2.4.0...v2.4.1) (2025-12-07)

### 🎯 Invites Management Enhancements

**New Features**

• **invite-status: Multi-badge status system**
◦ Invites can now display multiple status badges simultaneously
◦ "Redeemed" badge (green) shows when invite has active users
◦ Additional "Expired" (red) and "Used Up" (orange) badges appear when applicable
◦ Badge priority: Disabled > Redeemed (+ expired/used) > Expired/Used > Active
◦ Better visual clarity of invite states at a glance

• **invite-filters: Redeemed filter tab**
◦ New "Redeemed" filter tab in invites manager
◦ Shows all invites that have been claimed by users
◦ Filter positioned between "Active" and "Expired" tabs
◦ Active invites stat card now shows redeemed count: "X (Y redeemed)"
◦ Redeemed status card removed in favor of filter tab

• **invite-redemption: Re-invitation support**
◦ Users can now be re-invited after being removed from Plex
◦ OAuth flow skips "already a member" check
◦ Allows seamless user re-additions without errors
◦ Improved invite redemption flow for previously removed users

• **invite-cleanup: Automatic orphan deletion**
◦ Invites automatically deleted when last associated user is removed
◦ Prevents orphaned invite codes cluttering the dashboard
◦ Delete user action now checks for remaining users on invite
◦ Cascade deletion keeps invite database clean

### 🎨 UI/UX Improvements

**Navigation Updates**

• **nav: Plex-specific naming**
◦ "VOD Activity" renamed to "Plex Activity"
◦ "User Accounts" renamed to "Plex User Accounts"
◦ "User History" renamed to "Plex User Stats"
◦ Clearer indication of Plex integration throughout UI

**Dashboard Refinements**

• **traffic-cards: Carousel improvements**
◦ Removed green activity indicator dots from traffic cards
◦ Fixed grid layout to prevent second row wrapping
◦ Cards now properly overflow with horizontal scroll
◦ Cleaner, more consistent visual presentation

• **invite-stats: Refined counter logic**
◦ Active invites counter properly filters expired/exhausted states
◦ Stats endpoint returns accurate counts for dashboard
◦ Redeemed count only includes active (non-expired, non-exhausted) invites

### 📚 Documentation

**API Documentation**

• **swagger-ui: Dark mode with proper OpenAPI schema**
◦ Custom OpenAPI schema generation ensures version field
◦ Swagger UI accessible at `/docs` endpoint
◦ Vite proxy configured for `/docs` and `/openapi.json`
◦ Dark mode theme with inverted colors for readability
◦ Fixed "Unable to render this definition" error

• **about-page: Fixed API docs link**
◦ API Documentation link in About section now works correctly
◦ Links to `/docs` with proper proxy routing
◦ Removed favicon 404 error from Swagger HTML

### 🌐 Internationalization

**Translation Updates**

• **locales: New translation keys**
◦ Added "redeemed" status translations (EN: "Redeemed", DE: "Eingelöst")
◦ Added "redeemed" filter translations
◦ Updated "totalRedemptions" to just "Redemptions" (EN/DE)
◦ Plex-specific navigation labels updated in both languages

### 🔧 Technical Improvements

**Backend**

• **openapi: Custom schema generation**
◦ Explicit OpenAPI version "3.1.0" in schema
◦ Custom `custom_openapi()` function ensures proper spec format
◦ Swagger UI compatible with generated schema

**Frontend**

• **vite-config: Extended proxy configuration**
◦ Added `/docs` proxy for Swagger UI
◦ Added `/openapi.json` proxy for OpenAPI schema
◦ Ensures dev environment works with backend documentation

### 🐛 Bug Fixes

• **invites: Fixed filter logic for redeemed invites**
◦ Redeemed count in stats card now excludes expired/used invites
◦ Only active redeemed invites counted in stat display
◦ Filter logic matches display logic for consistency

• **oauth: Fixed re-invitation blocking**
◦ Previously removed users can now redeem invites again
◦ OAuth flow simplified to allow duplicate invitations
◦ Plex handles duplicate prevention automatically

# [2.4.0](https://github.com/cyb3rgh05t/komandorr/compare/v2.3.0...v2.4.0) (2025-12-01)

### 📊 Watch History & User Analytics

**New Features**

• **watch-history: Complete Plex watch history tracking**
◦ New User History page with comprehensive viewing analytics
◦ Real-time sync of Plex watch history to local database
◦ Track movies, TV episodes, and music playback per user
◦ View progress, duration, view count, and ratings for all content
◦ Background sync service fetches up to 200 most recent history items
◦ Automatic account mapping with Plex system accounts
◦ Persistent storage in SQLite database (WatchHistoryDB model)
◦ Support for thumbnails, studio, genres, and content ratings

• **user-analytics: Advanced filtering and search**
◦ Filter by time period: All Time, Today, This Week, This Month
◦ Filter by content type: All, Movies, TV Episodes, Music
◦ Search across username, email, and content titles
◦ User statistics with total views, favorite content type, and last activity
◦ Per-user detailed history with play progress indicators
◦ Responsive card layout with media type icons and badges
◦ Real-time data refresh with optimized caching (15-minute stale time)

• **api: Watch history endpoints**
◦ `GET /api/plex/watch-history` - Retrieve all watch history from database
◦ Background service automatically syncs every 15 minutes
◦ Efficient database queries with indexed lookups
◦ Support for duplicate detection using rating_key + viewed_at

### 🎨 UI/UX Enhancements

**New Features**

• **carousel: Traffic and media carousel navigation**
◦ DashboardTrafficCards now displays traffic data in paginated carousel
◦ Auto-scrolling carousel for top bandwidth consumers
◦ Previous/Next navigation arrows with smooth transitions
◦ Pagination dots showing current position
◦ Configurable items per page (default: 5 services)
◦ InviteRedemption page features auto-scrolling Plex media showcase
◦ Horizontal scroll animation for poster images

• **badges: Enhanced visual indicators**
◦ Expiration badges on User Accounts cards showing time until expiry
◦ "Expires in X days" display with color coding (red < 7 days, yellow < 30 days)
◦ "Expired" badge for users past expiration date
◦ Badge counters on Services tab showing active service count
◦ User count badges in sidebar navigation

• **sidebar: Improved navigation**
◦ User History menu item with Activity icon
◦ Dynamic badge counts for Services and User Accounts
◦ Responsive collapsing on mobile devices
◦ Active route highlighting with theme colors

### 🔧 Invite System Improvements

**New Features**

• **invite-editing: Full CRUD operations for invites**
◦ Edit existing invites with modal dialog
◦ Update usage limits, expiration dates, and permissions
◦ Modify library access after invite creation
◦ Real-time validation and error handling
◦ Confirmation dialogs for destructive actions

• **library-selection: Enhanced library picker**
◦ Fixed individual library selection in multi-select dropdown
◦ Support for Movies, TV Shows, Music, and All Libraries
◦ Visual checkboxes for selected libraries
◦ "All Libraries" option properly toggles individual selections

• **expiration-picker: Time selection for expiry dates**
◦ Added time picker to expiration date selector
◦ Support for hour and minute precision on invite expiration
◦ User expiration date editor with time selection
◦ Default time set to end of day (23:59) for better UX

### 🚀 Traffic Agent Improvements

**New Features**

• **persistence: Traffic data persistence across restarts**
◦ State file saves total upload/download counters to disk
◦ Automatic state restoration on agent startup
◦ JSON-based state storage in `traffic_state.json`
◦ Prevents data loss when agent restarts
◦ `load_state()` and `save_state()` methods for state management
◦ State file created automatically on first run

### 🐛 Bug Fixes

• **refresh: Fixed user refresh button states**
◦ Individual refresh buttons now show loading spinner during operation
◦ Disabled state prevents multiple concurrent refreshes
◦ Proper error handling with toast notifications
◦ RefreshCw icon animates during refresh

• **oauth: Improved Plex OAuth flow**
◦ Better error messages for OAuth failures
◦ Automatic email collection for new users
◦ Fixed account mapping with Plex system accounts

• **services: Service tab count accuracy**
◦ Fixed service count badge showing incorrect numbers
◦ Real-time updates when services added/removed
◦ Proper filtering of active vs inactive services

### 📚 Documentation

• **localization: Updated translations**
◦ Added German translations for User History page
◦ English translations for watch history features
◦ Filter labels, time periods, and content types
◦ Statistics and analytics terminology

### 🔄 Database Schema Updates

• **models: New watch history schema**
◦ WatchHistoryDB table with comprehensive metadata
◦ Fields: user_id, email, username, type, title, viewed_at, duration, progress
◦ Support for TV show hierarchy (grandparent_title, parent_index, index)
◦ Rating, year, thumb, content_rating, studio, summary, genres
◦ Unique constraint on rating_key + viewed_at for duplicate prevention
◦ Indexed columns for fast queries (user_id, email, viewed_at, type)

---

# [2.3.0](https://github.com/cyb3rgh05t/komandorr/compare/v2.2.0...v2.3.0) (2025-11-26)

### 🎭 Plex Invite Management System

**New Features**

• **invites: Complete Plex invitation system**
◦ Create custom invite codes with usage limits and expiration dates
◦ Library-specific access control (Movies, TV Shows, Music, or All)
◦ Permission management (Sync, Live TV/Channels, Plex Home)
◦ OAuth-based redemption flow (Wizarr-style)
◦ Automatic user provisioning to Plex Media Server
◦ Support for both Plex Friends and Plex Home invitations

• **user-accounts: Advanced user management**
◦ View all redeemed Plex users with detailed information
◦ User avatars/thumbnails from Plex profiles
◦ Individual user expiration dates (independent from invite expiration)
◦ Edit user expiration dates via modal dialog
◦ Refresh user information from Plex server on-demand
◦ Delete/remove users from Plex server
◦ Library and permission badges for each user
◦ Real-time statistics (Total Users, Redeemed Invites, Plex Server Name)
◦ Search functionality across username, email, and invite codes
◦ Skeleton loading states matching card layouts

• **invites-manager: Comprehensive invite administration**
◦ Create invites with library selection (multi-select dropdown)
◦ Set usage limits (1-100 or unlimited)
◦ Configure expiration dates for invites
◦ Toggle permissions: Allow Sync, Allow Channels/Live TV, Plex Home
◦ View invite statistics and redemption status
◦ Copy invite links with one click
◦ Active/Expired/Exhausted status indicators
◦ Batch delete and edit capabilities
◦ Real-time invite validation

• **oauth: Wizarr-style Plex OAuth flow**
◦ Secure OAuth PIN-based authentication
◦ Automatic Plex account detection
◦ Email collection for new users
◦ Seamless invitation acceptance
◦ Success/failure redirect handling

• **api: RESTful invite endpoints**
◦ `POST /api/invites/` - Create new invite
◦ `GET /api/invites/` - List all invites with users
◦ `GET /api/invites/{id}` - Get specific invite details
◦ `PUT /api/invites/{id}` - Update invite settings
◦ `DELETE /api/invites/{id}` - Delete invite
◦ `POST /api/invites/validate` - Validate invite code
◦ `POST /api/invites/redeem` - Redeem invite (OAuth)
◦ `GET /api/invites/stats` - Invite statistics
◦ `GET /api/invites/plex/config` - Plex server config & libraries
◦ `GET /api/invites/users` - List all Plex users
◦ `POST /api/invites/users/{id}/refresh` - Refresh user info from Plex
◦ `DELETE /api/invites/users/{id}` - Remove user from Plex
◦ `PUT /api/invites/users/{id}/expiration` - Update user expiration

### 🎨 UI/UX Improvements

• **skeleton-loading: Enhanced loading states**
◦ Replaced spinner loaders with skeleton cards across UserAccounts page
◦ Skeleton cards match actual card layouts (avatar, text, badges, buttons)
◦ Smooth pulse animation for better perceived performance
◦ Consistent with loading patterns in other pages

• **user-cards: Beautiful user display**
◦ Plex-themed background watermark on user cards
◦ Color-coded library badges (Movies=blue, TV=purple, Music=pink, All=cyan)
◦ Permission badges with icons (Sync, Channels, Plex Home)
◦ Active status indicators with green pulse animation
◦ Hover effects and smooth transitions
◦ Responsive grid layout (1/2/3 columns)

• **invite-cards: Rich invite visualization**
◦ Usage progress bars showing redemption percentage
◦ Status badges (Active, Expired, Exhausted, Inactive)
◦ Library icons and names displayed inline
◦ Copy invite link button with success feedback
◦ Edit and delete actions with confirmation dialogs

### 🔧 Backend Enhancements

• **database: Extended schema for invites**
◦ InviteDB model with SQLite storage
◦ PlexUserDB model with user metadata
◦ Foreign key relationships between invites and users
◦ User expiration field (expires_at) separate from invite expiration
◦ Thumbnail/avatar storage for user profiles
◦ Last seen tracking for user activity

• **plex-integration: PlexAPI utilities**
◦ `invite_plex_friend()` - Invite users as Plex Friends
◦ `invite_plex_home()` - Invite users to Plex Home
◦ `remove_plex_user()` - Remove users from Plex server
◦ `get_plex_libraries()` - Fetch available libraries
◦ `refresh_plex_user()` - Update user info from Plex API
◦ Library access control via library IDs
◦ Permission flags (sync, channels, camera upload)

### 📚 Documentation

• **invites: New invite system documentation**
◦ Complete guide for creating and managing invites
◦ OAuth redemption flow explanation
◦ Library and permission configuration
◦ API endpoint reference
◦ Troubleshooting common issues

• **README: Updated feature list**
◦ Added Plex Invite Management section
◦ User Accounts management description
◦ OAuth flow documentation
◦ Updated technology stack

### 🐛 Bug Fixes

• **user-refresh: Fixed concurrent refresh operations**
◦ Added refreshingUsers state to track in-progress refreshes
◦ Disabled refresh button during operation
◦ Proper loading spinner on individual user refresh

• **event-propagation: Fixed copy button click handling**
◦ Prevented card navigation when copying invite links
◦ Added stopPropagation to copy button clicks
◦ Success feedback with checkmark icon

---

# [2.2.0](https://github.com/cyb3rgh05t/komandorr/compare/v2.1.0...v2.2.0) (2025-11-25)

### 🎨 Traffic Visualization Enhancement

**New Features**

• **dashboard: Circular progress traffic cards**
◦ Complete redesign of traffic visualization with circular progress indicators
◦ Top 5 services by bandwidth displayed with 200px diameter circular progress rings
◦ Percentage calculated using configured MAX_BANDWIDTH (realistic 3 Gbps = 375 MB/s)
◦ Color-coded service cards: pink, violet, cyan, emerald, amber rotation
◦ Removed line charts in favor of cleaner circular progress design
◦ Active indicator: green pulsing dot on top-right of cards
◦ Centered layout using flexbox (flex flex-wrap justify-center gap-8)
◦ Responsive grid fallback for smaller screens

• **traffic: Enhanced bandwidth display box**
◦ Two-row layout showing both real-time speeds AND cumulative data
◦ Row 1: Current speeds (Upload: blue, Download: green, Total: purple)
◦ Row 2: Total transferred (Uploaded: orange, Downloaded: cyan, Combined: amber)
◦ formatBandwidth(): Handles MB/s and KB/s for current speeds
◦ formatData(): Displays GB with automatic TB conversion for values ≥1000 GB
◦ Mono font for consistent number alignment
◦ Border separator between speed and data rows

• **traffic-agent: MAX_BANDWIDTH configuration**
◦ Added MAX_BANDWIDTH = 375.0 (3 Gbps connection = 375 MB/s)
◦ Backend stores max_bandwidth from agent updates
◦ TrafficMetrics model includes max_bandwidth field
◦ Percentage calculation: (serviceBandwidth / max_bandwidth) × 100
◦ Fallback to relative percentages if max_bandwidth not configured
◦ Comment guide: 125 MB/s = 1 Gbps, 1250 MB/s = 10 Gbps, 12.5 MB/s = 100 Mbps

**Bug Fixes**

• **services: Fixed copy button interaction**
◦ Service card copy button now properly stops event propagation
◦ handleCopyClick uses e.preventDefault() and e.stopPropagation()
◦ Prevents card link navigation when copying service ID
◦ Copy feedback shows Check icon for 2 seconds after successful copy

### 📚 Documentation

• **traffic: Updated monitoring documentation**
◦ Documented circular progress visualization approach
◦ Added MAX_BANDWIDTH configuration examples
◦ Bandwidth calculation formulas and percentage logic
◦ Color scheme documentation for service cards

---

# [2.1.0](https://github.com/cyb3rgh05t/komandorr/compare/v2.0.0...v2.1.0) (2025-11-24)

### ⚙️ Configuration Management

**New Features**

• **config: Unified configuration system**
◦ Simplified configuration to two-tier system (environment variables + config.json)
◦ Removed .env file complexity - only HOST, PORT, DEBUG, CORS_ORIGINS needed
◦ All application settings (auth, logging, timezone, API tokens, Plex) managed via config.json
◦ Settings UI provides unified interface for runtime configuration changes
◦ Created comprehensive CONFIGURATION.md documentation
◦ Priority order: config.json > environment variables > hardcoded defaults

• **config: Settings API with Plex integration**
◦ Added /api/settings endpoint with GET/POST operations
◦ Pydantic models for LoggingSettings, GeneralSettings, APISettings, PlexSettings
◦ Moved Plex configuration from database to config.json (server_url, server_token, server_name)
◦ Database now only stores peak_concurrent statistic
◦ Live statistics (movies/shows/users) fetched directly from Plex API
◦ Migration function handles automatic DB → config.json transition

• **config: Enhanced Settings UI**
◦ Unified Settings page with single "Save Settings" button
◦ Sections for Auth, Plex, Logging, General, and API configuration
◦ Added GitHub token and TMDB API key fields for invite redemption flow
◦ Plex validation button to test server connection
◦ All settings load from /api/settings endpoint
◦ Removed separate Plex save - integrated into main settings save

**Bug Fixes**

• **plex: Fixed OAuth redemption flow**
◦ Updated invite_plex_user_oauth to use settings instead of database
◦ Fixed 'PlexStatsDB' object has no attribute 'server_url' errors
◦ Removed all database field references (server_url, server_token, server_name)
◦ Invites endpoints now use settings.PLEX_SERVER_NAME instead of database query
◦ get_plex_stats endpoint loads config from config.json and fetches live stats

• **docker: Cleaned up environment variables**
◦ Removed application settings from docker-compose.yml (LOG_LEVEL, CORS_ORIGINS, etc.)
◦ Kept only essential container params (PGID, PUID, TZ, TERM, HOST, PORT, DEBUG)
◦ CORS moved back to environment variables (deployment-level security setting)
◦ Simplified .env.example to server parameters only with migration comments

### 🎨 UI/UX Improvements

**New Features**

• **monitor: Clickable service cards**
◦ Service cards now link directly to service URLs
◦ Removed separate URL badge - entire card is clickable
◦ Added hover effects: border highlights to theme-primary color
◦ Service name changes color on hover for visual feedback
◦ Maintained target="\_blank" for security

• **dashboard/services/traffic: Consistent hover effects**
◦ Applied clickable card pattern across all pages
◦ DashboardServiceCard, ServiceCard, and Traffic cards now clickable
◦ Unified hover styling: border-theme-primary + shadow-lg
◦ Action buttons preventDefault to avoid navigation conflicts
◦ Consistent user experience across the application

### 🔒 Authentication & Security Improvements

**Bug Fixes**

• **auth: fixed Basic Auth popup with ENABLE_AUTH=false**
◦ Added `HTTPBasic(auto_error=False)` to prevent automatic authentication challenge
◦ Changed credentials parameter to `Optional[HTTPBasicCredentials]` in require_auth dependency
◦ Fixed browser Basic Auth popup appearing on `/api/invites/plex/config` endpoint
◦ Authentication now properly skips when ENABLE_AUTH=false without triggering login prompts
◦ Added proper credential validation check when auth is enabled

• **ui: authentication settings always visible**
◦ Removed conditional rendering of auth settings based on ENABLE_AUTH state
◦ Auth toggle and credentials form now always visible in Settings page
◦ Allows dual-layer security: Authelia/Traefik + optional Komandorr Basic Auth
◦ Dynamic warning message adapts based on auth enabled/disabled state
◦ Users can enable additional security layer on top of external authentication

**Documentation**

• **authelia: reference configuration**
◦ Created complete Authelia configuration file (authelia-config.yml)
◦ Proper access control rule ordering (specific domains before wildcards)
◦ API endpoint bypass rules for /api/_ paths
◦ Public invite page bypass rules for /invite/_, /invites, /redeem
◦ NTP time synchronization configuration
◦ Complete session, regulation, storage, and notifier settings

• **traefik: docker-compose labels**
◦ Updated docker-compose.yml with Traefik routing configuration
◦ Three-router setup: API (priority 100), public invites (priority 90), main app (priority 10)
◦ API routes bypass Authelia for frontend functionality
◦ Public invite redemption pages accessible without authentication
◦ Main application protected by Authelia middleware

---

# [2.0.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.8.0...v2.0.0) (2025-11-23)

### 🎉 Major Release - VOD Invites System

**New Features**

• **invites: Complete VOD invite management system**
◦ New InvitesManager component with full CRUD operations
◦ Create invite codes with customizable settings (usage limits, expiration, permissions)
◦ Copy invite links with one-click feedback toast notifications
◦ Real-time invite statistics: total invites, active invites, total users, active users
◦ Permission control: allow_sync, allow_camera_upload, allow_channels toggles
◦ iOS-style toggle switches for permission settings in create modal
◦ Library selection support (all libraries or specific ones)
◦ 24-hour time format for all timestamps
◦ Permission badges display on invite cards (shows "None" when no permissions set)

• **invites: Backend API endpoints**
◦ POST /api/invites/ - Create new invite with validation
◦ GET /api/invites/ - List all invites with users
◦ GET /api/invites/{invite_id} - Get single invite details
◦ PUT /api/invites/{invite_id} - Update invite settings
◦ DELETE /api/invites/{invite_id} - Delete invite
◦ POST /api/invites/redeem - Redeem invite code and create Plex user
◦ POST /api/invites/validate - Validate invite code before redemption
◦ GET /api/invites/stats - Get aggregate invite statistics
◦ Plex server name integration from PlexStatsDB

• **invites: Database schema**
◦ New `invites` table with code, expiration, usage limits, permissions
◦ New `plex_users` table for tracking invited users
◦ Foreign key relationships between invites and users
◦ Automatic invite code generation (8-character alphanumeric)
◦ Soft delete support with is_active flag

• **ui: Unified stats card styling**
◦ Traffic page style applied to Dashboard and Invites pages
◦ Consistent layout: small icon + label on left, large icon on right
◦ Left-aligned values for better readability
◦ Rounded-lg borders with shadow-sm hover effects
◦ Theme-consistent colors and spacing

• **plex: Server name display**
◦ Fetch Plex server name from /api/plex/stats endpoint
◦ Display real server name (e.g., "StreamNet VOD") on invite cards
◦ Fallback to "Plex Server" if name not available
◦ Automatic server name fetching on component mount

• **navigation: VOD Invites menu item**
◦ New sidebar navigation entry: "VOD Invites"
◦ Accessible at /invites route
◦ Film icon for visual consistency

**Technical Improvements**

• **backend: Enhanced Pydantic models**
◦ Invite, InviteCreate, InviteUpdate, InviteWithUsers models
◦ PlexUser model for user tracking
◦ RedeemInviteRequest and ValidateInviteResponse models
◦ Proper serialization with model_dump() support

• **frontend: Component architecture**
◦ Reusable toast notifications via ToastContext
◦ API service abstraction for invite endpoints
◦ Real-time data fetching and state management
◦ Internationalization ready with i18next integration

• **security: Invite validation**
◦ Expiration checking (date-based)
◦ Usage limit enforcement
◦ Active status validation
◦ Duplicate email prevention

**Bug Fixes**

• Fixed Pydantic model serialization excluding plex_server field
• Fixed console logging showing undefined plex_server values
• Fixed stats card alignment issues across different pages
• Fixed permission badges not showing when no permissions selected
• Fixed JSX syntax errors from duplicate code blocks

---

# [1.8.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.7.0...v1.8.0) (2025-11-21)

### Features

• **ui: modern premium card design**
◦ Complete visual redesign of DashboardServiceCard and ServiceCard components
◦ Gradient backgrounds: from-theme-card via-theme-card to-theme-hover
◦ Enhanced shadows with colored glows on hover (shadow-theme-primary/10)
◦ Rounded-xl corners (12px) for modern aesthetic
◦ Icon glow effects with scale animations on hover
◦ Smooth 300ms transitions throughout

• **ui: redesigned service cards**
◦ Clickable card containers linking directly to service URLs
◦ Removed URL section for cleaner layout
◦ Action buttons (Check, Edit, Delete) moved to header, right-aligned below status badges
◦ All buttons use consistent theming with hover effects
◦ Stats displayed in responsive grid (4 columns with traffic, 2 columns without)
◦ Enhanced typography: bold headings, semibold badges, uppercase labels

• **ui: enhanced status badges**
◦ Gradient backgrounds for status indicators
◦ Shadow colors matching status (green/red/yellow with 20% opacity)
◦ Improved text contrast with -400 color variants
◦ Larger padding and font sizes for better readability

• **ui: modern traffic chart**
◦ Complete redesign of DashboardTrafficChart component
◦ SVG glow filters for chart lines
◦ Grid background pattern with 20px squares
◦ Animated pulse indicators on active services
◦ Card-based legend layout with gradient backgrounds
◦ Info overlay with animated Activity icon
◦ Enhanced color scheme with primary/glow properties

• **ui: improved modal dropdowns**
◦ ServiceModal type dropdown now uses custom styled dropdown
◦ Matches group dropdown theme: bg-theme-card, border-theme, shadow-lg
◦ Selected items highlighted with theme-primary background
◦ Check icon for selected item, hover effects on options
◦ Click outside to close functionality

• **database: Plex configuration migration**
◦ Created PlexStatsDB table with server_url, server_token, server_name, peak_concurrent fields
◦ Migrated Plex config from JSON file to SQLite database
◦ New API endpoints: GET /api/plex/stats, POST /api/plex/stats/peak, POST /api/plex/stats/reset
◦ Migration script (migrate_plex_to_db.py) created for one-time data transfer
◦ Automatic migration on server startup checks for JSON file and migrates to database
◦ Backup created during migration process

• **vod: enhanced peak concurrent tracking**
◦ Peak concurrent counter now persists in database instead of localStorage
◦ Uses React refs to prevent stale closure issues and decreasing values
◦ Functional setState for accurate peak tracking
◦ Database persistence enables multi-user sync and centralized stats

### Changed

• **ui: dynamic stats grid**
◦ Response and Checked boxes take full width (2 columns) when no traffic data
◦ Expands to 4 columns when upload/download traffic values are present
◦ Better use of available space based on data availability

• **ui: card spacing adjustments**
◦ Increased spacing between service name and type/description badges (mb-2 → mb-3)
◦ Better visual hierarchy in card headers

### Fixed

• **dashboard: traffic chart "ALL" tab filtering**
◦ Fixed chart not displaying data on "ALL" tab
◦ Added special case check: if activeTab === "ALL" show all services
◦ Previously tried to match "ALL" as a group name

• **docs: changelog edit link redirect**
◦ Fixed changelog page edit link to point to root CHANGELOG.md
◦ Previously pointed to docs/changelog.md (copy) instead of source file
◦ Added template override in docs/overrides/main.html

# [1.7.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.6.0...v1.7.0) (2025-11-20)

### Features

• **ui: 4-column grid layout**
◦ Service cards now display in 4 columns on large screens (xl:grid-cols-4)
◦ Applied to Dashboard, Services, Monitor, and Traffic pages
◦ Improved information density and screen space utilization

• **ui: compact service cards**
◦ Reduced padding, margins, and font sizes across all service cards
◦ ServiceCard: p-6→p-4, text-lg→text-base, optimized spacing
◦ Traffic cards: p-6→p-4, stats padding p-3→p-2, text-xl→text-base
◦ More services visible on screen with less scrolling

• **ui: problem badges on service cards**
◦ Added "Slow" badge to services with response_time > 1000ms
◦ Yellow warning badge displays on Dashboard, Services, and Monitor pages
◦ Visual indicator for performance issues alongside status badges

• **monitoring: average response time card**
◦ Added cumulative average response time stat card to Monitor page
◦ Displays aggregated response time across all services
◦ Blue color scheme with Zap icon, consistent with Dashboard

• **navigation: clickable stats cards**
◦ Dashboard stats cards now navigate to relevant pages on click
◦ Upload/Download/Total Transfer → Traffic page
◦ Avg Response/Active (5min) → Monitor page  
◦ VOD Streams → VOD Monitor page
◦ All cards have cursor-pointer for better UX

• **i18n: updated navigation labels**
◦ "Services" → "Servers"
◦ "Monitor" → "Response Monitor"
◦ "Traffic" → "Traffic Monitor"
◦ "VOD Streams" → "VOD Monitor"
◦ Updated in both English and German translations

### Changed

• **ui: download color scheme**
◦ Changed download traffic color from indigo to green
◦ Upload remains blue for better visual distinction
◦ Applied across Dashboard total transfer card

• **settings: removed duplicate controls**
◦ Removed theme and language settings from Settings page
◦ Settings now accessible only via navbar dropdowns
◦ Cleaner settings page focused on core configuration

### Fixed

• **dashboard: problem card filtering**
◦ Fixed problem filter to correctly check response_time > 1000ms
◦ Previously only checked status === "problem"
◦ Now properly filters services with slow response times

• **traffic: tab filtering**
◦ Added "ALL" tab to Traffic, Monitor, Services, and Dashboard
◦ Fixed tab filtering to actually filter services by selected tab
◦ Tab counts now accurate and filtering works as expected

• **services: missing variable errors**
◦ Fixed groupedServices undefined error in Services.jsx
◦ Added missing servicesInActiveGroup calculation in Traffic.jsx
◦ Resolved all console errors related to undefined variables

# [1.6.0](https://github.com/cyb3rgh05t/komandorr/compare/v1.5.8...v1.6.0) (2025-11-14)

### Features

• **backend: SQLite database storage**
◦ Migrated from JSON file storage to SQLite database for better scalability
◦ Implemented SQLAlchemy ORM with three tables: services, response_history, traffic_history
◦ Automatic database initialization on first run
◦ Stores up to 1000 historical data points per service (vs 100 in memory)
◦ Single database file: `backend/data/komandorr.db`

• **migration: automatic JSON to SQLite import**
◦ Created migration script `migrate_to_sqlite.py` to import existing services
◦ Preserves all service data including status, history, and traffic metrics
◦ Automatically backs up original JSON file as `.json.backup`
◦ Smooth upgrade path for existing installations

• **database: efficient history management**
◦ Keeps last 100 data points in memory for fast API responses
◦ Stores up to 1000 points in database for long-term history
◦ Automatic cleanup of old data points to prevent database bloat
◦ Timezone-aware datetime handling with naive UTC storage

### Changed

• **storage: replaced JSON with SQLite**
◦ Services no longer stored in `services.json` file
◦ All service data now persisted in `komandorr.db` database
◦ Improved query performance for historical data
◦ Better concurrent access handling

• **dependencies: added SQLAlchemy**
◦ Added `sqlalchemy>=2.0.0` to requirements.txt
◦ Updated documentation with SQLite information
◦ Added database schema documentation

• **docs: updated for SQLite**
◦ README now mentions SQLite storage location
◦ Added migration instructions for existing JSON users
◦ Updated configuration guide with database details
◦ Added database schema explanation

### Fixed

• **type checking: SQLAlchemy ORM type hints**
◦ Added `# type: ignore` comments for SQLAlchemy ORM operations
◦ Updated pyrightconfig.json to suppress false positive type errors
◦ Resolved Pylance warnings about Column type assignments

# [1.5.8](https://github.com/cyb3rgh05t/komandorr/compare/v1.5.7...v1.5.8) (2025-11-13)

### Features

• **ui: clickable stats card filters**
◦ Stats cards now act as filter buttons on Dashboard, Services, and Monitor pages
◦ Click Total/Online/Offline/Problem cards to filter services by status
◦ Active filters show colored borders (green/red/yellow) without shadow effects
◦ All three pages have consistent filtering behavior

• **ui: improved empty states**
◦ Added contextual empty state messages when filtering shows no results
◦ Different icons per state: 🟢 for no online services, ✓ for no offline/problem
◦ Themed messages using theme-primary color for better visibility
◦ Clear, reassuring messages like "All services are operational!"

• **ui: redesigned stats cards**
◦ Compact horizontal layout with labels and numbers side-by-side
◦ Large SVG icons on the right side of each card
◦ Uppercase labels with wider tracking for better readability
◦ Fully theme-aware design that adapts to light/dark modes
◦ Hover effects with shadow transitions

• **docs: bootswatch slate theme**
◦ Switched from MkDocs Material to mkdocs-bootswatch slate theme
◦ Dark theme with Bootstrap 4 styling
◦ Updated GitHub Actions workflow to use new theme
◦ Modern, clean design with better readability

### Changed

• **ui: stats cards are now interactive buttons**
◦ Converted static stats displays to clickable filter controls
◦ Reduced gap spacing for more compact layout (gap-4)
◦ Removed hover scale effects in favor of cleaner interactions

• **docs: theme dependencies**
◦ Replaced mkdocs-material with mkdocs-bootswatch in requirements
◦ Updated docs deployment workflow with new theme package

# [1.5.7](https://github.com/cyb3rgh05t/komandorr/compare/v1.5.6...v1.5.7) (2025-11-13)

### Features

• **logging: enhanced logging system with colorama**
◦ Implemented cross-platform colored console output using colorama library
◦ Added beautiful color-coded log levels (DEBUG=cyan, INFO=green, WARNING=yellow, ERROR=red, CRITICAL=magenta)
◦ Colored log messages that match their severity level for better readability
◦ Separate formatters for console (colored) and file (plain text) output
◦ Enhanced file logging with detailed timestamps and optional module/function/line tracking
◦ New logger.exception() method for automatic traceback logging
◦ New logger.set_level() method for dynamic log level changes at runtime
◦ Auto-delete log file on restart for fresh logging sessions

• **configuration: extensive logging customization**
◦ Added LOG_TO_FILE setting to enable/disable file logging (default: true)
◦ Added LOG_SHOW_TIMESTAMP setting for console timestamps (default: false)
◦ Added LOG_FILE_INCLUDE_LOCATION setting for module/function info in files (default: true)
◦ Improved Settings model to include all new logging configuration options
◦ Logger now reads from Pydantic Settings instead of raw environment variables
◦ Updated .env.example with comprehensive logging documentation

• **traffic-agent: enhanced output formatting**
◦ Created AgentLogger class with colored output for traffic monitoring agent
◦ Replaced all print statements with proper logging methods
◦ Color-coded traffic statistics and error messages
◦ Better visual separation with styled headers and separators

• **documentation: comprehensive logging guides**
◦ Created docs/configuration/logging.md with full logging documentation
◦ Added demo_logger.py script for interactive logging demonstrations
◦ Created LOGGER_IMPROVEMENTS.md with migration guide and examples
◦ Created .env.logging.example with configuration templates
◦ Documentation covers all log levels, configuration options, and best practices

### Changed

• **dependencies: added colorama**
◦ Added colorama>=0.4.6 to backend/requirements.txt
◦ Added colorama>=0.4.6 to traffic/requirements.txt
◦ Cross-platform colored terminal support for Windows, macOS, and Linux

• **logging: improved uvicorn integration**
◦ Updated UvicornFormatter to use colorama instead of ANSI codes
◦ Consistent color scheme between application and server logs
◦ Better startup messages with styled output

• **backend: configuration enhancements**
◦ Settings class now includes LOG_TO_FILE, LOG_SHOW_TIMESTAMP, LOG_FILE_INCLUDE_LOCATION
◦ Logger singleton pattern ensures consistent configuration across application
◦ Backward compatible with existing logging code (100% compatibility)

### Technical Details

• **architecture: enhanced logger class**
◦ ColoredConsoleFormatter class for terminal output with colorama
◦ DetailedFileFormatter class for structured file logging
◦ Singleton pattern prevents duplicate logger instances
◦ Timezone-aware timestamps using ZoneInfo
◦ UTF-8 encoding support for international characters
◦ Automatic log directory creation
◦ Graceful degradation to console-only if file logging fails

• **benefits**
◦ Easier debugging with color-coded severity levels
◦ Professional-looking console output
◦ Detailed file logs for troubleshooting and auditing
◦ Highly configurable without code changes
◦ Cross-platform consistency
◦ Zero breaking changes - fully backward compatible

# [1.5.6](https://github.com/cyb3rgh05t/komandorr/compare/v1.5.5...v1.5.6) (2025-11-10)

### Features

• **assets: upgraded logo and favicon to SVG format**
◦ Replaced PNG logo and favicon files with scalable SVG versions
◦ Updated all frontend components to use SVG logo (/logo.svg)
◦ Updated frontend HTML to use SVG favicon with proper MIME type (image/svg+xml)
◦ Updated backend API documentation favicon reference to SVG
◦ Updated MkDocs configuration to use SVG assets for documentation
◦ Updated main README.md to reference SVG logo
◦ Updated documentation index.md to use SVG logo
◦ Copied SVG assets to all necessary directories (backend/icons/, docs/images/)

### Changed

• **quality: improved visual assets**
◦ SVG format provides better scalability and quality at all sizes
◦ Smaller file sizes compared to PNG equivalents
◦ Vector graphics eliminate pixelation on high-DPI displays
◦ Future-proof format compatible with all modern browsers
◦ Maintained PNG versions as legacy backups

• **documentation: updated asset references**
◦ Updated docs/images/README.md to reflect both SVG and PNG versions
◦ Updated docs/README.md structure documentation
◦ All documentation now uses superior SVG format

# [1.5.5](https://github.com/cyb3rgh05t/komandorr/compare/v1.5.1...v1.5.5) (2025-11-09)

### Features

• **ui: comprehensive mobile responsiveness**
◦ Optimized all pages for mobile devices with responsive layouts
◦ Reduced padding and spacing on small screens (px-3 sm:px-4, py-4 sm:py-6)
◦ Improved button layouts with proper flex wrapping and mobile-first sizing
◦ Smaller text sizes on mobile (text-xs sm:text-sm, text-2xl sm:text-3xl)
◦ Smaller icon sizes on mobile (size={16} to size={18})
◦ Full-width buttons on mobile that adapt to inline on larger screens
◦ Responsive search inputs with proper mobile sizing
◦ Updated all main pages: Dashboard, Services, Monitor, Traffic, VOD Streams
◦ Updated Settings and About pages with mobile-optimized headers
◦ TopNavbar padding reduced for mobile (px-3 sm:px-6)
◦ Layout properly handles mobile width constraints

• **ux: improved mobile interactions**
◦ Buttons now use justify-center for better mobile alignment
◦ Action buttons expand to full width on mobile, inline on desktop
◦ Better touch targets with appropriate padding on mobile
◦ Responsive gap spacing (gap-2 sm:gap-3, gap-3 sm:gap-4)
◦ Proper text truncation on small screens
◦ Flexible button groups that wrap on mobile

### Changed

• **layout: mobile-first approach**
◦ All pages now use responsive spacing utilities
◦ Consistent mobile breakpoint usage across all components
◦ Better utilization of screen real estate on mobile devices
◦ Improved readability with appropriate font scaling

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
