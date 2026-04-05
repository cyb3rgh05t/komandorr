import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Globe,
  Wifi,
  WifiOff,
  HeartCrack,
  AlertTriangle,
  Network,
  ArrowUpDown,
  MapPin,
  Users,
  ChevronRight,
  Layers,
} from "lucide-react";

export default function DashboardVpnProviders({
  containers,
  vpnInfoMap,
  depsMap,
}) {
  const navigate = useNavigate();

  const providerStats = useMemo(() => {
    if (!containers || containers.length === 0) return [];
    const map = {};
    for (const c of containers) {
      const p = c.vpn_provider || "unknown";
      if (!map[p])
        map[p] = {
          total: 0,
          running: 0,
          connected: 0,
          disconnected: 0,
          stopped: 0,
          unhealthy: 0,
          types: new Set(),
          countries: new Set(),
          cities: new Set(),
          proxyCount: 0,
          httpProxyCount: 0,
          shadowsocksCount: 0,
          clientCount: 0,
          portForwardCount: 0,
          ips: new Set(),
          serverLocations: new Set(),
          connectedItems: [],
          disconnectedItems: [],
          unhealthyItems: [],
          stoppedItems: [],
        };
      map[p].total++;
      if (c.vpn_type) map[p].types.add(c.vpn_type);
      const info = vpnInfoMap?.[c.id] || {};
      const status = (c.docker_status || c.status || "").toLowerCase();
      const isRunning = status === "running" || status === "healthy";
      const isConnected = info?.vpn_status === "running" && info?.public_ip;
      if (isRunning) map[p].running++;
      if (isConnected) {
        map[p].connected++;
        map[p].connectedItems.push({ id: c.id, name: c.name });
      } else if (isRunning) {
        map[p].disconnected++;
        map[p].disconnectedItems.push({ id: c.id, name: c.name });
      }
      if (["exited", "dead", "removed"].includes(status)) {
        map[p].stopped++;
        map[p].stoppedItems.push({ id: c.id, name: c.name });
      }
      if (status === "unhealthy") {
        map[p].unhealthy++;
        map[p].unhealthyItems.push({ id: c.id, name: c.name });
      }
      if (info?.country) map[p].countries.add(info.country);
      if (info?.region) map[p].cities.add(info.region);
      if (info?.public_ip) map[p].ips.add(info.public_ip);
      if (info?.port_forwarded) map[p].portForwardCount++;
      if (c.config?.SERVER_COUNTRIES)
        c.config.SERVER_COUNTRIES.split(",").forEach((s) => {
          if (s.trim()) map[p].serverLocations.add(s.trim());
        });
      if (c.config?.SERVER_CITIES)
        c.config.SERVER_CITIES.split(",").forEach((s) => {
          if (s.trim()) map[p].serverLocations.add(s.trim());
        });
      if (c.config?.HTTPPROXY?.toLowerCase() === "on") {
        map[p].proxyCount++;
        map[p].httpProxyCount++;
      }
      if (c.config?.SHADOWSOCKS?.toLowerCase() === "on") {
        map[p].proxyCount++;
        map[p].shadowsocksCount++;
      }
      const deps = depsMap?.[c.id] || [];
      map[p].clientCount += deps.length;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({
        name,
        ...data,
        types: [...data.types],
        countries: [...data.countries],
        cities: [...data.cities],
        ips: [...data.ips],
        serverLocations: [...data.serverLocations],
      }));
  }, [containers, vpnInfoMap, depsMap]);

  if (providerStats.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-theme-primary" />
        <h3 className="text-sm font-semibold text-theme-text">VPN Providers</h3>
        <span className="text-[10px] text-theme-text-muted bg-theme-hover px-2 py-0.5 rounded-full ml-auto">
          {providerStats.length}
        </span>
      </div>

      <div className="space-y-3">
        {providerStats.map((p) => (
          <div
            key={p.name}
            onClick={() => navigate("/vpn-proxy")}
            className="bg-theme-card border border-theme rounded-lg p-3 hover:border-theme-primary/30 transition-colors cursor-pointer"
          >
            {/* Provider header */}
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-theme-text font-semibold capitalize truncate">
                    {p.name}
                  </p>
                  <span className="text-[10px] text-theme-text-muted bg-theme-hover px-1.5 py-0.5 rounded-full font-medium tabular-nums">
                    {p.total} {p.total === 1 ? "container" : "containers"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {p.types.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-theme-text-muted flex-shrink-0" />
            </div>

            {/* Status mini-cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
              <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-2.5 py-1.5">
                <Wifi className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-400 leading-tight">
                    {p.connected}
                  </p>
                  <p className="text-[9px] text-emerald-400/60 uppercase tracking-wider">
                    Connected
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5">
                <WifiOff className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-400 leading-tight">
                    {p.disconnected}
                  </p>
                  <p className="text-[9px] text-amber-400/60 uppercase tracking-wider">
                    Disconnected
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/10 rounded-lg px-2.5 py-1.5">
                <HeartCrack className="w-3 h-3 text-red-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-red-400 leading-tight">
                    {p.unhealthy}
                  </p>
                  <p className="text-[9px] text-red-400/60 uppercase tracking-wider">
                    Unhealthy
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-500/5 border border-gray-500/10 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3 h-3 text-theme-text-muted flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-theme-text-muted leading-tight">
                    {p.stopped}
                  </p>
                  <p className="text-[9px] text-theme-text-muted/60 uppercase tracking-wider">
                    Stopped
                  </p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex-1 h-1.5 bg-theme-hover rounded-full overflow-hidden flex">
                {p.total > 0 && (
                  <>
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{
                        width: `${(p.connected / p.total) * 100}%`,
                      }}
                    />
                    {p.disconnected > 0 && (
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{
                          width: `${(p.disconnected / p.total) * 100}%`,
                        }}
                      />
                    )}
                    {p.unhealthy > 0 && (
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{
                          width: `${(p.unhealthy / p.total) * 100}%`,
                        }}
                      />
                    )}
                  </>
                )}
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold tabular-nums whitespace-nowrap">
                {p.connected}/{p.total}
              </span>
            </div>

            {/* Clickable container mini-cards per status */}
            {(p.unhealthyItems.length > 0 ||
              p.disconnectedItems.length > 0 ||
              p.stoppedItems.length > 0) && (
              <div className="space-y-1.5 mb-2.5">
                {p.disconnectedItems.length > 0 && (
                  <div>
                    <p className="text-[9px] text-amber-400/60 uppercase tracking-wider font-medium mb-1 flex items-center gap-1">
                      <WifiOff className="w-2.5 h-2.5" />
                      Disconnected
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {p.disconnectedItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/vpn-proxy");
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-colors"
                        >
                          <WifiOff className="w-2.5 h-2.5" />
                          {item.name}
                          <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {p.unhealthyItems.length > 0 && (
                  <div>
                    <p className="text-[9px] text-red-400/60 uppercase tracking-wider font-medium mb-1 flex items-center gap-1">
                      <HeartCrack className="w-2.5 h-2.5" />
                      Unhealthy
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {p.unhealthyItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/vpn-proxy");
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                        >
                          <HeartCrack className="w-2.5 h-2.5" />
                          {item.name}
                          <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {p.stoppedItems.length > 0 && (
                  <div>
                    <p className="text-[9px] text-theme-text-muted/60 uppercase tracking-wider font-medium mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Stopped
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {p.stoppedItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/vpn-proxy");
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-gray-500/10 text-theme-text-muted border border-theme/50 hover:bg-gray-500/20 hover:border-theme transition-colors"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {item.name}
                          <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Info badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {p.countries.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-theme-hover text-theme-text-muted border border-theme/50">
                  <MapPin className="w-2.5 h-2.5" />
                  {p.countries.length}{" "}
                  {p.countries.length === 1 ? "country" : "countries"}
                </span>
              )}
              {p.cities.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-theme-hover text-theme-text-muted border border-theme/50">
                  <Globe className="w-2.5 h-2.5" />
                  {p.cities.length}{" "}
                  {p.cities.length === 1 ? "region" : "regions"}
                </span>
              )}
              {p.httpProxyCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Network className="w-2.5 h-2.5" />
                  {p.httpProxyCount} HTTP proxy
                </span>
              )}
              {p.shadowsocksCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Network className="w-2.5 h-2.5" />
                  {p.shadowsocksCount} Shadowsocks
                </span>
              )}
              {p.clientCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Users className="w-2.5 h-2.5" />
                  {p.clientCount} {p.clientCount === 1 ? "client" : "clients"}
                </span>
              )}
              {p.portForwardCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-theme-primary/10 text-theme-primary border border-theme-primary/20">
                  <ArrowUpDown className="w-2.5 h-2.5" />
                  {p.portForwardCount} forwarded
                </span>
              )}
              {p.ips.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Globe className="w-2.5 h-2.5" />
                  {p.ips.length} {p.ips.length === 1 ? "IP" : "IPs"}
                </span>
              )}
            </div>

            {/* Server locations */}
            {p.serverLocations.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-theme/30">
                {p.serverLocations.slice(0, 6).map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-theme-hover/70 text-theme-text-muted"
                  >
                    {loc}
                  </span>
                ))}
                {p.serverLocations.length > 6 && (
                  <span className="text-[9px] text-theme-text-muted">
                    +{p.serverLocations.length - 6} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
