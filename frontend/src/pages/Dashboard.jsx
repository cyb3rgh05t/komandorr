import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Activity,
  Clock,
  TrendingUp,
  Server,
  Zap,
  Video,
  Network,
  ArrowUp,
  ArrowDown,
  Upload,
  Download,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { api } from "@/services/api";
import { fetchPlexActivities } from "@/services/plexService";
import { uploaderApi } from "@/services/uploaderApi";
import { arrActivityApi } from "@/services/arrActivityApi";
import DashboardServiceCard from "@/components/DashboardServiceCard";
import DashboardTrafficCards from "@/components/DashboardTrafficCards";
import ServiceModal from "@/components/ServiceModal";
import ConfirmDialog from "@/components/ConfirmDialog";

const API_URL = "/api";
const REPO_URL = "https://github.com/cyb3rgh05t/komandorr/releases/latest";

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Use React Query for services data
  const {
    data: services = [],
    isLoading: loading,
    isFetching,
  } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.getServices(),
    staleTime: 10000, // 10 seconds
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    placeholderData: (previousData) => previousData, // Show old data while fetching
  });

  // Use React Query for traffic data
  const { data: trafficData, isFetching: trafficFetching } = useQuery({
    queryKey: ["traffic"],
    queryFn: () => api.getTrafficSummary(),
    staleTime: 5000,
    refetchInterval: 5000,
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for Plex activities
  const { data: plexActivities = [], isFetching: plexFetching } = useQuery({
    queryKey: ["plexActivities"],
    queryFn: fetchPlexActivities,
    staleTime: 5000,
    refetchInterval: 5000,
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for uploader data (active uploads)
  const { data: uploaderData } = useQuery({
    queryKey: ["uploader", "inprogress"],
    queryFn: () => uploaderApi.getInProgress(),
    staleTime: 2000,
    refetchInterval: 2000,
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for arr-activity data (downloads queue)
  const { data: arrQueueData } = useQuery({
    queryKey: ["arr-activity", "queue"],
    queryFn: () => arrActivityApi.getQueue(),
    staleTime: 5000,
    refetchInterval: 5000,
    placeholderData: (previousData) => previousData,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null); // null = all, 'online', 'offline', 'problem'
  const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    serviceId: null,
    serviceName: null,
  });

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
      JSON.stringify(dashboardVisibility),
    );
  }, [dashboardVisibility]);

  useEffect(() => {
    fetchVersion();

    // Check for updates every 12 hours
    const versionCheckInterval = setInterval(fetchVersion, 12 * 60 * 60 * 1000);

    return () => {
      clearInterval(versionCheckInterval);
    };
  }, []);

  const fetchVersion = async () => {
    try {
      const credentials = sessionStorage.getItem("auth_credentials");
      const response = await fetch(`${API_URL}/version`, {
        headers: {
          ...(credentials && { Authorization: `Basic ${credentials}` }),
        },
      });
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
      const groupName = service.group || t("dashboard.groupUngrouped");
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

  const handleRefreshAll = async () => {
    try {
      // Start refetch first to trigger isFetching animation immediately
      const refetchPromise = queryClient.refetchQueries(["services"]);
      // Trigger backend check in parallel
      await Promise.all([api.checkAllServices(), refetchPromise]);
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to check all services:", error);
    }
  };

  const handleRefreshTraffic = async () => {
    await queryClient.refetchQueries(["traffic"]);
  };

  const handleCheckService = async (id) => {
    try {
      const updated = await api.checkService(id);
      // Update the cache with the updated service
      queryClient.setQueryData(["services"], (old) =>
        old.map((s) => (s.id === id ? updated : s)),
      );
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to check service:", error);
    }
  };

  const handleCreateService = async (data) => {
    try {
      const newService = await api.createService(data);
      // Add to cache
      queryClient.setQueryData(["services"], (old) => [...old, newService]);
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
      // Update cache
      queryClient.setQueryData(["services"], (old) =>
        old.map((s) => (s.id === updated.id ? updated : s)),
      );
      setShowModal(false);
      setEditingService(null);
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to update service:", error);
    }
  };

  const handleDeleteService = (service) => {
    setConfirmDialog({
      isOpen: true,
      serviceId: service.id,
      serviceName: service.name,
    });
  };

  const confirmDeleteService = async () => {
    try {
      await api.deleteService(confirmDialog.serviceId);
      // Remove from cache
      queryClient.setQueryData(["services"], (old) =>
        old.filter((s) => s.id !== confirmDialog.serviceId),
      );
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
    total: services.length,
    avgResponseTime:
      services.length > 0
        ? Math.round(
            services.reduce((sum, s) => sum + (s.response_time || 0), 0) /
              services.length,
          )
        : 0,
    recentlyChecked: services.filter((s) => {
      if (!s.last_check) return false;
      const lastCheck = new Date(s.last_check);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return lastCheck > fiveMinutesAgo;
    }).length,
    activeStreams: plexActivities.length,
    uploadSpeed: trafficData?.total_bandwidth_up || 0,
    downloadSpeed: trafficData?.total_bandwidth_down || 0,
    totalUploaded: trafficData?.total_traffic_up || 0,
    totalDownloaded: trafficData?.total_traffic_down || 0,
    activeUploads: uploaderData?.jobs?.length || 0,
    activeDownloads: (() => {
      if (!arrQueueData) return 0;
      // arrQueueData is an object with instance IDs as keys
      return Object.values(arrQueueData).reduce((sum, inst) => {
        return sum + (inst.records?.length || 0);
      }, 0);
    })(),
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
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder={
              t("dashboard.searchPlaceholder") ||
              "Search services and groups..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme rounded-lg text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowCustomizeMenu(!showCustomizeMenu)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm"
            title={t("dashboard.customize")}
          >
            <Settings size={16} sm:size={18} className="text-theme-primary" />
            <span className="text-xs sm:text-sm hidden sm:inline">
              {t("dashboard.customize")}
            </span>
          </button>
          <button
            onClick={handleRefreshAll}
            disabled={isFetching}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
          >
            <RefreshCw
              size={16}
              className={`text-theme-primary transition-transform duration-500 ${
                isFetching ? "animate-spin" : ""
              }`}
            />
            <span className="text-xs sm:text-sm">
              {isFetching
                ? t("common.refreshing", "Refreshing")
                : t("service.checkNow")}
            </span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm flex-1 sm:flex-initial"
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
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
              <button
                onClick={() => setShowCustomizeMenu(false)}
                className="px-4 py-2 bg-theme-hover hover:bg-theme-primary/10 border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all"
              >
                {t("dashboard.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - Compact Layout */}
      {dashboardVisibility.stats && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {/* Total Services */}
          <button
            onClick={() => setStatusFilter(null)}
            className="bg-theme-card border border-theme rounded-lg px-3 py-2 transition-all hover:shadow-md hover:border-theme-primary hover:bg-theme-primary/10 flex items-center gap-2"
          >
            <Server className="w-5 h-5 text-theme-primary flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.totalServices")}
              </p>
              <p className="text-lg font-bold text-theme-primary leading-tight">
                {stats.total}
              </p>
            </div>
          </button>

          {/* Online */}
          <button
            onClick={() => setStatusFilter("online")}
            className={`bg-theme-card border rounded-lg px-3 py-2 transition-all hover:shadow-md hover:bg-green-500/10 flex items-center gap-2 ${
              statusFilter === "online"
                ? "border-green-500 ring-1 ring-green-500/20"
                : "border-theme hover:border-green-500/50"
            }`}
          >
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.online")}
              </p>
              <p className="text-lg font-bold text-green-500 leading-tight">
                {stats.online}
              </p>
            </div>
          </button>

          {/* Offline */}
          <button
            onClick={() => setStatusFilter("offline")}
            className={`bg-theme-card border rounded-lg px-3 py-2 transition-all hover:shadow-md hover:bg-red-500/10 flex items-center gap-2 ${
              statusFilter === "offline"
                ? "border-red-500 ring-1 ring-red-500/20"
                : "border-theme hover:border-red-500/50"
            }`}
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.offline")}
              </p>
              <p className="text-lg font-bold text-red-500 leading-tight">
                {stats.offline}
              </p>
            </div>
          </button>

          {/* Problem */}
          <button
            onClick={() => setStatusFilter("problem")}
            className={`bg-theme-card border rounded-lg px-3 py-2 transition-all hover:shadow-md hover:bg-yellow-500/10 flex items-center gap-2 ${
              statusFilter === "problem"
                ? "border-yellow-500 ring-1 ring-yellow-500/20"
                : "border-theme hover:border-yellow-500/50"
            }`}
          >
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.problems")}
              </p>
              <p className="text-lg font-bold text-yellow-500 leading-tight">
                {stats.problem}
              </p>
            </div>
          </button>

          {/* Avg Response Time */}
          <div
            onClick={() => navigate("/monitor")}
            className="bg-theme-card border border-theme rounded-lg px-3 py-2 hover:shadow-md hover:bg-blue-500/10 hover:border-blue-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <Zap className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.avgResponse")}
              </p>
              <p className="text-lg font-bold text-blue-500 leading-tight">
                {stats.avgResponseTime}
                <span className="text-xs text-blue-400 ml-0.5">ms</span>
              </p>
            </div>
          </div>

          {/* Active (5min) */}
          <div
            onClick={() => navigate("/monitor")}
            className="bg-theme-card border border-theme rounded-lg px-3 py-2 hover:shadow-md hover:bg-purple-500/10 hover:border-purple-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <Activity className="w-5 h-5 text-purple-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.active5min")}
              </p>
              <p className="text-lg font-bold text-purple-500 leading-tight">
                {stats.recentlyChecked}
              </p>
            </div>
          </div>

          {/* Upload Speed */}
          <div
            onClick={() => navigate("/traffic")}
            className="bg-theme-card border border-theme rounded-lg px-3 py-2 hover:shadow-md hover:bg-orange-500/10 hover:border-orange-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <ArrowUp className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.uploadSpeed")}
              </p>
              <p className="text-lg font-bold text-orange-500 leading-tight">
                {stats.uploadSpeed.toFixed(1)}
                <span className="text-xs text-orange-400 ml-0.5">MB/s</span>
              </p>
            </div>
          </div>

          {/* Download Speed */}
          <div
            onClick={() => navigate("/traffic")}
            className="bg-theme-card border border-theme rounded-lg px-3 py-2 hover:shadow-md hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <ArrowDown className="w-5 h-5 text-cyan-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.downloadSpeed")}
              </p>
              <p className="text-lg font-bold text-cyan-500 leading-tight">
                {stats.downloadSpeed.toFixed(1)}
                <span className="text-xs text-cyan-400 ml-0.5">MB/s</span>
              </p>
            </div>
          </div>

          {/* Total Transfer */}
          <div
            onClick={() => navigate("/traffic")}
            className="bg-theme-card border border-theme rounded-lg px-3 py-2 hover:shadow-md hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <Network className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.totalTransfer")}
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold leading-tight">
                <span className="text-orange-500 flex items-center">
                  <ArrowUp className="w-3 h-3 mr-0.5" />
                  {stats.totalUploaded >= 1024
                    ? `${(stats.totalUploaded / 1024).toFixed(1)}T`
                    : `${stats.totalUploaded.toFixed(1)}G`}
                </span>
                <span className="text-cyan-500 flex items-center">
                  <ArrowDown className="w-3 h-3 mr-0.5" />
                  {stats.totalDownloaded >= 1024
                    ? `${(stats.totalDownloaded / 1024).toFixed(1)}T`
                    : `${stats.totalDownloaded.toFixed(1)}G`}
                </span>
              </div>
            </div>
          </div>

          {/* Active Streams */}
          <div
            onClick={() => navigate("/vod-streams")}
            className="bg-theme-card border border-theme rounded-lg px-3 py-2 hover:shadow-md hover:bg-pink-500/10 hover:border-pink-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <Video className="w-5 h-5 text-pink-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.vodStreams")}
              </p>
              <p className="text-lg font-bold text-pink-500 leading-tight">
                {stats.activeStreams}
              </p>
            </div>
          </div>

          {/* Active Uploads */}
          <div
            onClick={() => navigate("/uploader")}
            className="bg-theme-card border border-theme rounded-lg px-3 py-2 hover:shadow-md hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <Upload className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.activeUploads", "Uploading")}
              </p>
              <p className="text-lg font-bold text-emerald-500 leading-tight">
                {stats.activeUploads}
              </p>
            </div>
          </div>

          {/* Active Downloads */}
          <div
            onClick={() => navigate("/arr-activity")}
            className="bg-theme-card border border-theme rounded-lg px-3 py-2 hover:shadow-md hover:bg-teal-500/10 hover:border-teal-500/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <Download className="w-5 h-5 text-teal-500 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wide truncate">
                {t("dashboard.stats.activeDownloads", "Downloads")}
              </p>
              <p className="text-lg font-bold text-teal-500 leading-tight">
                {stats.activeDownloads}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Services Grid */}
      {dashboardVisibility.services && (
        <>
          {loading ? (
            <div className="space-y-6">
              {/* Service Cards Loading - Optimized for tablet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <LoadingServiceCard key={i} />
                ))}
              </div>
            </div>
          ) : services.length === 0 ? (
            <div className="bg-theme-card border border-theme rounded-lg p-6 md:p-8 text-center shadow-sm">
              <Server
                size={48}
                className="mx-auto mb-4 text-theme-text-muted"
              />
              <h3 className="text-base md:text-lg font-semibold text-theme-text mb-2">
                {t("dashboard.noServices")}
              </h3>
              <p className="text-sm md:text-base text-theme-text-muted mb-6">
                Get started by adding your first service to monitor
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
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
                      icon: CheckCircle,
                      iconColor: "text-green-500",
                      bgColor: "bg-green-500/10",
                      title: t("dashboard.emptyStates.noOnline.title"),
                      message: t("dashboard.emptyStates.noOnline.message"),
                      buttonText: "View All Services",
                    },
                    offline: {
                      icon: AlertCircle,
                      iconColor: "text-red-500",
                      bgColor: "bg-red-500/10",
                      title: t("dashboard.emptyStates.noOffline.title"),
                      message: t("dashboard.emptyStates.noOffline.message"),
                      buttonText: "View All Services",
                    },
                    problem: {
                      icon: AlertCircle,
                      iconColor: "text-yellow-500",
                      bgColor: "bg-yellow-500/10",
                      title: t("dashboard.emptyStates.noProblems.title"),
                      message: t("dashboard.emptyStates.noProblems.message"),
                      buttonText: "View All Services",
                    },
                  };

                  const state = emptyStates[statusFilter];
                  const IconComponent = state.icon;

                  return (
                    <div className="bg-theme-card border border-theme rounded-xl p-8 text-center shadow-lg">
                      <div className="max-w-md mx-auto">
                        <div
                          className={`w-16 h-16 ${state.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}
                        >
                          <IconComponent
                            size={32}
                            className={state.iconColor}
                          />
                        </div>
                        <h3 className="text-xl font-bold text-theme-text mb-2">
                          {state.title}
                        </h3>
                        <p className="text-theme-muted mb-6">{state.message}</p>
                        <button
                          onClick={() => setStatusFilter(null)}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
                        >
                          <Server size={20} className="text-theme-primary" />
                          <span>{state.buttonText}</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                const grouped = filteredServices.reduce((acc, service) => {
                  const groupName =
                    service.group || t("dashboard.groupUngrouped");
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
                          // If activeTab is "ALL", show all services
                          if (!activeTab || activeTab === "ALL") return true;

                          // Find the service in the filtered services list to get its group
                          const matchingService = filteredServices.find(
                            (s) => s.id === service.id,
                          );
                          if (!matchingService) return false;
                          const serviceGroup =
                            matchingService.group ||
                            t("dashboard.groupUngrouped");
                          return serviceGroup === activeTab;
                        }) || [],
                    }
                  : null;

                // If only one group or no groups, show simple list
                if (!hasMultipleGroups) {
                  return (
                    <div className="space-y-6">
                      {/* Traffic Chart */}
                      {dashboardVisibility.trafficChart && (
                        <div className="flex justify-center w-full">
                          <DashboardTrafficCards
                            trafficData={filteredTrafficData}
                            onRefresh={handleRefreshTraffic}
                            refreshing={trafficFetching}
                          />
                        </div>
                      )}

                      {Object.entries(grouped).map(
                        ([groupName, groupServices]) => (
                          <div key={groupName} className="space-y-4">
                            {groupName !== t("dashboard.groupUngrouped") && (
                              <div className="bg-theme-card border border-theme rounded-lg p-4">
                                <h2 className="text-xl font-semibold text-theme-text flex items-center gap-2">
                                  <span>{groupName}</span>
                                  <span className="text-sm text-theme-text-muted font-normal">
                                    ({groupServices.length})
                                  </span>
                                </h2>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                        ),
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
                        <button
                          onClick={() => setActiveTab("ALL")}
                          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                            activeTab === "ALL"
                              ? "bg-theme-primary text-black shadow-md"
                              : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
                          }`}
                        >
                          {t("dashboard.all")}
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
                        {groupNames.map((groupName) => (
                          <button
                            key={groupName}
                            onClick={() => setActiveTab(groupName)}
                            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                              activeTab === groupName
                                ? "bg-theme-primary text-black shadow-md"
                                : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
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
                              ({grouped[groupName].length})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Traffic Chart - filtered by active tab */}
                    {dashboardVisibility.trafficChart && (
                      <div className="flex justify-center w-full">
                        <DashboardTrafficCards
                          trafficData={filteredTrafficData}
                          onRefresh={handleRefreshTraffic}
                          refreshing={trafficFetching}
                        />
                      </div>
                    )}

                    {/* Active Tab Content */}
                    {activeTab &&
                      (activeTab === "ALL"
                        ? filteredServices
                        : grouped[activeTab]) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {(activeTab === "ALL"
                            ? filteredServices
                            : grouped[activeTab]
                          ).map((service) => (
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({
            isOpen: false,
            serviceId: null,
            serviceName: null,
          })
        }
        onConfirm={confirmDeleteService}
        title={t("confirmations.deleteService")}
        message={
          confirmDialog.serviceName
            ? t("confirmations.deleteServiceMessage", {
                name: confirmDialog.serviceName,
              })
            : t("confirmations.deleteServiceMessage")
        }
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        variant="danger"
      />
    </div>
  );
}
