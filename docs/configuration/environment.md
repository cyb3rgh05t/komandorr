# Environment Variables

Complete reference for all environment variables.

## Core Settings

### ENABLE_AUTH
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable/disable authentication

### TIMEZONE
- **Type**: String
- **Default**: `UTC`
- **Description**: Application timezone

### DEBUG
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable debug logging

## Authentication

### AUTH_USERNAME
- **Type**: String
- **Default**: `admin`
- **Description**: Authentication username

### AUTH_PASSWORD
- **Type**: String
- **Default**: `admin`
- **Description**: Authentication password

## Backend

### HOST
- **Type**: String
- **Default**: `0.0.0.0`
- **Description**: Backend host

### PORT
- **Type**: Integer
- **Default**: `8000`
- **Description**: Backend port

### CORS_ORIGINS
- **Type**: String (comma-separated)
- **Default**: `http://localhost:3000,http://localhost:5173`
- **Description**: Allowed CORS origins

See [Configuration Guide](../getting-started/configuration.md) for usage examples.
