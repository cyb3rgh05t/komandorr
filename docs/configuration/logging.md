# Enhanced Logging Configuration

The Komandorr project now features an enhanced logging system with beautiful colored console output and detailed file logging.

## Features

✨ **Cross-platform colored output** using `colorama`  
📝 **Detailed file logging** with timestamps and module information  
🎨 **Visual log levels** with emoji icons and colors  
⚙️ **Highly configurable** via environment variables  
🔍 **Multiple log levels** (DEBUG, INFO, WARNING, ERROR, CRITICAL)  
📊 **Separate formatting** for console and file output

## Log Levels

The logging system supports five standard log levels:

| Level        | Icon | Color   | Description                                                   |
| ------------ | ---- | ------- | ------------------------------------------------------------- |
| **DEBUG**    | 🔍   | Cyan    | Detailed diagnostic information for debugging                 |
| **INFO**     | ℹ️   | Green   | General informational messages about normal operation         |
| **WARNING**  | ⚠️   | Yellow  | Warning messages for unusual but non-critical events          |
| **ERROR**    | ❌   | Red     | Error events that may still allow the application to continue |
| **CRITICAL** | 🚨   | Magenta | Severe errors that may cause application failure              |

## Environment Variables

Configure the logging behavior using these environment variables:

### Core Settings

```bash
# Set the minimum logging level (default: INFO)
LOG_LEVEL=DEBUG|INFO|WARNING|ERROR|CRITICAL

# Path to the log file (default: logs/komandorr.log)
LOG_FILE=logs/komandorr.log

# Enable or disable file logging (default: true)
LOG_TO_FILE=true|false

# Timezone for timestamps (default: UTC)
TZ=America/New_York
# or
TIMEZONE=Europe/London
```

### Console Output Settings

```bash
# Show emoji icons in console output (default: true)
LOG_SHOW_ICONS=true|false

# Show timestamp in console output (default: false)
# Note: File logs always include timestamps
LOG_SHOW_TIMESTAMP=true|false
```

### File Output Settings

```bash
# Include module/function names in file logs (default: true)
LOG_FILE_INCLUDE_LOCATION=true|false
```

## Usage Examples

### Basic Logging

```python
from app.utils.logger import logger

# Different log levels
logger.debug("Detailed debugging information")
logger.info("Application started successfully")
logger.warning("Configuration value is deprecated")
logger.error("Failed to connect to database")
logger.critical("System is shutting down")
```

### Logging with Exception Traceback

```python
from app.utils.logger import logger

try:
    # Some code that might fail
    result = risky_operation()
except Exception as e:
    logger.exception("Operation failed")
    # This logs the full traceback automatically
```

### Dynamic Log Level Changes

```python
from app.utils.logger import logger

# Change log level at runtime
logger.set_level("DEBUG")
logger.debug("This will now be shown")

logger.set_level("WARNING")
logger.info("This will be hidden")
logger.warning("This will be shown")
```

## Configuration Examples

### Development Environment

For development, you might want verbose console output with debug information:

```bash
# .env
LOG_LEVEL=DEBUG
LOG_SHOW_ICONS=true
LOG_SHOW_TIMESTAMP=false
LOG_TO_FILE=true
LOG_FILE_INCLUDE_LOCATION=true
```

### Production Environment

For production, you might want minimal console output with detailed file logs:

```bash
# .env
LOG_LEVEL=INFO
LOG_SHOW_ICONS=false
LOG_SHOW_TIMESTAMP=true
LOG_TO_FILE=true
LOG_FILE_INCLUDE_LOCATION=true
TZ=UTC
```

### Docker Environment

When running in Docker, you might disable file logging and rely on Docker's logging:

```bash
# docker-compose.yml environment
LOG_LEVEL=INFO
LOG_TO_FILE=false
LOG_SHOW_ICONS=true
LOG_SHOW_TIMESTAMP=false
```

## Console Output Examples

### Default Output (with icons)

```
🔍 DEBUG - Initializing database connection
ℹ️  INFO - Server started on port 8000
⚠️  WARNING - API rate limit approaching
❌ ERROR - Failed to fetch user data
🚨 CRITICAL - Database connection lost
```

### Without Icons

