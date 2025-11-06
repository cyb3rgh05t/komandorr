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
RUN mkdir -p logs data

# Create startup script
COPY <<'EOF' /app/start.sh
#!/bin/bash
set -e

# Ensure directories exist
mkdir -p /app/logs /app/data

# Use APP_PORT environment variable, or default to 8000
INTERNAL_PORT=${APP_PORT:-8000}

echo "Starting Komandorr Web UI on port ${INTERNAL_PORT}..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${INTERNAL_PORT}
EOF

RUN chmod +x /app/start.sh

# Expose port
EXPOSE 8000

ENTRYPOINT ["/app/start.sh"]

# Labels
LABEL org.opencontainers.image.source="https://github.com/cyb3rgh05t/komandorr"
LABEL org.opencontainers.image.description="Komandorr - Service monitoring dashboard"
LABEL org.opencontainers.image.licenses="MIT"

