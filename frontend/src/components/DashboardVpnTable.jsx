import { useNavigate } from "react-router-dom";
import {
  Shield,
  Globe,
  Activity,
  Server,
  Network,
  Lock,
  WifiOff,
} from "lucide-react";

const providerConfig = {
  nordvpn: {
    color: "text-blue-400",
    bgColor: "bg-gradient-to-br from-blue-500/20 to-blue-500/10",
    borderColor: "border-blue-500/30",
    shadowColor: "shadow-blue-500/20",
  },
  surfshark: {
    color: "text-cyan-400",
    bgColor: "bg-gradient-to-br from-cyan-500/20 to-cyan-500/10",
    borderColor: "border-cyan-500/30",
    shadowColor: "shadow-cyan-500/20",
  },
  expressvpn: {
    color: "text-red-400",
    bgColor: "bg-gradient-to-br from-red-500/20 to-red-500/10",
    borderColor: "border-red-500/30",
    shadowColor: "shadow-red-500/20",
  },
  mullvad: {
    color: "text-yellow-400",
    bgColor: "bg-gradient-to-br from-yellow-500/20 to-yellow-500/10",
    borderColor: "border-yellow-500/30",
    shadowColor: "shadow-yellow-500/20",
  },
  protonvpn: {
    color: "text-purple-400",
    bgColor: "bg-gradient-to-br from-purple-500/20 to-purple-500/10",
    borderColor: "border-purple-500/30",
    shadowColor: "shadow-purple-500/20",
  },
  pia: {
    color: "text-green-400",
    bgColor: "bg-gradient-to-br from-green-500/20 to-green-500/10",
    borderColor: "border-green-500/30",
    shadowColor: "shadow-green-500/20",
  },
  cyberghost: {
    color: "text-amber-400",
    bgColor: "bg-gradient-to-br from-amber-500/20 to-amber-500/10",
    borderColor: "border-amber-500/30",
    shadowColor: "shadow-amber-500/20",
  },
  ivpn: {
    color: "text-indigo-400",
    bgColor: "bg-gradient-to-br from-indigo-500/20 to-indigo-500/10",
    borderColor: "border-indigo-500/30",
    shadowColor: "shadow-indigo-500/20",
  },
  windscribe: {
    color: "text-teal-400",
    bgColor: "bg-gradient-to-br from-teal-500/20 to-teal-500/10",
    borderColor: "border-teal-500/30",
    shadowColor: "shadow-teal-500/20",
  },
  ipvanish: {
    color: "text-emerald-400",
    bgColor: "bg-gradient-to-br from-emerald-500/20 to-emerald-500/10",
    borderColor: "border-emerald-500/30",
    shadowColor: "shadow-emerald-500/20",
  },
};

const defaultProviderConfig = {
  color: "text-sky-400",
  bgColor: "bg-gradient-to-br from-sky-500/20 to-sky-500/10",
  borderColor: "border-sky-500/30",
  shadowColor: "shadow-sky-500/20",
};

const isActiveStatus = (s) => {
  const lower = (s || "").toLowerCase();
  return lower === "running" || lower === "healthy" || lower === "starting";
};

const statusConfig = {
  running: {
    color: "text-green-400",
    bgColor: "bg-gradient-to-br from-green-500/20 to-green-500/10",
    borderColor: "border-green-500/30",
    shadowColor: "shadow-green-500/20",
  },
  healthy: {
    color: "text-green-400",
    bgColor: "bg-gradient-to-br from-green-500/20 to-green-500/10",
    borderColor: "border-green-500/30",
    shadowColor: "shadow-green-500/20",
  },
  unhealthy: {
    color: "text-red-400",
    bgColor: "bg-gradient-to-br from-red-500/20 to-red-500/10",
    borderColor: "border-red-500/30",
    shadowColor: "shadow-red-500/20",
  },
  stopped: {
    color: "text-red-400",
    bgColor: "bg-gradient-to-br from-red-500/20 to-red-500/10",
    borderColor: "border-red-500/30",
    shadowColor: "shadow-red-500/20",
  },
  exited: {
    color: "text-red-400",
    bgColor: "bg-gradient-to-br from-red-500/20 to-red-500/10",
    borderColor: "border-red-500/30",
    shadowColor: "shadow-red-500/20",
  },
  starting: {
    color: "text-yellow-400",
    bgColor: "bg-gradient-to-br from-yellow-500/20 to-yellow-500/10",
    borderColor: "border-yellow-500/30",
    shadowColor: "shadow-yellow-500/20",
  },
  restarting: {
    color: "text-yellow-400",
    bgColor: "bg-gradient-to-br from-yellow-500/20 to-yellow-500/10",
    borderColor: "border-yellow-500/30",
    shadowColor: "shadow-yellow-500/20",
  },
};

const defaultConfig = {
  color: "text-gray-400",
  bgColor: "bg-gradient-to-br from-gray-500/20 to-gray-500/10",
  borderColor: "border-gray-500/30",
  shadowColor: "shadow-gray-500/20",
};

