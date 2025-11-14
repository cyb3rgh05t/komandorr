# Configuration

Configure Komandorr to fit your infrastructure and monitoring needs.

## Configuration Overview

Komandorr can be configured through multiple methods:

### :material-file-code: Configuration Files

JSON-based configuration files for persistent settings.

[Environment Variables →](environment.md){ .md-button }

### :material-cog: Web Interface

Runtime configuration through the dashboard UI.

[Services Config →](services.md){ .md-button }

### :material-variable: Environment Variables

Docker-friendly environment-based configuration.

[Plex Setup →](plex.md){ .md-button }

## Configuration Files

Main configuration files:

| File            | Purpose             | Location                     |
| --------------- | ------------------- | ---------------------------- |
| `config.json`   | Global settings     | `backend/data/config.json`   |
| `services.json` | Service definitions | `backend/data/services.json` |
| `komandorr.db`  | SQLite database     | `backend/data/komandorr.db`  |

## Quick Configuration

### Minimal Setup

```json
{
  "check_interval": 60,
  "admin_password": "your-secure-password"
}
```

### Full Configuration

```json
{
  "check_interval": 60,
  "log_level": "INFO",
  "admin_password": "your-secure-password",
  "plex": {
    "url": "http://plex-server:32400",
    "token": "your-plex-token"
  },
  "traffic": {
    "enabled": true,
    "interface": "eth0"
  }
}
```

## Configuration Topics

- [Environment Variables](environment.md) - Docker and system environment configuration
- [Services](services.md) - Service monitoring configuration
- [Plex Integration](plex.md) - Plex Media Server setup
- [Traffic Agent](traffic-agent.md) - Network traffic monitoring configuration

## Best Practices

1. **Use Environment Variables** for sensitive data (tokens, passwords)
2. **Version Control** configuration files (excluding secrets)
3. **Document Changes** when modifying default settings
4. **Test Configuration** in non-production first
5. **Backup Regularly** especially before major changes

## Security

!!! warning "Protect Sensitive Data" - Never commit tokens or passwords to git - Use environment variables for secrets - Restrict file permissions: `chmod 600 config.json` - Rotate credentials regularly - Use strong passwords
