# Docker Setup

Complete guide for deploying Komandorr with Docker.

## Quick Start with Docker Compose

```bash
git clone https://github.com/cyb3rgh05t/komandorr.git
cd komandorr
docker-compose up -d
```

Visit http://localhost:3000

## Docker Run

```bash
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

## Configuration

See [Configuration Guide](configuration.md) for environment variables and settings.

## Volumes

- `/app/backend/data` - Service and configuration data
- `/app/backend/logs` - Application logs

## Ports

- `3000` - Frontend (Nginx)
- `8000` - Backend API (FastAPI)

## Updates

```bash
docker-compose pull
docker-compose up -d
```
