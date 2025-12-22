import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  ListOrdered,
  Server,
  Upload,
  Gauge,
  ArrowRight,
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
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 25;

  const { data: queueData } = useQuery({
    queryKey: ["uploader", "queue"],
    queryFn: () => uploaderApi.getQueue(),
    refetchInterval: 5000,
    placeholderData: (previousData) => previousData,
  });

  const { data: queueStats } = useQuery({
    queryKey: ["uploader", "queue-stats"],
    queryFn: () => uploaderApi.getQueueStats(),
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  const { data: inProgressData } = useQuery({
    queryKey: ["uploader", "inprogress"],
    queryFn: () => uploaderApi.getInProgress(),
    refetchInterval: 2000,
    placeholderData: (previousData) => previousData,
  });

  const { data: completedData, isFetching: completedLoading } = useQuery({
    queryKey: ["uploader", "completed", pageNumber, pageSize],
    queryFn: () => uploaderApi.getCompleted(pageNumber, pageSize),
    refetchInterval: 15000,
    keepPreviousData: true,
    placeholderData: (previousData) => previousData,
  });

  const { data: completedToday } = useQuery({
    queryKey: ["uploader", "completed-today"],
    queryFn: () => uploaderApi.getCompletedTodayStats(),
    refetchInterval: 15000,
    placeholderData: (previousData) => previousData,
  });

  const { data: uploaderStatus } = useQuery({
    queryKey: ["uploader", "status"],
    queryFn: () => uploaderApi.getStatus(),
    refetchInterval: 15000,
    placeholderData: (previousData) => previousData,
  });

  const queueFiles = queueData?.files || [];
  const inProgressJobs = inProgressData?.jobs || [];
  const completedJobs = completedData?.jobs || [];
  const totalCompleted = completedData?.total_count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCompleted / pageSize));

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

  const statusLabel = uploaderStatus?.status || "UNKNOWN";

  const onNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, totalPages));
  };

  const onPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Section
        title={t("uploader.systemOverview")}
        icon={Server}
        description={t("uploader.systemDescription")}
      >
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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

          <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-purple-500/10 hover:border-purple-500/50">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-purple-500" />
                  {t("uploader.mini.queueCount")}
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
                  {t("uploader.mini.completedToday")}
                </p>
                <p className="text-2xl font-bold text-green-500 mt-1">
                  {completedToday?.count || 0}
                </p>
                <div className="text-[10px] text-theme-text-muted/70 mt-0.5">
                  {formatSize(completedToday?.total_size || 0)}
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div
            className={`relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md ${
              statusLabel === "STARTED"
                ? "hover:bg-green-500/10 hover:border-green-500/50"
                : "hover:bg-orange-500/10 hover:border-orange-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <ArrowRight
                    className={`w-3 h-3 ${
                      statusLabel === "STARTED"
                        ? "text-green-500"
                        : "text-orange-500"
                    }`}
                  />
                  {t("uploader.mini.status")}
                </p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    statusLabel === "STARTED"
                      ? "text-green-500"
                      : "text-orange-500"
                  }`}
                >
                  {statusLabel}
                </p>
                {uploaderStatus?.storage && (
                  <div className="text-[10px] text-theme-text-muted/70 mt-0.5">
                    {uploaderStatus.storage}
                  </div>
                )}
              </div>
              <ArrowRight
                className={`w-8 h-8 ${
                  statusLabel === "STARTED"
                    ? "text-green-500"
                    : "text-orange-500"
                }`}
              />
            </div>
          </div>
        </div>
      </Section>
      {/* Stats Cards - align with Dashboard style */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-blue-500/10 hover:border-blue-500/50">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Upload className="w-3 h-3 text-blue-500" />
                {t("uploader.activeUploads")}
              </p>
              <p className="text-2xl font-bold text-blue-500 mt-1">
                {inProgressJobs.length}
                <span className="text-sm text-blue-400 ml-1">{`${totalActiveSpeed.toFixed(
                  2
                )} MB/s`}</span>
              </p>
            </div>
            <Upload className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-amber-500/10 hover:border-amber-500/50">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <ListOrdered className="w-3 h-3 text-amber-500" />
                {t("uploader.queue")}
              </p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {queueFiles.length}
                <span className="text-sm text-amber-400 ml-1">
                  {formatSize(queueTotalSize)}
                </span>
              </p>
            </div>
            <ListOrdered className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:bg-green-500/10 hover:border-green-500/50">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                {t("uploader.completedToday")}
              </p>
              <p className="text-2xl font-bold text-green-500 mt-1">
                {completedToday?.count || 0}
                <span className="text-sm text-green-400 ml-1">
                  {formatSize(completedToday?.total_size || 0)}
                </span>
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div
          className={`relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md ${
            statusLabel === "STARTED"
              ? "hover:bg-green-500/10 hover:border-green-500/50"
              : "hover:bg-orange-500/10 hover:border-orange-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Activity
                  className={`w-3 h-3 ${
                    statusLabel === "STARTED"
                      ? "text-green-500"
                      : "text-orange-500"
                  }`}
                />
                {t("uploader.status")}
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  statusLabel === "STARTED"
                    ? "text-green-500"
                    : "text-orange-500"
                }`}
              >
                {statusLabel}
                {uploaderStatus?.uptime && (
                  <span
                    className={`text-sm ml-1 ${
                      statusLabel === "STARTED"
                        ? "text-green-400"
                        : "text-orange-400"
                    }`}
                  >
                    {uploaderStatus.uptime}
                  </span>
                )}
              </p>
            </div>
            <Activity
              className={`w-8 h-8 ${
                statusLabel === "STARTED" ? "text-green-500" : "text-orange-500"
              }`}
            />
          </div>
        </div>
      </div>

      <Section
        title={t("uploader.activeUploads")}
        icon={Upload}
        description={t("uploader.activeDescription")}
      >
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-theme-hover border-b border-theme">
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.filename")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.drive")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.directory")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.key")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.progress")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.size")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.remaining")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.speed")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {inProgressJobs.length === 0 && (
                  <tr>
                    <td
                      className="py-6 px-4 text-center text-theme-text-secondary"
                      colSpan={8}
                    >
                      {t("uploader.empty.active")}
                    </td>
                  </tr>
                )}
                {inProgressJobs.map((job, index) => {
                  const progress = percentageToNumber(job.upload_percentage);
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
                              className="h-full rounded-full bg-theme-primary transition-all duration-300 ease-out"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="text-xs font-medium text-theme-text-muted">
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
                      <td className="py-3 px-4 whitespace-nowrap">
                        {job.upload_speed || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section
        title={t("uploader.queue")}
        icon={ListOrdered}
        description={t("uploader.queueDescription")}
      >
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-theme-hover border-b border-theme">
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    #
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.filename")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.drive")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.directory")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.size")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.added")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {queueFiles.length === 0 && (
                  <tr>
                    <td
                      className="py-6 px-4 text-center text-theme-text-secondary"
                      colSpan={6}
                    >
                      {t("uploader.empty.queue")}
                    </td>
                  </tr>
                )}
                {queueFiles.map((file, index) => {
                  const normalizedDir =
                    file.filedir &&
                    file.drive &&
                    file.filedir.startsWith(`${file.drive}/`)
                      ? file.filedir.slice(file.drive.length + 1)
                      : file.filedir || "";
                  const added = file.created_at
                    ? new Date(file.created_at * 1000).toLocaleString()
                    : "-";
                  return (
                    <tr
                      key={`${file.filename}-${index}`}
                      className="border-b border-theme hover:bg-theme-hover/30 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        {index + 1}
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
                        {file.filesize || "-"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{added}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section
        title={t("uploader.completed")}
        icon={CheckCircle}
        description={t("uploader.completedDescription")}
      >
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-theme-hover border-b border-theme">
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.filename")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.drive")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.directory")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.key")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.size")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.duration")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                    {t("uploader.table.completedAt")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(!completedJobs || completedJobs.length === 0) && (
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
                {completedJobs?.map((job, index) => {
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
                      <td className="py-3 px-4 whitespace-nowrap">
                        {job.file_size || "-"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {job.time_elapsed || "-"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {job.time_end_clean || job.time_end || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 text-sm text-theme-text-muted">
          <div>
            {t("uploader.pagination", {
              from: (pageNumber - 1) * pageSize + 1,
              to: Math.min(pageNumber * pageSize, totalCompleted),
              total: totalCompleted,
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={pageNumber === 1}
              className="px-3 py-1 border border-theme rounded bg-theme-card disabled:opacity-50"
            >
              {t("common.previous")}
            </button>
            <span className="text-theme-text">
              {pageNumber} / {totalPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={pageNumber === totalPages}
              className="px-3 py-1 border border-theme rounded bg-theme-card disabled:opacity-50"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, description, icon: Icon, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded bg-theme-hover text-theme-primary">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-theme-text">{title}</h2>
          <p className="text-sm text-theme-text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
