import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Wifi,
  WifiOff,
  Globe,
  Server,
  Activity,
  RefreshCw,
  Search,
  ExternalLink,
  Network,
  CheckCircle2,
  Power,
  LayoutGrid,
} from "lucide-react";
import { api } from "../services/api";

const isActiveStatus = (s) => {
  const lower = (s || "").toLowerCase();
  return lower === "running" || lower === "healthy" || lower === "starting";
};

const StatusBadge = ({ status }) => {
  const statusLower = (status || "").toLowerCase();
  let color = "bg-gray-500/20 text-gray-400 border-gray-500/30";
  let label = status || "unknown";
  let dotClass = "bg-yellow-400";

  if (statusLower === "running" || statusLower === "healthy") {
    color = "bg-green-500/20 text-green-400 border-green-500/30";
    dotClass = "bg-green-400 animate-pulse";
  } else if (statusLower === "unhealthy") {
    color = "bg-red-500/20 text-red-400 border-red-500/30";
    dotClass = "bg-red-400";
  } else if (statusLower === "stopped" || statusLower === "exited") {
    color = "bg-red-500/20 text-red-400 border-red-500/30";
    dotClass = "bg-red-400";
  } else if (
    statusLower === "restarting" ||
    statusLower === "created" ||
    statusLower === "starting"
  ) {
    color = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    dotClass = "bg-yellow-400";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
};

export default function VpnProxy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(
    searchParams.get("provider") || "all",
  );
  const [statusFilter, setStatusFilter] = useState(null);

  // Fetch VPN containers
  const {
    data: containers = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["vpn-proxy-containers"],
    queryFn: () => api.get("/vpn-proxy/containers"),
    staleTime: 5000,
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
  });

  // Fetch VPN info batch
  const { data: vpnInfoMap = {} } = useQuery({
    queryKey: ["vpn-proxy-vpn-info"],
    queryFn: () => api.get("/vpn-proxy/containers/vpn-info-batch"),
    staleTime: 5000,
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
  });

  // Fetch dependents
  const { data: dependentsRaw = [] } = useQuery({
    queryKey: ["vpn-proxy-dependents"],
    queryFn: () => api.get("/vpn-proxy/containers/dependents"),
    staleTime: 10000,
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
  });

  // Fetch connection status
  const { data: connectionStatus } = useQuery({
    queryKey: ["vpn-proxy-status"],
    queryFn: () => api.get("/vpn-proxy/status"),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Build dependents map (container_id -> dependent containers)
  const depsMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(dependentsRaw)) return map;
    dependentsRaw.forEach((dep) => {
      const vpnParent = dep.vpn_container_name || dep.vpn_parent;
      if (!vpnParent) return;
      const parent = containers.find(
        (c) =>
          c.name === vpnParent ||
          c.docker_name === vpnParent ||
          vpnParent === `gluetun-${c.name}` ||
          dep.network_mode?.includes(c.name) ||
          dep.network_mode?.includes(c.container_id?.slice(0, 12)),
      );
      if (parent) {
        if (!map[parent.id]) map[parent.id] = [];
        map[parent.id].push(dep);
      }
    });
    return map;
  }, [dependentsRaw, containers]);

  // Get unique providers
  const providers = useMemo(() => {
    const set = new Set();
    containers.forEach((c) => {
      if (c.vpn_provider) set.add(c.vpn_provider);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [containers]);

  // Filter containers by tab + status + search
  const filtered = useMemo(() => {
    let result = containers;
    if (activeTab !== "all") {
      result = result.filter(
        (c) => (c.vpn_provider || "").toLowerCase() === activeTab.toLowerCase(),
      );
    }
    if (statusFilter === "running") {
      result = result.filter((c) =>
        isActiveStatus(c.docker_status || c.status),
      );
    } else if (statusFilter === "stopped") {
      result = result.filter(
        (c) => !isActiveStatus(c.docker_status || c.status),
      );
    } else if (statusFilter === "clients") {
      result = result.filter((c) => (depsMap[c.id] || []).length > 0);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.vpn_provider?.toLowerCase().includes(q) ||
          vpnInfoMap[c.id]?.country?.toLowerCase().includes(q) ||
          vpnInfoMap[c.id]?.public_ip?.includes(q),
      );
    }
    return result;
  }, [containers, activeTab, statusFilter, search, vpnInfoMap, depsMap]);

  // Stats
  const runningCount = containers.filter((c) =>
    isActiveStatus(c.docker_status || c.status),
  ).length;
  const stoppedCount = containers.length - runningCount;

  const vpnNotConfigured = !connectionStatus?.connected && !isLoading;

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Not Configured Banner */}
      {vpnNotConfigured && (
        <Link
          to="/settings?tab=vpn_proxy"
          className="block p-4 rounded-xl border shadow-lg bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg backdrop-blur-sm bg-yellow-500/10">
              <WifiOff className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-yellow-400">
                {"VPN-Proxy is " +
                  (connectionStatus?.error || "not configured")}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Search Bar & Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          <input
            type="text"
            placeholder="Search containers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
          />
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-4 h-4 text-theme-primary ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Stats Cards (clickable filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === null ? null : null)}
          className={`bg-theme-card border rounded-lg px-4 py-3 transition-all text-left cursor-pointer hover:shadow-md hover:bg-yellow-500/10 ${
            statusFilter === null
              ? "border-yellow-500 ring-1 ring-yellow-500/20"
              : "border-theme hover:border-yellow-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <LayoutGrid className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Total
                </span>
              </div>
              <p className="text-2xl font-bold text-theme-text">
                {containers.length}
              </p>
            </div>
            <LayoutGrid className="w-6 h-6 text-yellow-400" />
          </div>
        </button>
        <button
          onClick={() =>
            setStatusFilter(statusFilter === "running" ? null : "running")
          }
          className={`bg-theme-card border rounded-lg px-4 py-3 transition-all text-left cursor-pointer hover:shadow-md hover:bg-green-500/10 ${
            statusFilter === "running"
              ? "border-green-500 ring-1 ring-green-500/20"
              : "border-theme hover:border-green-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Online
                </span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {runningCount}
              </p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
        </button>
        <button
          onClick={() =>
            setStatusFilter(statusFilter === "stopped" ? null : "stopped")
          }
          className={`bg-theme-card border rounded-lg px-4 py-3 transition-all text-left cursor-pointer hover:shadow-md hover:bg-red-500/10 ${
            statusFilter === "stopped"
              ? "border-red-500 ring-1 ring-red-500/20"
              : "border-theme hover:border-red-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Power className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Offline
                </span>
              </div>
              <p className="text-2xl font-bold text-red-400">{stoppedCount}</p>
            </div>
            <Power className="w-6 h-6 text-red-400" />
          </div>
        </button>
        <button
          onClick={() =>
            setStatusFilter(statusFilter === "clients" ? null : "clients")
          }
          className={`bg-theme-card border rounded-lg px-4 py-3 transition-all text-left cursor-pointer hover:shadow-md hover:bg-theme-primary/10 ${
            statusFilter === "clients"
              ? "border-theme-primary ring-1 ring-theme-primary/20"
              : "border-theme hover:border-theme-primary/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Network className="w-3.5 h-3.5 text-theme-primary" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Clients
                </span>
              </div>
              <p className="text-2xl font-bold text-theme-primary">
                {Object.values(depsMap).reduce((sum, d) => sum + d.length, 0)}
              </p>
            </div>
            <Network className="w-6 h-6 text-theme-primary" />
          </div>
        </button>
      </div>

      {/* Provider Tabs */}
      {!isLoading && containers.length > 0 && (
        <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => {
                setActiveTab("all");
                setSearchParams({});
              }}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-theme-primary text-black shadow-md"
                  : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
              }`}
            >
              All
              <span
                className={`ml-2 text-xs ${
                  activeTab === "all"
                    ? "text-black/70"
                    : "text-theme-text-muted"
                }`}
              >
                ({containers.length})
              </span>
            </button>
            {providers.map((provider) => {
              const count = containers.filter(
                (c) =>
                  (c.vpn_provider || "").toLowerCase() ===
                  provider.toLowerCase(),
              ).length;
              const isActive =
                activeTab.toLowerCase() === provider.toLowerCase();
              return (
                <button
                  key={provider}
                  onClick={() => {
                    setActiveTab(provider);
                    setSearchParams({ provider });
                  }}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-theme-primary text-black shadow-md"
                      : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
                  }`}
                >
                  <span className="capitalize">{provider}</span>
                  <span
                    className={`ml-2 text-xs ${
                      isActive ? "text-black/70" : "text-theme-text-muted"
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-theme-primary"></div>
        </div>
      )}

      {/* Container Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((container) => {
            const info = vpnInfoMap[container.id] || {};
            const deps = depsMap[container.id] || [];
            const status =
              container.docker_status || container.status || "unknown";
            const isRunning = isActiveStatus(status);
            return (
              <div
                key={container.id}
                className="group bg-theme-card border border-theme rounded-xl overflow-hidden hover:border-theme-primary/60 hover:shadow-lg transition-all"
              >
                {/* Card Header */}
                <div className="px-4 py-3 bg-theme-hover/30 border-b border-theme flex items-center justify-between">
                  <h3 className="text-sm font-bold text-theme-primary truncate">
                    {container.name}
                  </h3>
                  <StatusBadge status={status} />
                </div>

                {/* Info Section */}
                <div className="px-4 py-3 border-b border-theme space-y-2">
                  {/* Provider · Type + VPN Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-theme-text-muted min-w-0">
                      <Shield className="w-3.5 h-3.5 text-theme-primary flex-shrink-0" />
                      <span className="font-medium text-theme-text capitalize truncate">
                        {container.vpn_provider || "—"}
                      </span>
                      <span className="text-theme-text-muted">·</span>
                      <span className="uppercase text-theme-text-muted font-medium">
                        {container.vpn_type || "—"}
                      </span>
                    </div>
                    {isRunning && info.vpn_status && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-400 flex-shrink-0 ml-2">
                        <Wifi className="w-3.5 h-3.5" />
                        {info.vpn_status === "running"
                          ? "Connected"
                          : info.vpn_status}
                      </span>
                    )}
                  </div>

                  {/* IP & Location */}
                  {isRunning && info.public_ip && (
                    <div className="flex items-center gap-3 text-xs text-theme-text-muted">
                      <span className="flex items-center gap-1 font-mono">
                        <Globe className="w-3.5 h-3.5" />
                        {info.public_ip}
                      </span>
                      {(info.country || info.region) && (
                        <span className="flex items-center gap-1">
                          ⊙{" "}
                          {[info.country, info.region]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Port Forwarding */}
                {isRunning &&
                  info.port_forwarded &&
                  info.port_forwarded > 0 && (
                    <div className="mx-3 mt-3 bg-theme-hover/40 border border-theme rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-theme-text-muted mb-0.5">
                        Port Forward
                      </p>
                      <p className="text-xs text-theme-primary font-mono">
                        {info.port_forwarded}
                      </p>
                    </div>
                  )}

                {/* Clients / Network Section */}
                {deps.length > 0 && (
                  <div className="mx-3 mt-3 mb-3 bg-theme-hover/40 border border-theme rounded-lg border-l-2 border-l-green-500/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-theme-text-muted mb-1.5">
                      Clients ({deps.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {deps.slice(0, 5).map((dep, i) => {
                        const depStatus = (
                          dep.status ||
                          dep.state ||
                          ""
                        ).toLowerCase();
                        const depActive = isActiveStatus(depStatus);
                        return (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${
                              depActive
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${depActive ? "bg-green-400" : "bg-red-400"}`}
                            />
                            {dep.name || dep.container_name}
                          </span>
                        );
                      })}
                      {deps.length > 5 && (
                        <span className="text-[10px] text-theme-text-muted px-2 py-0.5">
                          +{deps.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Network name */}
                {container.network_name && (
                  <div
                    className={`mx-3 ${deps.length > 0 ? "mb-3" : "mt-3 mb-3"} bg-theme-hover/40 border border-theme rounded-lg border-l-2 border-l-theme-primary/60 px-3 py-2`}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-theme-text-muted mb-0.5">
                      Network
                    </p>
                    <p className="text-xs text-theme-text font-medium">
                      {container.network_name}
                    </p>
                  </div>
                )}

                {/* Bottom spacing when no sections below info */}
                {!deps.length &&
                  !container.network_name &&
                  !(isRunning && info.port_forwarded > 0) && (
                    <div className="pb-1" />
                  )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && containers.length > 0 && (
        <div className="bg-theme-card border border-theme rounded-lg p-8 text-center">
          <Search className="w-8 h-8 text-theme-text-muted mx-auto mb-3" />
          <p className="text-theme-text-muted text-sm">
            No containers matching "{search}"
          </p>
        </div>
      )}

      {!isLoading && containers.length === 0 && connectionStatus?.connected && (
        <div className="bg-theme-card border border-theme rounded-lg p-8 text-center">
          <Shield className="w-8 h-8 text-theme-text-muted mx-auto mb-3" />
          <p className="text-theme-text-muted text-sm">
            No VPN containers found. Create one in the VPN Proxy Manager.
          </p>
        </div>
      )}

      {/* Not Configured State */}
      {vpnNotConfigured && (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <WifiOff className="w-16 h-16 mx-auto text-theme-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-theme-text mb-2">
            VPN Proxy Not Configured
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            Configure the VPN Proxy Manager URL and API Key in the settings to
            monitor VPN containers.
          </p>
        </div>
      )}
    </div>
  );
}
