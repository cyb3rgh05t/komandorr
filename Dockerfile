FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# ---- Final runtime image ----
FROM python:3.11-slim

WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create necessary directories with proper permissions
RUN mkdir -p logs data && \
    chown -R 1000:1000 /app && \
    chmod -R 755 /app

# Install gosu for user switching
RUN apt-get update && \
    apt-get install -y gosu && \
    rm -rf /var/lib/apt/lists/*

# Create startup script that runs as root first to fix permissions, then drops to user 1000
COPY <<'EOF' /app/start.sh
#!/bin/bash
set -e

# Fix permissions for mounted volumes (runs as root before user switch)
mkdir -p /app/logs /app/data
chown -R 1000:1000 /app/logs /app/data 2>/dev/null || true
chmod -R 755 /app/logs /app/data 2>/dev/null || true

# Use APP_PORT environment variable, or default to 8000
INTERNAL_PORT=${APP_PORT:-8000}

echo "Starting Komandorr Web UI on port ${INTERNAL_PORT}..."

# Switch to user 1000 and run the application
exec gosu 1000:1000 python -m uvicorn app.main:app --host 0.0.0.0 --port ${INTERNAL_PORT}
EOF

RUN chmod +x /app/start.sh

# Expose port
EXPOSE 8000

ENTRYPOINT ["/app/start.sh"]

# Labels
LABEL org.opencontainers.image.source="https://github.com/cyb3rgh05t/komandorr"
LABEL org.opencontainers.image.description="Komandorr - Service monitoring dashboard"
LABEL org.opencontainers.image.licenses="MIT"

