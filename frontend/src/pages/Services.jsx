import { useTranslation } from "react-i18next";
import {
  Server,
  Activity,
  AlertCircle,
  Search,
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../services/api";
import ServiceCard from "../components/ServiceCard";
import ServiceModal from "../components/ServiceModal";
import { useToast } from "../context/ToastContext";

export default function Services() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchServices = async () => {
    try {
      const data = await api.getServices();
      setServices(data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
      showToast(t("errors.fetchServices"), "error");
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

  const handleCreateService = async (data) => {
    try {
      const newService = await api.createService(data);
      setServices([...services, newService]);
      setShowModal(false);
      showToast(t("success.serviceCreated"), "success");
    } catch (error) {
      console.error("Failed to create service:", error);
      showToast(t("errors.createService"), "error");
    }
  };

  const handleUpdateService = async (data) => {
    try {
      const updatedService = await api.updateService(editingService.id, data);
      setServices(
        services.map((s) => (s.id === editingService.id ? updatedService : s))
      );
      setShowModal(false);
      setEditingService(null);
      showToast(t("success.serviceUpdated"), "success");
    } catch (error) {
      console.error("Failed to update service:", error);
      showToast(t("errors.updateService"), "error");
    }
  };

  const handleDeleteService = async (id) => {
    if (!confirm(t("confirmations.deleteService"))) return;

    try {
      await api.deleteService(id);
      setServices(services.filter((s) => s.id !== id));
      showToast(t("success.serviceDeleted"), "success");
    } catch (error) {
      console.error("Failed to delete service:", error);
      showToast(t("errors.deleteService"), "error");
    }
  };

  const handleCheckService = async (id) => {
    try {
      setRefreshing(true);
      const updatedService = await api.checkService(id);
      setServices(services.map((s) => (s.id === id ? updatedService : s)));
      showToast(t("success.serviceChecked"), "success");
    } catch (error) {
      console.error("Failed to check service:", error);
      showToast(t("errors.checkService"), "error");
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setShowModal(true);
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

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <LoadingServiceCard key={i} />
          ))}
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

  const stats = {
    total: services.length,
    online: services.filter((s) => s.status === "online").length,
    offline: services.filter((s) => s.status === "offline").length,
    problem: services.filter((s) => s.status === "problem").length,
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Search Bar & Action Buttons */}
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

        <div className="flex gap-2">
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
          <button
            onClick={() => {
              setEditingService(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <Plus size={18} className="text-theme-primary" />
            <span className="text-sm">{t("dashboard.addService")}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-theme-primary" />
                {t("services.total")}
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
                <AlertCircle className="w-3 h-3 text-red-500" />
                {t("dashboard.offline")}
              </p>
              <p className="text-2xl font-bold text-red-500 mt-1">
                {stats.offline}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-yellow-500" />
                {t("dashboard.problem")}
              </p>
              <p className="text-2xl font-bold text-yellow-500 mt-1">
                {stats.problem}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Services List */}
      {filteredServices.length === 0 ? (
        <div className="bg-theme-card border border-theme rounded-lg p-12 text-center">
          <Server className="mx-auto mb-4 text-theme-text-muted" size={48} />
          <p className="text-theme-text-muted text-lg mb-4">
            {searchTerm ? t("services.noResults") : t("dashboard.noServices")}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowModal(true)}
              className="py-3 px-4 bg-theme-primary hover:bg-theme-primary-hover text-white font-medium rounded-lg transition-all"
            >
              {t("dashboard.addService")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEditService}
              onDelete={handleDeleteService}
              onCheck={handleCheckService}
            />
          ))}
        </div>
      )}

      {/* Service Modal */}
      <ServiceModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingService(null);
        }}
        onSave={editingService ? handleUpdateService : handleCreateService}
        service={editingService}
      />
    </div>
  );
}
