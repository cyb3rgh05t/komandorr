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
      className="group border-b border-theme last:border-b-0 hover:bg-theme-hover/50 transition-colors cursor-pointer"
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
        <span className="px-2 py-0.5 bg-theme-hover/50 border border-theme rounded-md text-[10px] font-medium text-theme-text-muted capitalize">
          {container.vpn_provider || "—"}
        </span>
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
              <tr className="bg-theme-primary-80 border-b border-theme-primary">
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                  Container
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black hidden sm:table-cell">
                  Provider
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black hidden md:table-cell">
                  IP
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black hidden lg:table-cell">
                  Location
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black hidden xl:table-cell">
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
