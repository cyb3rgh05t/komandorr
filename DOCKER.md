# Docker Deployment Guide

This guide explains how to run Komandorr using Docker and Docker Compose.

Komandorr runs as a **single container** with both the frontend (React) and backend (FastAPI) served by FastAPI.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (optional, but recommended)

## Quick Start

### Local Development

For local development with live code reloading:

```bash
# Build the frontend first
cd frontend
npm install
npm run build
cd ..

# Start development environment with Redis
docker-compose -f docker-compose.dev.yml up -d

# Access the application
# - Web UI & API: http://localhost:8010
# - API Documentation: http://localhost:8010/docs
# - Redis: localhost:6379

# View logs
docker-compose -f docker-compose.dev.yml logs -f komandorr

# Stop
docker-compose -f docker-compose.dev.yml down
```

**Features:**

- Backend auto-reload on code changes (uvicorn --reload)
- Redis cache for development testing
- Debug logging enabled
- Local volume mounts for data persistence
- Custom ports to avoid conflicts

### Using Docker Compose (Production/Testing)

1. **Start the application:**

   ```bash
   docker-compose up -d
   ```

2. **Access the application:**

   - Web UI & API: <http://localhost:8000>
   - API Documentation: <http://localhost:8000/docs>

3. **View logs:**

   ```bash
   docker-compose logs -f
   ```

4. **Stop the application:**

   ```bash
   docker-compose down
   ```

5. **Rebuild after code changes:**

   ```bash
   docker-compose up -d --build
   ```

### Using Docker Only

1. **Build the image:**

   ```bash
   docker build -t komandorr .
   ```

2. **Run the container:**

   ```bash
   docker run -d \
     --name komandorr \
     -p 8000:8000 \
     -v $(pwd)/backend/data:/app/data \
     -v $(pwd)/backend/logs:/app/logs \
     -e ENABLE_AUTH=false \
     komandorr
   ```

3. **Access at:** <http://localhost:8000>

## Configuration

### Environment Variables

Edit the `docker-compose.yml` file to customize settings:

- `PORT`: Backend port (default: 8000)
- `DEBUG`: Enable debug mode (default: false)
- `LOG_LEVEL`: Logging level (default: INFO)
- `CORS_ORIGINS`: Allowed CORS origins
- `ENABLE_AUTH`: Enable basic authentication (default: false)
- `AUTH_USERNAME`: Admin username (default: admin)
- `AUTH_PASSWORD`: Admin password (default: admin)
- `TIMEZONE`: Server timezone (default: UTC)
- `GITHUB_TOKEN`: Optional GitHub token for higher API rate limits

### Custom Ports

To change the port, edit `docker-compose.yml`:

```yaml
services:
  komandorr:
    ports:
      - "9000:8000" # Access UI at http://localhost:9000
```

## Data Persistence

Service configurations and logs are persisted in volumes:

- `./backend/data` - Service configurations (services.json)
- `./backend/logs` - Application logs

These directories are mounted as volumes and persist between container restarts.

## Architecture

The container includes:

- **FastAPI** (port 8000) - Serves both the API and static frontend files
- Built frontend files are served directly by FastAPI
- `/api/*` routes go to the backend API
- All other routes serve the React frontend

## Production Deployment

For production, consider:

1. **Enable authentication:**

   ```yaml
   environment:
     - ENABLE_AUTH=true
     - AUTH_USERNAME=your_username
     - AUTH_PASSWORD=strong_password_here
   ```

2. **Use environment file:**
   Create a `.env` file:

   ```env
   BACKEND_PORT=8000
   FRONTEND_PORT=80
   ENABLE_AUTH=true
   AUTH_USERNAME=admin
   AUTH_PASSWORD=your_secure_password
   ```

   Update `docker-compose.yml`:

   ```yaml
   services:
     backend:
       env_file: .env
   ```

3. **Use a reverse proxy (nginx/traefik) with SSL**

4. **Adjust CORS origins** to match your domain

## Troubleshooting

### Check container status

```bash
docker-compose ps
```

### Check container health

```bash
docker inspect komandorr | grep -A 10 Health
```

### Restart the container

```bash
docker-compose restart
```

### Remove all data and start fresh

```bash
docker-compose down
rm -rf backend/data/* backend/logs/*
docker-compose up -d
```

### View real-time resource usage

```bash
docker stats komandorr
```

### Access container shell

```bash
docker exec -it komandorr bash
```

## Updating

1. Pull latest code
2. Rebuild container:

   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## Technical Details

- Frontend is built during Docker image creation
- FastAPI serves static files from `/app/frontend/dist`
- Single process handles both API requests and frontend delivery
- No reverse proxy needed - FastAPI handles everything
