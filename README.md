# Komandorr Dashboard

Ein modernes WebUI Dashboard zum Überwachen von Apps, Webseiten, Panels und Projekten auf ihren Online/Offline/Problem-Status.

## Features

- **Backend**: Python FastAPI mit Service-Monitoring und Logger-System
- **Frontend**: React mit Vite, TailwindCSS und Lucide React Icons
- **11 Themes**: Dark, Plex, Jellyfin, Emby, Mind/Power/Reality/Soul/Space/Time Stones, Seerr
- **Multi-Language**: Englisch (Standard) und Deutsch
- **Responsive**: Sidebar und TopNavbar Layout (wie Sonarr/Radarr)
- **Real-time Monitoring**: Automatische Service-Überwachung

## Projekt-Struktur

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

## Installation & Start

### Automatisches Setup (Empfohlen)

Führe das Setup-Script aus, um alle Dependencies zu installieren:

```powershell
.\setup.ps1
```

Das Script installiert:

- Backend: Python Virtual Environment + Dependencies
- Frontend: Node.js Dependencies
- Erstellt .env Datei und Logs-Verzeichnis

### Anwendung starten

**Option 1: Mit Start-Scripts**

Terminal 1 - Backend:

```powershell
.\start-backend.ps1
```

Terminal 2 - Frontend:

```powershell
.\start-frontend.ps1
```

**Option 2: Manuell**

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
python run.py
```

Backend läuft auf: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend läuft auf: `http://localhost:3000`

## Verwendung

1. Backend starten
2. Frontend starten
3. Dashboard unter `http://localhost:3000` öffnen
4. Services hinzufügen über den "Add Service" Button
5. Theme und Sprache in den Einstellungen anpassen

## Authentication

Komandorr unterstützt Basic Authentication zum Schutz des Dashboards.

### Authentication aktivieren

Erstelle eine `.env` Datei im `backend` Verzeichnis:

```env
ENABLE_AUTH=true
AUTH_USERNAME=dein_benutzername
AUTH_PASSWORD=dein_passwort
```

### Timezone Konfiguration

Komandorr verwendet standardmäßig UTC für alle Zeitstempel. Du kannst die Zeitzone in der `.env` Datei anpassen:

```env
TIMEZONE=Europe/Berlin
# Oder andere gültige Zeitzonen:
# TIMEZONE=America/New_York
# TIMEZONE=Asia/Tokyo
# TIMEZONE=Europe/London
```

**Hinweis**: Die konfigurierte Zeitzone wird für:

- Backend-Logging verwendet
- Im About-Tab der UI angezeigt

Siehe die vollständige Liste gültiger Zeitzonen: [Wikipedia - TZ database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### Standard-Credentials (wenn aktiviert)

- **Username**: admin
- **Password**: admin

**⚠️ WICHTIG**: Ändere die Standard-Credentials in der Produktion!

### Authentication verwalten

Nach der Anmeldung kannst du:

1. **Logout**: Klicke auf das Benutzer-Symbol in der oberen Navigationsleiste und wähle "Logout"
2. **Einstellungen öffnen**: Über das Benutzer-Menü oder direkt unter Settings
3. **Authentication ein/ausschalten**: In den Einstellungen unter "Authentication Settings"
4. **Credentials ändern**: Benutzername und Passwort in den Einstellungen aktualisieren

**Hinweis**: Beim Aktivieren der Authentication wirst du automatisch zur Login-Seite weitergeleitet.

### Authentication deaktivieren

Setze in der `.env` Datei:

```env
ENABLE_AUTH=false
```

Oder deaktiviere es direkt in den Einstellungen (wenn angemeldet).

## Themes

- **Dark** (Default): Dunkles Theme mit Grautönen
- **Plex**: Orangefarbenes Plex-Theme
- **Jellyfin**: Lila Jellyfin-Theme
- **Emby**: Grünes Emby-Theme
- **Mind Stone**: Gelbes Theme
- **Power Stone**: Magenta/Lila Theme
- **Reality Stone**: Rotes Theme
- **Soul Stone**: Orange Theme
- **Space Stone**: Blaues Theme
- **Time Stone**: Grünes Theme
- **Seerr**: Indigo Theme

## Sprachen

- English (en) - Standard
- Deutsch (de)

## Technologien

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
