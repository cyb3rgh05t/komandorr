import { useState } from "react";
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

function ManagerSection({ manager }) {
  const mounts = manager.nfs_mounts || [];
  const mountStatuses = manager.nfs_mount_statuses || {};
  const exports = manager.nfs_exports || [];
  const exportStatuses = manager.nfs_export_statuses || {};
  const mergerfsConfigs = manager.mergerfs_configs || [];
  const mergerfsStatuses = manager.mergerfs_statuses || {};
  const vpnConfigs = manager.vpn_configs || [];
  const vpnStatuses = manager.vpn_statuses || {};

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

  if (
    mounts.length === 0 &&
    exports.length === 0 &&
    mergerfsConfigs.length === 0 &&
    vpnConfigs.length === 0
  ) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-8 text-center">
        <HardDrive className="w-10 h-10 text-theme-muted mx-auto mb-3 opacity-30" />
        <p className="text-theme-muted text-sm">
          No NFS mounts, exports, MergerFS configs, or VPN tunnels configured
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg overflow-hidden">
          <div className="bg-theme-primary/10 border-b border-theme px-4 py-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-theme-primary" />
              <h3 className="text-base font-semibold text-theme-text">
                NFS Client Mounts
              </h3>
              <span className="ml-2 px-2 py-0.5 bg-theme-primary/20 text-theme-primary text-xs font-medium rounded-full">
                {mountedCount}/{mounts.length} mounted
              </span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {mounts.map((m) => {
              const st = mountStatuses[m.id];
              const mounted = st?.mounted || false;
              return (
                <div
                  key={m.id}
                  className="bg-theme-hover border border-theme rounded-xl p-5 hover:border-theme-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-theme-text">
                          {m.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border ${
                            mounted
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          }`}
                        >
                          {mounted ? "Mounted" : "Unmounted"}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">
                          NFSv{m.nfs_version}
                        </span>
                        {m.auto_mount && (
                          <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                            AUTO-Mount
                          </span>
                        )}
                        {!m.enabled && (
                          <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border bg-gray-500/15 text-gray-400 border-gray-500/30">
                            Disabled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Server
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
                        {m.server_ip}
                      </p>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Remote Path
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
                        {m.remote_path}
                      </p>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Local Path
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
                        {m.local_path}
                      </p>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Server Status
                      </p>
                      <span
                        className={`inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
                          st?.server_reachable
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/15 text-red-400 border-red-500/30"
                        }`}
                      >
                        {st?.server_reachable ? "Reachable" : "Unreachable"}
                      </span>
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
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg overflow-hidden">
          <div className="bg-theme-primary/10 border-b border-theme px-4 py-3">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-theme-primary" />
              <h3 className="text-base font-semibold text-theme-text">
                NFS Server Exports
              </h3>
              <span className="ml-2 px-2 py-0.5 bg-theme-primary/20 text-theme-primary text-xs font-medium rounded-full">
                {activeExports}/{exports.length} active
              </span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {exports.map((exp) => {
              const st = exportStatuses[exp.id];
              const active = st?.is_active || exp.is_active || false;
              return (
                <div
                  key={exp.id}
                  className="bg-theme-hover border border-theme rounded-xl p-5 hover:border-theme-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-theme-text">
                          {exp.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border ${
                            active
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">
                          NFSv{exp.nfs_version}
                        </span>
                        {exp.auto_enable && (
                          <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                            AUTO-Enable
                          </span>
                        )}
                        {!exp.enabled && (
                          <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border bg-gray-500/15 text-gray-400 border-gray-500/30">
                            Disabled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Export Path
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
                        {exp.export_path}
                      </p>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Allowed Hosts
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
                        {exp.allowed_hosts}
                      </p>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3 sm:col-span-1 col-span-2">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Options
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
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
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg overflow-hidden">
          <div className="bg-theme-primary/10 border-b border-theme px-4 py-3">
            <div className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-theme-primary" />
              <h3 className="text-base font-semibold text-theme-text">
                MergerFS
              </h3>
              <span className="ml-2 px-2 py-0.5 bg-theme-primary/20 text-theme-primary text-xs font-medium rounded-full">
                {mergerMounted}/{mergerfsConfigs.length} mounted
              </span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {mergerfsConfigs.map((c) => {
              const st = mergerfsStatuses[c.id];
              const mounted = st?.mounted || false;
              const sources = Array.isArray(c.sources) ? c.sources : [];
              return (
                <div
                  key={c.id}
                  className="bg-theme-hover border border-theme rounded-xl p-5 hover:border-theme-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-theme-text">
                          {c.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border ${
                            mounted
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          }`}
                        >
                          {mounted ? "Mounted" : "Unmounted"}
                        </span>
                        {c.auto_mount && (
                          <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                            AUTO-Mount
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Mount Point
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
                        {c.mount_point}
                      </p>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Sources
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {sources.map((src, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center text-xs bg-blue-500/10 border border-blue-500/25 rounded-full px-2 py-0.5 font-mono text-blue-300 truncate max-w-[140px]"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Used Space
                      </p>
                      {mounted && st?.used_space ? (
                        <div className="mt-0.5">
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm text-theme-text font-mono">
                              {st.used_space}
                            </p>
                            <p
                              className={`text-xs font-medium ${
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
                        <p className="text-sm text-theme-muted mt-0.5">—</p>
                      )}
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Free Space
                      </p>
                      {mounted && st?.free_space ? (
                        <p className="text-sm text-emerald-400 font-mono mt-0.5">
                          {st.free_space}
                        </p>
                      ) : (
                        <p className="text-sm text-theme-muted mt-0.5">—</p>
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
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg overflow-hidden">
          <div className="bg-theme-primary/10 border-b border-theme px-4 py-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-theme-primary" />
              <h3 className="text-base font-semibold text-theme-text">
                VPN Tunnels
              </h3>
              <span className="ml-2 px-2 py-0.5 bg-theme-primary/20 text-theme-primary text-xs font-medium rounded-full">
                {vpnConnected}/{vpnConfigs.length} connected
              </span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {vpnConfigs.map((v) => {
              const st = vpnStatuses[v.id];
              const connected = st?.connected || false;
              return (
                <div
                  key={v.id}
                  className="bg-theme-hover border border-theme rounded-xl p-5 hover:border-theme-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-theme-text">
                          {v.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border ${
                            connected
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          }`}
                        >
                          {connected ? "Connected" : "Disconnected"}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">
                          {v.vpn_type?.toUpperCase()}
                        </span>
                        {v.auto_connect && (
                          <span className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                            AUTO-Connect
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Interface
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
                        {st?.interface_name || v.interface_name || "—"}
                      </p>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Endpoint
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
                        {st?.endpoint || "—"}
                      </p>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Transfer
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
                        {st?.transfer
                          ? `↑ ${st.transfer.sent || "0 B"} / ↓ ${st.transfer.received || "0 B"}`
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-theme-hover border border-theme rounded-lg px-4 py-3">
                      <p className="text-xs text-theme-muted uppercase tracking-wider">
                        Type
                      </p>
                      <p className="text-sm text-theme-text font-mono truncate mt-0.5">
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
    enabled: connStatus?.any_connected === true,
  });

  const anyConnected = connStatus?.any_connected;
  const instances = connStatus?.instances || [];
  const managers = dashboard?.managers || [];
  const notConfigured = instances.length === 0 && !dashLoading;

  const [activeTab, setActiveTab] = useState(null);

  // Auto-select first manager tab if none selected yet
  const effectiveTab =
    activeTab && managers.find((m) => m.id === activeTab)
      ? activeTab
      : managers.length > 0
        ? managers[0].id
        : null;

  const activeManager = managers.find((m) => m.id === effectiveTab);

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
                NFS Mount Manager is not configured
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Manager Tabs */}
      {managers.length > 1 && (
        <div className="inline-flex items-center bg-theme-card border border-theme rounded-xl p-1 gap-0.5 overflow-x-auto">
          {managers.map((mgr) => {
            const isActive = effectiveTab === mgr.id;
            return (
              <button
                key={mgr.id}
                onClick={() => setActiveTab(mgr.id)}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "bg-theme-primary text-black shadow-md shadow-theme-primary/25"
                    : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/60"
                }`}
              >
                {mgr.name}
                <span
                  className={`inline-block w-2 h-2 rounded-full ml-2 ${
                    mgr.connected ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Live/Offline Indicator & Refresh */}
      <div className="flex justify-end items-center gap-2 sm:gap-3">
        {anyConnected ? (
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-theme-card border border-theme rounded-lg justify-center">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-theme-text">
              Live
            </span>
          </div>
        ) : instances.length > 0 ? (
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-theme-card border border-theme rounded-lg justify-center">
            <span className="relative flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-theme-text">
              Offline
            </span>
          </div>
        ) : null}
        <button
          onClick={() => refetchDash()}
          disabled={dashFetching}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-4 h-4 text-theme-primary ${dashFetching ? "animate-spin" : ""}`}
          />
          <span className="text-xs sm:text-sm">Refresh</span>
        </button>
      </div>

      {/* Active Manager Content */}
      {activeManager && (
        <div className="space-y-4">
          {activeManager.connected ? (
            <ManagerSection manager={activeManager} />
          ) : (
            <div className="bg-theme-card border border-theme rounded-xl p-6 text-center">
              <WifiOff className="w-10 h-10 text-theme-muted mx-auto mb-3 opacity-30" />
              <p className="text-theme-muted text-sm">
                {activeManager.error ||
                  "Cannot connect to this NFS Mount Manager"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Single manager (no tabs needed) */}
      {managers.length === 1 && !activeManager && managers[0] && (
        <div className="space-y-4">
          {managers[0].connected ? (
            <ManagerSection manager={managers[0]} />
          ) : (
            <div className="bg-theme-card border border-theme rounded-xl p-6 text-center">
              <WifiOff className="w-10 h-10 text-theme-muted mx-auto mb-3 opacity-30" />
              <p className="text-theme-muted text-sm">
                {managers[0].error ||
                  "Cannot connect to this NFS Mount Manager"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {anyConnected && dashLoading && !dashboard && (
        <div className="space-y-4">
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          {/* Detail cards skeleton */}
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-theme-card border border-theme rounded-xl p-4"
              >
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-theme-hover rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-theme-hover rounded w-1/4" />
                      <div className="h-3 bg-theme-hover rounded w-1/3" />
                    </div>
                    <div className="w-3 h-3 bg-theme-hover rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not Configured State */}
      {notConfigured && (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <WifiOff className="w-16 h-16 mx-auto text-theme-text-muted mb-4" />
          <h3 className="text-base font-semibold text-theme-text mb-2">
            NFS Mount Manager Not Configured
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            Configure one or more NFS Mount Manager instances in the settings to
            monitor NFS mounts, exports, MergerFS and VPN tunnels.
          </p>
        </div>
      )}
    </div>
  );
}
