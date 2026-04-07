import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  HardDrive,
  Server,
  CheckCircle,
  XCircle,
  Shield,
  GitMerge,
  Download,
  Upload,
  WifiOff,
  Activity,
} from "lucide-react";
import { api } from "../services/api";

function StatusDot({ active, pulse = true }) {
  return (
    <div
      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        active ? `bg-emerald-400 ${pulse ? "animate-pulse" : ""}` : "bg-red-400"
      }`}
    />
  );
}

function StatCard({ label, value, icon: Icon, color = "theme-primary" }) {
  return (
    <div className="bg-theme-card border border-theme rounded-xl p-4 hover:border-theme-primary/50 transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}/10`}>
          <Icon className={`w-5 h-5 text-${color}`} />
        </div>
        <div>
          <p className="text-xs text-theme-muted uppercase tracking-wider">
            {label}
          </p>
          <p className="text-lg font-bold text-theme-text">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function NfsMount() {
  // Connection check
  const { data: connStatus } = useQuery({
    queryKey: ["nfs-mount-status"],
    queryFn: () => api.get("/nfs-mount/status"),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Dashboard data
  const {
    data: dashboard,
    isLoading: dashLoading,
    isFetching: dashFetching,
    refetch: refetchDash,
  } = useQuery({
    queryKey: ["nfs-mount-dashboard"],
    queryFn: () => api.get("/nfs-mount/dashboard"),
    staleTime: 5000,
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.connected === true,
  });

  const isConnected = connStatus?.connected;
  const notConfigured = !connStatus?.connected && !dashLoading;

  const mounts = dashboard?.nfs_mounts || [];
  const mountStatuses = dashboard?.nfs_mount_statuses || {};
  const exports = dashboard?.nfs_exports || [];
  const exportStatuses = dashboard?.nfs_export_statuses || {};
  const mergerfsConfigs = dashboard?.mergerfs_configs || [];
  const mergerfsStatuses = dashboard?.mergerfs_statuses || {};
  const vpnConfigs = dashboard?.vpn_configs || [];
  const vpnStatuses = dashboard?.vpn_statuses || {};

  // Summary counts
  const mountedCount = mounts.filter(
    (m) => mountStatuses[m.id]?.mounted,
  ).length;
  const activeExports = exports.filter(
    (e) => exportStatuses[e.id]?.is_active || e.is_active,
  ).length;
  const mergerMounted = mergerfsConfigs.filter(
    (c) => mergerfsStatuses[c.id]?.mounted,
  ).length;
  const vpnConnected = vpnConfigs.filter(
    (v) => vpnStatuses[v.id]?.connected,
  ).length;

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Not Configured Banner */}
      {notConfigured && (
        <Link
          to="/settings?tab=nfs_mount"
          className="block p-4 rounded-xl border shadow-lg bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg backdrop-blur-sm bg-yellow-500/10">
              <WifiOff className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-yellow-400">
                {connStatus?.error || "NFS Mount Manager is not configured"}
              </p>
              <p className="text-sm text-yellow-500/70">
                Click here to configure in Settings
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-theme-primary/10">
            <HardDrive className="w-6 h-6 text-theme-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-theme-text">
              NFS Mount Manager
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusDot active={isConnected} pulse={false} />
              <span className="text-xs text-theme-muted">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => refetchDash()}
          disabled={dashFetching}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all"
        >
          <RefreshCw
            className={`w-4 h-4 text-theme-primary ${dashFetching ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {isConnected && dashboard && !dashboard.not_configured && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="NFS Mounts"
              value={`${mountedCount}/${mounts.length}`}
              icon={Download}
              color="emerald-400"
            />
            <StatCard
              label="NFS Exports"
              value={`${activeExports}/${exports.length}`}
              icon={Upload}
              color="blue-400"
            />
            <StatCard
              label="MergerFS"
              value={`${mergerMounted}/${mergerfsConfigs.length}`}
              icon={GitMerge}
              color="purple-400"
            />
            <StatCard
              label="VPN Tunnels"
              value={`${vpnConnected}/${vpnConfigs.length}`}
              icon={Shield}
              color="amber-400"
            />
          </div>

          {/* NFS Client Mounts */}
          {mounts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-4 h-4 text-theme-primary" />
                <h2 className="text-lg font-semibold text-theme-text">
                  NFS Client Mounts
                </h2>
              </div>
              <div className="space-y-2">
                {mounts.map((m) => {
                  const st = mountStatuses[m.id];
                  const mounted = st?.mounted || false;
                  return (
                    <div
                      key={m.id}
                      className="bg-theme-card border border-theme rounded-xl p-4 hover:border-theme-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <StatusDot active={mounted} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-theme-text">
                              {m.name}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                                mounted
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-red-500/15 text-red-400 border-red-500/30"
                              }`}
                            >
                              {mounted ? "Mounted" : "Unmounted"}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">
                              NFSv{m.nfs_version}
                            </span>
                            {m.auto_mount && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                                Auto
                              </span>
                            )}
                            {!m.enabled && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-gray-500/15 text-gray-400 border-gray-500/30">
                                Disabled
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-theme-muted">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              st?.server_reachable
                                ? "bg-emerald-400"
                                : "bg-red-400"
                            }`}
                          />
                          Server{" "}
                          {st?.server_reachable ? "Reachable" : "Unreachable"}
                        </div>
                      </div>
                      {/* Mini info cards */}
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Server
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {m.server_ip}
                          </p>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Remote Path
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {m.remote_path}
                          </p>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Local Path
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {m.local_path}
                          </p>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Server Status
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                st?.server_reachable
                                  ? "bg-emerald-400"
                                  : "bg-red-400"
                              }`}
                            />
                            <p
                              className={`text-xs ${st?.server_reachable ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {st?.server_reachable
                                ? "Reachable"
                                : "Unreachable"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NFS Server Exports */}
          {exports.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-4 h-4 text-theme-primary" />
                <h2 className="text-lg font-semibold text-theme-text">
                  NFS Server Exports
                </h2>
              </div>
              <div className="space-y-2">
                {exports.map((exp) => {
                  const st = exportStatuses[exp.id];
                  const active = st?.is_active || exp.is_active || false;
                  return (
                    <div
                      key={exp.id}
                      className="bg-theme-card border border-theme rounded-xl p-4 hover:border-theme-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <StatusDot active={active} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-theme-text">
                              {exp.name}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                                active
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-red-500/15 text-red-400 border-red-500/30"
                              }`}
                            >
                              {active ? "Active" : "Inactive"}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">
                              NFSv{exp.nfs_version}
                            </span>
                            {!exp.enabled && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-gray-500/15 text-gray-400 border-gray-500/30">
                                Disabled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Mini info cards */}
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Export Path
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {exp.export_path}
                          </p>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Allowed Hosts
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {exp.allowed_hosts}
                          </p>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2 sm:col-span-1 col-span-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Options
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {exp.options}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MergerFS */}
          {mergerfsConfigs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GitMerge className="w-4 h-4 text-theme-primary" />
                <h2 className="text-lg font-semibold text-theme-text">
                  MergerFS
                </h2>
              </div>
              <div className="space-y-2">
                {mergerfsConfigs.map((c) => {
                  const st = mergerfsStatuses[c.id];
                  const mounted = st?.mounted || false;
                  const sources = Array.isArray(c.sources) ? c.sources : [];
                  return (
                    <div
                      key={c.id}
                      className="bg-theme-card border border-theme rounded-xl p-4 hover:border-theme-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <StatusDot active={mounted} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-theme-text">
                              {c.name}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                                mounted
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-red-500/15 text-red-400 border-red-500/30"
                              }`}
                            >
                              {mounted ? "Mounted" : "Unmounted"}
                            </span>
                            {c.auto_mount && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                                Auto
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Mini info cards */}
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Mount Point
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {c.mount_point}
                          </p>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Sources
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {sources.map((src, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center text-[10px] bg-blue-500/10 border border-blue-500/25 rounded-full px-2 py-0.5 font-mono text-blue-300 truncate max-w-[140px]"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Used Space
                          </p>
                          {mounted && st?.used_space ? (
                            <div className="mt-0.5">
                              <div className="flex items-baseline justify-between">
                                <p className="text-xs text-theme-text font-mono">
                                  {st.used_space}
                                </p>
                                <p
                                  className={`text-[10px] font-medium ${
                                    (st.used_percent || 0) > 90
                                      ? "text-red-400"
                                      : (st.used_percent || 0) > 70
                                        ? "text-amber-400"
                                        : "text-emerald-400"
                                  }`}
                                >
                                  {st.used_percent}%
                                </p>
                              </div>
                              <div className="w-full bg-theme-bg rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    (st.used_percent || 0) > 90
                                      ? "bg-red-400"
                                      : (st.used_percent || 0) > 70
                                        ? "bg-amber-400"
                                        : "bg-emerald-400"
                                  }`}
                                  style={{
                                    width: `${st.used_percent || 0}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-theme-muted mt-0.5">—</p>
                          )}
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Free Space
                          </p>
                          {mounted && st?.free_space ? (
                            <p className="text-xs text-emerald-400 font-mono mt-0.5">
                              {st.free_space}
                            </p>
                          ) : (
                            <p className="text-xs text-theme-muted mt-0.5">—</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VPN Tunnels */}
          {vpnConfigs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-theme-primary" />
                <h2 className="text-lg font-semibold text-theme-text">
                  VPN Tunnels
                </h2>
              </div>
              <div className="space-y-2">
                {vpnConfigs.map((v) => {
                  const st = vpnStatuses[v.id];
                  const connected = st?.connected || false;
                  return (
                    <div
                      key={v.id}
                      className="bg-theme-card border border-theme rounded-xl p-4 hover:border-theme-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <StatusDot active={connected} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-theme-text">
                              {v.name}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                                connected
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-red-500/15 text-red-400 border-red-500/30"
                              }`}
                            >
                              {connected ? "Connected" : "Disconnected"}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">
                              {v.vpn_type?.toUpperCase()}
                            </span>
                            {v.auto_connect && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                                Auto
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Mini info cards */}
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Interface
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {st?.interface_name || v.interface_name || "—"}
                          </p>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Endpoint
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {st?.endpoint || "—"}
                          </p>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Transfer
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {st?.transfer || "—"}
                          </p>
                        </div>
                        <div className="bg-theme-hover/80 border border-theme/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                            Type
                          </p>
                          <p className="text-xs text-theme-text font-mono truncate mt-0.5">
                            {v.vpn_type || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state if no data at all */}
          {mounts.length === 0 &&
            exports.length === 0 &&
            mergerfsConfigs.length === 0 &&
            vpnConfigs.length === 0 && (
              <div className="bg-theme-card border border-theme rounded-xl p-12 text-center">
                <HardDrive className="w-12 h-12 text-theme-muted mx-auto mb-4 opacity-30" />
                <p className="text-theme-muted">
                  No NFS mounts, exports, MergerFS configs, or VPN tunnels
                  configured
                </p>
              </div>
            )}
        </>
      )}

      {/* Loading state */}
      {isConnected && dashLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-theme-primary animate-spin" />
        </div>
      )}
    </div>
  );
}
