import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-text">
            {t("dashboard.title")}
          </h1>
          <p className="text-theme-text-muted mt-1">
            {t("dashboard.allServices")}
          </p>
        </div>
        <div className="flex gap-3">
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="text-2xl font-bold text-theme-text">
            {services.length}
          </div>
          <div className="text-sm text-theme-text-muted">
            {t("dashboard.allServices")}
          </div>
        </div>
        <div className="bg-theme-card border border-green-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-500">
            {stats.online}
          </div>
          <div className="text-sm text-theme-text-muted">
            {t("dashboard.online")}
          </div>
        </div>
        <div className="bg-theme-card border border-red-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-500">{stats.offline}</div>
          <div className="text-sm text-theme-text-muted">
            {t("dashboard.offline")}
          </div>
        </div>
        <div className="bg-theme-card border border-yellow-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-500">
            {stats.problem}
          </div>
          <div className="text-sm text-theme-text-muted">
            {t("dashboard.problem")}
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onCheck={handleCheckService}
              onEdit={handleEditService}
              onDelete={handleDeleteService}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ServiceModal
          service={editingService}
          onClose={handleCloseModal}
          onSave={editingService ? handleUpdateService : handleCreateService}
        />
      )}
    </div>
  );
}
