import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../context/ToastContext";
import {
  Activity,
  ArrowUp,
  ArrowDown,
  Server,
  RefreshCw,
  Loader2,
  TrendingUp,
  Search,
} from "lucide-react";
import { api } from "../services/api";

// Traffic chart component - Line/Area chart style for bandwidth history
const TrafficChart = ({ data = [], type = "upload", serviceId, t }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-theme-text-muted text-xs bg-[#0a0f1a] rounded border border-gray-800">
        {t("traffic.page.noTrafficData")}
      </div>
    );
  }

  // Extract bandwidth values based on type
  const values = data.map((point) =>
    type === "upload" ? point.bandwidth_up : point.bandwidth_down
  );

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || max * 0.1 || 1;

  // Create unique gradient ID
  const gradientId = `traffic-gradient-${type}-${serviceId}-${Date.now()}`;

  // Create SVG path
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

  // Color based on type
  const color = type === "upload" ? "#3b82f6" : "#22c55e"; // blue for upload, green for download

  return (
    <div className="relative h-20 bg-[#0a0f1a] rounded border border-gray-800/50 overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <line
          x1="0"
          y1="20"
          x2={width}
          y2="20"
          stroke="rgba(255,255,255,0.02)"
          strokeWidth="0.5"
        />
        <line
          x1="0"
          y1="40"
          x2={width}
          y2="40"
          stroke="rgba(255,255,255,0.02)"
          strokeWidth="0.5"
        />
        <line
          x1="0"
          y1="60"
          x2={width}
          y2="60"
          stroke="rgba(255,255,255,0.02)"
          strokeWidth="0.5"
        />
        <line
          x1="0"
          y1="80"
          x2={width}
          y2="80"
          stroke="rgba(255,255,255,0.02)"
          strokeWidth="0.5"
        />

        {/* Area fill with gradient */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* The line itself */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Hover overlay for tooltip */}
      <div className="absolute inset-0 flex">
        {values.map((value, index) => (
          <div
            key={index}
            className="flex-1 group relative"
            title={`${value.toFixed(2)} MB/s`}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/95 border border-gray-700 rounded text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
              {value.toFixed(2)} MB/s
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Traffic() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Use React Query for services data with traffic filtering
  const {
    data: allServices = [],
    isLoading: loading,
    isFetching,
  } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.getServices(),
    staleTime: 5000,
    refetchInterval: 5000,
    placeholderData: (previousData) => previousData,
  });

  // Filter services that have traffic data
  const services = allServices.filter((s) => s.traffic);

  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [, setCurrentTime] = useState(Date.now()); // Force re-render for time updates
  const [activeTab, setActiveTab] = useState(null);

  // Update current time every second to refresh "X seconds ago" display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Manage active tab based on available groups
  useEffect(() => {
    if (services.length === 0) return;

    const filteredServices = services.filter((service) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        service.name.toLowerCase().includes(searchLower) ||
        service.url.toLowerCase().includes(searchLower) ||
        service.type.toLowerCase().includes(searchLower) ||
        (service.group && service.group.toLowerCase().includes(searchLower))
      );
    });

    const grouped = filteredServices.reduce((acc, service) => {
      const groupName = service.group || "Ungrouped";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(service);
      return acc;
    }, {});

    const groupNames = Object.keys(grouped);

    // Set initial tab if not set
    if (!activeTab && groupNames.length > 0) {
      setActiveTab("ALL");
    }
    // Only reset tab if current tab no longer exists
    else if (
      activeTab &&
      activeTab !== "ALL" &&
      !groupNames.includes(activeTab) &&
      groupNames.length > 0
    ) {
      setActiveTab("ALL");
    }
  }, [services, searchTerm, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries(["services"]);
    setRefreshing(false);
    toast.success(t("traffic.page.refreshSuccess"));
  };

  const formatBandwidth = (mbps) => {
    if (!mbps) return "0 KB/s";
    if (mbps < 1) {
      return `${(mbps * 1024).toFixed(2)} KB/s`;
    }
    return `${mbps.toFixed(2)} MB/s`;
  };

  const formatTraffic = (gb) => {
    if (!gb) return "0 MB";
    if (gb < 1) {
      return `${(gb * 1024).toFixed(2)} MB`;
    }
    if (gb > 1024) {
      return `${(gb / 1024).toFixed(2)} TB`;
    }
    return `${gb.toFixed(2)} GB`;
  };

  const formatLastCheck = (lastCheck) => {
    if (!lastCheck) return "Never";
    const date = new Date(lastCheck);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Calculate total bandwidth across all services
  const totalBandwidthUp = services.reduce(
    (sum, service) => sum + (service.traffic?.bandwidth_up || 0),
    0
  );
  const totalBandwidthDown = services.reduce(
    (sum, service) => sum + (service.traffic?.bandwidth_down || 0),
    0
  );

  // Calculate total traffic (cumulative) across all services
  const totalTrafficUp = services.reduce(
    (sum, service) => sum + (service.traffic?.total_up || 0),
    0
  );
  const totalTrafficDown = services.reduce(
    (sum, service) => sum + (service.traffic?.total_down || 0),
    0
  );

  // Filter and group services
  const filteredServices = services.filter((service) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      service.name.toLowerCase().includes(searchLower) ||
      service.url.toLowerCase().includes(searchLower) ||
      service.type.toLowerCase().includes(searchLower) ||
      (service.group && service.group.toLowerCase().includes(searchLower))
    );
  });

  const groupedServices = filteredServices.reduce((acc, service) => {
    const groupName = service.group || "Ungrouped";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(service);
    return acc;
  }, {});

  const allGroups = Object.keys(groupedServices);
  const servicesInActiveGroup =
    activeTab && activeTab !== "ALL"
      ? groupedServices[activeTab] || []
      : filteredServices;

  const LoadingServiceCard = () => (
    <div className="bg-theme-card border border-theme rounded-lg p-6">
      <div className="space-y-4 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-theme-hover rounded w-1/3" />
            <div className="flex gap-2">
              <div className="h-5 bg-theme-hover rounded w-20" />
              <div className="h-5 bg-theme-hover rounded w-32" />
            </div>
          </div>
          <div className="h-6 w-20 bg-theme-hover rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="h-48 bg-theme-hover/30 rounded border border-theme" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-theme-hover/30 rounded" />
            <div className="h-16 bg-theme-hover/30 rounded" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {loading ? (
        <>
          {/* Stats Cards Loading */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-theme-card border border-theme rounded-xl p-5 shadow-sm"
              >
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-theme-hover rounded w-24" />
                  <div className="h-8 bg-theme-hover rounded w-20" />
                </div>
              </div>
            ))}
          </div>
          {/* Service Cards Loading */}
          <div className="grid grid-cols-1 gap-5">
            <LoadingServiceCard />
            <LoadingServiceCard />
          </div>
        </>
      ) : (
        <>
          {/* Header with Search & Refresh */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
                size={18}
              />
              <input
                type="text"
                placeholder={t("traffic.page.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme rounded-lg text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all"
              />
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
            >
              <RefreshCw
                size={16}
                className={`text-theme-primary ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span className="text-xs sm:text-sm">
                {t("traffic.page.refresh")}
              </span>
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Total Services */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-theme-primary hover:bg-theme-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Server className="w-3 h-3 text-theme-primary" />
                    {t("traffic.page.stats.services")}
                  </p>
                  <p className="text-2xl font-bold text-theme-text mt-1">
                    {services.length}
                  </p>
                </div>
                <Server className="w-8 h-8 text-theme-primary" />
              </div>
            </div>

            {/* Upload Speed */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-500/50 hover:bg-blue-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <ArrowUp className="w-3 h-3 text-blue-500" />
                    {t("traffic.page.stats.upload")}
                  </p>
                  <p className="text-2xl font-bold text-blue-500 mt-1">
                    {formatBandwidth(totalBandwidthUp)}
                  </p>
                </div>
                <ArrowUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            {/* Download Speed */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-green-500/50 hover:bg-green-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <ArrowDown className="w-3 h-3 text-green-500" />
                    {t("traffic.page.stats.download")}
                  </p>
                  <p className="text-2xl font-bold text-green-500 mt-1">
                    {formatBandwidth(totalBandwidthDown)}
                  </p>
                </div>
                <ArrowDown className="w-8 h-8 text-green-500" />
              </div>
            </div>

            {/* Total Uploaded */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-500/50 hover:bg-blue-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                    {t("traffic.page.stats.uploaded")}
                  </p>
                  <p className="text-2xl font-bold text-blue-500 mt-1">
                    {formatTraffic(totalTrafficUp)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            {/* Total Downloaded */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-green-500/50 hover:bg-green-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    {t("traffic.page.stats.downloaded")}
                  </p>
                  <p className="text-2xl font-bold text-green-500 mt-1">
                    {formatTraffic(totalTrafficDown)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            {/* Total Traffic */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-theme-primary hover:bg-theme-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Activity className="w-3 h-3 text-theme-primary" />
                    {t("traffic.page.stats.totalTraffic")}
                  </p>
                  <p className="text-2xl font-bold text-theme-primary mt-1">
                    {formatTraffic(totalTrafficUp + totalTrafficDown)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-theme-primary" />
              </div>
            </div>
          </div>

          {/* Group Tabs */}
          {allGroups.length > 0 && (
            <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === "ALL"
                      ? "bg-theme-hover text-white shadow-md"
                      : "bg-theme-accent text-theme-text hover:bg-theme-hover"
                  }`}
                >
                  {t("traffic.page.tabs.all")}
                  <span
                    className={`ml-2 text-xs ${
                      activeTab === "ALL"
                        ? "text-white/80"
                        : "text-theme-text-muted"
                    }`}
                  >
                    ({filteredServices.length})
                  </span>
                </button>
                {allGroups.map((groupName) => {
                  const groupServices = groupedServices[groupName] || [];
                  return (
                    <button
                      key={groupName}
                      onClick={() => setActiveTab(groupName)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        activeTab === groupName
                          ? "bg-theme-hover text-white shadow-md"
                          : "bg-theme-accent text-theme-text hover:bg-theme-hover"
                      }`}
                    >
                      {groupName}
                      <span
                        className={`ml-2 text-xs ${
                          activeTab === groupName
                            ? "text-white/80"
                            : "text-theme-text-muted"
                        }`}
                      >
                        ({groupServices.length})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {servicesInActiveGroup.length === 0 ? (
              <div className="bg-theme-card border border-theme rounded-lg p-8 text-center shadow-sm">
                <Server
                  size={48}
                  className="mx-auto mb-4 text-theme-text-muted"
                />
                <h3 className="text-lg font-semibold text-theme-text mb-2">
                  {searchTerm
                    ? t("traffic.page.emptyStates.noMatching")
                    : t("traffic.page.emptyStates.noServices")}
                </h3>
                <p className="text-theme-text-muted">
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "Deploy the traffic agent on your servers to start monitoring"}
                </p>
              </div>
            ) : (
              servicesInActiveGroup.map((service) => (
                <a
                  key={service.id}
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-theme-card border border-theme rounded-lg p-4 hover:border-theme-primary hover:shadow-lg transition-all group"
                >
                  {/* Service Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-theme-text mb-1.5 group-hover:text-theme-primary transition-colors">
                        {service.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {service.description && (
                          <span className="px-2 py-0.5 bg-theme-hover border border-theme rounded text-xs font-medium text-theme-text-muted">
                            {service.description}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-theme-hover border border-theme rounded text-xs font-medium text-theme-text-muted flex items-center gap-1">
                          <Server size={12} />
                          {service.type.charAt(0).toUpperCase() +
                            service.type.slice(1)}
                        </span>
                        <span className="px-2 py-0.5 bg-theme-hover border border-theme rounded text-xs font-medium text-theme-text-muted flex items-center gap-1">
                          <Activity size={12} />
                          {formatLastCheck(service.traffic?.last_updated)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Traffic Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <ArrowUp className="w-3 h-3 text-blue-400" />
                        <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                          {t("traffic.page.stats.uploadSpeed")}
                        </p>
                      </div>
                      <p className="text-base font-bold text-blue-500">
                        {formatBandwidth(service.traffic?.bandwidth_up || 0)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <ArrowDown className="w-3 h-3 text-green-400" />
                        <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">
                          {t("traffic.page.stats.downloadSpeed")}
                        </p>
                      </div>
                      <p className="text-base font-bold text-green-500">
                        {formatBandwidth(service.traffic?.bandwidth_down || 0)}
                      </p>
                    </div>
                    <div className="bg-theme-card border border-theme rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <ArrowUp className="w-3 h-3 text-theme-text-muted" />
                        <p className="text-[10px] text-theme-text-muted font-semibold uppercase tracking-wider">
                          {t("traffic.page.stats.totalUpload")}
                        </p>
                      </div>
                      <p className="text-base font-bold text-theme-text">
                        {formatTraffic(service.traffic?.total_up || 0)}
                      </p>
                    </div>
                    <div className="bg-theme-card border border-theme rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <ArrowDown className="w-3 h-3 text-theme-text-muted" />
                        <p className="text-[10px] text-theme-text-muted font-semibold uppercase tracking-wider">
                          {t("traffic.page.stats.totalDownload")}
                        </p>
                      </div>
                      <p className="text-base font-bold text-theme-text">
                        {formatTraffic(service.traffic?.total_down || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Traffic Charts */}
                  {service.traffic_history &&
                    service.traffic_history.length > 0 && (
                      <div className="bg-theme-card border border-theme rounded-lg p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-theme-primary/20 rounded">
                            <TrendingUp
                              size={14}
                              className="text-theme-primary"
                            />
                          </div>
                          <span className="text-xs font-bold text-theme-text uppercase tracking-wider">
                            {t("traffic.page.charts.bandwidthHistory")}
                          </span>
                        </div>

                        {/* Upload Chart */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs font-semibold text-blue-400 flex items-center gap-1">
                                <ArrowUp size={10} />
                                {t("traffic.page.charts.upload")}
                              </span>
                            </div>
                            {(() => {
                              const values = service.traffic_history.map(
                                (p) => p.bandwidth_up
                              );
                              if (values.length > 0) {
                                const avg =
                                  values.reduce((a, b) => a + b, 0) /
                                  values.length;
                                const max = Math.max(...values);
                                return (
                                  <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs font-medium text-blue-400">
                                      {t("traffic.page.stats.avg")}:{" "}
                                      {avg.toFixed(2)} MB/s
                                    </span>
                                    <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs font-medium text-blue-400">
                                      {t("traffic.page.stats.max")}:{" "}
                                      {max.toFixed(2)} MB/s
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <TrafficChart
                            data={service.traffic_history}
                            type="upload"
                            serviceId={service.id}
                            t={t}
                          />
                        </div>

                        {/* Download Chart */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs font-semibold text-green-400 flex items-center gap-1">
                                <ArrowDown size={10} />
                                {t("traffic.page.charts.download")}
                              </span>
                            </div>
                            {(() => {
                              const values = service.traffic_history.map(
                                (p) => p.bandwidth_down
                              );
                              if (values.length > 0) {
                                const avg =
                                  values.reduce((a, b) => a + b, 0) /
                                  values.length;
                                const max = Math.max(...values);
                                return (
                                  <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs font-medium text-green-400">
                                      {t("traffic.page.stats.avg")}:{" "}
                                      {avg.toFixed(2)} MB/s
                                    </span>
                                    <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs font-medium text-green-400">
                                      {t("traffic.page.stats.max")}:{" "}
                                      {max.toFixed(2)} MB/s
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <TrafficChart
                            data={service.traffic_history}
                            type="download"
                            serviceId={service.id}
                            t={t}
                          />
                        </div>
                      </div>
                    )}
                </a>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
