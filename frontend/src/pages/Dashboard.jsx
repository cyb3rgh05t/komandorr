import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { api } from "@/services/api";
import ServiceCard from "@/components/ServiceCard";
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
  const [refreshing, setRefreshing] = useState(false);
  const [trafficData, setTrafficData] = useState(null);
  const [version, setVersion] = useState({
    local: null,
    remote: null,
    is_update_available: false,
    loading: true,
  });

  useEffect(() => {
    loadServices();
    fetchVersion();
    fetchTrafficData();

    // Check for updates every 12 hours
    const versionCheckInterval = setInterval(fetchVersion, 12 * 60 * 60 * 1000);

    // Fetch traffic data every 30 seconds
    const trafficInterval = setInterval(fetchTrafficData, 30000);

    return () => {
      clearInterval(versionCheckInterval);
      clearInterval(trafficInterval);
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

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.getServices();
      setServices(data);

      // Set initial active tab if not set
      if (!activeTab && data.length > 0) {
        const groups = [...new Set(data.map((s) => s.group || "Ungrouped"))];
        setActiveTab(groups[0]);
      }
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to load services:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-text">
            {t("dashboard.title")}
          </h1>
          <p className="text-theme-text-muted mt-1">
            {t("dashboard.allServices")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              loadServices();
            }}
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
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <Plus size={18} className="text-theme-primary" />
            <span className="text-sm">{t("dashboard.addService")}</span>
          </button>
        </div>
      </div>

      {/* Stats & Search Card */}
      <div className="bg-theme-card border border-theme rounded-xl p-6 space-y-6 shadow-sm">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-theme-text mb-1">
              {services.length}
            </div>
            <div className="text-xs uppercase tracking-wider text-theme-text-muted font-medium">
              {t("dashboard.allServices")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500 mb-1">
              {stats.online}
            </div>
            <div className="text-xs uppercase tracking-wider text-theme-text-muted font-medium">
              {t("dashboard.online")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500 mb-1">
              {stats.offline}
            </div>
            <div className="text-xs uppercase tracking-wider text-theme-text-muted font-medium">
              {t("dashboard.offline")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500 mb-1">
              {stats.problem}
            </div>
            <div className="text-xs uppercase tracking-wider text-theme-text-muted font-medium">
              {t("dashboard.problem")}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-theme"></div>

        {/* Search Bar */}
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

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-12 text-theme-text-muted">
          {t("common.loading")}
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
            // Filter services based on search term
            const filteredServices = services.filter((service) => {
              const searchLower = searchTerm.toLowerCase();
              return (
                service.name.toLowerCase().includes(searchLower) ||
                service.url.toLowerCase().includes(searchLower) ||
                service.type.toLowerCase().includes(searchLower) ||
                (service.group &&
                  service.group.toLowerCase().includes(searchLower))
              );
            });

            const grouped = filteredServices.reduce((acc, service) => {
              const groupName = service.group || "Ungrouped";
              if (!acc[groupName]) acc[groupName] = [];
              acc[groupName].push(service);
              return acc;
            }, {});

            const groupNames = Object.keys(grouped);
            const hasMultipleGroups = groupNames.length > 1;

            // If active tab is not set or doesn't exist in current groups, set to first group
            if (!activeTab || !groupNames.includes(activeTab)) {
              if (groupNames.length > 0) {
                setActiveTab(groupNames[0]);
              }
            }

            // If only one group or no groups, show simple list
            if (!hasMultipleGroups) {
              return Object.entries(grouped).map(
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
                      {groupServices.map((service) =>
                        renderServiceCard(service, trafficData)
                      )}
                    </div>
                  </div>
                )
              );
            }

            // Multiple groups - show tabs
            return (
              <div className="space-y-4">
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

                {/* Active Tab Content */}
                {activeTab && grouped[activeTab] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grouped[activeTab].map((service) =>
                      renderServiceCard(service, trafficData)
                    )}
                  </div>
                )}
              </div>
            );
          })()}
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

  // Helper function to render a service card
  function renderServiceCard(service, trafficData) {
    // Find traffic data for this service
    const serviceTraffic = trafficData?.services?.find(
      (s) => s.id === service.id
    );

    const formatBandwidth = (mbps) => {
      if (!mbps || mbps === 0) return "0 KB/s";
      if (mbps < 1) {
        return `${(mbps * 1024).toFixed(1)} KB/s`;
      }
      return `${mbps.toFixed(1)} MB/s`;
    };

    const statusConfig = {
      online: {
        icon: CheckCircle2,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
      },
      offline: {
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
      },
      problem: {
        icon: AlertTriangle,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/20",
      },
    };
    const config = statusConfig[service.status] || statusConfig.offline;
    const StatusIcon = config.icon;

    return (
      <div
        key={service.id}
        className="bg-theme-card border border-theme rounded-lg p-5 hover:bg-theme-hover transition-all duration-200 shadow-sm"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-theme-card p-2.5 rounded-lg border border-theme">
              {service.icon ? (
                <img
                  src={`http://localhost:8000${service.icon}`}
                  alt={service.name}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    // Fallback to status icon if image fails to load
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
              ) : null}
              <StatusIcon
                className={`${config.color}`}
                size={24}
                style={{
                  display: service.icon ? "none" : "block",
                }}
              />
            </div>
            <div className="flex-1">
              {service.description && (
                <span className="inline-block px-2 py-0.5 mb-1.5 text-xs font-medium bg-theme-card text-theme-text-muted border border-theme rounded">
                  {service.description}
                </span>
              )}
              <h3 className="text-lg font-semibold text-theme-text">
                {service.name}
              </h3>
              <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium bg-theme-card text-theme-text-muted border border-theme rounded">
                {t(`service.types.${service.type}`)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleCheckService(service.id)}
              className="p-2 hover:bg-theme-card rounded-lg transition-colors"
              title={t("service.checkNow")}
            >
              <RefreshCw
                className={`text-theme-text-muted hover:text-theme-primary transition-transform duration-500 ${
                  refreshing ? "animate-spin" : ""
                }`}
                size={16}
              />
            </button>
            <button
              onClick={() => handleEditService(service)}
              className="p-2 hover:bg-theme-card rounded-lg transition-colors"
              title={t("service.edit")}
            >
              <Edit
                className="text-theme-text-muted hover:text-theme-primary"
                size={16}
              />
            </button>
            <button
              onClick={() => handleDeleteService(service.id)}
              className="p-2 hover:bg-theme-card rounded-lg transition-colors"
              title={t("service.delete")}
            >
              <Trash2
                className="text-theme-text-muted hover:text-red-500"
                size={16}
              />
            </button>
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-text-muted">{t("service.url")}:</span>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-primary hover:text-theme-primary-hover truncate max-w-xs"
            >
              {service.url}
            </a>
          </div>
        </div>

        {/* Traffic Data */}
        {serviceTraffic &&
          (serviceTraffic.bandwidth_up > 0 ||
            serviceTraffic.bandwidth_down > 0) && (
            <div className="mt-2 bg-theme-card border border-theme rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-theme-text-muted">Traffic:</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <ArrowUp size={14} className="text-blue-500" />
                    <span className="text-blue-500 font-mono text-xs">
                      {formatBandwidth(serviceTraffic.bandwidth_up)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowDown size={14} className="text-green-500" />
                    <span className="text-green-500 font-mono text-xs">
                      {formatBandwidth(serviceTraffic.bandwidth_down)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    );
  }
}
