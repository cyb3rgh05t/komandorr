# Installation

Learn how to install Komandorr using your preferred method.

## Docker Installation

!!! tip "Recommended Method"
Docker is the recommended installation method for most users.

### Using Docker Run

```bash
docker run -d \
  --name komandorr \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e PLEX_URL=http://your-plex-server:32400 \
  -e PLEX_TOKEN=your-plex-token \
  cyb3rgh05t/komandorr:latest
```

### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: "3.8"

services:
  komandorr:
    image: cyb3rgh05t/komandorr:latest
    container_name: komandorr
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - PLEX_URL=http://your-plex-server:32400
      - PLEX_TOKEN=your-plex-token
      - CHECK_INTERVAL=60
    restart: unless-stopped
```

Start the container:

```bash
docker-compose up -d
```

## Manual Installation

### Backend Setup

1. Clone the repository:

```bash
git clone https://github.com/cyb3rgh05t/komandorr.git
cd komandorr
```

2. Install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

3. Start the backend:

```bash
python run.py
```

### Frontend Setup

1. Install Node.js dependencies:

```bash
cd frontend
npm install
```

2. Build the frontend:

```bash
npm run build
```

3. Start the development server:

```bash
npm run dev
```

## Verification

After installation, verify Komandorr is running:

1. Open your browser to `http://localhost:3000`
2. You should see the Komandorr login screen
3. Default credentials: `admin` / `admin` (change immediately!)

## Next Steps

- [Configure your services](configuration.md)
- [Set up Plex integration](../configuration/plex.md)
- [Configure environment variables](../configuration/environment.md)
