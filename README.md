<div align="center">
  <img src="frontend/public/logo.svg" alt="Komandorr Logo" width="400"/>

A modern WebUI dashboard for monitoring apps, websites, panels, and projects for their Online/Offline/Problem status.

</div>

## Features

- **Backend**: Python FastAPI with service monitoring and logger system
- **Frontend**: React with Vite, TailwindCSS, and Lucide React Icons
- **11 Themes**: Dark, Plex, Jellyfin, Emby, Mind/Power/Reality/Soul/Space/Time Stones, Seerr
- **Multi-Language**: English (default) and German
- **Responsive**: Sidebar and TopNavbar layout (like Sonarr/Radarr)
- **Real-time Monitoring**: Automatic service monitoring

## Project Structure

```
komandorr/
├── backend/          # Python FastAPI Backend
│   ├── app/
│   │   ├── api/     # API Routes
│   │   ├── models/  # Pydantic Models
│   │   ├── services/# Service Monitor
│   │   ├── utils/   # Logger & Utilities
│   │   ├── config.py
│   │   └── main.py
│   ├── requirements.txt
│   └── run.py
├── frontend/         # React Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── locales/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Installation & Setup

### Automatic Setup (Recommended)

Run the setup script to install all dependencies:

```powershell
.\setup.ps1
```

The script installs:

- Backend: Python Virtual Environment + Dependencies
- Frontend: Node.js Dependencies
- Creates .env file and logs directory

### Starting the Application

**Option 1: With Start Scripts**

Terminal 1 - Backend:

```powershell
.\start-backend.ps1
```

Terminal 2 - Frontend:

```powershell
.\start-frontend.ps1
```

**Option 2: Manually**

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
python run.py
```

Backend runs on: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

## Usage

1. Start the backend
2. Start the frontend
3. Open the dashboard at `http://localhost:3000`
4. Add services via the "Add Service" button
5. Customize theme and language in the settings

## Authentication

Komandorr supports Basic Authentication to protect the dashboard.

### Enable Authentication

Create a `.env` file in the `backend` directory:

```env
ENABLE_AUTH=true
AUTH_USERNAME=dein_benutzername
AUTH_PASSWORD=dein_passwort
```

### Timezone Configuration

Komandorr uses UTC by default for all timestamps. You can customize the timezone in the `.env` file:

```env
TIMEZONE=Europe/Berlin
# Or other valid timezones:
# TIMEZONE=America/New_York
# TIMEZONE=Asia/Tokyo
# TIMEZONE=Europe/London
```

**Note**: The configured timezone is used for:

- Backend logging
- Display in the About tab of the UI

See the full list of valid timezones: [Wikipedia - TZ database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### Default Credentials (when enabled)

- **Username**: admin
- **Password**: admin

**⚠️ IMPORTANT**: Change the default credentials in production!

### Managing Authentication

After logging in, you can:

1. **Logout**: Click on the user icon in the top navigation bar and select "Logout"
2. **Open Settings**: Via the user menu or directly under Settings
3. **Enable/Disable Authentication**: In the settings under "Authentication Settings"
4. **Change Credentials**: Update username and password in the settings

**Note**: When enabling authentication, you will be automatically redirected to the login page.

### Disable Authentication

Set in the `.env` file:

```env
ENABLE_AUTH=false
```

Or disable it directly in the settings (when logged in).

## Themes

- **Dark** (Default): Dark theme with gray tones
- **Plex**: Orange Plex theme
- **Jellyfin**: Purple Jellyfin theme
- **Emby**: Green Emby theme
- **Mind Stone**: Yellow theme
- **Power Stone**: Magenta/Purple theme
- **Reality Stone**: Red theme
- **Soul Stone**: Orange theme
- **Space Stone**: Blue theme
- **Time Stone**: Green theme
- **Seerr**: Indigo theme

## Languages

- English (en) - Default
- German (de)

## Technologies

### Backend

- FastAPI
- Uvicorn
- Pydantic
- HTTPX
- Python-dotenv

### Frontend

- React 18
- Vite 5
- TailwindCSS
- React Router DOM
- i18next
- Lucide React
- React Hot Toast

## Lizenz

MIT
