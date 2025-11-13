import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { api } from "@/services/api";
import DashboardServiceCard from "@/components/DashboardServiceCard";
import DashboardTrafficChart from "@/components/DashboardTrafficChart";
import ServiceModal from "@/components/ServiceModal";

const API_URL = "/api";
const REPO_URL = "https://github.com/cyb3rgh05t/komandorr/releases/latest";

export default function Dashboard() {
  const { t } = useTranslation();
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null); // null = all, 'online', 'offline', 'problem'
  const [refreshing, setRefreshing] = useState(false);
  const [trafficData, setTrafficData] = useState(null);
  const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);
  const [dashboardVisibility, setDashboardVisibility] = useState(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem("dashboardVisibility");
    return saved
      ? JSON.parse(saved)
      : {
          stats: true,
          trafficChart: true,
          services: true,
        };
  });
  const [chartLineThickness, setChartLineThickness] = useState(() => {
    // Load from localStorage or use default (0.25px for ultra-thin lines)
    const saved = localStorage.getItem("chartLineThickness");
    return saved ? parseFloat(saved) : 0.25;
  });
  const [version, setVersion] = useState({
    local: null,
    remote: null,
    is_update_available: false,
    loading: true,
  });

  // Save visibility settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "dashboardVisibility",
      JSON.stringify(dashboardVisibility)
    );
  }, [dashboardVisibility]);

  // Save chart line thickness to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("chartLineThickness", chartLineThickness.toString());
  }, [chartLineThickness]);

  useEffect(() => {
    loadServices();
    fetchVersion();
    fetchTrafficData();

    // Check for updates every 12 hours
    const versionCheckInterval = setInterval(fetchVersion, 12 * 60 * 60 * 1000);

    // Fetch traffic data every 10 seconds for more responsive updates
    const trafficInterval = setInterval(fetchTrafficData, 10000);

    // Refresh services every 10 seconds for updated stats
    // Don't reset scroll position or active tab during auto-refresh
    const servicesInterval = setInterval(() => {
      loadServices(true); // Pass true to indicate this is auto-refresh
    }, 10000);

    return () => {
      clearInterval(versionCheckInterval);
      clearInterval(trafficInterval);
      clearInterval(servicesInterval);
    };
  }, []);

  const fetchVersion = async () => {
    try {
      const response = await fetch(`${API_URL}/version`);
      const data = await response.json();

      setVersion({
        local: data.local,
        remote: data.remote,
        is_update_available: data.is_update_available || false,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching version:", error);
      setVersion({
        local: null,
        remote: null,
        is_update_available: false,
        loading: false,
      });
    }
  };

  const fetchTrafficData = async () => {
    try {
      const data = await api.getTrafficSummary();
      setTrafficData(data);
    } catch (error) {
      console.error("Error fetching traffic data:", error);
      // Don't show error to user, traffic is optional
    }
  };

  const loadServices = async (isAutoRefresh = false) => {
    try {
      // Save current scroll position before updating
      const currentScrollY = isAutoRefresh ? window.scrollY : 0;

      if (!isAutoRefresh) {
        setLoading(true);
      }

      const data = await api.getServices();
      setServices(data);

      // Don't manage activeTab here - let useEffect handle it

      // Restore scroll position after state update for auto-refresh
      if (isAutoRefresh && currentScrollY > 0) {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          window.scrollTo(0, currentScrollY);
        }, 0);
      }
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to load services:", error);
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
      setActiveTab(groupNames[0]);
    }
    // Only reset tab if current tab no longer exists
    else if (
      activeTab &&
      !groupNames.includes(activeTab) &&
      groupNames.length > 0
    ) {
      setActiveTab(groupNames[0]);
    }
  }, [services, searchTerm, activeTab]);

  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      const data = await api.checkAllServices();
      setServices(data);
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to check all services:", error);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleRefreshTraffic = async () => {
    setRefreshing(true);
    await fetchTrafficData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleCheckService = async (id) => {
    try {
      setRefreshing(true);
      const updated = await api.checkService(id);
      setServices(services.map((s) => (s.id === id ? updated : s)));
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to check service:", error);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleCreateService = async (data) => {
    try {
      const newService = await api.createService(data);
      setServices([...services, newService]);
      setShowModal(false);
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to create service:", error);
    }
  };

  const handleUpdateService = async (data) => {
    try {
      const updated = await api.updateService(editingService.id, data);
      setServices(services.map((s) => (s.id === updated.id ? updated : s)));
      setShowModal(false);
      setEditingService(null);
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to update service:", error);
    }
  };

  const handleDeleteService = async (id) => {
    if (!confirm(t("common.confirm"))) return;

    try {
      await api.deleteService(id);
      setServices(services.filter((s) => s.id !== id));
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to delete service:", error);
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  const stats = {
    online: services.filter((s) => s.status === "online").length,
    offline: services.filter((s) => s.status === "offline").length,
    problem: services.filter((s) => s.status === "problem").length,
  };

  const LoadingServiceCard = () => (
    <div className="bg-theme-card border border-theme rounded-lg p-6">
      <div className="space-y-3 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-theme-hover rounded w-1/2" />
            <div className="flex gap-2">
              <div className="h-4 bg-theme-hover rounded w-16" />
              <div className="h-4 bg-theme-hover rounded w-32" />
            </div>
          </div>
          <div className="h-6 w-6 bg-theme-hover rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-theme-hover rounded w-20" />
          <div className="h-8 bg-theme-hover rounded w-20" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-text">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm sm:text-base text-theme-text-muted mt-1">
            {t("dashboard.allServices")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowCustomizeMenu(!showCustomizeMenu)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
            title={t("dashboard.customize")}
          >
            <Settings size={16} sm:size={18} className="text-theme-primary" />
            <span className="text-xs sm:text-sm hidden sm:inline">
              {t("dashboard.customize")}
            </span>
          </button>
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
          >
            <RefreshCw
              size={16}
              className={`text-theme-primary transition-transform duration-500 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span className="text-xs sm:text-sm">{t("service.checkNow")}</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm flex-1 sm:flex-initial"
          >
            <Plus size={16} className="text-theme-primary" />
            <span className="text-xs sm:text-sm">
              {t("dashboard.addService")}
            </span>
          </button>
        </div>
      </div>

      {/* Customize Modal */}
      {showCustomizeMenu && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card border border-theme rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-theme">
              <h3 className="text-xl font-bold text-theme-text flex items-center gap-2">
                <Settings size={20} className="text-theme-primary" />
                {t("dashboard.dashboardVisibility")}
              </h3>
              <button
                onClick={() => setShowCustomizeMenu(false)}
                className="text-theme-text-muted hover:text-theme-text transition-colors p-1 hover:bg-theme-hover rounded"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Stats Card Toggle */}
              <div className="flex items-center justify-between p-4 bg-theme-hover border border-theme rounded-lg">
                <div className="flex items-center gap-3">
                  {dashboardVisibility.stats ? (
                    <Eye size={18} className="text-green-500" />
                  ) : (
                    <EyeOff size={18} className="text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-theme-text">
                    {t("dashboard.showStatsCard")}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setDashboardVisibility({
                      ...dashboardVisibility,
                      stats: !dashboardVisibility.stats,
                    })
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    dashboardVisibility.stats
                      ? "bg-theme-primary"
                      : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      dashboardVisibility.stats ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Traffic Chart Toggle */}
              <div className="flex items-center justify-between p-4 bg-theme-hover border border-theme rounded-lg">
                <div className="flex items-center gap-3">
                  {dashboardVisibility.trafficChart ? (
                    <Eye size={18} className="text-green-500" />
                  ) : (
                    <EyeOff size={18} className="text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-theme-text">
                    {t("dashboard.showTrafficChart")}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setDashboardVisibility({
                      ...dashboardVisibility,
                      trafficChart: !dashboardVisibility.trafficChart,
                    })
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    dashboardVisibility.trafficChart
                      ? "bg-theme-primary"
                      : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      dashboardVisibility.trafficChart ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Service Cards Toggle */}
              <div className="flex items-center justify-between p-4 bg-theme-hover border border-theme rounded-lg">
                <div className="flex items-center gap-3">
                  {dashboardVisibility.services ? (
                    <Eye size={18} className="text-green-500" />
                  ) : (
                    <EyeOff size={18} className="text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-theme-text">
                    {t("dashboard.showServiceCards")}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setDashboardVisibility({
                      ...dashboardVisibility,
                      services: !dashboardVisibility.services,
                    })
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    dashboardVisibility.services
                      ? "bg-theme-primary"
                      : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      dashboardVisibility.services ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-theme my-4"></div>

              {/* Chart Line Thickness Slider */}
              <div className="p-4 bg-theme-hover border border-theme rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-theme-text">
                    {t("dashboard.chartLineThickness")}
                  </span>
                  <span className="text-xs text-theme-text-muted bg-theme-card px-2 py-1 rounded">
                    {chartLineThickness.toFixed(2)}px
                  </span>
                </div>
                <div className="space-y-2">
                  {/* Custom Slider */}
                  <div className="relative pt-1">
                    <div className="relative h-2 bg-gray-700 rounded-full">
                      {/* Filled track */}
                      <div
                        className="absolute h-2 bg-gradient-to-r from-theme-primary to-theme-primary/80 rounded-full transition-all duration-200"
                        style={{
                          width: `${((chartLineThickness - 0.1) / 1.9) * 100}%`,
                        }}
                      />
                      {/* Slider input */}
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.05"
                        value={chartLineThickness}
                        onChange={(e) =>
                          setChartLineThickness(parseFloat(e.target.value))
                        }
                        className="absolute w-full h-2 opacity-0 cursor-pointer"
                      />
                      {/* Slider thumb */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-theme-primary rounded-full shadow-lg pointer-events-none transition-all duration-200"
                        style={{
                          left: `calc(${
                            ((chartLineThickness - 0.1) / 1.9) * 100
                          }% - 8px)`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-theme-text-muted">
                    <span>{t("dashboard.thin")} (0.1px)</span>
                    <span>{t("dashboard.thick")} (2px)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
              <button
                onClick={() => setShowCustomizeMenu(false)}
                className="px-4 py-2 bg-theme-hover hover:bg-theme-primary/10 border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {dashboardVisibility.stats && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    TOTAL
                  </div>
                  <div className="text-3xl font-bold text-theme-text">
                    {services.length}
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
                    ONLINE
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
                    OFFLINE
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
                    PROBLEM
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
          </div>

          {/* Search Bar */}
          <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
                size={20}
              />
              <input
                type="text"
                placeholder={
                  t("dashboard.searchPlaceholder") ||
                  "Search services and groups..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-theme-card border border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Services Grid */}
      {dashboardVisibility.services && (
        <>
          {loading ? (
            <div className="space-y-6">
              {/* Stats Cards Loading */}
              <div className="bg-theme-card border border-theme rounded-xl p-6 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="text-center space-y-2">
                      <div className="h-9 bg-theme-hover rounded w-16 mx-auto" />
                      <div className="h-3 bg-theme-hover rounded w-24 mx-auto" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Service Cards Loading */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <LoadingServiceCard key={i} />
                ))}
              </div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-theme-text-muted mb-4">
                {t("dashboard.noServices")}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
              >
                <Plus size={20} className="text-theme-primary" />
                <span className="text-sm">{t("dashboard.addService")}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Group services by group field */}
              {(() => {
                // Filter services based on search term and status filter
                const filteredServices = services.filter((service) => {
                  const searchLower = searchTerm.toLowerCase();
                  const matchesSearch =
                    service.name.toLowerCase().includes(searchLower) ||
                    service.url.toLowerCase().includes(searchLower) ||
                    service.type.toLowerCase().includes(searchLower) ||
                    (service.group &&
                      service.group.toLowerCase().includes(searchLower));

                  const matchesStatus =
                    statusFilter === null || service.status === statusFilter;

                  return matchesSearch && matchesStatus;
                });

                // Show empty state if no services match the filter
                if (filteredServices.length === 0 && statusFilter !== null) {
                  const emptyStates = {
                    online: {
                      icon: "🟢",
                      title: "No online services",
                      message: "Currently no services are online",
                    },
                    offline: {
                      icon: "✓",
                      title: "No offline services",
                      message: "All services are operational!",
                    },
                    problem: {
                      icon: "✓",
                      title: "No services with problems",
                      message: "Everything is running smoothly!",
                    },
                  };

                  const state = emptyStates[statusFilter];

                  return (
                    <div className="bg-theme-card border border-theme rounded-lg p-12 text-center shadow-sm">
                      <div className="text-6xl mb-4">{state.icon}</div>
                      <h3 className="text-xl font-semibold text-theme-primary mb-2">
                        {state.title}
                      </h3>
                      <p className="text-theme-text-muted">{state.message}</p>
                    </div>
                  );
                }

                const grouped = filteredServices.reduce((acc, service) => {
                  const groupName = service.group || "Ungrouped";
                  if (!acc[groupName]) acc[groupName] = [];
                  acc[groupName].push(service);
                  return acc;
                }, {});

                const groupNames = Object.keys(grouped);
                const hasMultipleGroups = groupNames.length > 1;

                // Filter traffic data by active group
                const filteredTrafficData = trafficData
                  ? {
                      ...trafficData,
                      services:
                        trafficData.services?.filter((service) => {
                          // Find the service in the filtered services list to get its group
                          const matchingService = filteredServices.find(
                            (s) => s.id === service.id
                          );
                          if (!matchingService) return false;
                          const serviceGroup =
                            matchingService.group || "Ungrouped";
                          return activeTab ? serviceGroup === activeTab : true;
                        }) || [],
                    }
                  : null;

                // If only one group or no groups, show simple list
                if (!hasMultipleGroups) {
                  return (
                    <div className="space-y-6">
                      {/* Traffic Chart */}
                      {dashboardVisibility.trafficChart && (
                        <DashboardTrafficChart
                          trafficData={filteredTrafficData}
                          onRefresh={handleRefreshTraffic}
                          refreshing={refreshing}
                          lineThickness={chartLineThickness}
                        />
                      )}

                      {Object.entries(grouped).map(
                        ([groupName, groupServices]) => (
                          <div key={groupName} className="space-y-4">
                            {groupName !== "Ungrouped" && (
                              <div className="bg-theme-card border border-theme rounded-lg p-4">
                                <h2 className="text-xl font-semibold text-theme-text flex items-center gap-2">
                                  <span>{groupName}</span>
                                  <span className="text-sm text-theme-text-muted font-normal">
                                    ({groupServices.length})
                                  </span>
                                </h2>
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {groupServices.map((service) => (
                                <DashboardServiceCard
                                  key={service.id}
                                  service={service}
                                  trafficData={trafficData}
                                  onCheck={handleCheckService}
                                  onEdit={handleEditService}
                                  onDelete={handleDeleteService}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                }

                // Multiple groups - show tabs
                return (
                  <div className="space-y-6">
                    {/* Tabs */}
                    <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
                      <div className="flex gap-2 min-w-max">
                        {groupNames.map((groupName) => (
                          <button
                            key={groupName}
                            onClick={() => setActiveTab(groupName)}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                              activeTab === groupName
                                ? "bg-theme-primary text-white shadow-md"
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
                              ({grouped[groupName].length})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Traffic Chart - filtered by active tab */}
                    {dashboardVisibility.trafficChart && (
                      <DashboardTrafficChart
                        trafficData={filteredTrafficData}
                        onRefresh={handleRefreshTraffic}
                        refreshing={refreshing}
                        lineThickness={chartLineThickness}
                      />
                    )}

                    {/* Active Tab Content */}
                    {activeTab && grouped[activeTab] && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {grouped[activeTab].map((service) => (
                          <DashboardServiceCard
                            key={service.id}
                            service={service}
                            trafficData={trafficData}
                            onCheck={handleCheckService}
                            onEdit={handleEditService}
                            onDelete={handleDeleteService}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <ServiceModal
          isOpen={showModal}
          service={editingService}
          onClose={handleCloseModal}
          onSave={editingService ? handleUpdateService : handleCreateService}
        />
      )}
    </div>
  );
}
