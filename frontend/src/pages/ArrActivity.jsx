import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  Download,
  RefreshCcw,
  Search,
  Film,
  Tv,
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive,
  Server,
  Upload as UploadIcon,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { arrActivityApi } from "../services/arrActivityApi";

const ActivityBadge = ({ status, t }) => {
  const statusLower = (status || "").toLowerCase();

  const styles = {
    downloading: {
      icon: Download,
      className: "bg-green-500/20 text-green-400 border border-green-500/30",
      label: "Downloading",
    },
    importing: {
      icon: UploadIcon,
      className: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
      label: "Importing",
    },
    completed: {
      icon: CheckCircle,
      className: "bg-green-500/20 text-green-400 border border-green-500/30",
      label: "Completed",
    },
    warning: {
      icon: AlertCircle,
      className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
      label: "Warning",
    },
    failed: {
      icon: AlertCircle,
      className: "bg-red-500/20 text-red-400 border border-red-500/30",
      label: "Failed",
    },
    queued: {
      icon: Clock,
      className: "bg-theme-hover text-theme-text-muted border border-theme",
      label: "Queued",
    },
  };

  let style;
  if (statusLower.includes("download")) {
    style = styles.downloading;
  } else if (statusLower.includes("import")) {
    style = styles.importing;
  } else if (statusLower.includes("complet")) {
    style = styles.completed;
  } else if (statusLower.includes("warn")) {
    style = styles.warning;
  } else if (statusLower.includes("fail") || statusLower.includes("error")) {
    style = styles.failed;
  } else {
    style = styles.queued;
  }

  const Icon = style.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${style.className}`}
    >
      <Icon size={14} />
      <span className="text-xs font-medium">{style.label}</span>
    </div>
  );
};

const formatSize = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const formatTimeLeft = (timeleft) => {
  if (!timeleft) return "Unknown";
  return timeleft;
};

const getStatusColor = (status) => {
  const statusLower = (status || "").toLowerCase();
  if (statusLower.includes("download")) return "text-blue-500";
  if (statusLower.includes("complet") || statusLower.includes("import"))
    return "text-green-500";
  if (statusLower.includes("warn")) return "text-yellow-500";
  if (statusLower.includes("fail") || statusLower.includes("error"))
    return "text-red-500";
  return "text-theme-text-muted";
};

const getStatusBadgeClass = (status) => {
  const statusLower = (status || "").toLowerCase();
  if (statusLower.includes("download"))
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (statusLower.includes("complet") || statusLower.includes("import"))
    return "bg-green-500/20 text-green-400 border-green-500/30";
  if (statusLower.includes("warn"))
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (statusLower.includes("fail") || statusLower.includes("error"))
    return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-theme-hover text-theme-text border-theme";
};

export default function ArrActivity() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state per instance
  const [instancePages, setInstancePages] = useState({});
  const [instanceItemsPerPage, setInstanceItemsPerPage] = useState({});

  // Get tab from URL params - defaults to "tvshows"
  const activeTab = searchParams.get("tab") || "tvshows";

  const {
    data: queueData,
    refetch: refetchQueue,
    isFetching: isFetchingQueue,
  } = useQuery({
    queryKey: ["arr-activity", "queue"],
    queryFn: () => arrActivityApi.getQueue(),
    refetchInterval: 5000,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: queueStatus,
    refetch: refetchQueueStatus,
    isFetching: isFetchingStatus,
  } = useQuery({
    queryKey: ["arr-activity", "queue-status"],
    queryFn: () => arrActivityApi.getQueueStatus(),
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: systemStatus,
    refetch: refetchSystemStatus,
    isFetching: isFetchingSystem,
  } = useQuery({
    queryKey: ["arr-activity", "system-status"],
    queryFn: () => arrActivityApi.getSystemStatus(),
    refetchInterval: 60000, // Check system status every minute
    placeholderData: (previousData) => previousData,
  });

  const instancesList = useMemo(() => {
    if (!queueData) return [];
    return Object.entries(queueData).map(([id, data]) => ({ id, ...data }));
  }, [queueData]);

  const enabledInstances = instancesList.filter((i) => i.enabled);
  const enabledCount = enabledInstances.length;
  const totalInstances = instancesList.length;
  const sonarrTotalQueue = instancesList
    .filter((i) => i.type === "sonarr")
    .reduce((sum, i) => sum + (i.records?.length || 0), 0);
  const radarrTotalQueue = instancesList
    .filter((i) => i.type === "radarr")
    .reduce((sum, i) => sum + (i.records?.length || 0), 0);

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchQueue(),
        refetchQueueStatus(),
        refetchSystemStatus(),
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredInstances = useMemo(() => {
    if (!normalizedSearch) return instancesList;
    return instancesList.map((inst) => ({
      ...inst,
      records: (inst.records || []).filter((item) => {
        const haystack = `${item.title || ""} ${item.downloadClient || ""} ${
          item.indexer || ""
        }`.toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    }));
  }, [instancesList, normalizedSearch]);

  // Pagination helpers
  const getInstancePage = (instanceId) => instancePages[instanceId] || 1;
  const getInstanceItemsPerPage = (instanceId) =>
    instanceItemsPerPage[instanceId] || 10;

  const setInstancePage = (instanceId, page) => {
    setInstancePages((prev) => ({ ...prev, [instanceId]: page }));
  };

  const setInstanceItemsPerPageValue = (instanceId, value) => {
    setInstanceItemsPerPage((prev) => ({ ...prev, [instanceId]: value }));
    // Reset to page 1 when changing items per page
    setInstancePages((prev) => ({ ...prev, [instanceId]: 1 }));
  };

  const getPaginatedRecords = (records, instanceId) => {
    const page = getInstancePage(instanceId);
    const itemsPerPage = getInstanceItemsPerPage(instanceId);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return records.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalRecords, instanceId) => {
    const itemsPerPage = getInstanceItemsPerPage(instanceId);
    return Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  };

  const renderQueueTable = (items, type) => {
    const Icon = type === "sonarr" ? Tv : Film;
    const colorClass = type === "sonarr" ? "text-purple-500" : "text-blue-500";

    if (items.length === 0) {
      return (
        <div className="py-12 text-center text-theme-text-muted">
          <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t("arrActivity.noActiveDownloads", "No active downloads")}</p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-theme-hover border-b border-theme">
                <th className="text-left py-3 px-4 font-medium text-theme-text-secondary rounded-tl-xl">
                  {t("arrActivity.title", "Title")}
                </th>
                <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                  {t("arrActivity.quality", "Quality")}
                </th>
                <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                  {t("arrActivity.status", "Status")}
                </th>
                <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                  {t("arrActivity.size", "Size")}
                </th>
                <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                  {t("arrActivity.timeLeft", "Time Left")}
                </th>
                <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                  {t("arrActivity.protocol", "Protocol")}
                </th>
                <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                  {t("arrActivity.client", "Client")}
                </th>
                <th className="text-right py-3 px-4 font-medium text-theme-text-secondary rounded-tr-xl">
                  {t("arrActivity.progress", "Progress")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const progress =
                  item.size > 0
                    ? ((item.size - item.sizeleft) / item.size) * 100
                    : 0;

                return (
                  <tr
                    key={item.id || idx}
                    className="border-b border-theme hover:bg-theme-hover transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="min-w-0">
                        <div className="font-medium text-theme-text truncate">
                          {item.title}
                        </div>
                        {type === "sonarr" && item.episode && (
                          <div className="text-xs text-theme-text-muted">
                            S
                            {String(item.episode.seasonNumber || 0).padStart(
                              2,
                              "0"
                            )}
                            E
                            {String(item.episode.episodeNumber || 0).padStart(
                              2,
                              "0"
                            )}
                            {item.episode.title && ` - ${item.episode.title}`}
                          </div>
                        )}
                        {item.indexer && (
                          <div className="text-xs text-purple-400">
                            {item.indexer}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-theme-text">
                        {item.quality?.quality?.name || "Unknown"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <ActivityBadge status={item.status} t={t} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-theme-text">
                        {formatSize(item.size - item.sizeleft)}{" "}
                        <span className="text-theme-text-muted">
                          / {formatSize(item.size)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-theme-text-muted">
                        <Clock className="w-3 h-3" />
                        {formatTimeLeft(item.timeleft)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {item.protocol || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-theme-text-muted" />
                        <span className="text-theme-text">
                          {item.downloadClient || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="space-y-1.5 min-w-[200px] ml-auto">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-theme-text-muted">
                            {t("arrActivity.progress", "Progress")}
                          </span>
                          <span className="text-xs font-medium text-green-400">
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative h-2 bg-theme-hover rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300 ease-out bg-green-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-theme-card border border-theme rounded-lg py-2.5 pl-10 pr-3 text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary"
            placeholder={t("common.search", "Search...")}
          />
        </div>
        <button
          onClick={refreshAll}
          disabled={
            isRefreshing ||
            isFetchingQueue ||
            isFetchingStatus ||
            isFetchingSystem
          }
          className="inline-flex items-center justify-center gap-2 bg-theme-card border border-theme rounded-lg px-4 py-2.5 text-sm font-semibold text-theme-text hover:text-white hover:border-theme-primary hover:bg-theme active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCcw
            className={`w-4 h-4 ${
              isRefreshing ||
              isFetchingQueue ||
              isFetchingStatus ||
              isFetchingSystem
                ? "animate-spin"
                : ""
            }`}
          />
          {isRefreshing ||
          isFetchingQueue ||
          isFetchingStatus ||
          isFetchingSystem
            ? t("common.refreshing", "Refreshing")
            : t("common.refresh", "Refresh")}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-purple-500/10 hover:border-purple-500/50">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Tv className="w-3 h-3 text-purple-500" />
                Sonarr
              </p>
              <p className="text-2xl font-bold text-purple-500 mt-1">
                {sonarrTotalQueue}
              </p>
            </div>
            <Tv className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-blue-500/10 hover:border-blue-500/50">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Film className="w-3 h-3 text-blue-500" />
                Radarr
              </p>
              <p className="text-2xl font-bold text-blue-500 mt-1">
                {radarrTotalQueue}
              </p>
            </div>
            <Film className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-green-500/10 hover:border-green-500/50">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Download className="w-3 h-3 text-green-500" />
                {t("arrActivity.totalQueue", "Total Queue")}
              </p>
              <p className="text-2xl font-bold text-green-500 mt-1">
                {sonarrTotalQueue + radarrTotalQueue}
              </p>
            </div>
            <Download className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-orange-500/10 hover:border-orange-500/50">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-orange-500" />
                {t("arrActivity.services", "Services")}
              </p>
              <p className="text-2xl font-bold text-orange-500 mt-1">
                {enabledCount}/{totalInstances || 0}
              </p>
            </div>
            <Server className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Instance Queues - Filtered by Tab */}
      {filteredInstances
        .filter((inst) => {
          if (!inst.enabled) return false;
          if (activeTab === "tvshows") return inst.type === "sonarr";
          if (activeTab === "movies") return inst.type === "radarr";
          return true;
        })
        .map((inst) => {
          const allRecords = inst.records || [];
          const totalRecords = allRecords.length;
          const paginatedRecords = getPaginatedRecords(allRecords, inst.id);
          const currentPage = getInstancePage(inst.id);
          const itemsPerPage = getInstanceItemsPerPage(inst.id);
          const totalPages = getTotalPages(totalRecords, inst.id);

          return (
            <div key={inst.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
                  {inst.type === "sonarr" ? (
                    <Tv className="w-5 h-5" />
                  ) : (
                    <Film className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-theme-text">
                    {inst.name} Downloads
                    <span className="text-sm font-normal text-theme-text-muted ml-2">
                      ({totalRecords})
                    </span>
                  </h3>
                </div>
              </div>

              {inst.error ? (
                <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-6">
                  <div className="flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">
                        Unable to connect to {inst.name}
                      </p>
                      <p className="text-sm text-theme-text-muted mt-1">
                        {inst.error}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-theme-card rounded-xl border border-theme shadow-lg">
                    {renderQueueTable(paginatedRecords, inst.type)}
                  </div>

                  {/* Pagination for this instance */}
                  {totalRecords > 0 && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme border border-theme rounded-xl p-5 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-theme-text-muted">
                          {t("arrActivity.pagination.showing", "Showing")}{" "}
                          <span className="text-theme-text font-semibold">
                            {totalRecords > 0
                              ? (currentPage - 1) * itemsPerPage + 1
                              : 0}
                          </span>{" "}
                          {t("arrActivity.pagination.to", "to")}{" "}
                          <span className="text-theme-text font-semibold">
                            {Math.min(currentPage * itemsPerPage, totalRecords)}
                          </span>{" "}
                          {t("arrActivity.pagination.of", "of")}{" "}
                          <span className="text-theme-text font-semibold">
                            {totalRecords}
                          </span>{" "}
                          {t("arrActivity.pagination.items", "items")}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-theme-text-muted">
                            {t(
                              "arrActivity.pagination.itemsPerPage",
                              "Items per page:"
                            )}
                          </span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) =>
                              setInstanceItemsPerPageValue(
                                inst.id,
                                Number(e.target.value)
                              )
                            }
                            className="px-3 py-1.5 bg-theme-card border border-theme rounded-lg text-sm text-theme-text hover:border-theme-primary focus:outline-none focus:border-theme-primary transition-colors"
                          >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setInstancePage(inst.id, currentPage - 1)
                          }
                          disabled={currentPage === 1}
                          className="p-2.5 bg-theme hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                          title={t("common.previous")}
                        >
                          <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: totalPages }).map(
                            (_, index) => {
                              const page = index + 1;
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 &&
                                  page <= currentPage + 1)
                              ) {
                                return (
                                  <button
                                    key={page}
                                    onClick={() =>
                                      setInstancePage(inst.id, page)
                                    }
                                    className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                                      currentPage === page
                                        ? "bg-theme border border-theme-primary text-white shadow-md scale-105"
                                        : "bg-theme-hover hover:bg-theme border border-theme text-theme-text hover:text-theme-primary hover:border-theme-primary"
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
                                  <span
                                    key={page}
                                    className="text-theme-text-muted px-2"
                                  >
                                    •••
                                  </span>
                                );
                              }
                              return null;
                            }
                          )}
                        </div>

                        <button
                          onClick={() =>
                            setInstancePage(inst.id, currentPage + 1)
                          }
                          disabled={currentPage === totalPages}
                          className="p-2.5 bg-theme-hover hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                          title={t("common.next")}
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
        })}

      {/* No Sonarr Services Configured (TV Shows tab) */}
      {activeTab === "tvshows" &&
        filteredInstances.filter(
          (inst) => inst.enabled && inst.type === "sonarr"
        ).length === 0 && (
          <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
            <Tv className="w-16 h-16 mx-auto text-purple-500/50 mb-4" />
            <h3 className="text-lg font-semibold text-theme-text mb-2">
              {t(
                "arrActivity.noSonarrConfigured",
                "No Sonarr Services Configured"
              )}
            </h3>
            <p className="text-theme-text-muted max-w-md mx-auto">
              {t(
                "arrActivity.configureSonarr",
                "Configure Sonarr instances in settings to monitor TV show downloads."
              )}
            </p>
          </div>
        )}

      {/* No Radarr Services Configured (Movies tab) */}
      {activeTab === "movies" &&
        filteredInstances.filter(
          (inst) => inst.enabled && inst.type === "radarr"
        ).length === 0 && (
          <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
            <Film className="w-16 h-16 mx-auto text-blue-500/50 mb-4" />
            <h3 className="text-lg font-semibold text-theme-text mb-2">
              {t(
                "arrActivity.noRadarrConfigured",
                "No Radarr Services Configured"
              )}
            </h3>
            <p className="text-theme-text-muted max-w-md mx-auto">
              {t(
                "arrActivity.configureRadarr",
                "Configure Radarr instances in settings to monitor movie downloads."
              )}
            </p>
          </div>
        )}

      {/* No Services Configured (fallback) */}
      {enabledCount === 0 && (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <Server className="w-16 h-16 mx-auto text-theme-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-theme-text mb-2">
            {t("arrActivity.noServicesConfigured", "No Services Configured")}
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            {t(
              "arrActivity.configureServices",
              "Configure Sonarr/Radarr instances in settings to monitor download activity."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
