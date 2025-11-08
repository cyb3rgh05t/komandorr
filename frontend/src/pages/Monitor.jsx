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
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function Monitor() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 5000); // Update every 5 seconds for real-time monitoring
    return () => clearInterval(interval);
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
      showToast(t("success.servicesChecked") || "Services checked", "success");
    } catch (error) {
      console.error("Failed to check all services:", error);
      showToast(
        t("errors.checkServices") || "Failed to check services",
        "error"
      );
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
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
      {/* Search Bar, Live Indicator & Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={20}
          />
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme rounded-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-theme-text">LIVE</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={18}
              className={`text-theme-primary transition-transform duration-500 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span className="text-sm">{t("service.checkNow")}</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Server className="text-theme-primary" size={24} />
            <div>
              <p className="text-sm text-theme-text-muted">
                {t("monitor.totalServices")}
              </p>
              <p className="text-2xl font-bold text-theme-text">
                {stats.total}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Activity className="text-green-500" size={24} />
            <div>
              <p className="text-sm text-theme-text-muted">
                {t("dashboard.online")}
              </p>
              <p className="text-2xl font-bold text-green-500">
                {stats.online}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Server className="text-red-500" size={24} />
            <div>
              <p className="text-sm text-theme-text-muted">
                {t("dashboard.offline")}
              </p>
              <p className="text-2xl font-bold text-red-500">{stats.offline}</p>
            </div>
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Activity className="text-yellow-500" size={24} />
            <div>
              <p className="text-sm text-theme-text-muted">
                {t("dashboard.problem")}
              </p>
              <p className="text-2xl font-bold text-yellow-500">
                {stats.problem}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Zap className="text-blue-500" size={24} />
            <div>
              <p className="text-sm text-theme-text-muted">
                {t("monitor.avgResponse")}
              </p>
              <p className="text-2xl font-bold text-blue-500">
                {typeof stats.avgResponseTime === "number"
                  ? `${stats.avgResponseTime}ms`
                  : stats.avgResponseTime}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Monitor Table */}
      <div className="bg-theme-card border border-theme rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-hover">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-theme-text">
                  {t("service.name")}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-theme-text">
                  {t("service.type")}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-theme-text">
                  {t("service.status")}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-theme-text">
                  {t("service.responseTime")}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-theme-text">
                  {t("service.lastCheck")}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-theme-text">
                  {t("service.url")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {paginatedServices.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-theme-text-muted"
                  >
                    {searchTerm
                      ? "No services found matching your search"
                      : t("dashboard.noServices")}
                  </td>
                </tr>
              ) : (
                paginatedServices.map((service) => (
                  <tr
                    key={service.id}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {service.icon && (
                          <img
                            src={service.icon}
                            alt=""
                            className="w-6 h-6 rounded"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        )}
                        <span className="font-medium text-theme-text">
                          {service.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-theme-text-muted capitalize">
                        {service.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusBg(
                          service.status
                        )} ${getStatusColor(service.status)}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        {service.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {service.response_time ? (
                        <div className="flex items-center gap-2">
                          <TrendingUp size={16} className="text-blue-500" />
                          <span className="text-theme-text">
                            {service.response_time.toFixed(2)}ms
                          </span>
                        </div>
                      ) : (
                        <span className="text-theme-text-muted">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-theme-text-muted">
                        <Clock size={16} />
                        <span className="text-sm">
                          {formatLastCheck(service.last_check)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <a
                        href={service.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-theme-primary hover:underline text-sm"
                      >
                        {service.url.length > 40
                          ? service.url.substring(0, 40) + "..."
                          : service.url}
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredServices.length > itemsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme-card border border-theme rounded-lg p-4">
          <div className="text-sm text-theme-text-muted">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, filteredServices.length)} of{" "}
            {filteredServices.length} services
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-theme-hover border border-theme rounded-lg text-theme-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-primary hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-1">
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
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "bg-theme-primary text-white"
                          : "bg-theme-hover border border-theme text-theme-text hover:bg-theme-primary hover:text-white"
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
                    <span key={page} className="text-theme-text-muted">
                      ...
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
              className="p-2 bg-theme-hover border border-theme rounded-lg text-theme-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-primary hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
