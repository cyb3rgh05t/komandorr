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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import ServiceCard from "../components/ServiceCard";
import ServiceModal from "../components/ServiceModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../context/ToastContext";

export default function Services() {
  const { t } = useTranslation();
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
    staleTime: 10000,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null); // null = all, 'online', 'offline', 'problem'

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    serviceId: null,
    serviceName: null,
  });

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

  const handleRefresh = async () => {
    try {
      // Start refetch first to trigger isFetching animation immediately
      const refetchPromise = queryClient.refetchQueries(["services"]);
      // Trigger backend check in parallel
      await Promise.all([api.checkAllServices(), refetchPromise]);
      toast.success(t("success.servicesChecked") || "Services checked");
    } catch (error) {
      console.error("Failed to check all services:", error);
      toast.error(t("errors.checkServices") || "Failed to check services");
    }
  };

  const handleCreateService = async (data) => {
    try {
      const newService = await api.createService(data);
      queryClient.setQueryData(["services"], (old) => [...old, newService]);
      setShowModal(false);
      toast.success(t("success.serviceCreated"));
    } catch (error) {
      console.error("Failed to create service:", error);
      toast.error(t("errors.createService"));
    }
  };

  const handleUpdateService = async (data) => {
    try {
      const updatedService = await api.updateService(editingService.id, data);
      queryClient.setQueryData(["services"], (old) =>
        old.map((s) => (s.id === editingService.id ? updatedService : s))
      );
      setShowModal(false);
      setEditingService(null);
      toast.success(t("success.serviceUpdated"));
    } catch (error) {
      console.error("Failed to update service:", error);
      toast.error(t("errors.updateService"));
    }
  };

  const handleDeleteService = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    setConfirmDialog({
      isOpen: true,
      serviceId: serviceId,
      serviceName: service?.name || "Unknown Service",
    });
  };

  const confirmDeleteService = async () => {
    try {
      await api.deleteService(confirmDialog.serviceId);
      queryClient.setQueryData(["services"], (old) =>
        old.filter((s) => s.id !== confirmDialog.serviceId)
      );
      toast.success(t("success.serviceDeleted"));
    } catch (error) {
      console.error("Failed to delete service:", error);
      toast.error(t("errors.deleteService"));
    }
  };

  const handleCheckService = async (id) => {
    try {
      const updatedService = await api.checkService(id);
      queryClient.setQueryData(["services"], (old) =>
        old.map((s) => (s.id === id ? updatedService : s))
      );
      toast.success(t("success.serviceChecked"));
    } catch (error) {
      console.error("Failed to check service:", error);
      toast.error(t("errors.checkService"));
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

  // Filter services based on search term, active tab, and status filter
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.type.toLowerCase().includes(searchTerm.toLowerCase());

    const serviceGroup = service.group || "Ungrouped";
    const matchesTab =
      activeTab && activeTab !== "ALL" ? serviceGroup === activeTab : true;

    const matchesStatus =
      statusFilter === null || service.status === statusFilter;

    return matchesSearch && matchesTab && matchesStatus;
  });

  // Calculate ALL tab count (without tab filter, only search and status)
  const allTabCount = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === null || service.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).length;

  // Group services for tab counts - use filteredServices for display
  const groupedServices = filteredServices.reduce((acc, service) => {
    const groupName = service.group || t("dashboard.groupUngrouped");
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(service);
    return acc;
  }, {});

  // Group ALL services by group to show correct tab counts
  const allGroupedServices = services.reduce((acc, service) => {
    const groupName = service.group || t("dashboard.groupUngrouped");
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(service);
    return acc;
  }, {});

  // Get all unique groups for tabs
  const allGroups = [
    ...new Set(services.map((s) => s.group || t("dashboard.groupUngrouped"))),
  ];

  const stats = {
    total: services.length,
    online: services.filter((s) => s.status === "online").length,
    offline: services.filter((s) => s.status === "offline").length,
    problem: services.filter((s) => s.status === "problem").length,
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {loading ? (
        <>
          {/* Stats Cards Loading */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-5">
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
          {/* Service Cards Loading - Optimized for tablet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(6)].map((_, i) => (
              <LoadingServiceCard key={i} />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Search Bar & Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
                size={18}
              />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
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
                onClick={() => {
                  setEditingService(null);
                  setShowModal(true);
                }}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm flex-1 sm:flex-initial"
              >
                <Plus size={16} className="text-theme-primary" />
                <span className="text-xs sm:text-sm">
                  {t("dashboard.addService")}
                </span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setStatusFilter(null)}
              className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:border-theme-primary hover:bg-theme-primary/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                    {t("services.stats.total")}
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
              className={`relative bg-theme-card border rounded-lg p-4 transition-all hover:shadow-md hover:bg-green-500/10 ${
                statusFilter === "online"
                  ? "border-green-500 ring-2 ring-green-500/20"
                  : "border-theme hover:border-green-500/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                    {t("services.stats.online")}
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
              className={`relative bg-theme-card border rounded-lg p-4 transition-all hover:shadow-md hover:bg-red-500/10 ${
                statusFilter === "offline"
                  ? "border-red-500 ring-2 ring-red-500/20"
                  : "border-theme hover:border-red-500/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                    {t("services.stats.offline")}
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
              className={`relative bg-theme-card border rounded-lg p-4 transition-all hover:shadow-md hover:bg-yellow-500/10 ${
                statusFilter === "problem"
                  ? "border-yellow-500 ring-2 ring-yellow-500/20"
                  : "border-theme hover:border-yellow-500/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                    {t("services.stats.problem")}
                    <div className="text-[9px] normal-case tracking-normal text-theme-text-muted/70 mt-0.5 font-normal">
                      {t("services.stats.slowResponse")}
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
          </div>

          {/* Group Tabs */}
          {allGroups.length > 0 && (
            <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === "ALL"
                      ? "bg-theme-hover text-white shadow-md"
                      : "bg-theme-accent text-theme-text hover:bg-theme-hover"
                  }`}
                >
                  {t("services.all")}
                  <span
                    className={`ml-2 text-xs ${
                      activeTab === "ALL"
                        ? "text-white/80"
                        : "text-theme-text-muted"
                    }`}
                  >
                    ({allTabCount})
                  </span>
                </button>
                {allGroups.map((groupName) => {
                  const groupServices = allGroupedServices[groupName] || [];
                  return (
                    <button
                      key={groupName}
                      onClick={() => setActiveTab(groupName)}
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
          {filteredServices.length === 0 ? (
            <div className="bg-theme-card border border-theme rounded-xl p-8 text-center shadow-lg">
              {statusFilter !== null ? (
                (() => {
                  const emptyStates = {
                    online: {
                      iconComponent: () => (
                        <svg
                          className="w-8 h-8 text-green-500"
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
                      ),
                      bgColor: "bg-green-500/10",
                      title: t("services.emptyStates.noOnline.title"),
                      message: t("services.emptyStates.noOnline.message"),
                    },
                    offline: {
                      iconComponent: () => (
                        <svg
                          className="w-8 h-8 text-red-500"
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
                      ),
                      bgColor: "bg-red-500/10",
                      title: t("services.emptyStates.noOffline.title"),
                      message: t("services.emptyStates.noOffline.message"),
                    },
                    problem: {
                      iconComponent: () => (
                        <svg
                          className="w-8 h-8 text-yellow-500"
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
                      ),
                      bgColor: "bg-yellow-500/10",
                      title: t("services.emptyStates.noProblems.title"),
                      message: t("services.emptyStates.noProblems.message"),
                    },
                  };

                  const state = emptyStates[statusFilter];
                  const IconComponent = state.iconComponent;

                  return (
                    <div className="max-w-md mx-auto">
                      <div
                        className={`w-16 h-16 ${state.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}
                      >
                        <IconComponent />
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
                        <span>View All Services</span>
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Server size={32} className="text-theme-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-theme-text mb-2">
                    {searchTerm
                      ? t("services.noResults")
                      : t("dashboard.noServices")}
                  </h3>
                  <p className="text-theme-muted mb-6">
                    {searchTerm
                      ? "Try adjusting your search criteria"
                      : "Get started by adding your first service to monitor"}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
                    >
                      <Plus size={20} />
                      <span>{t("dashboard.addService")}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        </>
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
