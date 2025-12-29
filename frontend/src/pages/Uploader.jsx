import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  ListOrdered,
  RefreshCcw,
  Search,
  Upload,
  Gauge,
  HardDrive,
  Power,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { uploaderApi } from "../services/uploaderApi";

const formatSize = (valueBytes) => {
  if (!valueBytes || Number.isNaN(valueBytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = valueBytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const parseSizeToBytes = (input) => {
  if (!input) return 0;
  if (typeof input === "number") return input;
  const trimmed = String(input).trim();
  const match = trimmed.match(/([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)/);
  if (!match) return Number(trimmed) || 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const map = {
    b: 1,
    kb: 1024,
    kib: 1024,
    mb: 1024 ** 2,
    mib: 1024 ** 2,
    gb: 1024 ** 3,
    gib: 1024 ** 3,
    tb: 1024 ** 4,
    tib: 1024 ** 4,
  };
  return value * (map[unit] || 1);
};

const parseSpeedToMbps = (speedStr) => {
  if (!speedStr) return 0;
  const match = String(speedStr).match(/([0-9]+(?:\.[0-9]+)?)\s*([KMG])?/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === "g") return value * 1024;
  if (unit === "k") return value / 1024;
  return value;
};

const percentageToNumber = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace("%", "");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
};

export default function Uploader() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "uploader";
  const [pageNumber, setPageNumber] = useState(1);
  const [queuePageNumber, setQueuePageNumber] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [queueItemsPerPage, setQueueItemsPerPage] = useState(10);

  const { data: queueData, refetch: refetchQueue } = useQuery({
    queryKey: ["uploader", "queue"],
    queryFn: () => uploaderApi.getQueue(),
    refetchInterval: 5000,
    placeholderData: (previousData) => previousData,
  });

  const { data: queueStats, refetch: refetchQueueStats } = useQuery({
    queryKey: ["uploader", "queue-stats"],
    queryFn: () => uploaderApi.getQueueStats(),
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  const { data: inProgressData, refetch: refetchInProgress } = useQuery({
    queryKey: ["uploader", "inprogress"],
    queryFn: () => uploaderApi.getInProgress(),
    refetchInterval: 2000,
    placeholderData: (previousData) => previousData,
  });

  const { data: allCompletedData, refetch: refetchAllCompleted } = useQuery({
    queryKey: ["uploader", "completed-all"],
    queryFn: () => uploaderApi.getCompleted(1, 10000),
    refetchInterval: 15000,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: completedData,
    isFetching: completedLoading,
    refetch: refetchCompleted,
  } = useQuery({
    queryKey: ["uploader", "completed", pageNumber, itemsPerPage],
    queryFn: () => uploaderApi.getCompleted(pageNumber, itemsPerPage),
    refetchInterval: 15000,
    keepPreviousData: true,
    placeholderData: (previousData) => previousData,
  });

  const { data: completedToday, refetch: refetchCompletedToday } = useQuery({
    queryKey: ["uploader", "completed-today"],
    queryFn: () => uploaderApi.getCompletedTodayStats(),
    refetchInterval: 15000,
    placeholderData: (previousData) => previousData,
  });

  const { data: uploaderStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["uploader", "status"],
    queryFn: () => uploaderApi.getStatus(),
    refetchInterval: 15000,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: failedData,
    isFetching: failedLoading,
    refetch: refetchFailed,
  } = useQuery({
    queryKey: ["uploader", "failed"],
    queryFn: () => uploaderApi.getFailed(1, 1000),
    refetchInterval: 15000,
    placeholderData: (previousData) => previousData,
  });

  const queueFiles = queueData?.files || [];
  const inProgressJobs = inProgressData?.jobs || [];
  const completedJobs = completedData?.jobs || [];
  const failedJobs = failedData?.jobs || [];
  const totalCompleted = completedData?.total_count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCompleted / itemsPerPage));

  // Reset to page 1 when items per page changes
  React.useEffect(() => {
    setPageNumber(1);
  }, [itemsPerPage]);

  // Reset queue page to 1 when queue items per page changes
  React.useEffect(() => {
    setQueuePageNumber(1);
  }, [queueItemsPerPage]);

  const queueTotalSize = useMemo(() => {
    if (queueStats?.total_size) return queueStats.total_size;
    return queueFiles.reduce(
      (acc, file) => acc + parseSizeToBytes(file.filesize),
      0
    );
  }, [queueFiles, queueStats]);

  const totalActiveSpeed = useMemo(
    () =>
      inProgressJobs.reduce(
        (acc, job) => acc + parseSpeedToMbps(job.upload_speed),
        0
      ),
    [inProgressJobs]
  );

  const rawStatus = uploaderStatus?.status || "UNKNOWN";
  const activeUploads = inProgressJobs.length;

  const { statusLabel, statusIcon, statusTone } = useMemo(() => {
    const label = rawStatus.toLowerCase();

    if (label.includes("error") || label.includes("fail")) {
      return {
        statusLabel: "Error",
        statusIcon: Power,
        statusTone: {
          color: "text-red-500",
          bg: "hover:bg-red-500/10 hover:border-red-500/50",
        },
      };
    }

    if (label.includes("stopped")) {
      return {
        statusLabel: "Stopped",
        statusIcon: Power,
        statusTone: {
          color: "text-orange-500",
          bg: "hover:bg-orange-500/10 hover:border-orange-500/50",
        },
      };
    }

    if (label.includes("started")) {
      if (activeUploads > 0) {
        return {
          statusLabel: "Uploading",
          statusIcon: Upload,
          statusTone: {
            color: "text-green-500",
            bg: "hover:bg-green-500/10 hover:border-green-500/50",
          },
        };
      } else {
        return {
          statusLabel: "Online",
          statusIcon: CheckCircle,
          statusTone: {
            color: "text-green-500",
            bg: "hover:bg-green-500/10 hover:border-green-500/50",
          },
        };
      }
    }

    return {
      statusLabel: rawStatus,
      statusIcon: Power,
      statusTone: {
        color: "text-gray-500",
        bg: "hover:bg-gray-500/10 hover:border-gray-500/50",
      },
    };
  }, [rawStatus, activeUploads]);

  const refreshAll = () => {
    refetchQueue();
    refetchQueueStats();
    refetchInProgress();
    refetchAllCompleted();
    refetchCompleted();
    refetchCompletedToday();
    refetchStatus();
    refetchFailed();
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredInProgressJobs = useMemo(() => {
    if (!normalizedSearch) return inProgressJobs;
    return inProgressJobs.filter((job) => {
      const haystack = `${job.file_name || ""} ${job.drive || ""} ${
        job.file_directory || ""
      } ${job.gdsa || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [inProgressJobs, normalizedSearch]);

  const filteredQueueFiles = useMemo(() => {
    if (!normalizedSearch) return queueFiles;
    return queueFiles.filter((file) => {
      const haystack = `${file.filename || ""} ${file.drive || ""} ${
        file.filedir || ""
      }`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, queueFiles]);

  // Queue pagination calculations
  const totalQueueFiles = filteredQueueFiles.length;
  const totalQueuePages = Math.max(
    1,
    Math.ceil(totalQueueFiles / queueItemsPerPage)
  );

  // Paginated queue files
  const paginatedQueueFiles = useMemo(() => {
    const startIndex = (queuePageNumber - 1) * queueItemsPerPage;
    const endIndex = startIndex + queueItemsPerPage;
    return filteredQueueFiles.slice(startIndex, endIndex);
  }, [filteredQueueFiles, queuePageNumber, queueItemsPerPage]);

  const onQueueNextPage = () => {
    setQueuePageNumber((prev) => Math.min(prev + 1, totalQueuePages));
  };

  const onQueuePrevPage = () => {
    setQueuePageNumber((prev) => Math.max(prev - 1, 1));
  };

  const filteredCompletedJobs = useMemo(() => {
    // Use all completed jobs for search to include all history pages
    const jobsToSearch = normalizedSearch
      ? allCompletedData?.jobs || []
      : completedJobs;
    if (!normalizedSearch) return completedJobs;
    return jobsToSearch.filter((job) => {
      const haystack = `${job.file_name || ""} ${job.drive || ""} ${
        job.file_directory || ""
      } ${job.gdsa || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [completedJobs, allCompletedData, normalizedSearch]);

  const onNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, totalPages));
  };

  const onPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="space-y-3">
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
            className="inline-flex items-center justify-center gap-2 bg-theme-card border border-theme rounded-lg px-4 py-2.5 text-sm font-semibold text-theme-text hover:text-white hover:border-theme-primary hover:bg-theme active:scale-95 transition-all shadow-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            {t("common.refresh", "Refresh")}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 sm:gap-4">
          <div
            className={`relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md ${statusTone.bg}`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  {React.createElement(statusIcon, {
                    className: `w-3 h-3 ${statusTone.color}`,
                  })}
                  {t("uploader.systemStatus", "System Status")}
                </p>
                <p className={`text-2xl font-bold mt-1 ${statusTone.color}`}>
                  {statusLabel}
                </p>
              </div>
              {React.createElement(statusIcon, {
                className: `w-8 h-8 ${statusTone.color}`,
              })}
            </div>
          </div>

          <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-indigo-500/10 hover:border-indigo-500/50">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-500" />
                  {t("uploader.uptime", "Uptime")}
                </p>
                <p className="text-2xl font-bold text-indigo-500 mt-1">
                  {uploaderStatus?.uptime || t("uploader.unknown", "Unknown")}
                </p>
              </div>
              <Clock className="w-8 h-8 text-indigo-500" />
            </div>
          </div>

          <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-orange-500/10 hover:border-orange-500/50">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-orange-500" />
                  {t("uploader.storage", "Storage")}
                </p>
                <p className="text-2xl font-bold text-orange-500 mt-1">
                  {uploaderStatus?.storage || t("uploader.unknown", "Unknown")}
                </p>
              </div>
              <HardDrive className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-cyan-500/10 hover:border-cyan-500/50">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-500" />
                  {t("uploader.mini.rate")}
                </p>
                <p className="text-2xl font-bold text-cyan-500 mt-1">
                  {totalActiveSpeed.toFixed(2)}
                  <span className="text-sm text-cyan-400 ml-1">MB/s</span>
                </p>
              </div>
              <Gauge className="w-8 h-8 text-cyan-500" />
            </div>
          </div>

          <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-blue-500/10 hover:border-blue-500/50">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Upload className="w-3 h-3 text-blue-500" />
                  {t("uploader.activeUploads")}
                </p>
                <p className="text-2xl font-bold text-blue-500 mt-1">
                  {inProgressJobs.length}
                </p>
              </div>
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-purple-500/10 hover:border-purple-500/50">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-purple-500" />
                  {t("uploader.queue")}
                </p>
                <p className="text-2xl font-bold text-purple-500 mt-1">
                  {queueFiles.length}
                </p>
                <div className="text-[10px] text-theme-text-muted/70 mt-0.5">
                  {formatSize(queueTotalSize)}
                </div>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-green-500/10 hover:border-green-500/50">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {t("uploader.completed")}
                </p>
                <p className="text-2xl font-bold text-green-500 mt-1">
                  {totalCompleted}
                </p>
                <div className="text-[10px] text-theme-text-muted/70 mt-0.5">
                  {t("uploader.mini.completedToday")}:{" "}
                  {completedToday?.count || 0}
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {(activeTab === "uploader" || activeTab === "active") && (
        <Section>
          <div className="bg-theme-card rounded-xl border border-theme shadow-lg">
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-theme-hover border-b border-theme">
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary rounded-tl-xl">
                        {t("uploader.table.filename")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.drive")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.directory")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.key")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.progress")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.size")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.remaining")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-theme-text-secondary rounded-tr-xl">
                        {t("uploader.table.speed")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInProgressJobs.length === 0 && (
                      <tr>
                        <td
                          className="py-6 px-4 text-center text-theme-text-secondary"
                          colSpan={8}
                        >
                          {t("uploader.empty.active")}
                        </td>
                      </tr>
                    )}
                    {filteredInProgressJobs.map((job, index) => {
                      const progress = percentageToNumber(
                        job.upload_percentage
                      );
                      const normalizedDir =
                        job.file_directory &&
                        job.drive &&
                        job.file_directory.startsWith(`${job.drive}/`)
                          ? job.file_directory.slice(job.drive.length + 1)
                          : job.file_directory || "";
                      return (
                        <tr
                          key={`${job.file_name}-${index}`}
                          className="border-b border-theme hover:bg-theme-hover/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium truncate max-w-[220px]">
                            {job.file_name}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {job.drive || "-"}
                          </td>
                          <td className="py-3 px-4 truncate max-w-[220px]">
                            {normalizedDir || "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {job.gdsa || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-2">
                              <div className="relative h-2.5 bg-theme-hover rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-green-500 transition-all duration-300 ease-out"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="text-xs font-medium text-green-400">
                                {progress.toFixed(0)}%
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {job.file_size || "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {job.upload_remainingtime || "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            {job.upload_speed || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Section>
      )}

      {(activeTab === "uploader" || activeTab === "queue") && (
        <Section>
          <div className="bg-theme-card rounded-xl border border-theme shadow-lg">
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-theme-hover border-b border-theme">
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary rounded-tl-xl">
                        #
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.filename")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.drive")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.directory")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.size")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-theme-text-secondary rounded-tr-xl">
                        {t("uploader.table.added")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQueueFiles.length === 0 && (
                      <tr>
                        <td
                          className="py-6 px-4 text-center text-theme-text-secondary"
                          colSpan={6}
                        >
                          {t("uploader.empty.queue")}
                        </td>
                      </tr>
                    )}
                    {paginatedQueueFiles.map((file, index) => {
                      const normalizedDir =
                        file.filedir &&
                        file.drive &&
                        file.filedir.startsWith(`${file.drive}/`)
                          ? file.filedir.slice(file.drive.length + 1)
                          : file.filedir || "";
                      const added = file.created_at
                        ? new Date(file.created_at * 1000).toLocaleString()
                        : "-";
                      const rowNumber =
                        (queuePageNumber - 1) * queueItemsPerPage + index + 1;
                      return (
                        <tr
                          key={`${file.filename}-${index}`}
                          className="border-b border-theme hover:bg-theme-hover/30 transition-colors"
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            {rowNumber}
                          </td>
                          <td className="py-3 px-4 font-medium truncate max-w-[220px]">
                            {file.filename}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {file.drive || "-"}
                          </td>
                          <td className="py-3 px-4 truncate max-w-[220px]">
                            {normalizedDir || "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {formatSize(file.filesize)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            {added}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Queue Pagination */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme border border-theme rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-theme-text-muted">
                {t("uploader.pagination.showing", "Showing")}{" "}
                <span className="text-theme-text font-semibold">
                  {totalQueueFiles > 0
                    ? (queuePageNumber - 1) * queueItemsPerPage + 1
                    : 0}
                </span>{" "}
                {t("uploader.pagination.to", "to")}{" "}
                <span className="text-theme-text font-semibold">
                  {Math.min(
                    queuePageNumber * queueItemsPerPage,
                    totalQueueFiles
                  )}
                </span>{" "}
                {t("uploader.pagination.of", "of")}{" "}
                <span className="text-theme-text font-semibold">
                  {totalQueueFiles}
                </span>{" "}
                {t("uploader.pagination.files", "files")}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-theme-text-muted">
                  {t("uploader.pagination.itemsPerPage", "Items per page:")}
                </span>
                <select
                  value={queueItemsPerPage}
                  onChange={(e) => setQueueItemsPerPage(Number(e.target.value))}
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
                onClick={onQueuePrevPage}
                disabled={queuePageNumber === 1}
                className="p-2.5 bg-theme hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                title={t("common.previous")}
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalQueuePages }).map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === totalQueuePages ||
                    (page >= queuePageNumber - 1 && page <= queuePageNumber + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setQueuePageNumber(page)}
                        className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                          queuePageNumber === page
                            ? "bg-theme border border-theme-primary text-white shadow-md scale-105"
                            : "bg-theme-hover hover:bg-theme border border-theme text-theme-text hover:text-theme-primary hover:border-theme-primary"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === queuePageNumber - 2 ||
                    page === queuePageNumber + 2
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
                onClick={onQueueNextPage}
                disabled={queuePageNumber === totalQueuePages}
                className="p-2.5 bg-theme-hover hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                title={t("common.next")}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </Section>
      )}

      {(activeTab === "uploader" || activeTab === "history") && (
        <Section>
          <div className="bg-theme-card rounded-xl border border-theme shadow-lg">
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-theme-hover border-b border-theme">
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary rounded-tl-xl">
                        {t("uploader.table.filename")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.drive")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.directory")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.key")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.size")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.duration")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-theme-text-secondary rounded-tr-xl">
                        {t("uploader.table.completedAt")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!filteredCompletedJobs ||
                      filteredCompletedJobs.length === 0) && (
                      <tr>
                        <td
                          className="py-6 px-4 text-center text-theme-text-secondary"
                          colSpan={7}
                        >
                          {completedLoading
                            ? t("common.loading")
                            : t("uploader.empty.completed")}
                        </td>
                      </tr>
                    )}
                    {filteredCompletedJobs?.map((job, index) => {
                      const normalizedDir =
                        job.file_directory &&
                        job.drive &&
                        job.file_directory.startsWith(`${job.drive}/`)
                          ? job.file_directory.slice(job.drive.length + 1)
                          : job.file_directory || "";
                      return (
                        <tr
                          key={`${job.file_name}-${index}`}
                          className="border-b border-theme hover:bg-theme-hover/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium truncate max-w-[300px]">
                            {job.file_name}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {job.drive || "-"}
                          </td>
                          <td className="py-3 px-4 truncate max-w-[280px]">
                            {normalizedDir || "-"}
                          </td>
                          <td className="py-3 px-4 truncate max-w-[120px]">
                            {job.gdsa || "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {job.file_size || "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {job.time_elapsed || "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            {job.time_end_clean || job.time_end || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Pagination - pill style like Plex pages, outside the card */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme border border-theme rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-theme-text-muted">
                {t("uploader.pagination.showing", "Showing")}{" "}
                <span className="text-theme-text font-semibold">
                  {(pageNumber - 1) * itemsPerPage + 1}
                </span>{" "}
                {t("uploader.pagination.to", "to")}{" "}
                <span className="text-theme-text font-semibold">
                  {Math.min(pageNumber * itemsPerPage, totalCompleted)}
                </span>{" "}
                {t("uploader.pagination.of", "of")}{" "}
                <span className="text-theme-text font-semibold">
                  {totalCompleted}
                </span>{" "}
                {t("uploader.pagination.jobs", "jobs")}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-theme-text-muted">
                  {t("uploader.pagination.itemsPerPage", "Items per page:")}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
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
                onClick={onPrevPage}
                disabled={pageNumber === 1}
                className="p-2.5 bg-theme hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                title={t("common.previous")}
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= pageNumber - 1 && page <= pageNumber + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setPageNumber(page)}
                        className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                          pageNumber === page
                            ? "bg-theme border border-theme-primary text-white shadow-md scale-105"
                            : "bg-theme-hover hover:bg-theme border border-theme text-theme-text hover:text-theme-primary hover:border-theme-primary"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === pageNumber - 2 ||
                    page === pageNumber + 2
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
                onClick={onNextPage}
                disabled={pageNumber === totalPages}
                className="p-2.5 bg-theme-hover hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                title={t("common.next")}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </Section>
      )}

      {activeTab === "failed" && (
        <Section>
          <div className="bg-theme-card rounded-xl border border-theme shadow-lg">
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-theme-hover border-b border-theme">
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary rounded-tl-xl">
                        {t("uploader.table.filename")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.drive")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.directory")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.size")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-theme-text-secondary">
                        {t("uploader.table.error", "Error")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-theme-text-secondary rounded-tr-xl">
                        {t("uploader.table.failedAt", "Failed At")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!failedJobs || failedJobs.length === 0) && (
                      <tr>
                        <td
                          className="py-6 px-4 text-center text-theme-text-secondary"
                          colSpan={6}
                        >
                          {failedLoading
                            ? t("common.loading")
                            : t("uploader.empty.failed", "No failed uploads")}
                        </td>
                      </tr>
                    )}
                    {failedJobs?.map((job, index) => {
                      const normalizedDir =
                        job.file_directory &&
                        job.drive &&
                        job.file_directory.startsWith(`${job.drive}/`)
                          ? job.file_directory.slice(job.drive.length + 1)
                          : job.file_directory || "";
                      return (
                        <tr
                          key={`${job.file_name}-${index}`}
                          className="border-b border-theme hover:bg-theme-hover/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium truncate max-w-[220px]">
                            {job.file_name}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {job.drive || "-"}
                          </td>
                          <td className="py-3 px-4 truncate max-w-[220px]">
                            {normalizedDir || "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {job.file_size || "-"}
                          </td>
                          <td
                            className="py-3 px-4 truncate max-w-[200px] text-red-400 cursor-help"
                            title={job.error_message || ""}
                          >
                            {job.error_message || "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            {job.time_end_clean || job.time_end || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ children }) {
  return <section className="space-y-3">{children}</section>;
}