function VpnRow({ container, vpnInfo, deps }) {
  const navigate = useNavigate();
  const status = (
    container.docker_status ||
    container.status ||
    "unknown"
  ).toLowerCase();
  const config = statusConfig[status] || defaultConfig;
  const isRunning = isActiveStatus(status);

  return (
    <tr
      className="group border-b border-theme last:border-b-0 hover:bg-theme-primary-10 transition-colors cursor-pointer"
      onClick={() => navigate("/vpn-proxy")}
    >
      {/* Name */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Shield className="w-4 h-4 text-theme-primary flex-shrink-0" />
          <span className="text-sm font-bold text-theme-text truncate group-hover:text-theme-primary transition-colors">
            {container.name}
          </span>
        </div>
      </td>

      {/* Provider */}
      <td className="px-3 py-2.5 hidden sm:table-cell">
        {container.vpn_provider ? (
          (() => {
            const pKey = container.vpn_provider
              .toLowerCase()
              .replace(/[^a-z]/g, "");
            const pc = providerConfig[pKey] || defaultProviderConfig;
            return (
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${pc.bgColor} ${pc.color} border ${pc.borderColor} shadow-sm ${pc.shadowColor}`}
              >
                <Shield size={11} />
                <span className="text-[11px] font-semibold capitalize whitespace-nowrap">
                  {container.vpn_provider}
                </span>
              </div>
            );
          })()
        ) : (
          <span className="text-xs text-theme-text-muted">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-2.5">
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${config.bgColor} ${config.color} border ${config.borderColor} shadow-sm ${config.shadowColor}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : status === "starting" || status === "restarting" ? "bg-yellow-400" : "bg-red-400"}`}
          />
          <span className="text-[11px] font-semibold capitalize whitespace-nowrap">
            {status}
          </span>
        </div>
      </td>

      {/* IP */}
      <td className="px-3 py-2.5 hidden md:table-cell">
        {isRunning && vpnInfo?.public_ip ? (
          <div className="flex items-center gap-1">
            <Globe size={11} className="text-theme-primary" />
            <span className="text-xs font-bold text-theme-primary font-mono whitespace-nowrap">
              {vpnInfo.public_ip}
            </span>
          </div>
        ) : (
          <span className="text-xs text-theme-text-muted">—</span>
        )}
      </td>

      {/* Location */}
      <td className="px-3 py-2.5 hidden lg:table-cell">
        {isRunning && (vpnInfo?.country || vpnInfo?.region) ? (
          <span className="text-xs font-bold text-theme-text whitespace-nowrap">
            {[vpnInfo.country, vpnInfo.region].filter(Boolean).join(", ")}
          </span>
        ) : (
          <span className="text-xs text-theme-text-muted">—</span>
        )}
      </td>

      {/* Proxy */}
      <td className="px-3 py-2.5 hidden xl:table-cell">
        {container.port_http_proxy && deps.length === 0 ? (
          <div className="flex items-center gap-1">
            <Lock size={11} className="text-theme-text-muted" />
            <span className="text-xs font-bold text-theme-text font-mono whitespace-nowrap">
              :{container.port_http_proxy}
            </span>
          </div>
        ) : deps.length > 0 ? (
          <div className="flex items-center gap-1">
            <Network size={11} className="text-theme-text-muted" />
            <span className="text-xs font-bold text-theme-text whitespace-nowrap">
              {deps.length} client{deps.length !== 1 ? "s" : ""}
            </span>
          </div>
        ) : (
          <span className="text-xs text-theme-text-muted">—</span>
        )}
      </td>
    </tr>
  );
}

export default function DashboardVpnTable({
  containers,
  vpnInfoMap,
  depsMap,
  connected,
}) {
  const navigate = useNavigate();

  if (connected === false) {
    return (
      <div className="bg-theme-card border border-theme rounded-lg p-6 text-center">
        <WifiOff className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-theme-text-muted">VPN Proxy not connected</p>
      </div>
    );
  }

  if (!containers || containers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigate("/vpn-proxy")}
      >
        <Shield className="w-5 h-5 text-theme-primary" />
        <span className="text-lg font-semibold text-theme-text">VPN-Proxy</span>
        <span className="text-sm text-theme-text-muted">
          ({containers.length})
        </span>
      </div>

      <div className="bg-theme-card border border-theme rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-theme-card border-b border-theme-primary">
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">
                  Container
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary hidden sm:table-cell">
                  Provider
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary hidden md:table-cell">
                  IP
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary hidden lg:table-cell">
                  Location
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary hidden xl:table-cell">
                  Proxy / Clients
                </th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container) => (
                <VpnRow
                  key={container.id}
                  container={container}
                  vpnInfo={vpnInfoMap?.[container.id] || {}}
                  deps={depsMap?.[container.id] || []}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
