# Komandorr Dashboard - Frontend

React frontend for the Komandorr Dashboard application.

## Features

- Modern React application with Vite
- 11 beautiful themes (Dark, Plex, Jellyfin, Emby, Mind Stone, Power Stone, Reality Stone, Soul Stone, Space Stone, Time Stone, Seerr)
- Responsive layout with Sidebar and TopNavbar (like Sonarr/Radarr)
- Multi-language support (English & German)
- Service monitoring dashboard
- Real-time status updates
- Tailwind CSS for styling
- Lucide React icons

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
