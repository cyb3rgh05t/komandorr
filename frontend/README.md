# Komandorr Dashboard - Frontend

React frontend for the Komandorr Dashboard application.

## Version

**v2.4.1** - December 2025

## Features

### 🎨 User Interface

- Modern React application with Vite
- 11 beautiful themes (Dark, Plex, Jellyfin, Emby, Mind Stone, Power Stone, Reality Stone, Soul Stone, Space Stone, Time Stone, Seerr)
- Responsive layout with Sidebar and TopNavbar (like Sonarr/Radarr)
- Multi-language support (English & German)
- Carousel navigation for traffic monitoring
- Multi-badge status system for invites
- Real-time status updates with optimized caching
- Tailwind CSS for styling
- Lucide React icons

### 📊 Dashboard Pages

- **Dashboard**: Service status monitoring, traffic analytics, release information
- **Plex Activity**: VOD streaming statistics and bandwidth monitoring
- **Invites**: Complete Plex invite management system with OAuth redemption
- **Plex User Accounts**: User management with expiration tracking and removal
- **Plex User Stats**: Detailed watch history and viewing analytics per user
- **Settings**: Comprehensive configuration for services, Plex, and traffic monitoring
- **About**: Application information, version details, and API documentation link

### 🎯 Invites Management

- Create and manage invite codes with usage limits
- Multi-status badge system (Active, Redeemed, Expired, Used Up, Disabled)
- Filter tabs: All, Active, Redeemed, Expired, Used Up, Disabled
- Real-time search and filtering
- OAuth redemption flow for seamless user onboarding
- Re-invitation support for previously removed users
- Automatic cleanup of orphaned invites
- User tracking with profile pictures and metadata

### 📈 Analytics & Monitoring

- Traffic monitoring with carousel pagination
- Top bandwidth consumers visualization
- Watch history tracking per user
- Content type filtering (Movies, TV, Music)
- Time period filtering (All Time, Today, This Week, This Month)
- Real-time data refresh with TanStack Query

### 🌐 Internationalization

- Full English translation
- Full German translation
- Language switcher in navbar
- Automatic browser language detection

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable components
│   ├── layout/      # Layout components (Sidebar, TopNavbar)
│   ├── ServiceCard.jsx
│   └── ServiceModal.jsx
├── context/         # React contexts
│   └── ThemeContext.jsx
├── locales/         # i18n translations
│   ├── en.json
│   └── de.json
├── pages/           # Page components
│   ├── Dashboard.jsx
│   └── Settings.jsx
├── services/        # API services
│   └── api.js
├── utils/           # Utility functions
│   └── dateUtils.js
├── App.jsx
├── main.jsx
├── i18n.js
└── index.css        # Global styles with theme variables
```

## Available Themes

- Dark (default)
- Plex
- Jellyfin
- Emby
- Mind Stone
- Power Stone
- Reality Stone
- Soul Stone
- Space Stone
- Time Stone
- Seerr

## Technologies

- React 18
- Vite 5
- React Router DOM
- Tailwind CSS
- PostCSS
- i18next (internationalization)
- Lucide React (icons)
- React Hot Toast (notifications)
