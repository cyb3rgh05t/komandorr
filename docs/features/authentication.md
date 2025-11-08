# Authentication

Secure your Komandorr dashboard with basic authentication.

## Enabling Authentication

Set in environment variables:

```bash
ENABLE_AUTH=true
AUTH_USERNAME=admin
AUTH_PASSWORD=your-secure-password
```

## Disabling Authentication

```bash
ENABLE_AUTH=false
```

## Security Best Practices

- Use strong passwords
- Enable HTTPS in production
- Use reverse proxy for additional security
- Rotate credentials regularly

See [Configuration](../getting-started/configuration.md) for details.
