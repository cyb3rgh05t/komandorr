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
  const [version, setVersion] = useState({
    local: null,
    remote: null,
    is_update_available: false,
    loading: true,
  });

  useEffect(() => {
    loadServices();
    fetchVersion();

    // Check for updates every 12 hours
    const versionCheckInterval = setInterval(fetchVersion, 12 * 60 * 60 * 1000);

    return () => {
      clearInterval(versionCheckInterval);
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

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.getServices();
      setServices(data);
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to load services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckService = async (id) => {
    try {
      const updated = await api.checkService(id);
      setServices(services.map((s) => (s.id === id ? updated : s)));
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to check service:", error);
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
    <div className="space-y-6">
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
            onClick={loadServices}
            className="flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <RefreshCw size={18} className="text-theme-primary" />
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
            className="w-full pl-10 pr-4 py-2.5 bg-theme-bg border border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
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

            return Object.entries(grouped).map(([groupName, groupServices]) => (
              <div key={groupName} className="space-y-4 mb-8">
                <div className="bg-theme-card border border-theme rounded-lg p-4">
                  <h2 className="text-xl font-semibold text-theme-text flex items-center gap-2">
                    <span>{groupName}</span>
                    <span className="text-sm text-theme-text-muted font-normal">
                      ({groupServices.length})
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupServices.map((service) => {
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
                    const config =
                      statusConfig[service.status] || statusConfig.offline;
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={service.id}
                        className={`bg-theme-card border ${config.borderColor} rounded-lg p-5 hover:bg-theme-hover transition-all duration-200`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`${config.bgColor} p-2 rounded-lg`}>
                              {service.icon ? (
                                <img
                                  src={`http://localhost:8000${service.icon}`}
                                  alt={service.name}
                                  className="w-6 h-6 object-contain"
                                  onError={(e) => {
                                    // Fallback to status icon if image fails to load
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display =
                                      "block";
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
                                <span className="inline-block px-2 py-0.5 mb-1.5 text-xs font-medium bg-theme-bg text-theme-text-muted border border-theme rounded">
                                  {service.description}
                                </span>
                              )}
                              <h3 className="text-lg font-semibold text-theme-text">
                                {service.name}
                              </h3>
                              <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium bg-theme-bg text-theme-text-muted border border-theme rounded">
                                {t(`service.types.${service.type}`)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCheckService(service.id)}
                              className="p-2 hover:bg-theme-bg-hover rounded-lg transition-colors"
                              title={t("service.checkNow")}
                            >
                              <RefreshCw
                                className="text-theme-text-muted hover:text-theme-primary"
                                size={18}
                              />
                            </button>
                            <button
                              onClick={() => handleEditService(service)}
                              className="p-2 hover:bg-theme-bg-hover rounded-lg transition-colors"
                              title={t("service.edit")}
                            >
                              <Edit
                                className="text-theme-text-muted hover:text-theme-primary"
                                size={18}
                              />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="p-2 hover:bg-theme-bg-hover rounded-lg transition-colors"
                              title={t("service.delete")}
                            >
                              <Trash2
                                className="text-theme-text-muted hover:text-red-500"
                                size={18}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="bg-theme-bg border border-theme rounded-lg p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-theme-text-muted">
                              {t("service.url")}:
                            </span>
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
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
}
