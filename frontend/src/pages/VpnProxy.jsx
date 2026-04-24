import { useState, useMemo, useEffect } from "react";
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
  MapPin,
  ArrowUpDown,
  Copy,
  Check,
  Play,
  Square,
  RotateCcw,
} from "lucide-react";
import { api } from "../services/api";
import PageHeader from "../components/PageHeader";

const isActiveStatus = (s) => {
  const lower = (s || "").toLowerCase();
  return lower === "running" || lower === "healthy" || lower === "starting";
};

const isStoppedStatus = (s) => {
  const lower = (s || "").toLowerCase();
  return ["stopped", "exited", "dead", "removed"].includes(lower);
};

const isUnhealthyStatus = (s) => {
  const lower = (s || "").toLowerCase();
  return lower === "unhealthy";
};

const isVpnConnected = (info) => {
  const vpnStatus = (info?.vpn_status || "").toLowerCase();
  return (
    ["running", "healthy", "connected"].includes(vpnStatus) &&
    Boolean(info?.public_ip)
  );
};

const isNotConnectedStatus = (container, info) => {
  const status = container.docker_status || container.status;
  if (!isActiveStatus(status)) return false;
  if (isUnhealthyStatus(status)) return false;
  return !isVpnConnected(info);
};

const NAME_COLLATOR = new Intl.Collator("de", {
  sensitivity: "base",
  numeric: true,
});

const getStatusPriority = (status) => {
  const lower = (status || "").toLowerCase();
  if (["running", "healthy"].includes(lower)) return 0;
  if (lower === "unhealthy") return 1;
  if (["starting", "restarting", "paused"].includes(lower)) return 2;
  if (lower === "created") return 3;
  if (["stopped", "exited", "dead", "removed", "error"].includes(lower)) {
    return 4;
  }
  return 5;
};

