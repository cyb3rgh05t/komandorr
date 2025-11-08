# Installation

This guide will help you install Komandorr using different methods.

## Prerequisites

Before installing Komandorr, ensure you have one of the following:

=== "Docker (Recommended)" - Docker Engine 20.10+ - Docker Compose 2.0+

=== "Manual Installation" - Python 3.9+ - Node.js 18+ - npm or yarn

## Installation Methods

### Docker Compose (Recommended)

The easiest way to run Komandorr is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/cyb3rgh05t/komandorr.git
cd komandorr

# Start the services
docker-compose up -d
```

The application will be available at:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

### Docker Run

If you prefer using Docker without Compose:

```bash
# Pull the image
docker pull ghcr.io/cyb3rgh05t/komandorr:latest

# Run the container
docker run -d \
  --name komandorr \
  -p 3000:80 \
  -p 8000:8000 \
  -v $(pwd)/backend/data:/app/backend/data \
  -v $(pwd)/backend/logs:/app/backend/logs \
  -e ENABLE_AUTH=false \
  -e TIMEZONE=Europe/Berlin \
  ghcr.io/cyb3rgh05t/komandorr:latest
```

### Manual Installation

For development or custom setups:

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend
python run.py
```

The backend API will start on `http://localhost:8000`.

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:5173` (Vite default).

For production build:

```bash
npm run build
npm run preview
```

## Verify Installation

After installation, verify everything is working:

1. **Check Frontend**: Open `http://localhost:3000` in your browser
2. **Check Backend**: Visit `http://localhost:8000/api/health`
3. **Check API Docs**: Navigate to `http://localhost:8000/docs`

You should see:

- ✅ Frontend loads with the dashboard
- ✅ Backend health check returns `{"status": "healthy"}`
- ✅ Swagger UI documentation displays

## Post-Installation

After successful installation:

1. **Configure Services**: Add your first service to monitor
2. **Set Up Plex** (optional): Configure Plex server for VOD monitoring
3. **Configure Traffic** (optional): Set up traffic monitoring agent
4. **Enable Authentication** (optional): Secure your dashboard

[Configuration Guide](configuration.md){ .md-button .md-button--primary }

## Troubleshooting

### Port Already in Use

If ports 3000 or 8000 are already in use, modify the `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "3001:80" # Change 3000 to 3001
  backend:
    ports:
      - "8001:8000" # Change 8000 to 8001
```

### Permission Issues

If you encounter permission issues with Docker volumes:

```bash
# Create directories with proper permissions
mkdir -p backend/data backend/logs
chmod 755 backend/data backend/logs
```

### Python Version Issues

Komandorr requires Python 3.9+. Check your version:

```bash
python --version
```

If needed, use a specific Python version:

```bash
python3.9 -m venv venv
```

## Next Steps

- [Quick Start Guide](quickstart.md)
- [Configuration](configuration.md)
- [Docker Setup Details](docker.md)
