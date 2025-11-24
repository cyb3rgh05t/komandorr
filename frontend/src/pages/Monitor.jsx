import { useTranslation } from "react-i18next";
import {
  Activity,
  Server,
  Clock,
  Zap,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

// Mini sparkline chart component - Line/Area chart style
const MiniChart = ({ data = [], serviceId }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-theme-text-muted text-xs bg-[#0a0f1a] rounded border border-gray-800">
        {/* Note: t() not available in this component scope, using hardcoded fallback */}
        No data yet - waiting for measurements
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || max * 0.1 || 1;

  // Create unique gradient ID for this specific chart
  const gradientId = `gradient-${serviceId}-${Date.now()}`;

  // Create SVG path for the line
  const width = 100;
  const height = 100;

  const points = data.map((value, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * width;
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
        {/* Grid lines - very subtle */}
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

        {/* Area fill with gradient - unique ID per service */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: "#22c55e", stopOpacity: 0.2 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "#22c55e", stopOpacity: 0 }}
            />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* The line itself */}
        <path
          d={linePath}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Hover overlay for tooltip */}
      <div className="absolute inset-0 flex">
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 group relative"
            title={`${value.toFixed(1)}ms`}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/95 border border-gray-700 rounded text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
              {value.toFixed(1)}ms
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Monitor() {
  const { t } = useTranslation();
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [, setCurrentTime] = useState(Date.now()); // Force re-render for time updates
  const [activeTab, setActiveTab] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null); // null = all, 'online', 'offline', 'problem'
  const itemsPerPage = 10;

  useEffect(() => {
    fetchServices();
    const interval = setInterval(() => {
      fetchServices(true); // Pass true to indicate auto-refresh
    }, 5000); // Update every 5 seconds for real-time monitoring
    return () => clearInterval(interval);
  }, []);

  // Update current time every second to refresh "X seconds ago" display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchServices = async (isAutoRefresh = false) => {
    try {
      // Save current scroll position and page before updating
      const currentScrollY = isAutoRefresh ? window.scrollY : 0;
      const currentPageNum = isAutoRefresh ? currentPage : 1;

      const data = await api.getServices();
      setServices(data);

      // Don't manage activeTab here - let useEffect handle it

      // Restore scroll position after state update for auto-refresh
      if (isAutoRefresh && currentScrollY > 0) {
        setTimeout(() => {
          window.scrollTo(0, currentScrollY);
        }, 0);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
    try {
      setRefreshing(true);
      const data = await api.checkAllServices();
      setServices(data);
      toast.success(t("success.servicesChecked") || "Services checked");
    } catch (error) {
      console.error("Failed to check all services:", error);
      toast.error(t("errors.checkServices") || "Failed to check services");
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const LoadingServiceCard = () => (
    <div className="bg-theme-card border border-theme rounded-lg p-6">
      <div className="space-y-4 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-theme-hover rounded w-2/5" />
            <div className="flex gap-2">
              <div className="h-5 bg-theme-hover rounded w-16" />
              <div className="h-5 bg-theme-hover rounded w-24" />
              <div className="h-5 bg-theme-hover rounded w-32" />
            </div>
          </div>
          <div className="h-6 w-20 bg-theme-hover rounded-full" />
        </div>
        <div className="h-20 bg-theme-hover/30 rounded border border-theme" />
      </div>
    </div>
  );

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

  // Calculate stats
  const stats = {
    total: services.length,
    online: services.filter((s) => s.status === "online").length,
    offline: services.filter((s) => s.status === "offline").length,
    problem: services.filter(
      (s) => s.status === "online" && s.response_time > 1000
    ).length,
    avgResponseTime:
      services.length > 0
        ? Math.round(
            services.reduce((sum, s) => sum + (s.response_time || 0), 0) /
              services.length
          )
        : 0,
  };

  // Filter services based on search and status
  const filteredServices = services.filter((service) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      service.name.toLowerCase().includes(searchLower) ||
      service.url.toLowerCase().includes(searchLower) ||
      service.type.toLowerCase().includes(searchLower) ||
      (service.group && service.group.toLowerCase().includes(searchLower));

    const matchesStatus =
      statusFilter === null ||
      (statusFilter === "online" && service.status === "online") ||
      (statusFilter === "offline" && service.status === "offline") ||
      (statusFilter === "problem" &&
        service.status === "online" &&
        service.response_time > 1000);

    return matchesSearch && matchesStatus;
  });

  // Group services
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

  // Pagination
  const totalPages = Math.ceil(servicesInActiveGroup.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = servicesInActiveGroup.slice(startIndex, endIndex);

  // Helper functions for status styling
  const getStatusBg = (status) => {
    switch (status) {
      case "online":
        return "bg-green-500/10";
      case "offline":
        return "bg-red-500/10";
      default:
        return "bg-gray-500/10";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "text-green-500";
      case "offline":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {loading ? (
        <>
          {/* Stats Cards Loading */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-theme-card border border-theme rounded-xl p-5 shadow-sm"
              >
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-theme-hover rounded w-24" />
                  <div className="h-8 bg-theme-hover rounded w-16" />
                </div>
              </div>
            ))}
          </div>
          {/* Service Cards Loading */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <LoadingServiceCard />
            <LoadingServiceCard />
            <LoadingServiceCard />
            <LoadingServiceCard />
          </div>
        </>
      ) : (
        <>
          {/* Search Bar & Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
                size={18}
              />
              <input
                type="text"
                placeholder={t("monitor.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme rounded-lg text-theme-text text-sm placeholder-theme-text-muted transition-all focus:outline-none focus:border-theme-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme rounded-lg text-sm font-medium text-theme-text transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  size={16}
                  className={`text-theme-primary transition-transform duration-500 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />

                <span>{t("monitor.refresh")}</span>
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button
              onClick={() => setStatusFilter(null)}
              className={`relative bg-theme-card border rounded-lg p-4 transition-all hover:shadow-lg ${
                statusFilter === null
                  ? "border-theme-primary"
                  : "border-theme hover:border-theme-primary/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                    {t("monitor.stats.total")}
                  </div>
                  <div className="text-3xl font-bold text-theme-text">
                    {stats.total}
                  </div>
                </div>
                <div className="text-theme-text-muted opacity-60">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                  >
                    <rect x="3" y="4" width="18" height="4" rx="1" />
                    <rect x="3" y="10" width="18" height="4" rx="1" />
                    <rect x="3" y="16" width="18" height="4" rx="1" />
                  </svg>
                </div>
              </div>
            </button>
            <button
              onClick={() => setStatusFilter("online")}
              className={`relative bg-theme-card border rounded-lg p-4 transition-all hover:shadow-lg ${
                statusFilter === "online"
                  ? "border-green-500"
                  : "border-theme hover:border-green-500/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                    {t("monitor.stats.online")}
                  </div>
                  <div className="text-3xl font-bold text-green-500">
                    {stats.online}
                  </div>
                </div>
                <div className="text-green-500 opacity-60">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
            </button>
            <button
              onClick={() => setStatusFilter("offline")}
              className={`relative bg-theme-card border rounded-lg p-4 transition-all hover:shadow-lg ${
                statusFilter === "offline"
                  ? "border-red-500"
                  : "border-theme hover:border-red-500/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                    {t("monitor.stats.offline")}
                  </div>
                  <div className="text-3xl font-bold text-red-500">
                    {stats.offline}
                  </div>
                </div>
                <div className="text-red-500 opacity-60">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                </div>
              </div>
            </button>
            <button
              onClick={() => setStatusFilter("problem")}
              className={`relative bg-theme-card border rounded-lg p-4 transition-all hover:shadow-lg ${
                statusFilter === "problem"
                  ? "border-yellow-500"
                  : "border-theme hover:border-yellow-500/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                    {t("monitor.stats.problem")}
                    <div className="text-[9px] normal-case tracking-normal text-theme-text-muted/70 mt-0.5 font-normal">
                      {t("monitor.stats.slowLabel")}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-yellow-500">
                    {stats.problem}
                  </div>
                </div>
                <div className="text-yellow-500 opacity-60">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
            </button>
            <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-lg hover:border-blue-500/50">
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                    {t("monitor.stats.avgResponse")}
                  </div>
                  <div className="text-3xl font-bold text-blue-500">
                    {stats.avgResponseTime}
                    <span className="text-sm text-blue-400 ml-1">
                      {t("monitor.stats.ms")}
                    </span>
                  </div>
                </div>
                <div className="text-blue-500 opacity-60">
                  <Zap className="w-10 h-10" strokeWidth={1} />
                </div>
              </div>
            </div>
          </div>

          {/* Group Tabs */}
          {allGroups.length > 0 && (
            <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => {
                    setActiveTab("ALL");
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === "ALL"
                      ? "bg-theme-hover text-white shadow-md"
                      : "bg-theme-accent text-theme-text hover:bg-theme-hover"
                  }`}
                >
                  {t("monitor.tabs.all")}
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
                      onClick={() => {
                        setActiveTab(groupName);
                        setCurrentPage(1); // Reset to first page when changing tabs
                      }}
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

          {/* Services List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {paginatedServices.length === 0 ? (
              <div className="bg-theme-card border border-theme rounded-lg p-8 text-center shadow-sm">
                {statusFilter !== null ? (
                  <>
                    <div className="text-6xl mb-4">
                      {statusFilter === "online" && "🟢"}
                      {statusFilter === "offline" && "✓"}
                      {statusFilter === "problem" && "✓"}
                    </div>
                    <h3 className="text-xl font-semibold text-theme-primary mb-2">
                      {statusFilter === "online" &&
                        t("monitor.emptyStates.noOnline.title")}
                      {statusFilter === "offline" &&
                        t("monitor.emptyStates.noOffline.title")}
                      {statusFilter === "problem" &&
                        t("monitor.emptyStates.noProblem.title")}
                    </h3>
                    <p className="text-theme-text-muted">
                      {statusFilter === "online" &&
                        t("monitor.emptyStates.noOnline.description")}
                      {statusFilter === "offline" &&
                        t("monitor.emptyStates.noOffline.description")}
                      {statusFilter === "problem" &&
                        t("monitor.emptyStates.noProblem.description")}
                    </p>
                  </>
                ) : (
                  <>
                    <Server
                      size={48}
                      className="mx-auto mb-4 text-theme-text-muted"
                    />
                    <h3 className="text-lg font-semibold text-theme-text mb-2">
                      {searchTerm
                        ? t("monitor.emptyStates.noMatching.title")
                        : t("monitor.emptyStates.noServices.title")}
                    </h3>
                    <p className="text-theme-text-muted mb-4">
                      {searchTerm
                        ? t("monitor.emptyStates.noMatching.description", {
                            searchTerm,
                          })
                        : t("monitor.emptyStates.noServices.description")}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/80 transition-colors"
                      >
                        {t("monitor.emptyStates.clearSearch")}
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                {paginatedServices.map((service) => (
                  <a
                    key={service.id}
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-theme-card border border-theme rounded-lg p-4 transition-all hover:border-theme-primary hover:shadow-lg group"
                  >
                    <div className="space-y-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {service.icon && (
                            <div className="w-10 h-10 rounded-lg bg-theme-hover flex items-center justify-center overflow-hidden border border-theme flex-shrink-0 group-hover:border-theme-primary/50 transition-colors">
                              <img
                                src={service.icon}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 text-theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg></div>`;
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-theme-text mb-2 truncate group-hover:text-theme-primary transition-colors">
                              {service.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              {service.description && (
                                <span className="px-2.5 py-1 bg-theme-hover border border-theme rounded-md text-xs font-medium text-theme-text-muted">
                                  {service.description}
                                </span>
                              )}
                              <span className="px-2.5 py-1 bg-theme-hover border border-theme rounded-md text-xs font-medium text-theme-text-muted flex items-center gap-1.5">
                                <Server size={12} />
                                {service.type.charAt(0).toUpperCase() +
                                  service.type.slice(1)}
                              </span>
                              <span className="px-2.5 py-1 bg-theme-hover border border-theme rounded-md text-xs font-medium text-theme-text-muted flex items-center gap-1.5">
                                <Clock size={12} />
                                {formatLastCheck(service.last_check)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {service.status === "online" &&
                            service.response_time > 1000 && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 text-xs font-bold uppercase tracking-wider">
                                <AlertTriangle size={12} />
                                {t("monitor.service.slow")}
                              </span>
                            )}
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${getStatusBg(
                              service.status
                            )} ${getStatusColor(service.status)} border ${
                              service.status === "online"
                                ? "border-green-500/30"
                                : service.status === "offline"
                                ? "border-red-500/30"
                                : "border-yellow-500/30"
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current" />
                            {service.status}
                          </span>
                        </div>
                      </div>

                      {/* Response Time Stats */}
                      {service.response_time && (
                        <div className="grid grid-cols-1 gap-3">
                          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <TrendingUp className="w-3 h-3 text-blue-400" />
                              <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                                {t("monitor.service.currentResponseTime")}
                              </p>
                            </div>
                            <p className="text-xl font-bold text-blue-500">
                              {service.response_time.toFixed(2)}{" "}
                              {t("monitor.stats.ms")}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Chart Section */}
                      <div className="bg-theme-card border border-theme rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-theme-primary/20 rounded">
                            <TrendingUp
                              size={14}
                              className="text-theme-primary"
                            />
                          </div>
                          <span className="text-xs font-bold text-theme-text uppercase tracking-wider">
                            {t("monitor.service.responseTimeHistory")}
                          </span>
                        </div>

                        {/* Response Time Chart */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                              <TrendingUp size={12} />
                              {t("monitor.service.responseTime")}
                            </span>
                            {(() => {
                              const history = (
                                service.response_history || []
                              ).map((point) => point.response_time);
                              const displayData =
                                history.length > 0
                                  ? history
                                  : service.response_time
                                  ? [service.response_time]
                                  : [];

                              if (displayData.length > 0) {
                                const avg =
                                  displayData.reduce((a, b) => a + b, 0) /
                                  displayData.length;
                                const max = Math.max(...displayData);
                                return (
                                  <span className="text-xs text-theme-text-muted">
                                    {t("monitor.service.avg")}: {avg.toFixed(1)}{" "}
                                    {t("monitor.stats.ms")} •{" "}
                                    {t("monitor.service.max")}: {max.toFixed(1)}{" "}
                                    {t("monitor.stats.ms")}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <MiniChart
                            serviceId={service.id}
                            data={(() => {
                              const history = (
                                service.response_history || []
                              ).map((point) => point.response_time);
                              return history.length > 0
                                ? history
                                : service.response_time
                                ? [service.response_time]
                                : [];
                            })()}
                          />
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </>
            )}
          </div>

          {/* Pagination */}
          {servicesInActiveGroup.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme-card border border-theme rounded-xl p-5 shadow-sm">
              <div className="text-sm font-medium text-theme-text-muted">
                {t("monitor.pagination.showing")}{" "}
                <span className="text-theme-text font-semibold">
                  {startIndex + 1}
                </span>{" "}
                {t("monitor.pagination.to")}{" "}
                <span className="text-theme-text font-semibold">
                  {Math.min(endIndex, servicesInActiveGroup.length)}
                </span>{" "}
                {t("monitor.pagination.of")}{" "}
                <span className="text-theme-text font-semibold">
                  {servicesInActiveGroup.length}
                </span>{" "}
                {t("monitor.pagination.services")}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2.5 bg-theme-hover hover:bg-theme-primary border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                  title={t("monitor.pagination.previous")}
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-1.5">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                            currentPage === page
                              ? "bg-theme-primary text-white shadow-md scale-105"
                              : "bg-theme-hover hover:bg-theme-primary/20 border border-theme text-theme-text hover:text-theme-primary hover:border-theme-primary/50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="text-theme-text-muted px-2">
                          •••
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2.5 bg-theme-hover hover:bg-theme-primary border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                  title={t("monitor.pagination.next")}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
