# Docker Deployment

Complete guide for deploying Komandorr with Docker.

## Docker Compose

```yaml
version: "3.8"
services:
  komandorr:
    image: cyb3rgh05t/komandorr:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
```

See [Installation](../getting-started/installation.md) for full guide.
