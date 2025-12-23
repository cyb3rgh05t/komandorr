import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../context/ToastContext";
import {
  HardDrive,
  Server,
  RefreshCw,
  Loader2,
  Database,
  Search,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Disc3,
} from "lucide-react";
import { api } from "../services/api";

// Storage Chart - Shows usage over time
const StorageChart = ({ data = [], serviceId, t }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-theme-text-muted text-xs bg-[#0a0f1a] rounded border border-gray-800">
        {t("storage.noData", "No storage data available")}
      </div>
    );
  }

  const values = data.map((point) => point.average_usage_percent);
  const max = Math.max(...values, 100);
  const min = Math.min(...values);
  const range = max - min || 10;

  const gradientId = `storage-gradient-${serviceId}-${Date.now()}`;

  const width = 100;
  const height = 100;

  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = (1 - (value - min) / range) * height;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `M 0,${height} L ${points.join(
    " L "
  )} L ${width},${height} Z`;

  return (
    <div className="relative h-20 bg-[#0a0f1a] rounded border border-gray-800/50 overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

// RAID Status Badge
const RaidStatusBadge = ({ status }) => {
  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      label: "Healthy",
    },
    degraded: {
      icon: AlertTriangle,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      label: "Degraded",
    },
    recovering: {
      icon: RefreshCw,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      label: "Recovering",
    },
    failed: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      label: "Failed",
    },
  };

  const config = statusConfig[status] || statusConfig.failed;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bg} ${config.color} text-xs font-medium`}
    >
      <Icon
        size={12}
        className={status === "recovering" ? "animate-spin" : ""}
      />
      {config.label}
    </span>
  );
};

// Storage Service Card
const StorageServiceCard = ({ service, t }) => {
  const [showDetails, setShowDetails] = useState(false);
  const storage = service.storage;
  const history = service.storage_history || [];

  if (!storage) {
    return null;
  }

  const totalCapacity = storage.storage_paths.reduce(
    (sum, path) => sum + path.total,
    0
  );
  const totalUsed = storage.storage_paths.reduce(
    (sum, path) => sum + path.used,
    0
  );
  const totalFree = storage.storage_paths.reduce(
    (sum, path) => sum + path.free,
    0
  );
  const averageUsage =
    totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

  const healthyRaids = storage.raid_arrays.filter(
    (r) => r.status === "healthy"
  ).length;
  const degradedRaids = storage.raid_arrays.filter(
    (r) => r.status === "degraded"
  ).length;
  const failedRaids = storage.raid_arrays.filter(
    (r) => !["healthy", "degraded", "recovering"].includes(r.status)
  ).length;

  // Include ZFS pools in RAID counts
  const zfsPools = storage.zfs_pools || [];
  const healthyZfs = zfsPools.filter((p) => p.status === "healthy").length;
  const degradedZfs = zfsPools.filter((p) => p.status === "degraded").length;
  const failedZfs = zfsPools.filter(
    (p) => !["healthy", "degraded", "recovering"].includes(p.status)
  ).length;

  const totalHealthy = healthyRaids + healthyZfs;
  const totalDegraded = degradedRaids + degradedZfs;
  const totalFailed = failedRaids + failedZfs;
  const totalArrays = storage.raid_arrays.length + zfsPools.length;

  return (
    <div className="bg-theme-bg-secondary border border-theme-border rounded-lg p-4 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Server className="text-purple-400" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-theme-text text-base">
              {service.name}
            </h3>
            <p className="text-theme-text-muted text-xs mt-0.5">
              {storage.hostname}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-theme-text-muted hover:text-theme-text transition-colors"
        >
          <Activity size={18} />
        </button>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-theme-bg-primary/50 rounded-lg p-3">
          <div className="text-theme-text-muted text-xs mb-1">
            {t("storage.total", "Total")}
          </div>
          <div className="text-theme-text font-semibold text-lg">
            {totalCapacity.toFixed(1)}{" "}
            <span className="text-sm font-normal">GB</span>
          </div>
        </div>
        <div className="bg-theme-bg-primary/50 rounded-lg p-3">
          <div className="text-theme-text-muted text-xs mb-1">
            {t("storage.used", "Used")}
          </div>
          <div className="text-theme-text font-semibold text-lg">
            {totalUsed.toFixed(1)}{" "}
            <span className="text-sm font-normal">GB</span>
          </div>
        </div>
        <div className="bg-theme-bg-primary/50 rounded-lg p-3">
          <div className="text-theme-text-muted text-xs mb-1">
            {t("storage.free", "Free")}
          </div>
          <div className="text-green-400 font-semibold text-lg">
            {totalFree.toFixed(1)}{" "}
            <span className="text-sm font-normal">GB</span>
          </div>
        </div>
      </div>

      {/* Usage Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-theme-text-muted text-xs">
            {t("storage.usage", "Usage")}
          </span>
          <span className="text-theme-text font-semibold text-sm">
            {averageUsage.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-theme-bg-primary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              averageUsage > 90
                ? "bg-red-500"
                : averageUsage > 75
                ? "bg-yellow-500"
                : "bg-purple-500"
            }`}
            style={{ width: `${Math.min(averageUsage, 100)}%` }}
          />
        </div>
      </div>

      {/* RAID Status - mdadm */}
      {storage.raid_arrays.length > 0 && (
        <div className="mb-4">
          <div className="text-theme-text-muted text-xs mb-2">
            {t("storage.mdadmRaid", "mdadm RAID Arrays")}
          </div>
          <div className="flex flex-wrap gap-2">
            {storage.raid_arrays.map((raid, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="text-theme-text-muted">{raid.device}:</span>
                <RaidStatusBadge status={raid.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ZFS Pools */}
      {zfsPools.length > 0 && (
        <div className="mb-4">
          <div className="text-theme-text-muted text-xs mb-2">
            {t("storage.zfsPools", "ZFS Pools")}
          </div>
          <div className="flex flex-wrap gap-2">
            {zfsPools.map((pool, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="text-theme-text-muted">{pool.pool}:</span>
                <RaidStatusBadge status={pool.status} />
                {pool.capacity && (
                  <span className="text-theme-text-muted text-xs">
                    ({pool.capacity}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Chart */}
      {history.length > 0 && (
        <div className="mb-3">
          <div className="text-theme-text-muted text-xs mb-2">
            {t("storage.usageHistory", "Usage History")}
          </div>
          <StorageChart data={history} serviceId={service.id} t={t} />
        </div>
      )}

      {/* Detailed View */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-theme-border space-y-3">
          {/* Storage Paths */}
          <div>
            <h4 className="text-theme-text font-medium text-sm mb-2">
              {t("storage.paths", "Storage Paths")}
            </h4>
            <div className="space-y-2">
              {storage.storage_paths.map((path, idx) => (
                <div
                  key={idx}
                  className="bg-theme-bg-primary/30 rounded p-2 text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-theme-text font-mono">
                      {path.path}
                    </span>
                    <span className="text-theme-text-muted">
                      {path.percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-theme-text-muted">
                    {path.used.toFixed(1)} GB / {path.total.toFixed(1)} GB (
                    {path.free.toFixed(1)} GB free)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RAID Details */}
          {storage.raid_arrays.length > 0 && (
            <div>
              <h4 className="text-theme-text font-medium text-sm mb-2">
                {t("storage.raidDetails", "mdadm RAID Details")}
              </h4>
              <div className="space-y-2">
                {storage.raid_arrays.map((raid, idx) => (
                  <div
                    key={idx}
                    className="bg-theme-bg-primary/30 rounded p-2 text-xs"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-theme-text font-mono">
                        {raid.device}
                      </span>
                      <RaidStatusBadge status={raid.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-theme-text-muted">
                      <div>Level: {raid.level}</div>
                      <div>
                        Devices: {raid.active_devices}/{raid.devices}
                      </div>
                      {raid.failed_devices > 0 && (
                        <div className="text-red-400">
                          Failed: {raid.failed_devices}
                        </div>
                      )}
                      {raid.spare_devices > 0 && (
                        <div className="text-yellow-400">
                          Spare: {raid.spare_devices}
                        </div>
                      )}
                    </div>
                    {raid.disks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-theme-border/30">
                        <div className="text-theme-text-muted mb-1">Disks:</div>
                        <div className="flex flex-wrap gap-1">
                          {raid.disks.map((disk, diskIdx) => (
                            <span
                              key={diskIdx}
                              className={`px-2 py-0.5 rounded text-xs ${
                                disk.state === "active"
                                  ? "bg-green-500/10 text-green-400"
                                  : disk.state === "spare"
                                  ? "bg-yellow-500/10 text-yellow-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {disk.device} ({disk.state})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ZFS Pool Details */}
          {zfsPools.length > 0 && (
            <div>
              <h4 className="text-theme-text font-medium text-sm mb-2">
                {t("storage.zfsPoolDetails", "ZFS Pool Details")}
              </h4>
              <div className="space-y-2">
                {zfsPools.map((pool, idx) => (
                  <div
                    key={idx}
                    className="bg-theme-bg-primary/30 rounded p-2 text-xs"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-theme-text font-mono">
                        {pool.pool}
                      </span>
                      <RaidStatusBadge status={pool.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-theme-text-muted">
                      <div>State: {pool.state}</div>
                      {pool.capacity && <div>Capacity: {pool.capacity}%</div>}
                      {pool.size && <div>Size: {pool.size}</div>}
                      {pool.allocated && <div>Used: {pool.allocated}</div>}
                      {pool.free && <div>Free: {pool.free}</div>}
                      {pool.errors && pool.errors !== "none" && (
                        <div className="text-red-400 col-span-2">
                          Errors: {pool.errors}
                        </div>
                      )}
                    </div>
                    {pool.scan && (
                      <div className="mt-2 pt-2 border-t border-theme-border/30">
                        <div className="text-theme-text-muted mb-1">Scan:</div>
                        <div className="text-xs">{pool.scan}</div>
                      </div>
                    )}
                    {pool.disks && pool.disks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-theme-border/30">
                        <div className="text-theme-text-muted mb-1">Disks:</div>
                        <div className="flex flex-wrap gap-1">
                          {pool.disks.map((disk, diskIdx) => (
                            <span
                              key={diskIdx}
                              className={`px-2 py-0.5 rounded text-xs ${
                                disk.state === "online"
                                  ? "bg-green-500/10 text-green-400"
                                  : disk.state === "degraded"
                                  ? "bg-yellow-500/10 text-yellow-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                              title={`Errors: R=${disk.read_errors || 0} W=${
                                disk.write_errors || 0
                              } C=${disk.cksum_errors || 0}`}
                            >
                              {disk.device} ({disk.state})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-theme-text-muted text-xs text-right">
            {t("storage.lastUpdated", "Last updated")}:{" "}
            {new Date(storage.last_updated).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Storage Page Component
const Storage = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch services with storage data
  const {
    data: services = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      try {
        const response = await api.get("/services");
        console.log("Services data:", response.data);
        const filtered = response.data.filter(
          (service) => service.storage !== null
        );
        console.log("Filtered services with storage:", filtered);
        return filtered;
      } catch (err) {
        console.error("Error fetching services:", err);
        throw err;
      }
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch storage summary
  const { data: summary } = useQuery({
    queryKey: ["storage-summary"],
    queryFn: async () => {
      try {
        const response = await api.get("/storage/summary");
        return response.data;
      } catch (error) {
        console.error("Error fetching storage summary:", error);
        return {
          total_services: 0,
          services_with_storage: 0,
          total_capacity: 0,
          total_used: 0,
          total_free: 0,
          average_usage_percent: 0,
          total_raid_arrays: 0,
          healthy_raids: 0,
          degraded_raids: 0,
          failed_raids: 0,
        };
      }
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  useEffect(() => {
    if (error) {
      console.error("Storage page error:", error);
      toast.error(t("storage.errorLoading", "Error loading storage data"));
    }
  }, [error, t, toast]);

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.storage?.hostname || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries(["storage-summary"]);
    toast.success(t("storage.refreshed", "Storage data refreshed"));
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header with Search & Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder={t("storage.searchPlaceholder", "Search servers...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme rounded-lg text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all"
          />
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
        >
          <RefreshCw
            size={16}
            className={`text-theme-primary ${isLoading ? "animate-spin" : ""}`}
          />
          <span className="text-xs sm:text-sm">
            {isLoading
              ? t("common.refreshing", "Refreshing")
              : t("storage.refresh", "Refresh")}
          </span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-purple-500/50 hover:bg-purple-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Database className="w-3 h-3 text-purple-500" />
                  {t("storage.totalCapacity", "Capacity")}
                </p>
                <p className="text-2xl font-bold text-theme-text mt-1">
                  {summary.total_capacity?.toFixed(0) || 0}
                  <span className="text-sm font-normal text-theme-text-muted ml-1">
                    GB
                  </span>
                </p>
              </div>
              <Database className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-500/50 hover:bg-blue-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-blue-500" />
                  {t("storage.totalUsed", "Used")}
                </p>
                <p className="text-2xl font-bold text-blue-500 mt-1">
                  {summary.total_used?.toFixed(0) || 0}
                  <span className="text-sm font-normal text-theme-text-muted ml-1">
                    GB
                  </span>
                </p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-yellow-500/50 hover:bg-yellow-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-yellow-500" />
                  {t("storage.averageUsage", "Usage")}
                </p>
                <p className="text-2xl font-bold text-yellow-500 mt-1">
                  {summary.average_usage_percent?.toFixed(1) || 0}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-green-500/50 hover:bg-green-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Disc3 className="w-3 h-3 text-green-500" />
                  {t("storage.raidArrays", "RAID")}
                </p>
                <p className="text-2xl font-bold text-theme-text mt-1">
                  {summary.total_raid_arrays || 0}
                </p>
                {(summary.healthy_raids > 0 ||
                  summary.degraded_raids > 0 ||
                  summary.failed_raids > 0) && (
                  <div className="flex gap-2 mt-1 text-xs">
                    {summary.healthy_raids > 0 && (
                      <span className="text-green-400">
                        ✓ {summary.healthy_raids}
                      </span>
                    )}
                    {summary.degraded_raids > 0 && (
                      <span className="text-yellow-400">
                        ⚠ {summary.degraded_raids}
                      </span>
                    )}
                    {summary.failed_raids > 0 && (
                      <span className="text-red-400">
                        ✗ {summary.failed_raids}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Disc3 className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Monitored Servers Section */}
      <div>
        <h2 className="text-lg font-semibold text-theme-text mb-4 flex items-center gap-2">
          <Server size={20} className="text-theme-primary" />
          {t("storage.monitoredServers", "Monitored Servers")}
          <span className="text-sm font-normal text-theme-text-muted">
            ({filteredServices.length})
          </span>
        </h2>

        {/* Services Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-purple-400" size={32} />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-theme-card border border-theme rounded-lg p-12 text-center">
            <HardDrive
              className="mx-auto text-theme-text-muted mb-4"
              size={48}
            />
            <h3 className="text-theme-text font-semibold text-lg mb-2">
              {t("storage.noServices", "No Storage Servers Found")}
            </h3>
            <p className="text-theme-text-muted">
              {searchTerm
                ? t("storage.noSearchResults", "No servers match your search")
                : t(
                    "storage.noServersConfigured",
                    "Configure storage agents on your servers to start monitoring"
                  )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredServices.map((service) => (
              <StorageServiceCard key={service.id} service={service} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Storage;
