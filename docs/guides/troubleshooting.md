# Troubleshooting

Common issues and solutions.

## Services Not Updating

**Issue**: Services show old status or don't update.

**Solutions**:

- Check backend is running: `http://localhost:8000/api/health`
- Verify service URL is accessible
- Check logs: `backend/logs/app.log`
- Verify check interval settings

## Authentication Issues

**Issue**: Can't login or auth not working.

**Solutions**:

- Verify `ENABLE_AUTH=true` in environment
- Check username/password are correct
- Clear browser cache and cookies
- Check backend logs for auth errors

## Plex Connection Failed

**Issue**: Can't connect to Plex server.

**Solutions**:

- Verify Plex server is running
- Check server URL is correct (include `:32400`)
- Ensure token is valid
- Test URL in browser: `http://your-plex:32400/web`
- Check firewall rules

## Traffic Not Showing

**Issue**: Traffic data not appearing on dashboard.

**Solutions**:

- Ensure traffic agent is running on server
- Verify service ID matches in agent config
- Check network connectivity
- Review agent logs
- Confirm backend can receive POST requests

## Docker Issues

**Issue**: Container won't start or crashes.

**Solutions**:

- Check logs: `docker-compose logs -f`
- Verify ports aren't already in use
- Check volume permissions
- Ensure environment variables are set
- Try rebuilding: `docker-compose up -d --build`

## Performance Issues

**Issue**: Slow loading or high resource usage.

**Solutions**:

- Increase check intervals for services
- Reduce number of concurrent checks
- Check system resources (CPU, RAM)
- Review logs for errors
- Consider dedicated server for larger deployments

## Frontend Issues

**Issue**: UI not loading or blank page.

**Solutions**:

- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Clear browser cache
- Check browser console for errors
- Verify backend is accessible
- Check CORS settings

## Need More Help?

- 📖 [Documentation](https://cyb3rgh05t.github.io/komandorr)
- 🐛 [Report Bug](https://github.com/cyb3rgh05t/komandorr/issues)
- 💬 [Discussions](https://github.com/cyb3rgh05t/komandorr/discussions)
