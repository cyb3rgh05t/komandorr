# ZFS Storage Monitoring Setup Guide

Quick guide for setting up storage monitoring for your ZFS RAID pool setup.

## Your Current Setup

Based on your `lsblk -f` output, you have:

### Storage Server (storage150)

**10-Disk ZFS RAID Pool:**

- Pool name: `zfsraidpool`
- Disks: sda1, sdb1, sdc1, sdd1, sde1, sdf1, sdg1, sdh1, sdi1, sdj1
- Mount point: `/mnt/raidpool` (or `/mnt/raidpool/filesystem`)

**System RAID (mdadm on NVMe):**

- `/dev/md0` - Swap (RAID 1 - nvme0n1p1 + nvme1n1p1)
- `/dev/md1` - Boot (RAID 1 - nvme0n1p2 + nvme1n1p2) - mounted on `/boot`
- `/dev/md2` - Root (RAID 1 - nvme0n1p3 + nvme1n1p3) - mounted on `/`

## Configuration for Your Server

### 1. Install Storage Agent

```bash
sudo mkdir -p /opt/komandorr
cd /opt/komandorr
wget https://raw.githubusercontent.com/cyb3rgh05t/komandorr/main/storage/storage_agent.py
chmod +x storage_agent.py
```

### 2. Install Dependencies

```bash
pip install psutil requests colorama
```

### 3. Configure storage_agent.py

Edit the configuration section in `storage_agent.py`:

```python
# URL of your Komandorr dashboard
KOMANDORR_URL = "https://komandorr.mystreamnet.club"

# Service ID from Komandorr dashboard
SERVICE_ID = "your-service-id-here"  # Get this from dashboard

# How often to send data (in seconds)
UPDATE_INTERVAL = 60

# Storage paths to monitor
STORAGE_PATHS = [
    "/mnt/raidpool",            # Your ZFS pool mount point
    "/mnt/raidpool/filesystem",  # Or wherever your ZFS is actually mounted
]

# mdadm RAID devices (your system drives)
RAID_DEVICES = [
    "/dev/md0",  # Swap RAID
    "/dev/md1",  # Boot RAID
    "/dev/md2",  # Root RAID
]

# ZFS pools to monitor
ZFS_POOLS = [
    "zfsraidpool",  # Your 10-disk ZFS pool
]

# Monitor individual disks
MONITOR_RAID_DISKS = True
```

### 4. Get Service ID from Dashboard

1. Go to your Komandorr dashboard
2. Navigate to **Services** page
3. Click **Add Service**
4. Create a service for your storage server:
   - Name: "Storage150 - ZFS RAID"
   - Type: "Server"
   - URL: http://your-server-ip
5. Copy the **Service ID** from the URL or service card
6. Paste it into `SERVICE_ID` in the configuration above

### 5. Test the Agent

Run the agent manually first to verify it works:

```bash
sudo python3 storage_agent.py
```

You should see output like:

```
========================================
Komandorr Storage Monitor Agent
========================================
Hostname:        storage150
Dashboard:       https://komandorr.mystreamnet.club
Service ID:      your-service-id
Update Interval: 60s
Storage Paths:   2 configured
mdadm RAID:      3 configured
ZFS Pools:       1 configured

INFO - Storage monitoring agent started
INFO - Press Ctrl+C to stop

========================================
Iteration #1 - 2025-12-23 12:00:00
========================================
INFO - Monitoring 2 storage paths...
DEBUG -   /mnt/raidpool: 5000.00GB / 10000.00GB (50.0%)
INFO - Monitoring 3 mdadm RAID arrays...
DEBUG -   /dev/md0: healthy (raid1, 2/2 active)
DEBUG -   /dev/md1: healthy (raid1, 2/2 active)
DEBUG -   /dev/md2: healthy (raid1, 2/2 active)
INFO - Monitoring 1 ZFS pools...
DEBUG -   zfsraidpool: healthy (ONLINE, 80% capacity, 10 disks)
SUCCESS - ✓ Data sent successfully to https://komandorr.mystreamnet.club
```

Press `Ctrl+C` to stop.

### 6. Set Up as System Service

Create systemd service file:

```bash
sudo nano /etc/systemd/system/komandorr-storage.service
```

Paste this content:

```ini
[Unit]
Description=Komandorr Storage Monitor Agent
After=network.target zfs.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/komandorr
ExecStart=/usr/bin/python3 /opt/komandorr/storage_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable komandorr-storage
sudo systemctl start komandorr-storage
sudo systemctl status komandorr-storage
```

### 7. View Logs

```bash
# Follow live logs
sudo journalctl -u komandorr-storage -f

# View recent logs
sudo journalctl -u komandorr-storage -n 50
```

## What You'll See in Dashboard

Once running, go to the **Storage** page in your Komandorr dashboard:

### Summary Cards

- **Total Capacity**: Combined size of all monitored paths
- **Total Used**: Total space used
- **Average Usage**: Overall usage percentage
- **RAID Arrays**: 4 arrays (3 mdadm + 1 ZFS)

### Storage Server Card

- **Storage Overview**: Total/Used/Free space
- **Usage Bar**: Visual progress bar
- **mdadm RAID Status**:
  - md0, md1, md2 with Healthy/Degraded badges
- **ZFS Pool Status**:
  - zfsraidpool with health badge and capacity percentage
- **Usage Chart**: Historical usage over time

### Detailed View (Click Activity Icon)

Shows:

- **Storage Paths**: Each mount point with usage details
- **mdadm RAID Details**:
  - Level (raid1)
  - Active devices (2/2)
  - Individual disk status
- **ZFS Pool Details**:
  - Pool state (ONLINE/DEGRADED/FAULTED)
  - Capacity percentage
  - Size/Used/Free in human-readable format
  - Scrub/resilver status if active
  - All 10 disks (sda1-sdj1) with status and error counts
  - Individual disk read/write/checksum errors

## Troubleshooting

### ZFS Pool Not Showing

Check if ZFS pool exists:

```bash
zpool list
zpool status zfsraidpool
```

### Permission Denied on zpool command

The agent needs root access:

```bash
sudo python3 storage_agent.py
```

### mdadm RAID Not Detected

Check mdadm is installed and devices exist:

```bash
sudo mdadm --detail /dev/md0
cat /proc/mdstat
```

### Agent Not Sending Data

1. Check network connectivity to dashboard:

   ```bash
   ping komandorr.mystreamnet.club
   ```

2. Verify Service ID is correct in dashboard

3. Check agent logs:
   ```bash
   sudo journalctl -u komandorr-storage -n 100
   ```

## Next Steps

- Monitor the dashboard to ensure data is coming through
- Set up monitoring for additional servers (if you have a second storage server)
- Configure alerts for degraded RAID status (coming soon)
- Set up email notifications for storage issues (coming soon)

---

**Need help?** Open an issue on GitHub: https://github.com/cyb3rgh05t/komandorr/issues
