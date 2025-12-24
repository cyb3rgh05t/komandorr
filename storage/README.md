# Komandorr Storage Monitor Agent

Monitor mdadm RAID arrays, ZFS pools, disk usage, and UnionFS mounts with the Komandorr Storage Monitor Agent. This lightweight Python agent runs on your storage servers and reports health, capacity, and RAID status back to your Komandorr dashboard in real-time.

## ✨ Features

- **mdadm RAID Monitoring**: Monitor Linux mdadm RAID arrays (RAID 0, 1, 5, 6, 10)
  - Real-time RAID status (healthy, degraded, recovering, failed)
  - Individual disk status within arrays
  - Active/failed/spare device counts
- **ZFS Pool Monitoring**: Monitor ZFS storage pools
  - Pool health status (ONLINE, DEGRADED, FAULTED)
  - Individual disk status (online, degraded, faulted, offline)
  - Resilver/scrub progress tracking
  - Pool capacity and usage
  - Read/write/checksum error counts per disk
- **Disk Usage Tracking**: Monitor multiple mount points simultaneously
  - Total capacity, used space, and free space
  - Usage percentage tracking
  - Historical usage trends
- **UnionFS Support**: Perfect for monitoring merged storage arrays
- **Multi-Server Support**: Deploy agents on multiple servers
- **Lightweight**: Minimal resource usage (<10MB RAM)
- **Auto-Reconnect**: Handles network interruptions gracefully
- **Persistent State**: Survives server reboots with state file

## 📋 Requirements

### System Requirements

- **Python**: 3.8 or higher
- **Operating System**: Linux (tested on Ubuntu, Debian, CentOS)
- **Privileges**: Root/sudo access for RAID monitoring (mdadm, zpool)
- **Network**: Access to your Komandorr dashboard URL

### Python Dependencies

```bash
pip install psutil requests colorama
```

Or install from requirements.txt:

```bash
pip install -r requirements.txt
```

### RAID Monitoring Requirements

**For mdadm RAID:**

- `mdadm` utility must be installed
- For Ubuntu/Debian:
  ```bash
  sudo apt-get install mdadm
  ```
- For CentOS/RHEL:
  ```bash
  sudo yum install mdadm
  ```

**For ZFS pools:**

- ZFS utilities must be installed
- For Ubuntu:
  ```bash
  sudo apt-get install zfsutils-linux
  ```
