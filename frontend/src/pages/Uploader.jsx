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
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Upload}
          title={t("uploader.activeUploads")}
          primary={`${inProgressJobs.length}`}
          secondary={`${totalActiveSpeed.toFixed(2)} MB/s`}
          accent="text-blue-400"
        />
        <SummaryCard
          icon={ListOrdered}
          title={t("uploader.queue")}
          primary={`${queueFiles.length}`}
          secondary={formatSize(queueTotalSize)}
          accent="text-amber-400"
        />
        <SummaryCard
          icon={CheckCircle}
          title={t("uploader.completedToday")}
          primary={`${completedToday?.count || 0}`}
          secondary={formatSize(completedToday?.total_size || 0)}
          accent="text-green-400"
        />
        <SummaryCard
          icon={Activity}
          title={t("uploader.status")}
          primary={statusLabel}
          secondary={uploaderStatus?.uptime || ""}
          accent={
            statusLabel === "STARTED" ? "text-green-400" : "text-orange-400"
          }
        />
      </div>

      <Section
        title={t("uploader.activeUploads")}
        icon={Upload}
        description={t("uploader.activeDescription")}
      >
        <div className="overflow-x-auto border border-theme rounded-lg bg-theme-card">
          <table className="min-w-full text-sm">
            <thead className="text-left text-theme-muted border-b border-theme">
              <tr className="divide-x divide-theme/60">
                <th className="px-4 py-3">{t("uploader.table.filename")}</th>
                <th className="px-4 py-3">{t("uploader.table.drive")}</th>
                <th className="px-4 py-3">{t("uploader.table.directory")}</th>
                <th className="px-4 py-3">{t("uploader.table.key")}</th>
                <th className="px-4 py-3">{t("uploader.table.progress")}</th>
                <th className="px-4 py-3">{t("uploader.table.size")}</th>
                <th className="px-4 py-3">{t("uploader.table.remaining")}</th>
                <th className="px-4 py-3">{t("uploader.table.speed")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme/60 text-theme-text">
              {inProgressJobs.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-4 text-center text-theme-muted"
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
                    className="divide-x divide-theme/60"
                  >
                    <td className="px-4 py-3 font-medium truncate max-w-[220px]">
                      {job.file_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.drive || "-"}
                    </td>
                    <td className="px-4 py-3 truncate max-w-[220px]">
                      {normalizedDir || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.gdsa || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-theme/40 rounded h-2 overflow-hidden">
                          <div
                            className="h-2 bg-theme-primary"
                            style={{ width: `${progress}%` }}
                            aria-label={t("uploader.table.progress")}
                          />
                        </div>
                        <span className="text-xs text-theme-muted min-w-[48px] text-right">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.file_size || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.upload_remainingtime || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.upload_speed || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title={t("uploader.queue")}
        icon={ListOrdered}
        description={t("uploader.queueDescription")}
      >
        <div className="overflow-x-auto border border-theme rounded-lg bg-theme-card">
          <table className="min-w-full text-sm">
            <thead className="text-left text-theme-muted border-b border-theme">
              <tr className="divide-x divide-theme/60">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t("uploader.table.filename")}</th>
                <th className="px-4 py-3">{t("uploader.table.drive")}</th>
                <th className="px-4 py-3">{t("uploader.table.directory")}</th>
                <th className="px-4 py-3">{t("uploader.table.size")}</th>
                <th className="px-4 py-3">{t("uploader.table.added")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme/60 text-theme-text">
              {queueFiles.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-4 text-center text-theme-muted"
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
                    className="divide-x divide-theme/60"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
                    <td className="px-4 py-3 font-medium truncate max-w-[220px]">
                      {file.filename}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {file.drive || "-"}
                    </td>
                    <td className="px-4 py-3 truncate max-w-[220px]">
                      {normalizedDir || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {file.filesize || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{added}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title={t("uploader.completed")}
        icon={CheckCircle}
        description={t("uploader.completedDescription")}
      >
        <div className="overflow-x-auto border border-theme rounded-lg bg-theme-card">
          <table className="min-w-full text-sm">
            <thead className="text-left text-theme-muted border-b border-theme">
              <tr className="divide-x divide-theme/60">
                <th className="px-4 py-3">{t("uploader.table.filename")}</th>
                <th className="px-4 py-3">{t("uploader.table.drive")}</th>
                <th className="px-4 py-3">{t("uploader.table.directory")}</th>
                <th className="px-4 py-3">{t("uploader.table.key")}</th>
                <th className="px-4 py-3">{t("uploader.table.size")}</th>
                <th className="px-4 py-3">{t("uploader.table.duration")}</th>
                <th className="px-4 py-3">{t("uploader.table.completedAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme/60 text-theme-text">
              {(!completedJobs || completedJobs.length === 0) && (
                <tr>
                  <td
                    className="px-4 py-4 text-center text-theme-muted"
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
                    className="divide-x divide-theme/60"
                  >
                    <td className="px-4 py-3 font-medium truncate max-w-[220px]">
                      {job.file_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.drive || "-"}
                    </td>
                    <td className="px-4 py-3 truncate max-w-[220px]">
                      {normalizedDir || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.gdsa || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.file_size || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.time_elapsed || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {job.time_end_clean || job.time_end || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-sm text-theme-muted">
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

      <Section
        title={t("uploader.systemOverview")}
        icon={Server}
        description={t("uploader.systemDescription")}
      >
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            icon={Gauge}
            label={t("uploader.mini.rate")}
            value={`${totalActiveSpeed.toFixed(2)} MB/s`}
          />
          <MiniStat
            icon={Activity}
            label={t("uploader.mini.queueCount")}
            value={`${queueFiles.length}`}
            helper={formatSize(queueTotalSize)}
          />
          <MiniStat
            icon={CheckCircle}
            label={t("uploader.mini.completedToday")}
            value={`${completedToday?.count || 0}`}
            helper={formatSize(completedToday?.total_size || 0)}
          />
          <MiniStat
            icon={ArrowRight}
            label={t("uploader.mini.status")}
            value={statusLabel}
            helper={uploaderStatus?.storage || ""}
          />
        </div>
      </Section>
    </div>
  );
}

function SummaryCard({ icon: Icon, title, primary, secondary, accent }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-theme-card border border-theme rounded-lg shadow-sm">
      <div className={`p-3 rounded-lg bg-theme-hover ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-theme-muted">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-theme-text">{primary}</span>
          {secondary && (
            <span className="text-xs text-theme-muted">{secondary}</span>
          )}
        </div>
      </div>
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
          <p className="text-sm text-theme-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MiniStat({ icon: Icon, label, value, helper }) {
  return (
    <div className="p-4 bg-theme-card border border-theme rounded-lg flex items-center gap-3">
      <div className="p-2 rounded bg-theme-hover text-theme-primary">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-theme-muted">{label}</p>
        <p className="text-lg font-semibold text-theme-text">{value}</p>
        {helper && <p className="text-xs text-theme-muted">{helper}</p>}
      </div>
    </div>
  );
}
