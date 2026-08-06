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
  Search,
  TrendingUp,
} from "lucide-react";
import { api } from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

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
  const [, setCurrentTime] = useState(Date.now()); // Force re-render for time updates
  const [activeTab, setActiveTab] = useState(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);

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
    await queryClient.refetchQueries(["services"]);
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
    0,
  );
  const totalBandwidthDown = services.reduce(
    (sum, service) => sum + (service.traffic?.bandwidth_down || 0),
    0,
  );

  // Calculate total traffic (cumulative) across all services
  const totalTrafficUp = services.reduce(
    (sum, service) => sum + Math.abs(service.traffic?.total_up || 0),
    0,
  );
  const totalTrafficDown = services.reduce(
    (sum, service) => sum + Math.abs(service.traffic?.total_down || 0),
    0,
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
          <PageHeader
            icon={TrendingUp}
            title={t("nav.traffic", "Traffic")}
            actions={
              <>
                <button
                  onClick={async () => {
                    setManualRefreshing(true);
                    try {
                      await handleRefresh();
                    } finally {
                      setManualRefreshing(false);
                    }
                  }}
                  disabled={manualRefreshing}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={`text-theme-primary ${
                      manualRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  <span className="text-xs sm:text-sm">
                    {manualRefreshing
                      ? t("common.refreshing", "Refreshing")
                      : t("traffic.page.refresh")}
                  </span>
                </button>
                <div className="relative w-full sm:w-64">
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
              </>
            }
          />

          {/* Summary Cards - Optimized for tablet */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4">
            <StatCard
              label={t("traffic.page.stats.services")}
              value={services.length}
              icon={Server}
              valueClass="text-theme-text"
            />
            <StatCard
              label={t("traffic.page.stats.upload")}
              value={formatBandwidth(totalBandwidthUp)}
              icon={ArrowUp}
              color="blue-500"
            />
            <StatCard
              label={t("traffic.page.stats.download")}
              value={formatBandwidth(totalBandwidthDown)}
              icon={ArrowDown}
              color="green-500"
            />
            <StatCard
              label={t("traffic.page.stats.uploaded")}
              value={formatTraffic(totalTrafficUp)}
              icon={TrendingUp}
              color="blue-500"
            />
            <StatCard
              label={t("traffic.page.stats.downloaded")}
              value={formatTraffic(totalTrafficDown)}
              icon={TrendingUp}
              color="green-500"
            />
            <StatCard
              label={t("traffic.page.stats.totalTraffic")}
              value={formatTraffic(totalTrafficUp + totalTrafficDown)}
              icon={Activity}
            />
          </div>

          {/* Group Tabs */}
          {allGroups.length > 0 && (
            <div className="inline-flex items-center bg-theme-card border border-theme rounded-xl p-1 gap-0.5 overflow-x-auto">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === "ALL"
                    ? "bg-theme-primary text-black shadow-md shadow-theme-primary/25"
                    : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/60"
                }`}
              >
                {t("traffic.page.tabs.all")}
                <span
                  className={`ml-2 text-xs ${
                    activeTab === "ALL"
                      ? "text-black/70"
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
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === groupName
                        ? "bg-theme-primary text-black shadow-md shadow-theme-primary/25"
                        : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/60"
                    }`}
                  >
                    {groupName}
                    <span
                      className={`ml-2 text-xs ${
                        activeTab === groupName
                          ? "text-black/70"
                          : "text-theme-text-muted"
                      }`}
                    >
                      ({groupServices.length})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Services Grid - Optimized for tablet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            {servicesInActiveGroup.length === 0 ? (
              <div className="col-span-full bg-theme-card border border-theme rounded-xl p-8 text-center shadow-lg">
                <Activity
                  size={48}
                  className="mx-auto mb-4 text-theme-text-muted opacity-30"
                />
                <div className="text-center space-y-1 mb-4">
                  <h3 className="text-lg font-semibold text-theme-text">
                    {searchTerm
                      ? t("traffic.page.emptyStates.noMatching")
                      : t(
                          "traffic.emptyState.title",
                          "No Traffic Agents Connected",
                        )}
                  </h3>
                  <p className="text-sm text-theme-text-muted max-w-md mx-auto">
                    {searchTerm
                      ? t(
                          "traffic.page.emptyStates.tryAdjusting",
                          "Try adjusting your search criteria",
                        )
                      : t(
                          "traffic.emptyState.description",
                          "Install the Traffic Agent on your servers to monitor real-time bandwidth usage, upload/download speeds, and network statistics.",
                        )}
                  </p>
                </div>
                {!searchTerm && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <a
                      href="https://github.com/cyb3rgh05t/komandorr/blob/main/traffic/README.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:scale-105"
                    >
                      <Activity size={16} />
                      {t(
                        "traffic.emptyState.setupGuide",
                        "Setup Traffic Agent",
                      )}
                    </a>
                  </div>
                )}
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="min-w-0 bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-lg p-3 hover:border-blue-500/50 transition-all shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                        <div className="p-1 bg-blue-500/20 rounded shrink-0">
                          <ArrowUp className="w-3 h-3 text-blue-400" />
                        </div>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider truncate">
                          {t("traffic.page.stats.uploadSpeed")}
                        </p>
                      </div>
                      <p
                        className="text-lg font-bold text-blue-400 truncate"
                        title={formatBandwidth(
                          service.traffic?.bandwidth_up || 0,
                        )}
                      >
                        {formatBandwidth(service.traffic?.bandwidth_up || 0)}
                      </p>
                    </div>
                    <div className="min-w-0 bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-lg p-3 hover:border-green-500/50 transition-all shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                        <div className="p-1 bg-green-500/20 rounded shrink-0">
                          <ArrowDown className="w-3 h-3 text-green-400" />
                        </div>
                        <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider truncate">
                          {t("traffic.page.stats.downloadSpeed")}
                        </p>
                      </div>
                      <p
                        className="text-lg font-bold text-green-400 truncate"
                        title={formatBandwidth(
                          service.traffic?.bandwidth_down || 0,
                        )}
                      >
                        {formatBandwidth(service.traffic?.bandwidth_down || 0)}
                      </p>
                    </div>
                    <div className="min-w-0 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-3 hover:border-orange-500/50 transition-all shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                        <div className="p-1 bg-orange-500/20 rounded shrink-0">
                          <ArrowUp className="w-3 h-3 text-orange-400" />
                        </div>
                        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider truncate">
                          {t("traffic.page.stats.totalUpload")}
                        </p>
                      </div>
                      <p
                        className="text-lg font-bold text-orange-400 truncate"
                        title={formatTraffic(
                          Math.abs(service.traffic?.total_up || 0),
                        )}
                      >
                        {formatTraffic(
                          Math.abs(service.traffic?.total_up || 0),
                        )}
                      </p>
                    </div>
                    <div className="min-w-0 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 rounded-lg p-3 hover:border-cyan-500/50 transition-all shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                        <div className="p-1 bg-cyan-500/20 rounded shrink-0">
                          <ArrowDown className="w-3 h-3 text-cyan-400" />
                        </div>
                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider truncate">
                          {t("traffic.page.stats.totalDownload")}
                        </p>
                      </div>
                      <p
                        className="text-lg font-bold text-cyan-400 truncate"
                        title={formatTraffic(
                          Math.abs(service.traffic?.total_down || 0),
                        )}
                      >
                        {formatTraffic(
                          Math.abs(service.traffic?.total_down || 0),
                        )}
                      </p>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
