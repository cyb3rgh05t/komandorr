import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Clock,
  Server,
  CheckCircle,
  XCircle,
  Calendar,
  Timer,
  FolderOpen,
  Film,
  Play,
  Pause,
  ArrowUpCircle,
  Layers,
  WifiOff,
} from "lucide-react";
import { api } from "../services/api";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i > 0 ? 2 : 0)} ${units[i]}`;
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function Posterizarr() {
  // Connection check
  const { data: connStatus } = useQuery({
    queryKey: ["posterizarr-status"],
    queryFn: () => api.get("/posterizarr/status"),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Dashboard: combined status + version + system info
  const {
    data: dashboard,
    isLoading: dashLoading,
    isFetching: dashFetching,
    refetch: refetchDash,
  } = useQuery({
    queryKey: ["posterizarr-dashboard"],
    queryFn: () => api.get("/posterizarr/dashboard"),
    staleTime: 10000,
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  // Scheduler
  const { data: scheduler, refetch: refetchScheduler } = useQuery({
    queryKey: ["posterizarr-scheduler"],
    queryFn: () => api.get("/posterizarr/scheduler"),
    staleTime: 10000,
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  // Runtime history
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["posterizarr-history"],
    queryFn: () => api.get("/posterizarr/runtime-history?limit=15"),
    staleTime: 15000,
    refetchInterval: 30000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  // Assets stats
  const { data: assetsStats, refetch: refetchAssets } = useQuery({
    queryKey: ["posterizarr-assets-stats"],
    queryFn: () => api.get("/posterizarr/assets/stats"),
    staleTime: 30000,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  // Plex export
  const { data: plexExport } = useQuery({
    queryKey: ["posterizarr-plex-stats"],
    queryFn: () => api.get("/posterizarr/plex-export/statistics"),
    staleTime: 30000,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  const isConnected = connStatus?.connected;

  const refetchAll = () => {
    refetchDash();
    refetchScheduler();
    refetchHistory();
    refetchAssets();
  };

  // Extract from /dashboard/all response
  // { success, status: { running, manual_running, scheduler_running, active_log },
  //   version: { local, remote, is_update_available },
  //   scheduler_status: { enabled, next_run },
  //   system_info: { platform, cpu_cores, memory_percent, is_docker, cpu_model, total_memory, used_memory, os_version } }
  const status = dashboard?.status || {};
  const version = dashboard?.version || {};
  const schedulerStatus = dashboard?.scheduler_status || {};
  const sysInfo = dashboard?.system_info || {};

  // Scheduler detail from /scheduler/status
  // { success, enabled, running, is_executing, schedules: [{time, description}], timezone, last_run, next_run, active_jobs: [{id, name, next_run}] }
  const schedules = scheduler?.schedules || [];
  const activeJobs = scheduler?.active_jobs || [];

  // History from /runtime-history
  // { success, history: [{id, timestamp, mode, runtime_seconds, runtime_formatted, total_images, posters, seasons, backgrounds, titlecards, collections, errors, status}], count, total, limit }
  const historyItems =
    history?.history || (Array.isArray(history) ? history : []);

  // Assets stats from /assets/stats
  // { success, stats: { posters, backgrounds, seasons, titlecards, total_size, folders: [{name, path, poster_count, files, size}] } }
  const stats = assetsStats?.stats || {};
  const assetFolders = stats?.folders || [];

  // Plex export from /plex-export/statistics
  // { success, statistics: { total_runs, total_library_records, total_episode_records, latest_run } }
  const plexStatistics = plexExport?.statistics || {};

  const posterizarrNotConfigured = !connStatus?.connected && !dashLoading;

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Not Configured Banner */}
      {posterizarrNotConfigured && (
        <Link
          to="/settings?tab=posterizarr"
          className="block p-4 rounded-xl border shadow-lg bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg backdrop-blur-sm bg-yellow-500/10">
              <WifiOff className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-yellow-400">
                {"Posterizarr is " +
                  (connStatus?.error || "Posterizarr is not configured")}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={refetchAll}
          disabled={dashFetching}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-4 h-4 text-theme-primary ${dashFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {dashLoading && !dashboard && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-theme-primary"></div>
        </div>
      )}

      {dashboard && (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Status */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md hover:border-theme-primary hover:bg-theme-primary-10 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-theme-text-muted uppercase tracking-wider">
                    Status
                  </span>
                  <p
                    className={`text-2xl font-bold ${status.running ? "text-green-400" : "text-theme-text"}`}
                  >
                    {status.running ? "Running" : "Idle"}
                  </p>
                </div>
                <div
                  className={`p-2 rounded-lg ${status.running ? "bg-green-500/10" : "bg-theme-text-muted/10"}`}
                >
                  {status.running ? (
                    <Play className="w-5 h-5 text-green-400" />
                  ) : (
                    <Pause className="w-5 h-5 text-theme-text-muted" />
                  )}
                </div>
              </div>
            </div>

            {/* Version */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md hover:border-theme-primary hover:bg-theme-primary-10 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-theme-text-muted uppercase tracking-wider">
                    Version
                  </span>
                  <p className="text-2xl font-bold text-theme-text">
                    {version.local || "—"}
                  </p>
                </div>
                <div
                  className={`p-2 rounded-lg ${version.is_update_available ? "bg-yellow-500/10" : "bg-green-500/10"}`}
                >
                  {version.is_update_available ? (
                    <ArrowUpCircle className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </div>
              {version.is_update_available && (
                <p className="text-xs text-yellow-400 mt-1">
                  Update: {version.remote}
                </p>
              )}
            </div>

            {/* Next Run */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md hover:border-theme-primary hover:bg-theme-primary-10 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-theme-text-muted uppercase tracking-wider">
                    Next Run
                  </span>
                  <p className="text-lg font-bold text-theme-text">
                    {formatTimestamp(
                      schedulerStatus.next_run || scheduler?.next_run,
                    )}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-theme-primary/10">
                  <Calendar className="w-5 h-5 text-theme-primary" />
                </div>
              </div>
            </div>

            {/* Last Run */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md hover:border-theme-primary hover:bg-theme-primary-10 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-theme-text-muted uppercase tracking-wider">
                    Last Run
                  </span>
                  <p className="text-lg font-bold text-theme-text">
                    {historyItems.length > 0
                      ? formatTimestamp(historyItems[0]?.timestamp)
                      : formatTimestamp(scheduler?.last_run)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-theme-text-muted/10">
                  <Timer className="w-5 h-5 text-theme-text-muted" />
                </div>
              </div>
              {historyItems.length > 0 &&
                historyItems[0]?.runtime_formatted && (
                  <p className="text-xs text-theme-text-muted mt-1">
                    Duration: {historyItems[0].runtime_formatted}
                  </p>
                )}
            </div>
          </div>

          {/* ── Scheduler ── */}
          <div className="bg-theme-card border border-theme rounded-xl overflow-hidden shadow-lg">
            <div className="bg-theme-primary/10 border-b border-theme px-4 py-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-theme-primary" />
              <h3 className="text-lg font-semibold text-theme-text">
                Scheduler
              </h3>
              <span
                className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                  scheduler?.enabled || schedulerStatus.enabled
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    scheduler?.enabled || schedulerStatus.enabled
                      ? "bg-green-400 animate-pulse"
                      : "bg-red-400"
                  }`}
                />
                {scheduler?.enabled || schedulerStatus.enabled
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-theme">
              <AssetCounter
                label="Timezone"
                value={scheduler?.timezone || "—"}
                isText
              />
              <AssetCounter
                label="Last Run"
                value={formatTimestamp(scheduler?.last_run)}
                isText
              />
              <AssetCounter
                label="Next Run"
                value={formatTimestamp(
                  scheduler?.next_run || schedulerStatus.next_run,
                )}
                isText
              />
              <AssetCounter
                label="Executing"
                value={scheduler?.is_executing ? "Yes" : "No"}
                isText
              />
            </div>

            {/* Schedules & Jobs as table */}
            {(schedules.length > 0 || activeJobs.length > 0) && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-theme-primary-80 border-b border-theme-primary">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                        Name
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-black">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s, i) => (
                      <tr
                        key={`s-${i}`}
                        className="group border-b border-theme last:border-b-0 hover:bg-theme-primary-10 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 bg-theme-hover/50 border border-theme rounded-md text-[10px] font-medium text-theme-text-muted">
                            Schedule
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-bold text-theme-text group-hover:text-theme-primary transition-colors">
                            {s.description || "Scheduled Run"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-xs font-bold text-theme-primary font-mono group-hover:text-theme-primary transition-colors">
                            {s.time}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {activeJobs.map((job, i) => (
                      <tr
                        key={`j-${i}`}
                        className="group border-b border-theme last:border-b-0 hover:bg-theme-primary-10 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gradient-to-br from-green-500/20 to-green-500/10 text-green-400 border border-green-500/30 shadow-sm shadow-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[11px] font-semibold">
                              Active Job
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-bold text-theme-text group-hover:text-theme-primary transition-colors">
                            {job.name}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-xs font-bold text-theme-text font-mono whitespace-nowrap group-hover:text-theme-primary transition-colors">
                            {formatTimestamp(job.next_run)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Plex Export ── */}
          {plexExport?.success && (
            <div className="bg-theme-card border border-theme rounded-xl overflow-hidden shadow-lg">
              <div className="bg-theme-primary/10 border-b border-theme px-4 py-3 flex items-center gap-2">
                <Film className="w-5 h-5 text-theme-primary" />
                <h3 className="text-lg font-semibold text-theme-text">
                  Plex Export
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
                <AssetCounter
                  label="Total Runs"
                  value={plexStatistics.total_runs}
                />
                <AssetCounter
                  label="Library Records"
                  value={plexStatistics.total_library_records}
                />
                <AssetCounter
                  label="Episode Records"
                  value={plexStatistics.total_episode_records}
                />
                <AssetCounter
                  label="Latest Run"
                  value={formatTimestamp(plexStatistics.latest_run)}
                  isText
                />
              </div>
            </div>
          )}

          {/* ── Assets Stats ── */}
          {assetsStats?.success && (
            <div className="bg-theme-card border border-theme rounded-xl overflow-hidden shadow-lg">
              <div className="bg-theme-primary/10 border-b border-theme px-4 py-3 flex items-center gap-2">
                <Layers className="w-5 h-5 text-theme-primary" />
                <h3 className="text-lg font-semibold text-theme-text">
                  Asset Statistics
                </h3>
                <span className="ml-2 px-2 py-0.5 bg-theme-primary/20 text-theme-primary text-xs font-medium rounded-full">
                  {(stats.posters || 0) +
                    (stats.backgrounds || 0) +
                    (stats.seasons || 0) +
                    (stats.titlecards || 0)}{" "}
                  assets
                </span>
              </div>
              {/* Summary counters */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border-b border-theme">
                <AssetCounter label="Posters" value={stats.posters} />
                <AssetCounter label="Backgrounds" value={stats.backgrounds} />
                <AssetCounter label="Seasons" value={stats.seasons} />
                <AssetCounter label="Title Cards" value={stats.titlecards} />
                <AssetCounter
                  label="Total Size"
                  value={formatBytes(stats.total_size)}
                  isText
                />
              </div>
              {/* Folders table */}
              {assetFolders.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-theme-primary-80 border-b border-theme-primary">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                          Library
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-black">
                          Posters
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-black">
                          Files
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-black">
                          Size
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetFolders.map((folder, i) => (
                        <tr
                          key={i}
                          className="group border-b border-theme last:border-b-0 hover:bg-theme-primary-10 transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <FolderOpen className="w-4 h-4 text-theme-primary flex-shrink-0" />
                              <span className="text-sm font-bold text-theme-text group-hover:text-theme-primary transition-colors">
                                {folder.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="text-xs font-bold text-theme-text font-mono group-hover:text-theme-primary transition-colors">
                              {folder.poster_count ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="text-xs font-bold text-theme-text font-mono group-hover:text-theme-primary transition-colors">
                              {folder.files?.toLocaleString() ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="text-xs font-bold text-theme-text font-mono group-hover:text-theme-primary transition-colors">
                              {formatBytes(folder.size)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Runtime History ── */}
          {historyItems.length > 0 && (
            <div className="bg-theme-card border border-theme rounded-xl overflow-hidden shadow-lg">
              <div className="bg-theme-primary/10 border-b border-theme px-4 py-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-theme-primary" />
                <h3 className="text-lg font-semibold text-theme-text">
                  Runtime History
                </h3>
                {history?.total != null && (
                  <span className="ml-2 px-2 py-0.5 bg-theme-primary/20 text-theme-primary text-xs font-medium rounded-full">
                    {history.total} runs
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-theme-primary-80 border-b border-theme-primary">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                        Time
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                        Mode
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                        Duration
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-black">
                        Images
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-black hidden sm:table-cell">
                        Errors
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-black">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.map((item, i) => {
                      const isSuccess =
                        item.status === "completed" ||
                        item.status === "success";
                      return (
                        <tr
                          key={item.id || i}
                          className="group border-b border-theme last:border-b-0 hover:bg-theme-primary-10 transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <span className="text-sm font-bold text-theme-text whitespace-nowrap group-hover:text-theme-primary transition-colors">
                              {formatTimestamp(item.timestamp)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {item.mode === "scheduled" ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gradient-to-br from-blue-500/20 to-blue-500/10 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/20">
                                <Calendar className="w-3 h-3" />
                                <span className="text-[11px] font-semibold capitalize">
                                  Scheduled
                                </span>
                              </div>
                            ) : item.mode === "manual" ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gradient-to-br from-purple-500/20 to-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm shadow-purple-500/20">
                                <Play className="w-3 h-3" />
                                <span className="text-[11px] font-semibold capitalize">
                                  Manual
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 text-yellow-400 border border-yellow-500/30 shadow-sm shadow-yellow-500/20">
                                <span className="text-[11px] font-semibold capitalize">
                                  {item.mode || "—"}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs font-bold text-theme-text font-mono whitespace-nowrap group-hover:text-theme-primary transition-colors">
                              {item.runtime_formatted || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="text-xs font-bold text-theme-text font-mono group-hover:text-theme-primary transition-colors">
                              {item.total_images ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                            <span
                              className={`text-xs font-bold font-mono ${
                                item.errors > 0
                                  ? "text-red-400"
                                  : "text-theme-text-muted"
                              }`}
                            >
                              {item.errors ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border shadow-sm ${
                                isSuccess
                                  ? "bg-gradient-to-br from-green-500/20 to-green-500/10 text-green-400 border-green-500/30 shadow-green-500/20"
                                  : "bg-gradient-to-br from-red-500/20 to-red-500/10 text-red-400 border-red-500/30 shadow-red-500/20"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSuccess
                                    ? "bg-green-400 animate-pulse"
                                    : "bg-red-400"
                                }`}
                              />
                              <span className="text-[11px] font-semibold capitalize whitespace-nowrap">
                                {item.status || "unknown"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Not Configured State */}
      {posterizarrNotConfigured && (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <WifiOff className="w-16 h-16 mx-auto text-theme-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-theme-text mb-2">
            Posterizarr Not Configured
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            Configure the Posterizarr URL and API Key in the settings to view
            poster management data.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Reusable row inside info panels ── */
function InfoRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-theme-text-muted">{label}</span>
      <span className="text-theme-text font-medium text-right truncate ml-4 max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

/* ── Small stat counter for grid strips ── */
function AssetCounter({ label, value, isText = false }) {
  return (
    <div className="px-4 py-3 text-center border-r border-theme last:border-r-0">
      <p
        className={`font-bold text-theme-text ${isText ? "text-sm" : "text-xl"}`}
      >
        {value != null ? (isText ? value : value.toLocaleString()) : "—"}
      </p>
      <p className="text-[10px] text-theme-text-muted uppercase tracking-wider mt-0.5">
        {label}
      </p>
    </div>
  );
}
