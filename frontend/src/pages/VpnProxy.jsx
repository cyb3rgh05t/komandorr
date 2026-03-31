import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
  Copy,
  Network,
  Lock,
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
  const [search, setSearch] = useState("");
  const [copiedProxy, setCopiedProxy] = useState(null);

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

  // Filter containers
  const filtered = useMemo(() => {
    if (!search.trim()) return containers;
    const q = search.toLowerCase();
    return containers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.vpn_provider?.toLowerCase().includes(q) ||
        vpnInfoMap[c.id]?.country?.toLowerCase().includes(q) ||
        vpnInfoMap[c.id]?.public_ip?.includes(q),
    );
  }, [containers, search, vpnInfoMap]);

  // Stats
  const runningCount = containers.filter((c) =>
    isActiveStatus(c.docker_status || c.status),
  ).length;
  const stoppedCount = containers.length - runningCount;

  const copyProxy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedProxy(id);
    setTimeout(() => setCopiedProxy(null), 2000);
  };

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-theme-text-muted uppercase tracking-wider">
                Total
              </span>
              <p className="text-2xl font-bold text-theme-text">
                {containers.length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-theme-text-muted/10">
              <Server className="w-5 h-5 text-theme-text-muted" />
            </div>
          </div>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md hover:border-green-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-theme-text-muted uppercase tracking-wider">
                Running
              </span>
              <p className="text-2xl font-bold text-green-400">
                {runningCount}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-theme-text-muted uppercase tracking-wider">
                Stopped
              </span>
              <p className="text-2xl font-bold text-red-400">{stoppedCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10">
              <Server className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md hover:border-theme-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-theme-text-muted uppercase tracking-wider">
                Clients
              </span>
              <p className="text-2xl font-bold text-theme-primary">
                {Object.values(depsMap).reduce((sum, d) => sum + d.length, 0)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-theme-primary/10">
              <Network className="w-5 h-5 text-theme-primary" />
            </div>
          </div>
        </div>
      </div>

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
            const proxyUrl = container.port_http_proxy
              ? `http://${window.location.hostname}:${container.port_http_proxy}`
              : null;

            return (
              <div
                key={container.id}
                className="group bg-theme-card border border-theme rounded-xl overflow-hidden hover:border-theme-primary hover:shadow-lg transition-all"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-theme">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield className="w-4 h-4 text-theme-primary flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-theme-text truncate">
                        {container.name}
                      </h3>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                  {container.description && (
                    <p className="text-xs text-theme-text-muted truncate">
                      {container.description}
                    </p>
                  )}
                </div>

                {/* VPN Info */}
                <div className="p-4 space-y-3">
                  {/* Provider & Type */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-theme-text-muted">Provider</span>
                    <span className="text-theme-text font-medium capitalize">
                      {container.vpn_provider || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-theme-text-muted">Type</span>
                    <span className="text-theme-text font-medium uppercase">
                      {container.vpn_type || "—"}
                    </span>
                  </div>

                  {/* IP & Location (only when running) */}
                  {isRunning && info.public_ip && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-theme-text-muted flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Public IP
                        </span>
                        <span className="text-theme-text font-mono">
                          {info.public_ip}
                        </span>
                      </div>
                      {(info.country || info.region) && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-theme-text-muted">
                            Location
                          </span>
                          <span className="text-theme-text">
                            {[info.country, info.region]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* VPN Status */}
                  {isRunning && info.vpn_status && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-theme-text-muted">VPN Status</span>
                      <span
                        className={`font-medium ${
                          info.vpn_status === "running"
                            ? "text-green-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {info.vpn_status}
                      </span>
                    </div>
                  )}

                  {/* Port Forwarding */}
                  {isRunning &&
                    info.port_forwarded &&
                    info.port_forwarded > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-theme-text-muted">
                          Port Forward
                        </span>
                        <span className="text-theme-primary font-mono">
                          {info.port_forwarded}
                        </span>
                      </div>
                    )}

                  {/* HTTP Proxy (hide when container has network-mode clients) */}
                  {proxyUrl && deps.length === 0 && (
                    <div className="mt-2 pt-2 border-t border-theme">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-theme-text-muted flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          HTTP Proxy
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-theme-text font-mono">
                            :{container.port_http_proxy}
                          </span>
                          <button
                            onClick={() => copyProxy(proxyUrl, container.id)}
                            className="p-1 text-theme-text-muted hover:text-theme-primary transition-colors"
                            title="Copy proxy URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedProxy === container.id && (
                            <span className="text-[10px] text-green-400">
                              Copied!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dependent Containers */}
                  {deps.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-theme">
                      <p className="text-xs text-theme-text-muted mb-2">
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
                </div>
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
