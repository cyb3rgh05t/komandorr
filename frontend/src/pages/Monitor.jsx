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
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

// Mini sparkline chart component - Line/Area chart style
const MiniChart = ({ data = [], serviceId }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-theme-text-muted text-xs bg-[#0a0f1a] rounded border border-gray-800">
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
  const itemsPerPage = 10;

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 10000); // Update every 10 seconds for real-time monitoring
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

  const fetchServices = async () => {
    try {
      const data = await api.getServices();
      setServices(data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
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
      </div>
    );
  }

  // Filter services based on search term
  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, endIndex);

  const stats = {
    total: services.length,
    online: services.filter((s) => s.status === "online").length,
    offline: services.filter((s) => s.status === "offline").length,
    problem: services.filter((s) => s.status === "problem").length,
    avgResponseTime:
      services.filter((s) => s.response_time).length > 0
        ? (
            services
              .filter((s) => s.response_time)
              .reduce((acc, s) => acc + s.response_time, 0) /
            services.filter((s) => s.response_time).length
          ).toFixed(2)
        : "N/A",
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "text-green-500";
      case "offline":
        return "text-red-500";
      case "problem":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case "online":
        return "bg-green-500/10";
      case "offline":
        return "bg-red-500/10";
      case "problem":
        return "bg-yellow-500/10";
      default:
        return "bg-gray-500/10";
    }
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

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Search Bar & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder="Search services..."
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

            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-theme-primary" />
                {t("monitor.totalServices")}
              </p>
              <p className="text-2xl font-bold text-theme-text mt-1">
                {stats.total}
              </p>
            </div>
            <Server className="w-8 h-8 text-theme-primary" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-500" />
                {t("dashboard.online")}
              </p>
              <p className="text-2xl font-bold text-green-500 mt-1">
                {stats.online}
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-red-500" />
                {t("dashboard.offline")}
              </p>
              <p className="text-2xl font-bold text-red-500 mt-1">
                {stats.offline}
              </p>
            </div>
            <Server className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-yellow-500" />
                {t("dashboard.problem")}
              </p>
              <p className="text-2xl font-bold text-yellow-500 mt-1">
                {stats.problem}
              </p>
            </div>
            <Activity className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-500" />
                {t("monitor.avgResponse")}
              </p>
              <p className="text-2xl font-bold text-blue-500 mt-1">
                {typeof stats.avgResponseTime === "number"
                  ? `${stats.avgResponseTime}`
                  : stats.avgResponseTime}
              </p>
            </div>
            <Zap className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {paginatedServices.length === 0 ? (
          <div className="text-center py-12 bg-theme-card rounded-lg border border-theme">
            <Server size={48} className="mx-auto mb-4 text-theme-muted" />
            <h3 className="text-lg font-semibold text-theme-text mb-2">
              {searchTerm ? "No matching services" : t("dashboard.noServices")}
            </h3>
            <p className="text-theme-muted mb-4">
              {searchTerm
                ? `No services found matching "${searchTerm}"`
                : "No services have been added yet."}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/80 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            {paginatedServices.map((service) => (
              <div
                key={service.id}
                className="bg-theme-card border border-theme rounded-lg p-4  transition-all"
              >
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {service.icon && (
                        <div className="w-10 h-10 rounded-lg bg-theme-hover flex items-center justify-center overflow-hidden border border-theme flex-shrink-0">
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
                        <h3 className="text-lg font-semibold text-theme-text mb-2 truncate">
                          {service.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 bg-theme-hover border border-theme rounded-md text-xs font-medium text-theme-text-muted flex items-center gap-1.5">
                            <Server size={12} />
                            {service.type}
                          </span>
                          <span className="px-2.5 py-1 bg-theme-hover border border-theme rounded-md text-xs font-medium text-theme-text-muted flex items-center gap-1.5">
                            <Clock size={12} />
                            {formatLastCheck(service.last_check)}
                          </span>
                          <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-theme-hover hover:bg-theme-primary/10 border border-theme hover:border-theme-primary/50 rounded-md text-xs font-medium text-theme-text-muted hover:text-theme-primary transition-all group/link"
                          >
                            <span className="truncate max-w-[200px]">
                              {service.url.replace(/^https?:\/\//, "")}
                            </span>
                            <ExternalLink
                              size={11}
                              className="flex-shrink-0 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform"
                            />
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                            Current Response Time
                          </p>
                        </div>
                        <p className="text-xl font-bold text-blue-500">
                          {service.response_time.toFixed(2)} ms
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Chart Section */}
                  <div className="bg-gradient-to-br from-theme-hover/40 to-theme-card/20 border border-theme rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-theme-primary/20 rounded">
                        <TrendingUp size={14} className="text-theme-primary" />
                      </div>
                      <span className="text-xs font-bold text-theme-text uppercase tracking-wider">
                        Response Time History
                      </span>
                    </div>

                    {/* Response Time Chart */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                          <TrendingUp size={12} />
                          Response Time
                        </span>
                        {(() => {
                          const history = (service.response_history || []).map(
                            (point) => point.response_time
                          );
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
                                Avg: {avg.toFixed(1)} ms • Max: {max.toFixed(1)}{" "}
                                ms
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <MiniChart
                        serviceId={service.id}
                        data={(() => {
                          const history = (service.response_history || []).map(
                            (point) => point.response_time
                          );
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
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {filteredServices.length > itemsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme-card border border-theme rounded-xl p-5 shadow-sm">
          <div className="text-sm font-medium text-theme-text-muted">
            Showing{" "}
            <span className="text-theme-text font-semibold">
              {startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="text-theme-text font-semibold">
              {Math.min(endIndex, filteredServices.length)}
            </span>{" "}
            of{" "}
            <span className="text-theme-text font-semibold">
              {filteredServices.length}
            </span>{" "}
            services
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2.5 bg-theme-hover hover:bg-theme-primary border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
              title="Previous page"
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
              title="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