const sortContainersByStatusAndName = (items) =>
  [...items].sort((a, b) => {
    const statusDiff =
      getStatusPriority(a?.docker_status || a?.status) -
      getStatusPriority(b?.docker_status || b?.status);
    if (statusDiff !== 0) return statusDiff;

    const nameDiff = NAME_COLLATOR.compare(a?.name || "", b?.name || "");
    if (nameDiff !== 0) return nameDiff;

    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });

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
  const [activeCategoryTab, setActiveCategoryTab] = useState("proxy");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || null,
  );
  const [copiedUrl, setCopiedUrl] = useState(null);

  const copyToClipboard = (url) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleDepAction = async (containerId, depName, action) => {
    try {
      await api.post(
        `/vpn-proxy/containers/${containerId}/dependents/${depName}/${action}`,
      );
    } catch {
      /* ignore */
    }
  };

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

  // Fetch dependents per container (batch)
  const { data: depsMap = {} } = useQuery({
    queryKey: ["vpn-proxy-dependents-batch"],
    queryFn: () => api.get("/vpn-proxy/containers/dependents-batch"),
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
    } else if (statusFilter === "unhealthy") {
      result = result.filter((c) =>
        isUnhealthyStatus(c.docker_status || c.status),
      );
    } else if (statusFilter === "not_connected") {
      result = result.filter((c) =>
        isNotConnectedStatus(c, vpnInfoMap[c.id] || {}),
      );
    } else if (statusFilter === "stopped") {
      result = result.filter((c) =>
        isStoppedStatus(c.docker_status || c.status),
      );
    } else if (statusFilter === "created") {
      result = result.filter(
        (c) => (c.docker_status || c.status || "").toLowerCase() === "created",
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
    return sortContainersByStatusAndName(result);
  }, [containers, activeTab, statusFilter, search, vpnInfoMap, depsMap]);

  // Group filtered containers by type
  const proxyContainers = useMemo(
    () =>
      filtered.filter(
        (c) =>
          !c.socks5_enabled &&
          (c.config?.HTTPPROXY?.toLowerCase() === "on" ||
            c.config?.SHADOWSOCKS?.toLowerCase() === "on"),
      ),
    [filtered],
  );
  const socks5Containers = useMemo(
    () => filtered.filter((c) => c.socks5_enabled),
    [filtered],
  );
  const vpnOnlyContainers = useMemo(
    () =>
      filtered.filter(
        (c) =>
          !c.socks5_enabled &&
          c.config?.HTTPPROXY?.toLowerCase() !== "on" &&
          c.config?.SHADOWSOCKS?.toLowerCase() !== "on",
      ),
    [filtered],
  );

  const categoryTabs = useMemo(
    () => [
      {
        key: "proxy",
        label: "Proxy Containers",
        icon: Network,
        iconClass: "text-theme-primary",
        items: proxyContainers,
      },
      {
        key: "socks5",
        label: "SOCKS5 Proxy Containers",
        icon: Shield,
        iconClass: "text-purple-400",
        items: socks5Containers,
      },
      {
        key: "vpn",
        label: "VPN Only Containers",
        icon: Shield,
        iconClass: "text-theme-primary",
        items: vpnOnlyContainers,
      },
    ],
    [proxyContainers, socks5Containers, vpnOnlyContainers],
  );

  const activeCategory =
    categoryTabs.find(
      (tab) => tab.key === activeCategoryTab && tab.items.length > 0,
    ) ||
    categoryTabs.find((tab) => tab.items.length > 0) ||
    categoryTabs[0];

  const visibleContainers = activeCategory?.items || [];

  useEffect(() => {
    if (
      categoryTabs.some(
        (tab) => tab.key === activeCategoryTab && tab.items.length > 0,
      )
    ) {
      return;
    }
    const firstNonEmpty = categoryTabs.find((tab) => tab.items.length > 0);
    if (firstNonEmpty && firstNonEmpty.key !== activeCategoryTab) {
      setActiveCategoryTab(firstNonEmpty.key);
    }
  }, [activeCategoryTab, categoryTabs]);

  // Stats
  const runningCount = containers.filter((c) =>
    isActiveStatus(c.docker_status || c.status),
  ).length;
  const unhealthyCount = containers.filter((c) =>
    isUnhealthyStatus(c.docker_status || c.status),
  ).length;
  const stoppedCount = containers.filter((c) =>
    isStoppedStatus(c.docker_status || c.status),
  ).length;
  const notConnectedCount = containers.filter((c) =>
    isNotConnectedStatus(c, vpnInfoMap[c.id] || {}),
  ).length;

  const vpnNotConfigured =
    connectionStatus !== undefined &&
    !connectionStatus?.connected &&
    !isLoading;

  const renderCard = (container) => {
    const info = vpnInfoMap[container.id] || {};
    const deps = depsMap[container.id] || [];
    const status = container.docker_status || container.status || "unknown";
    const isRunning = isActiveStatus(status);
    const isConnected = isVpnConnected(info);

    const predefinedLocations = [];
    if (container.config?.SERVER_COUNTRIES)
      container.config.SERVER_COUNTRIES.split(",").forEach((s) => {
        if (s.trim()) predefinedLocations.push(s.trim());
      });
    if (container.config?.SERVER_CITIES)
      container.config.SERVER_CITIES.split(",").forEach((s) => {
        if (s.trim()) predefinedLocations.push(s.trim());
      });
    if (container.config?.SERVER_REGIONS)
      container.config.SERVER_REGIONS.split(",").forEach((s) => {
        if (s.trim()) predefinedLocations.push(s.trim());
      });

    const serverLocation =
      container.config?.SERVER_COUNTRIES ||
      container.config?.SERVER_CITIES ||
      container.config?.SERVER_REGIONS ||
      null;

    const httpProxyEnabled =
      container.config?.HTTPPROXY?.toLowerCase() === "on";
    const shadowsocksEnabled =
      container.config?.SHADOWSOCKS?.toLowerCase() === "on";

    return (
      <div
        key={container.id}
        className="group bg-theme-card border border-theme rounded-xl overflow-hidden hover:border-theme-primary transition-all"
      >
        {/* Card Header */}
        <div className="px-4 py-3 bg-theme-hover border-b border-theme flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-theme-primary truncate">
                {container.name}
              </h3>
              {container.description && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 truncate max-w-[150px]">
                  {container.description}
                </span>
              )}
            </div>
            {container.docker_name &&
              container.docker_name !== `gluetun-${container.name}` &&
              container.docker_name !== container.name && (
                <p className="text-[10px] text-amber-400/70 mt-0.5 truncate font-mono">
                  {container.docker_name}
                </p>
              )}
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Card Body */}
        <div className="p-3 space-y-2.5">
          {/* VPN Connection Section */}
          <div className="bg-theme-hover/50 rounded-lg p-3 space-y-2">
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
                <span
                  className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ml-2 ${isConnected ? "text-emerald-400" : "text-red-400"}`}
                >
                  {isConnected ? (
                    <Wifi className="w-3.5 h-3.5" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5" />
                  )}
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              )}
            </div>

            {(info.public_ip || serverLocation) && (
              <div className="flex items-center gap-3 flex-wrap text-xs text-theme-text-muted">
                {info.public_ip && (
                  <span className="flex items-center gap-1 font-mono">
                    <Globe className="w-3.5 h-3.5 text-theme-primary" />
                    <span className="text-theme-primary">{info.public_ip}</span>
                  </span>
                )}
                {(info.country || serverLocation) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {info.country || serverLocation}
                    {info.region && (
                      <span className="text-theme-text-muted">
                        · {info.region}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}

            {info.port_forwarded && info.port_forwarded > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-theme-text-muted">
                <ArrowUpDown className="w-3 h-3 text-amber-400" />
                <span>
                  Port Forwarded:{" "}
                  <span className="text-amber-400 font-mono">
                    {info.port_forwarded}
                  </span>
                </span>
              </div>
            )}

            {predefinedLocations.length > 0 && (
              <div className="flex items-start gap-1.5 pt-1">
                <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {predefinedLocations.map((loc, i) => (
                    <span
                      key={`${loc}-${i}`}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    >
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Proxy Connections Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* HTTP Proxy */}
            {httpProxyEnabled &&
              (() => {
                const internalPort = container.port_http_proxy || 8888;
                const user = container.config?.HTTPPROXY_USER;
                const pass = container.config?.HTTPPROXY_PASSWORD;
                const auth = user && pass ? `${user}:${pass}@` : "";
                const authDisplay = user && pass ? `${user}:***@` : "";
                const ip = container.ip_address || "<ip>";
                const dockerName =
                  container.docker_name || `gluetun-${container.name}`;
                const internalUrl = `http://${auth}${ip}:${internalPort}`;
                const hostnameUrl = `http://${auth}${dockerName}:${internalPort}`;
                const proxyMapping = container.extra_ports?.find(
                  (ep) => parseInt(ep.container) === internalPort,
                );
                const externalPort = proxyMapping
                  ? parseInt(proxyMapping.host)
                  : null;
                const serverIp = window.location.hostname;
                const externalUrl = externalPort
                  ? `http://${auth}${serverIp}:${externalPort}`
                  : null;

                return (
                  <div className="bg-theme-hover/50 border border-theme rounded-lg px-4 py-3 col-span-2 space-y-2.5">
                    <p className="text-[10px] text-theme-text-muted uppercase tracking-wider font-semibold">
                      HTTP Proxy
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase text-emerald-400/70 mb-1">
                          Internal
                        </p>
                        <button
                          onClick={() => copyToClipboard(internalUrl)}
                          title="Click to copy"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer w-full"
                        >
                          <span className="truncate flex-1 text-left">
                            http://{authDisplay}
                            {ip}:{internalPort}
                          </span>
                          {copiedUrl === internalUrl ? (
                            <Check className="w-3 h-3 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase text-amber-400/70 mb-1">
                          Hostname
                        </p>
                        <button
                          onClick={() => copyToClipboard(hostnameUrl)}
                          title="Click to copy"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer w-full"
                        >
                          <span className="truncate flex-1 text-left">
                            http://{authDisplay}
                            {dockerName}:{internalPort}
                          </span>
                          {copiedUrl === hostnameUrl ? (
                            <Check className="w-3 h-3 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </div>
                      {externalUrl && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase text-blue-400/70 mb-1">
                            External
                          </p>
                          <button
                            onClick={() => copyToClipboard(externalUrl)}
                            title="Click to copy"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer w-full"
                          >
                            <span className="truncate flex-1 text-left">
                              http://{authDisplay}
                              {serverIp}:{externalPort}
                            </span>
                            {copiedUrl === externalUrl ? (
                              <Check className="w-3 h-3 shrink-0" />
                            ) : (
                              <Copy className="w-3 h-3 shrink-0 opacity-50" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* Shadowsocks */}
            {shadowsocksEnabled &&
              (() => {
                const ssPort = container.port_shadowsocks || 8388;
                const ip = container.ip_address || "<ip>";
                const dockerName =
                  container.docker_name || `gluetun-${container.name}`;
                const ssInternal = `ss://${ip}:${ssPort}`;
                const ssHostname = `ss://${dockerName}:${ssPort}`;
                const ssMapping = container.extra_ports?.find(
                  (ep) => parseInt(ep.container) === ssPort,
                );
                const ssExtPort = ssMapping ? parseInt(ssMapping.host) : null;
                const serverIp = window.location.hostname;
                const ssExternal = ssExtPort
                  ? `ss://${serverIp}:${ssExtPort}`
                  : null;

                return (
                  <div className="bg-theme-hover/50 border border-theme rounded-lg px-4 py-3 col-span-2 space-y-2.5">
                    <p className="text-[10px] text-theme-text-muted uppercase tracking-wider font-semibold">
                      Shadowsocks
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase text-emerald-400/70 mb-1">
                          Internal
                        </p>
                        <button
                          onClick={() => copyToClipboard(ssInternal)}
                          title="Click to copy"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer w-full"
                        >
                          <span className="truncate flex-1 text-left">
                            {ssInternal}
                          </span>
                          {copiedUrl === ssInternal ? (
                            <Check className="w-3 h-3 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase text-amber-400/70 mb-1">
                          Hostname
                        </p>
                        <button
                          onClick={() => copyToClipboard(ssHostname)}
                          title="Click to copy"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer w-full"
                        >
                          <span className="truncate flex-1 text-left">
                            {ssHostname}
                          </span>
                          {copiedUrl === ssHostname ? (
                            <Check className="w-3 h-3 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </div>
                      {ssExternal && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase text-blue-400/70 mb-1">
                            External
                          </p>
                          <button
                            onClick={() => copyToClipboard(ssExternal)}
                            title="Click to copy"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer w-full"
                          >
                            <span className="truncate flex-1 text-left">
                              {ssExternal}
                            </span>
                            {copiedUrl === ssExternal ? (
                              <Check className="w-3 h-3 shrink-0" />
                            ) : (
                              <Copy className="w-3 h-3 shrink-0 opacity-50" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* SOCKS5 Proxy */}
            {container.socks5_enabled &&
              (() => {
                const ip = container.ip_address || "<ip>";
                const dockerName =
                  container.docker_name || `gluetun-${container.name}`;
                const serverIp = window.location.hostname;
                const socks5Port = container.port_socks5 || 1080;
                const socks5Internal = `socks5://${ip}:${socks5Port}`;
                const socks5Hostname = `socks5://${dockerName}:${socks5Port}`;
                const socks5Mapping = container.extra_ports?.find(
                  (ep) => parseInt(ep.container) === socks5Port,
                );
                const socks5ExtPort = socks5Mapping
                  ? parseInt(socks5Mapping.host)
                  : null;
                const socks5External = socks5ExtPort
                  ? `socks5://${serverIp}:${socks5ExtPort}`
                  : null;

                return (
                  <div className="bg-theme-hover/50 border border-theme rounded-lg px-4 py-3 col-span-2 space-y-2.5">
                    <p className="text-[10px] text-theme-text-muted uppercase tracking-wider font-semibold">
                      SOCKS5 Proxy
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase text-emerald-400/70 mb-1">
                          Internal
                        </p>
                        <button
                          onClick={() => copyToClipboard(socks5Internal)}
                          title="Click to copy"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer w-full"
                        >
                          <span className="truncate flex-1 text-left">
                            {socks5Internal}
                          </span>
                          {copiedUrl === socks5Internal ? (
                            <Check className="w-3 h-3 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase text-amber-400/70 mb-1">
                          Hostname
                        </p>
                        <button
                          onClick={() => copyToClipboard(socks5Hostname)}
                          title="Click to copy"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer w-full"
                        >
                          <span className="truncate flex-1 text-left">
                            {socks5Hostname}
                          </span>
                          {copiedUrl === socks5Hostname ? (
                            <Check className="w-3 h-3 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 shrink-0 opacity-50" />
                          )}
                        </button>
                      </div>
                      {socks5External && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase text-blue-400/70 mb-1">
                            External
                          </p>
                          <button
                            onClick={() => copyToClipboard(socks5External)}
                            title="Click to copy"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer w-full"
                          >
                            <span className="truncate flex-1 text-left">
                              {socks5External}
                            </span>
                            {copiedUrl === socks5External ? (
                              <Check className="w-3 h-3 shrink-0" />
                            ) : (
                              <Copy className="w-3 h-3 shrink-0 opacity-50" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* Extra Ports */}
            {container.extra_ports?.length > 0 && (
              <div className="bg-theme-hover/50 border border-theme rounded-lg px-3 py-2">
                <p className="text-[10px] text-theme-text-muted uppercase tracking-wider mb-0.5">
                  Extra Ports
                </p>
                <p className="text-xs text-theme-text">
                  {container.extra_ports.length} mapped
                </p>
              </div>
            )}

            {/* Network */}
            {container.network_name && (
              <div className="bg-theme-hover/50 border border-theme rounded-lg px-3 py-2">
                <p className="text-[10px] text-theme-text-muted uppercase tracking-wider mb-0.5">
                  Network
                </p>
                <p className="text-xs text-theme-text truncate">
                  {container.network_name}
                </p>
              </div>
            )}
          </div>

          {/* Dependent Containers */}
          {deps.length > 0 && (
            <div className="bg-theme-hover/50 border border-theme rounded-lg px-3 py-2">
              <p className="text-[10px] text-theme-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Network className="w-3.5 h-3.5" />
                Network Clients ({deps.length})
              </p>
              <div className="space-y-1">
                {deps.map((dep, i) => {
                  const depStatus = (
                    dep.status ||
                    dep.state ||
                    ""
                  ).toLowerCase();
                  const depStopped = ["exited", "created", "dead"].includes(
                    depStatus,
                  );
                  const depRunning = depStatus === "running";
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-theme-card rounded px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            depRunning
                              ? "bg-emerald-500"
                              : depStopped
                                ? "bg-red-500"
                                : "bg-amber-500"
                          }`}
                        />
                        <span className="text-xs text-theme-text truncate">
                          {dep.name || dep.container_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {depStopped && (
                          <button
                            onClick={() =>
                              handleDepAction(
                                container.id,
                                dep.name || dep.container_name,
                                "start",
                              )
                            }
                            className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-90"
                            title="Start"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        )}
                        {depRunning && (
                          <button
                            onClick={() =>
                              handleDepAction(
                                container.id,
                                dep.name || dep.container_name,
                                "stop",
                              )
                            }
                            className="p-1 rounded text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90"
                            title="Stop"
                          >
                            <Square className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleDepAction(
                              container.id,
                              dep.name || dep.container_name,
                              "restart",
                            )
                          }
                          className="p-1 rounded text-theme-primary hover:bg-theme-primary/10 transition-all active:scale-90"
                          title="Restart"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
      <PageHeader
        icon={Shield}
        title="VPN-Proxies"
        actions={
          <>
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
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
              <input
                type="text"
                placeholder="Search containers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
              />
            </div>
          </>
        }
      />

      {/* Stats Cards (clickable filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter(null)}
          className="bg-theme-card border border-theme rounded-lg px-4 py-3 transition-all text-left cursor-pointer hover:shadow-md hover:bg-yellow-500/10 hover:border-yellow-500/50"
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
            setStatusFilter(statusFilter === "unhealthy" ? null : "unhealthy")
          }
          className={`bg-theme-card border rounded-lg px-4 py-3 transition-all text-left cursor-pointer hover:shadow-md hover:bg-red-500/10 ${
            statusFilter === "unhealthy"
              ? "border-red-500 ring-1 ring-red-500/20"
              : "border-theme hover:border-red-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Unhealthy
                </span>
              </div>
              <p className="text-2xl font-bold text-red-400">
                {unhealthyCount}
              </p>
            </div>
            <Activity className="w-6 h-6 text-red-400" />
          </div>
        </button>
        <button
          onClick={() =>
            setStatusFilter(
              statusFilter === "not_connected" ? null : "not_connected",
            )
          }
          className={`bg-theme-card border rounded-lg px-4 py-3 transition-all text-left cursor-pointer hover:shadow-md hover:bg-amber-500/10 ${
            statusFilter === "not_connected"
              ? "border-amber-500 ring-1 ring-amber-500/20"
              : "border-theme hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Not Connected
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-400">
                {notConnectedCount}
              </p>
            </div>
            <WifiOff className="w-6 h-6 text-amber-400" />
          </div>
        </button>
        <button
          onClick={() =>
            setStatusFilter(statusFilter === "stopped" ? null : "stopped")
          }
          className={`bg-theme-card border rounded-lg px-4 py-3 transition-all text-left cursor-pointer hover:shadow-md hover:bg-gray-500/10 ${
            statusFilter === "stopped"
              ? "border-gray-500 ring-1 ring-gray-500/20"
              : "border-theme hover:border-gray-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Power className="w-3.5 h-3.5 text-theme-text-muted" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Stopped/Exited
                </span>
              </div>
              <p className="text-2xl font-bold text-theme-text-muted">
                {stoppedCount}
              </p>
            </div>
            <Power className="w-6 h-6 text-theme-text-muted" />
          </div>
        </button>
        <button
          onClick={() =>
            setStatusFilter(statusFilter === "clients" ? null : "clients")
          }
          className={`bg-theme-card border rounded-lg px-4 py-3 transition-all text-left cursor-pointer hover:shadow-md hover:bg-purple-500/10 ${
            statusFilter === "clients"
              ? "border-purple-500 ring-1 ring-purple-500/20"
              : "border-theme hover:border-purple-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Network className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Clients
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-400">
                {Object.values(depsMap).reduce((sum, d) => sum + d.length, 0)}
              </p>
            </div>
            <Network className="w-6 h-6 text-purple-400" />
          </div>
        </button>
      </div>

      {/* Provider Tabs */}
      {!isLoading && containers.length > 0 && (
        <div className="inline-flex items-center bg-theme-card border border-theme rounded-xl p-1 gap-0.5 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab("all");
              setSearchParams({});
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === "all"
                ? "bg-theme-primary text-black shadow-md shadow-theme-primary/25"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/60"
            }`}
          >
            All
            <span
              className={`ml-2 text-xs ${
                activeTab === "all" ? "text-black/70" : "text-theme-text-muted"
              }`}
            >
              ({containers.length})
            </span>
          </button>
          {providers.map((provider) => {
            const count = containers.filter(
              (c) =>
                (c.vpn_provider || "").toLowerCase() === provider.toLowerCase(),
            ).length;
            const isActive = activeTab.toLowerCase() === provider.toLowerCase();
            return (
              <button
                key={provider}
                onClick={() => {
                  setActiveTab(provider);
                  setSearchParams({ provider });
                }}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "bg-theme-primary text-black shadow-md shadow-theme-primary/25"
                    : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/60"
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
      )}

      {/* Loading */}
      {isLoading && (
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
          {/* Container cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-theme-card border border-theme rounded-xl p-4"
              >
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-theme-hover rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-theme-hover rounded w-2/3" />
                      <div className="h-3 bg-theme-hover rounded w-1/2" />
                    </div>
                    <div className="w-3 h-3 bg-theme-hover rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-8 bg-theme-hover rounded" />
                    <div className="h-8 bg-theme-hover rounded" />
                  </div>
                  <div className="h-3 bg-theme-hover rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Container Cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {categoryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory?.key === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategoryTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isActive
                      ? "bg-theme-primary text-black border-theme-primary"
                      : "bg-theme-card border-theme text-theme-text hover:border-theme-primary"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? "text-black" : tab.iconClass}`}
                  />
                  <span>{tab.label}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-black/10 text-black/80"
                        : "bg-theme-hover text-theme-text-muted"
                    }`}
                  >
                    {tab.items.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {activeCategory && (
              <>
                <activeCategory.icon
                  className={`w-5 h-5 ${activeCategory.iconClass}`}
                />
                <h2 className="text-lg font-semibold text-theme-text">
                  {activeCategory.label}
                </h2>
                <span className="text-xs text-theme-text-muted bg-theme-hover px-2 py-1 rounded-full">
                  {visibleContainers.length}
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleContainers.map((container) => renderCard(container))}
          </div>
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