```
DEBUG - Initializing database connection
INFO - Server started on port 8000
WARNING - API rate limit approaching
ERROR - Failed to fetch user data
CRITICAL - Database connection lost
```

### With Timestamps

```
2025-11-13 14:30:15 - ℹ️  INFO - Server started on port 8000
2025-11-13 14:30:16 - ⚠️  WARNING - API rate limit approaching
```

## File Output Examples

### Standard File Format

```
2025-11-13 14:30:15 - INFO     - Server started on port 8000
2025-11-13 14:30:16 - WARNING  - API rate limit approaching
2025-11-13 14:30:17 - ERROR    - Failed to fetch user data
```

### With Location Information

```
2025-11-13 14:30:15 - INFO     - [komandorr:main:45] - Server started on port 8000
2025-11-13 14:30:16 - WARNING  - [komandorr:api.services:123] - API rate limit approaching
2025-11-13 14:30:17 - ERROR    - [komandorr:api.plex:89] - Failed to fetch user data
```

## Log File Management

### Location

By default, logs are stored in:

```
backend/logs/komandorr.log
```

You can customize this with the `LOG_FILE` environment variable.

### Rotation

To implement log rotation, you can use external tools:

#### Using logrotate (Linux)

Create `/etc/logrotate.d/komandorr`:

```
/path/to/komandorr/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 user user
    sharedscripts
    postrotate
        # Send SIGHUP to reload logs if needed
    endscript
}
```

#### Manual Rotation

```bash
# Archive current log
mv logs/komandorr.log logs/komandorr.$(date +%Y%m%d).log

# Compress old logs
gzip logs/komandorr.*.log

# Remove logs older than 30 days
find logs/ -name "komandorr.*.log.gz" -mtime +30 -delete
```

## Troubleshooting

### No Console Colors on Windows

If you don't see colors on Windows, ensure:

1. You're using a modern terminal (Windows Terminal, PowerShell 7+)
2. Colorama is properly installed: `pip install colorama`
3. ANSI escape codes are enabled in your terminal

### File Logging Not Working

If logs aren't being written to file:

1. Check permissions on the logs directory
2. Ensure `LOG_TO_FILE=true` is set
3. Check the console for permission warnings
4. Verify the `LOG_FILE` path is valid

### Missing Log Levels

If certain log levels aren't showing:

1. Check your `LOG_LEVEL` setting
2. Remember that setting level to `WARNING` hides `DEBUG` and `INFO`
3. Console and file handlers both respect the global log level

## Best Practices

1. **Use appropriate log levels**

   - `DEBUG`: Only for development and troubleshooting
   - `INFO`: Normal application flow events
   - `WARNING`: Unexpected but handled situations
   - `ERROR`: Errors that are caught and handled
   - `CRITICAL`: Severe errors requiring immediate attention

2. **Include context in log messages**

   ```python
   # Good
   logger.info(f"User {user_id} logged in from {ip_address}")

   # Less helpful
   logger.info("User logged in")
   ```

3. **Use exception logging for errors**

   ```python
   # Good - includes full traceback
   try:
       risky_function()
   except Exception as e:
       logger.exception("Failed to execute risky function")

   # Less helpful - no traceback
   try:
       risky_function()
   except Exception as e:
       logger.error(f"Error: {str(e)}")
   ```

4. **Don't log sensitive information**

   ```python
   # Bad - logs password
   logger.info(f"User login: {username}:{password}")

   # Good - no sensitive data
   logger.info(f"User login attempt: {username}")
   ```

5. **Use structured logging for complex data**
   ```python
   # For complex data, log in a structured way
   logger.info(f"API request completed: method={method}, endpoint={endpoint}, status={status}, duration={duration}ms")
   ```

## Migration from Old Logger

The new enhanced logger is backward compatible. No code changes are required for existing usage:

```python
# This still works exactly the same
from app.utils.logger import logger

logger.info("Application started")
logger.error("Something went wrong")
```

The only differences are:

- Better colored output in console
- More detailed file logging
- Additional configuration options via environment variables
- New `exception()` method for logging with tracebacks
- New `set_level()` method for dynamic level changes

## Dependencies

The enhanced logging system requires:

- `colorama>=0.4.6` - Cross-platform colored terminal output

This is automatically included in `requirements.txt`.
