import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import InstanceTabs, { useInstanceTabs } from "../components/InstanceTabs";
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
  Image,
  Globe,
  Activity,
  HardDrive,
  Database,
  Tv,
  AlertTriangle,
  Scissors,
  Type,
  BarChart3,
} from "lucide-react";
import { api } from "../services/api";
import PageHeader from "../components/PageHeader";

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
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year}  ${hours}:${minutes}`;
  } catch {
    return ts;
  }
}
function formatDate(ts) {
  if (!ts) return "\u2014";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return ts;
  }
}

function formatTime(ts) {
  if (!ts) return "\u2014";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return ts;
  }
}
export default function Posterizarr() {
  // Sub-tab routing (?tab=overview | ?tab=history)
  const [searchParams] = useSearchParams();
  const subTab = searchParams.get("tab") === "history" ? "history" : "overview";

  // Fetch Posterizarr instances
  const { data: instancesData } = useQuery({
    queryKey: ["posterizarr-instances"],
    queryFn: () => api.get("/posterizarr/instances"),
    staleTime: 30000,
    refetchInterval: 30000,
  });
  const { effectiveTab, setActiveTab, instances } =
    useInstanceTabs(instancesData);
  const instParam = effectiveTab
    ? `?instance_id=${encodeURIComponent(effectiveTab)}`
    : "";

  // Connection check
  const { data: connStatus } = useQuery({
    queryKey: ["posterizarr-status", effectiveTab],
    queryFn: () => api.get(`/posterizarr/status${instParam}`),
    staleTime: 30000,
    refetchInterval: 30000,
    enabled: instances.length > 0 || !instancesData,
  });

  // Dashboard: combined status + version + system info
  const {
    data: dashboard,
    isLoading: dashLoading,
    isFetching: dashFetching,
    refetch: refetchDash,
  } = useQuery({
    queryKey: ["posterizarr-dashboard", effectiveTab],
    queryFn: () => api.get(`/posterizarr/dashboard${instParam}`),
    staleTime: 10000,
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  // Scheduler
  const { data: scheduler, refetch: refetchScheduler } = useQuery({
    queryKey: ["posterizarr-scheduler", effectiveTab],
    queryFn: () => api.get(`/posterizarr/scheduler${instParam}`),
    staleTime: 10000,
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  // Runtime history
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["posterizarr-history", effectiveTab],
    queryFn: () =>
      api.get(
        `/posterizarr/runtime-history${instParam ? instParam + "&" : "?"}limit=15`,
      ),
    staleTime: 15000,
    refetchInterval: 30000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  // Assets stats
  const { data: assetsStats, refetch: refetchAssets } = useQuery({
    queryKey: ["posterizarr-assets-stats", effectiveTab],
    queryFn: () => api.get(`/posterizarr/assets/stats${instParam}`),
    staleTime: 30000,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  // Plex export
  const { data: plexExport } = useQuery({
    queryKey: ["posterizarr-plex-stats", effectiveTab],
    queryFn: () => api.get(`/posterizarr/plex-export/statistics${instParam}`),
    staleTime: 30000,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  const isConnected = connStatus?.connected;

  const [manualRefreshing, setManualRefreshing] = useState(false);

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
      <PageHeader
        icon={Image}
        title="Posterizarr"
        actions={
          <button
            onClick={async () => {
              setManualRefreshing(true);
              try {
                await Promise.all([
                  refetchDash(),
                  refetchScheduler(),
                  refetchHistory(),
                  refetchAssets(),
                ]);
              } finally {
                setManualRefreshing(false);
              }
            }}
            disabled={manualRefreshing}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-4 h-4 text-theme-primary ${manualRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        }
      />

      {/* Instance Tabs */}
      <InstanceTabs
        instances={instances}
        activeTab={effectiveTab}
        setActiveTab={setActiveTab}
      />

      {/* Loading */}
      {dashLoading && !dashboard && (
        <div className="space-y-4">
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-theme-card border border-theme rounded-lg p-4"
              >
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-theme-hover rounded w-2/3" />
                  <div className="h-7 bg-theme-hover rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
          {/* Scheduler skeleton */}
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <div className="animate-pulse space-y-4">
              <div className="h-5 bg-theme-hover rounded w-1/4" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-theme-hover rounded-lg" />
                ))}
              </div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-theme-hover rounded" />
                ))}
              </div>
            </div>
          </div>
          {/* Plex export skeleton */}
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <div className="animate-pulse space-y-3">
              <div className="h-5 bg-theme-hover rounded w-1/4" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-theme-hover rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {dashboard && (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Status */}
            <div
              className={`bg-theme-card border border-theme rounded-lg p-4 hover:shadow-md transition-all ${
                status.running
                  ? "hover:border-green-500/50 hover:bg-green-500/10"
                  : "hover:border-cyan-500/50 hover:bg-cyan-500/10"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    {status.running ? (
                      <Play className="w-3 h-3 text-green-500" />
                    ) : (
                      <Pause className="w-3 h-3 text-cyan-500" />
                    )}
                    Status
                  </p>
                  <p
                    className={`text-2xl font-bold truncate ${
                      status.running ? "text-green-500" : "text-cyan-500"
                    }`}
                  >
                    {status.running ? "Running" : "Idle"}
                  </p>
                </div>
                {status.running ? (
                  <Play className="w-8 h-8 text-green-500 shrink-0" />
                ) : (
                  <Pause className="w-8 h-8 text-cyan-500 shrink-0" />
                )}
              </div>
            </div>

            {/* Version */}
            <div
              className={`bg-theme-card border border-theme rounded-lg p-4 hover:shadow-md transition-all ${
                version.is_update_available
                  ? "hover:border-yellow-500/50 hover:bg-yellow-500/10"
                  : "hover:border-blue-500/50 hover:bg-blue-500/10"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    {version.is_update_available ? (
                      <ArrowUpCircle className="w-3 h-3 text-yellow-500" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-blue-500" />
                    )}
                    Version
                  </p>
                  <p
                    className={`text-2xl font-bold truncate ${
                      version.is_update_available
                        ? "text-yellow-500"
                        : "text-blue-500"
                    }`}
                  >
                    {version.local || "—"}
                  </p>
                  {version.is_update_available && (
                    <p className="text-[10px] text-yellow-500 truncate">
                      Update: {version.remote}
                    </p>
                  )}
                </div>
                {version.is_update_available ? (
                  <ArrowUpCircle className="w-8 h-8 text-yellow-500 shrink-0" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-blue-500 shrink-0" />
                )}
              </div>
            </div>

            {/* Next Run */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 hover:shadow-md transition-all hover:border-indigo-500/50 hover:bg-indigo-500/10">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-500" />
                    Next Run
                  </p>
                  <p className="text-2xl font-bold text-indigo-500 truncate">
                    {formatTimestamp(
                      schedulerStatus.next_run || scheduler?.next_run,
                    )}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-indigo-500 shrink-0" />
              </div>
            </div>

            {/* Last Run */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 hover:shadow-md transition-all hover:border-amber-500/50 hover:bg-amber-500/10">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Timer className="w-3 h-3 text-amber-500" />
                    Last Run
                  </p>
                  <p className="text-2xl font-bold text-amber-500 truncate">
                    {historyItems.length > 0
                      ? formatTimestamp(historyItems[0]?.timestamp)
                      : formatTimestamp(scheduler?.last_run)}
                  </p>
                  {historyItems.length > 0 &&
                    historyItems[0]?.runtime_formatted && (
                      <p className="text-[10px] text-theme-text-muted truncate">
                        Duration: {historyItems[0].runtime_formatted}
                      </p>
                    )}
                </div>
                <Timer className="w-8 h-8 text-amber-500 shrink-0" />
              </div>
            </div>
          </div>

          {/* ── Overview Tab ── */}
          {subTab === "overview" && (
            <div className="grid grid-cols-1 gap-4 items-start">
              {/* ── Scheduler ── */}
              <div className="bg-theme-card border border-theme rounded-xl overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-theme flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-theme-primary" />
                  <h3 className="text-base font-semibold text-theme-text">
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
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-theme">
                  <MiniStatCard
                    icon={Globe}
                    accent="blue"
                    label="Timezone"
                    value={scheduler?.timezone || "—"}
                    isText
                  />
                  <MiniStatCard
                    icon={Timer}
                    accent="green"
                    label="Last Run"
                    value={formatTimestamp(scheduler?.last_run)}
                    isText
                  />
                  <MiniStatCard
                    icon={Calendar}
                    accent="purple"
                    label="Next Run"
                    value={formatTimestamp(
                      scheduler?.next_run || schedulerStatus.next_run,
                    )}
                    isText
                  />
                  <MiniStatCard
                    icon={scheduler?.is_executing ? Play : Pause}
                    accent={scheduler?.is_executing ? "green" : "rose"}
                    label="Executing"
                    value={scheduler?.is_executing ? "Yes" : "No"}
                    isText
                  />
                </div>

                {/* Schedules & Jobs as list */}
                {(schedules.length > 0 || activeJobs.length > 0) && (
                  <div className="p-4 space-y-2">
                    {schedules.map((s, i) => (
                      <div
                        key={`s-${i}`}
                        className="bg-theme-hover border border-theme rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Clock className="w-4 h-4 text-theme-text-muted shrink-0" />
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono rounded-md border border-theme bg-theme-card text-theme-text-muted">
                            {s.time}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30 lowercase">
                            Schedule
                          </span>
                        </div>
                        <p className="text-sm text-theme-text truncate pl-6">
                          {s.description || "Scheduled Run"}
                        </p>
                      </div>
                    ))}
                    {activeJobs.map((job, i) => (
                      <div
                        key={`j-${i}`}
                        className="bg-theme-hover border border-theme rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Play className="w-4 h-4 text-green-400 shrink-0" />
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono rounded-md border border-theme bg-theme-card text-theme-text-muted">
                            {formatTimestamp(job.next_run)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active Job
                          </span>
                        </div>
                        <p className="text-sm text-theme-text truncate pl-6">
                          {job.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Runtime Statistics ── */}
              {(() => {
                const latest = historyItems[0];
                if (!latest) return null;
                const yesNo = (v) =>
                  v === true || v === "true" || v === 1 ? "YES" : "NO";
                const yesNoAccent = (v) =>
                  v === true || v === "true" || v === 1 ? "green" : "rose";
                return (
                  <div className="bg-theme-card border border-theme rounded-xl overflow-hidden shadow-lg">
                    <div className="px-4 py-3 border-b border-theme flex items-center gap-2">
                      <Clock className="w-5 h-5 text-theme-primary" />
                      <h3 className="text-base font-semibold text-theme-text">
                        Runtime Statistics
                      </h3>
                      <button
                        onClick={() => refetchHistory()}
                        className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-theme-card border-theme text-theme-text-muted hover:text-theme-text hover:border-theme-primary transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                      </button>
                    </div>

                    {/* Mode + Last Run banner */}
                    <div className="px-4 py-2.5 border-b border-theme bg-theme-hover/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-text-muted">Mode:</span>
                        <span className="font-semibold text-theme-text capitalize">
                          {latest.mode || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-theme-text-muted">Last Run:</span>
                        <span className="font-semibold text-theme-text">
                          {formatTimestamp(
                            latest.end_time ||
                              latest.start_time ||
                              latest.timestamp,
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Execution Time hero */}
                    <div className="p-4 border-b border-theme">
                      <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-theme-hover border border-theme">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-theme-text-muted">
                            Execution Time
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold text-theme-text">
                            {latest.runtime_formatted || "—"}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 shrink-0">
                          <Clock className="w-6 h-6" />
                        </div>
                      </div>
                    </div>

                    {/* Core counts */}
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 border-b border-theme">
                      <MiniStatCard
                        icon={Image}
                        accent="blue"
                        label="Total Images"
                        value={latest.total_images || 0}
                      />
                      <MiniStatCard
                        icon={Film}
                        accent="green"
                        label="Posters"
                        value={latest.posters || 0}
                      />
                      <MiniStatCard
                        icon={Tv}
                        accent="amber"
                        label="Seasons"
                        value={latest.seasons || 0}
                      />
                      <MiniStatCard
                        icon={Image}
                        accent="purple"
                        label="Backgrounds"
                        value={latest.backgrounds || 0}
                      />
                      <MiniStatCard
                        icon={Tv}
                        accent="primary"
                        label="Title Cards"
                        value={latest.titlecards || 0}
                      />
                      <MiniStatCard
                        icon={AlertTriangle}
                        accent="amber"
                        label="Fallbacks"
                        value={latest.fallbacks || 0}
                      />
                      <MiniStatCard
                        icon={Image}
                        accent="purple"
                        label="Textless"
                        value={latest.textless || 0}
                      />
                      <MiniStatCard
                        icon={Scissors}
                        accent="rose"
                        label="Truncated"
                        value={latest.truncated || 0}
                      />
                      <MiniStatCard
                        icon={Type}
                        accent="primary"
                        label="Text"
                        value={latest.text || 0}
                      />
                      <MiniStatCard
                        icon={Database}
                        accent="blue"
                        label="TBA Skipped"
                        value={latest.tba_skipped || 0}
                      />
                      <MiniStatCard
                        icon={Globe}
                        accent="blue"
                        label="JP/CN Skipped"
                        value={
                          latest.jap_chines_skipped || latest.jp_cn_skipped || 0
                        }
                      />
                      <MiniStatCard
                        icon={XCircle}
                        accent={(latest.errors || 0) > 0 ? "rose" : "green"}
                        label="Script Errors"
                        value={latest.errors || 0}
                      />
                    </div>

                    {/* Additional Information */}
                    <div className="px-4 pt-4 pb-3 border-b border-theme">
                      <p className="text-[11px] uppercase tracking-wider text-theme-text-muted font-semibold mb-3">
                        Additional Information
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <MiniStatCard
                          icon={CheckCircle}
                          accent={yesNoAccent(latest.notification_sent)}
                          label="Notification Sent"
                          value={yesNo(latest.notification_sent)}
                          isText
                        />
                        <MiniStatCard
                          icon={Activity}
                          accent={yesNoAccent(latest.uptime_kuma)}
                          label="Uptime Kuma"
                          value={yesNo(latest.uptime_kuma)}
                          isText
                        />
                        <MiniStatCard
                          icon={FolderOpen}
                          accent="amber"
                          label="Images Cleared"
                          value={latest.images_cleared || 0}
                        />
                        <MiniStatCard
                          icon={FolderOpen}
                          accent="amber"
                          label="Folders Cleared"
                          value={latest.folders_cleared || 0}
                        />
                        <MiniStatCard
                          icon={HardDrive}
                          accent="green"
                          label="Space Saved"
                          value={latest.space_saved || "0"}
                          isText
                        />
                      </div>
                    </div>

                    {/* Version Information */}
                    <div className="px-4 pt-4 pb-4">
                      <p className="text-[11px] uppercase tracking-wider text-theme-text-muted font-semibold mb-3">
                        Version Information
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <MiniStatCard
                          icon={BarChart3}
                          accent="primary"
                          label="Script Version"
                          value={latest.script_version || "—"}
                          isText
                        />
                        <MiniStatCard
                          icon={Server}
                          accent="blue"
                          label="ImageMagick Version"
                          value={
                            latest.im_version ||
                            latest.imagemagick_version ||
                            "—"
                          }
                          isText
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Plex Export ── */}
              {plexExport?.success && (
                <div className="bg-theme-card border border-theme rounded-xl overflow-hidden shadow-lg">
                  <div className="px-4 py-3 border-b border-theme flex items-center gap-2">
                    <Film className="w-5 h-5 text-theme-primary" />
                    <h3 className="text-base font-semibold text-theme-text">
                      Plex Export
                    </h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MiniStatCard
                      icon={RefreshCw}
                      accent="green"
                      label="Total Runs"
                      value={plexStatistics.total_runs}
                    />
                    <MiniStatCard
                      icon={Database}
                      accent="blue"
                      label="Library Records"
                      value={plexStatistics.total_library_records}
                    />
                    <MiniStatCard
                      icon={Tv}
                      accent="purple"
                      label="Episode Records"
                      value={plexStatistics.total_episode_records}
                    />
                    <MiniStatCard
                      icon={Clock}
                      accent="amber"
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
                  <div className="p-4 grid grid-cols-2 gap-3 border-b border-theme">
                    <MiniStatCard
                      icon={Image}
                      accent="green"
                      label="Posters"
                      value={stats.posters}
                    />
                    <MiniStatCard
                      icon={Layers}
                      accent="blue"
                      label="Backgrounds"
                      value={stats.backgrounds}
                    />
                    <MiniStatCard
                      icon={Calendar}
                      accent="purple"
                      label="Seasons"
                      value={stats.seasons}
                    />
                    <MiniStatCard
                      icon={Film}
                      accent="rose"
                      label="Title Cards"
                      value={stats.titlecards}
                    />
                    <MiniStatCard
                      icon={HardDrive}
                      accent="amber"
                      label="Total Size"
                      value={formatBytes(stats.total_size)}
                      isText
                    />
                  </div>
                  {/* Folders list */}
                  {assetFolders.length > 0 && (
                    <div className="p-4 space-y-2">
                      {assetFolders.map((folder, i) => (
                        <div
                          key={i}
                          className="bg-theme-hover border border-theme rounded-lg px-4 py-3"
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <FolderOpen className="w-4 h-4 text-theme-primary shrink-0" />
                            <span className="text-sm font-medium text-theme-text truncate">
                              {folder.name}
                            </span>
                            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded-md border border-theme bg-theme-card text-theme-text-muted">
                              {formatBytes(folder.size)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap pl-6 text-xs text-theme-text-muted font-mono">
                            <span>
                              <Image className="inline w-3 h-3 mr-1 -mt-0.5" />
                              {folder.poster_count ?? "—"} posters
                            </span>
                            <span>
                              <Layers className="inline w-3 h-3 mr-1 -mt-0.5" />
                              {folder.files?.toLocaleString() ?? "—"} files
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Runtime History (History tab) ── */}
          {subTab === "history" && historyItems.length > 0 && (
            <div className="bg-theme-card rounded-xl border border-theme shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-theme flex items-center gap-2">
                <Clock className="w-5 h-5 text-theme-primary" />
                <h3 className="text-base font-semibold text-theme-text">
                  Runtime History
                </h3>
                {history?.total != null && (
                  <span className="ml-auto text-xs text-theme-text-muted">
                    Last {Math.min(historyItems.length, history.total)} of{" "}
                    {history.total} runs
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2">
                {historyItems.map((item, i) => {
                  const isSuccess =
                    item.status === "completed" || item.status === "success";
                  const modeBadge =
                    item.mode === "scheduled"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : item.mode === "manual"
                        ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                        : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
                  return (
                    <div
                      key={item.id || i}
                      className="bg-theme-hover border border-theme rounded-lg px-4 py-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isSuccess ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono rounded-md border border-theme bg-theme-card text-theme-text-muted">
                          {formatTime(item.timestamp)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border lowercase ${modeBadge}`}
                        >
                          {item.mode === "scheduled" && (
                            <Calendar className="w-3 h-3" />
                          )}
                          {item.mode === "manual" && (
                            <Play className="w-3 h-3" />
                          )}
                          {item.mode || "—"}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                            isSuccess
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          }`}
                        >
                          {item.status || "unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap pl-6 text-xs text-theme-text-muted font-mono">
                        <span>{formatDate(item.timestamp)}</span>
                        <span>
                          <Timer className="inline w-3 h-3 mr-1 -mt-0.5" />
                          {item.runtime_formatted || "—"}
                        </span>
                        <span>
                          <Image className="inline w-3 h-3 mr-1 -mt-0.5" />
                          {item.total_images ?? "—"} images
                        </span>
                        {item.errors > 0 && (
                          <span className="text-red-400">
                            <XCircle className="inline w-3 h-3 mr-1 -mt-0.5" />
                            {item.errors} errors
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* ── History empty state ── */}
          {subTab === "history" && historyItems.length === 0 && (
            <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
              <Clock className="w-16 h-16 mx-auto text-theme-text-muted/50 mb-4" />
              <h3 className="text-lg font-semibold text-theme-text mb-2">
                No Runtime History
              </h3>
              <p className="text-theme-text-muted max-w-md mx-auto">
                Once Posterizarr completes a run, the history will appear here.
              </p>
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

/* ── Mini stat card with icon badge (Scheduler / Exports / Assets) ── */
function MiniStatCard({
  icon: Icon,
  label,
  value,
  accent = "primary",
  isText = false,
}) {
  const accents = {
    primary: {
      bg: "bg-theme-primary/10",
      text: "text-theme-primary",
      border: "border-theme-primary/30",
    },
    green: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      border: "border-green-500/30",
    },
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
    },
    purple: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/30",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/30",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/30",
    },
  };
  const a = accents[accent] || accents.primary;
  const display =
    value != null
      ? isText
        ? value
        : typeof value === "number"
          ? value.toLocaleString()
          : value
      : "—";
  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg bg-theme-hover border border-theme hover:border-theme-primary hover:shadow-md transition-all">
      <div
        className={`p-2 rounded-lg ${a.bg} ${a.text} border ${a.border} shrink-0`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-theme-text-muted truncate">
          {label}
        </p>
        <p
          className={`font-bold text-theme-text truncate group-hover:text-theme-primary transition-colors ${isText ? "text-sm" : "text-lg"}`}
        >
          {display}
        </p>
      </div>
    </div>
  );
}
