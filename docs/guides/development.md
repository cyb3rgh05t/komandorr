# Development Guide

Set up Komandorr for local development.

## Prerequisites

- Python 3.9+
- Node.js 18+
- Git

## Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python run.py
```

Backend runs on http://localhost:8000

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Development Workflow

1. Make changes to code
2. Test locally
3. Run tests (if available)
4. Commit with descriptive message
5. Push to GitHub

## Code Structure

```
backend/
├── app/
│   ├── api/          # API endpoints
│   ├── models/       # Data models
│   ├── services/     # Business logic
│   ├── middleware/   # Middleware
│   └── utils/        # Utilities
└── data/             # Data storage

frontend/
├── src/
│   ├── components/   # React components
│   ├── pages/        # Page components
│   ├── services/     # API services
│   ├── context/      # React context
│   └── locales/      # Translations
```

## Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## Building for Production

```bash
# Frontend build
cd frontend
npm run build

# Docker build
docker-compose build
```

## Contributing

See [Contributing Guide](contributing.md) for contribution guidelines.