- For other distributions, follow the [OpenZFS installation guide](https://openzfs.github.io/openzfs-docs/Getting%20Started/index.html)

## 🚀 Quick Start

### 1. Download the Agent

```bash
# Create directory
sudo mkdir -p /opt/komandorr
cd /opt/komandorr

# Download agent
wget https://raw.githubusercontent.com/cyb3rgh05t/komandorr/main/storage/storage_agent.py

# Make executable
chmod +x storage_agent.py
```

### 2. Create a Service in Komandorr Dashboard

1. Go to your Komandorr dashboard
2. Navigate to **Services** page
3. Click **Add Service**
4. Fill in the details:
   - **Name**: Storage Server 1 (or any name)
   - **Type**: Select "Server"
   - **URL**: http://your-server-ip (any valid URL)
5. Click **Create**
6. **Copy the Service ID** from the URL or service details

### 3. Configure the Agent

Edit the `storage_agent.py` file and update these configuration variables:

```python
# URL of your Komandorr dashboard
KOMANDORR_URL = "https://komandorr.yourdomain.com"

# Service ID from Komandorr (from step 2)
SERVICE_ID = "your-service-id-here"

# Storage paths to monitor
STORAGE_PATHS = [
    "/mnt/storage",
    "/mnt/raid1",
    "/mnt/raid2",
    "/mnt/unionfs",  # UnionFS mount point
]

# mdadm RAID devices to monitor
RAID_DEVICES = [
    "/dev/md0",
    "/dev/md1",
]

# ZFS pools to monitor
ZFS_POOLS = [
    "zfsraidpool",  # Your ZFS pool name
]

# Update interval (in seconds)
UPDATE_INTERVAL = 60

# Optional: Basic auth if enabled in Komandorr
AUTH_USERNAME = None  # or "your-username"
AUTH_PASSWORD = None  # or "your-password"
```

### 4. Test the Agent

Run the agent manually to test:

```bash
sudo python3 storage_agent.py
```

You should see output like:

```
========================================
Komandorr Storage Monitor Agent
========================================
Hostname:        storage-server-1
Dashboard:       https://komandorr.yourdomain.com
Service ID:      abc123xyz...
Update Interval: 60s
Storage Paths:   4 configured
RAID Arrays:     2 configured

INFO - Storage monitoring agent started
INFO - Press Ctrl+C to stop

==========================================
Iteration #1 - 2025-12-22 15:30:00
==========================================
INFO - Monitoring 4 storage paths...
DEBUG -   /mnt/storage: 2500.00GB / 5000.00GB (50%)
DEBUG -   /mnt/raid1: 1800.00GB / 4000.00GB (45%)
DEBUG -   /mnt/raid2: 2100.00GB / 4000.00GB (52.5%)
DEBUG -   /mnt/unionfs: 4400.00GB / 8000.00GB (55%)
INFO - Monitoring 2 RAID arrays...
DEBUG -   /dev/md0: healthy (raid5, 4/4 active)
DEBUG -   /dev/md1: healthy (raid5, 4/4 active)
DEBUG -   Found 8 disk devices
SUCCESS - ✓ Data sent successfully to https://komandorr.yourdomain.com
INFO - Next update in 60 seconds...
```

Press `Ctrl+C` to stop.

### 5. Setup as Systemd Service (Recommended)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/komandorr-storage.service
```

Add the following content:

```ini
[Unit]
Description=Komandorr Storage Monitor Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/komandorr
ExecStart=/usr/bin/python3 /opt/komandorr/storage_agent.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable komandorr-storage

# Start the service
sudo systemctl start komandorr-storage

# Check status
sudo systemctl status komandorr-storage

# View logs
sudo journalctl -u komandorr-storage -f
```

## 📊 Viewing Storage Data

Once the agent is running:

1. Go to your Komandorr dashboard
2. Navigate to **Storage** page (in sidebar)
3. You'll see your storage servers with:
   - Total capacity, used, and free space
   - Usage percentage with visual progress bars
   - RAID array status badges (Healthy/Degraded/Failed)
   - Historical usage charts
   - Detailed view with individual paths and RAID details

## 🔧 Advanced Configuration

### Monitoring Specific Network Interfaces

By default, the agent monitors all storage paths. To monitor specific paths:

```python
STORAGE_PATHS = [
    "/",              # Root filesystem
    "/home",          # Home directory
    "/mnt/data",      # Data mount
    "/mnt/backup",    # Backup mount
]
```

### Monitoring UnionFS

For UnionFS mounts (merging multiple storage arrays):

```python
STORAGE_PATHS = [
    "/mnt/storage1",   # First storage server
    "/mnt/storage2",   # Second storage server
    "/mnt/unionfs",    # UnionFS combining both
]
```

### Multiple RAID Arrays

To monitor multiple RAID devices:

```python
RAID_DEVICES = [
    "/dev/md0",   # First RAID array
    "/dev/md1",   # Second RAID array
    "/dev/md2",   # Third RAID array
]
```

To find your RAID devices:

```bash
cat /proc/mdstat
```

### Monitoring ZFS Pools

To monitor ZFS pools:

```python
ZFS_POOLS = [
    "tank",          # First ZFS pool
    "backup",        # Backup pool
    "zfsraidpool",   # Your main RAID pool
]
```

To find your ZFS pool names:

```bash
zpool list
```

To see pool status:

```bash
zpool status
```

**ZFS Example Configuration:**

```python
# Monitor ZFS pool with 10 disks
STORAGE_PATHS = [
    "/mnt/raidpool",           # ZFS pool mount
    "/mnt/raidpool/filesystem", # Specific dataset
]

ZFS_POOLS = [
    "zfsraidpool",  # Your ZFS pool
]

# Also monitor system mdadm RAID (for boot/root)
RAID_DEVICES = [
    "/dev/md0",  # Boot RAID
    "/dev/md1",  # Root RAID
]
```

### Adjusting Update Interval

```python
# Update every 30 seconds (more frequent)
UPDATE_INTERVAL = 30

# Update every 5 minutes (less frequent)
UPDATE_INTERVAL = 300
```

**Note**: More frequent updates = more API calls but more real-time data.

### Authentication

If your Komandorr dashboard has basic authentication enabled:

```python
AUTH_USERNAME = "admin"
AUTH_PASSWORD = "your-secure-password"
```

## 🎯 Use Cases

### Scenario 1: Two Remote Storage Servers with ZFS + UnionFS

Perfect for your setup with ZFS pools!

**Server 1** (`storage150` - ZFS RAID pool):

```python
SERVICE_ID = "service-id-1"
STORAGE_PATHS = [
    "/mnt/raidpool",            # ZFS pool mount point
    "/mnt/raidpool/filesystem",  # Main filesystem
]
ZFS_POOLS = ["zfsraidpool"]     # 10-disk ZFS pool (sda-sdj)
RAID_DEVICES = [
    "/dev/md0",  # System swap (NVMe RAID)
    "/dev/md1",  # Boot (NVMe RAID)
    "/dev/md2",  # Root (NVMe RAID)
]
```

**Server 2** (`storage-server-2`):

```python
SERVICE_ID = "service-id-2"
STORAGE_PATHS = ["/mnt/raid2"]
RAID_DEVICES = ["/dev/md1"]
```

**Union Server** (`union-server`):

```python
SERVICE_ID = "service-id-3"
STORAGE_PATHS = [
    "/mnt/storage1",  # Remote mount from server 1
    "/mnt/storage2",  # Remote mount from server 2
    "/mnt/unionfs"    # UnionFS combining both
]
RAID_DEVICES = []  # No local RAID on this server
```

### Scenario 2: Single Server with Multiple RAID Arrays

```python
SERVICE_ID = "main-storage"
STORAGE_PATHS = [
    "/mnt/raid0",
    "/mnt/raid1",
    "/mnt/raid5"
]
RAID_DEVICES = [
    "/dev/md0",
    "/dev/md1",
    "/dev/md2"
]
```

### Scenario 3: Mixed Storage Types

```python
STORAGE_PATHS = [
    "/",              # OS drive (SSD)
    "/mnt/ssd",       # Fast SSD storage
    "/mnt/hdd",       # Slow HDD storage
    "/mnt/raid",      # RAID array
]
```

## 🐛 Troubleshooting

### Agent Won't Start

**Check Python version:**

```bash
python3 --version  # Should be 3.8+
```

**Install dependencies:**

```bash
pip3 install psutil requests colorama
```

**Run with sudo** (required for RAID monitoring):

```bash
sudo python3 storage_agent.py
```

### RAID Status Shows "Unknown"

**Check if mdadm is installed:**

```bash
which mdadm
sudo mdadm --version
```

**Check RAID devices exist:**

```bash
cat /proc/mdstat
ls -l /dev/md*
```

**Verify RAID device paths in config match actual devices**

### "Permission Denied" Errors

The agent needs root privileges to access RAID information:

```bash
sudo python3 storage_agent.py
```

Or ensure the systemd service runs as `User=root`.

### Connection Errors

**Check Komandorr URL is correct:**

```bash
curl https://komandorr.yourdomain.com/api/health
```

**Check firewall allows outbound HTTPS:**

```bash
sudo ufw status
sudo iptables -L OUTPUT
```

**Verify Service ID is correct** (copy from dashboard URL)

### No Data in Dashboard

1. **Check agent is running:**

   ```bash
   sudo systemctl status komandorr-storage
   ```

2. **View agent logs:**

   ```bash
   sudo journalctl -u komandorr-storage -n 50
   ```

3. **Verify service exists in dashboard** and ID matches

4. **Check browser console** for API errors

## 📝 Logs

### View systemd logs:

```bash
# Last 50 lines
sudo journalctl -u komandorr-storage -n 50

# Follow live logs
sudo journalctl -u komandorr-storage -f

# Logs from today
sudo journalctl -u komandorr-storage --since today
```

### Agent log output includes:

- Iteration number and timestamp
- Storage path usage statistics
- RAID array status
- Network transmission status
- Error messages (if any)

## 🔐 Security Considerations

1. **Run as root**: Required for RAID monitoring but be cautious
2. **Secure your Komandorr URL**: Use HTTPS in production
3. **Enable authentication**: Set AUTH_USERNAME and AUTH_PASSWORD
4. **Firewall**: Only allow outbound HTTPS to Komandorr server
5. **State file**: Contains no sensitive data but is writable by agent

## 🔄 Updating the Agent

```bash
cd /opt/komandorr

# Backup current configuration
sudo cp storage_agent.py storage_agent.py.backup

# Download new version
sudo wget https://raw.githubusercontent.com/cyb3rgh05t/komandorr/main/storage/storage_agent.py -O storage_agent.py

# Restore your configuration (edit SERVICE_ID, paths, etc.)
sudo nano storage_agent.py

# Restart service
sudo systemctl restart komandorr-storage
```

## ❓ FAQ

### Can I monitor non-RAID storage?

Yes! Just leave `RAID_DEVICES = []` empty. The agent will still monitor disk usage for all configured paths.

### Does it work with hardware RAID?

Hardware RAID controllers use different tools (e.g., MegaCLI, arcconf). The current agent only supports Linux software RAID (mdadm). Hardware RAID support may be added in future versions.

### Can I monitor Windows servers?

Not currently. The agent is designed for Linux servers. Windows support may be added in the future.

### How much network bandwidth does it use?

Minimal! Each update sends ~1-5KB of JSON data. With default 60-second intervals, that's <5KB/minute or ~7MB/day per server.

### Will it impact server performance?

No. The agent uses <10MB RAM and negligible CPU (<0.1%). Disk reads are read-only and minimal.

### Can multiple agents report to the same service?

No. Each agent should have its own unique SERVICE_ID. Create one service per server in the dashboard.

## 📚 Additional Resources

- [Komandorr Documentation](https://cyb3rgh05t.github.io/komandorr/)
- [Traffic Monitoring Setup](../traffic/README.md)
- [Issue Tracker](https://github.com/cyb3rgh05t/komandorr/issues)
- [Changelog](../CHANGELOG.md)

## 🤝 Contributing

Found a bug? Have a feature request?

- Open an issue: https://github.com/cyb3rgh05t/komandorr/issues
- Submit a pull request: https://github.com/cyb3rgh05t/komandorr/pulls

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Made with ❤️ for the Komandorr project**
