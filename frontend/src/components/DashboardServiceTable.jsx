import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Zap,
  Clock,
  Globe,
  Server,
  Layout,
  Code,
  Database,
  Wifi,
  Terminal,
  Radio,
  Search,
  Layers,
  Settings,
} from "lucide-react";
import { formatDistanceToNow } from "@/utils/dateUtils";

const typeConfig = {
  app: {
    icon: Layout,
    color: "text-blue-400",
    bgColor: "bg-gradient-to-br from-blue-500/20 to-blue-500/10",
    borderColor: "border-blue-500/30",
    shadowColor: "shadow-blue-500/20",
  },
  website: {
    icon: Globe,
    color: "text-cyan-400",
    bgColor: "bg-gradient-to-br from-cyan-500/20 to-cyan-500/10",
    borderColor: "border-cyan-500/30",
    shadowColor: "shadow-cyan-500/20",
  },
  panel: {
    icon: Layout,
    color: "text-purple-400",
    bgColor: "bg-gradient-to-br from-purple-500/20 to-purple-500/10",
    borderColor: "border-purple-500/30",
    shadowColor: "shadow-purple-500/20",
  },
  project: {
    icon: Layers,
    color: "text-indigo-400",
    bgColor: "bg-gradient-to-br from-indigo-500/20 to-indigo-500/10",
    borderColor: "border-indigo-500/30",
    shadowColor: "shadow-indigo-500/20",
  },
  server: {
    icon: Server,
    color: "text-emerald-400",
    bgColor: "bg-gradient-to-br from-emerald-500/20 to-emerald-500/10",
    borderColor: "border-emerald-500/30",
    shadowColor: "shadow-emerald-500/20",
  },
  http: {
    icon: Globe,
    color: "text-orange-400",
    bgColor: "bg-gradient-to-br from-orange-500/20 to-orange-500/10",
    borderColor: "border-orange-500/30",
    shadowColor: "shadow-orange-500/20",
  },
  https: {
    icon: Globe,
    color: "text-green-400",
    bgColor: "bg-gradient-to-br from-green-500/20 to-green-500/10",
    borderColor: "border-green-500/30",
    shadowColor: "shadow-green-500/20",
  },
  tcp: {
    icon: Terminal,
    color: "text-amber-400",
    bgColor: "bg-gradient-to-br from-amber-500/20 to-amber-500/10",
    borderColor: "border-amber-500/30",
    shadowColor: "shadow-amber-500/20",
  },
  ping: {
    icon: Radio,
    color: "text-teal-400",
    bgColor: "bg-gradient-to-br from-teal-500/20 to-teal-500/10",
    borderColor: "border-teal-500/30",
    shadowColor: "shadow-teal-500/20",
  },
  dns: {
    icon: Search,
    color: "text-sky-400",
    bgColor: "bg-gradient-to-br from-sky-500/20 to-sky-500/10",
    borderColor: "border-sky-500/30",
    shadowColor: "shadow-sky-500/20",
  },
  api: {
    icon: Code,
    color: "text-pink-400",
    bgColor: "bg-gradient-to-br from-pink-500/20 to-pink-500/10",
    borderColor: "border-pink-500/30",
    shadowColor: "shadow-pink-500/20",
  },
  websocket: {
    icon: Wifi,
    color: "text-violet-400",
    bgColor: "bg-gradient-to-br from-violet-500/20 to-violet-500/10",
    borderColor: "border-violet-500/30",
    shadowColor: "shadow-violet-500/20",
  },
  database: {
    icon: Database,
    color: "text-rose-400",
    bgColor: "bg-gradient-to-br from-rose-500/20 to-rose-500/10",
    borderColor: "border-rose-500/30",
    shadowColor: "shadow-rose-500/20",
  },
  custom: {
    icon: Settings,
    color: "text-gray-400",
    bgColor: "bg-gradient-to-br from-gray-500/20 to-gray-500/10",
    borderColor: "border-gray-500/30",
    shadowColor: "shadow-gray-500/20",
  },
};

const defaultTypeConfig = {
  icon: Layers,
  color: "text-gray-400",
  bgColor: "bg-gradient-to-br from-gray-500/20 to-gray-500/10",
  borderColor: "border-gray-500/30",
  shadowColor: "shadow-gray-500/20",
};

const statusConfig = {
  online: {
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-gradient-to-br from-green-500/20 to-green-500/10",
    borderColor: "border-green-500/30",
    shadowColor: "shadow-green-500/20",
  },
  offline: {
    icon: XCircle,
    color: "text-red-400",
    bgColor: "bg-gradient-to-br from-red-500/20 to-red-500/10",
    borderColor: "border-red-500/30",
    shadowColor: "shadow-red-500/20",
  },
  problem: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bgColor: "bg-gradient-to-br from-yellow-500/20 to-yellow-500/10",
    borderColor: "border-yellow-500/30",
    shadowColor: "shadow-yellow-500/20",
  },
};

const formatBandwidth = (mbps) => {
  if (!mbps || mbps === 0) return "0 KB/s";
  if (mbps < 1) {
    return `${(mbps * 1024).toFixed(1)} KB/s`;
  }
  return `${mbps.toFixed(1)} MB/s`;
};

function ServiceRow({ service, trafficData, onCheck, onEdit, onDelete }) {
  const { t } = useTranslation();
  const config = statusConfig[service.status] || statusConfig.offline;
  const StatusIcon = config.icon;

  const serviceTraffic = trafficData?.services?.find(
    (s) => s.id === service.id,
  );

  return (
    <tr
      className="group border-b border-theme last:border-b-0 hover:bg-theme-primary-10 transition-colors cursor-pointer"
      onClick={() => window.open(service.url, "_blank", "noopener,noreferrer")}
    >
      {/* Service Name + Icon */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {service.icon && (
            <img
              src={service.icon}
              alt={service.name}
              className="w-6 h-6 object-contain flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
          <span className="text-sm font-bold text-theme-text truncate group-hover:text-theme-primary transition-colors">
            {service.name}
          </span>
        </div>
      </td>

      {/* Type / Description Badges */}
      <td className="px-3 py-2.5 hidden sm:table-cell">
        <div className="flex items-center gap-1.5">
          {service.description && (
            <span className="px-2 py-0.5 bg-theme-hover/50 border border-theme rounded-md text-[10px] font-medium text-theme-text-muted truncate max-w-[120px]">
              {service.description}
            </span>
          )}
          {(() => {
            const tc = typeConfig[service.type] || defaultTypeConfig;
            const TypeIcon = tc.icon;
            return (
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${tc.bgColor} ${tc.color} border ${tc.borderColor} shadow-sm ${tc.shadowColor}`}
              >
                <TypeIcon size={11} />
                <span className="text-[11px] font-semibold whitespace-nowrap">
                  {t(`service.types.${service.type}`)}
                </span>
              </div>
            );
          })()}
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${config.bgColor} ${config.color} border ${config.borderColor} shadow-sm ${config.shadowColor}`}
          >
            <StatusIcon size={12} />
            <span className="text-[11px] font-semibold capitalize whitespace-nowrap">
              {t(`dashboard.${service.status}`)}
            </span>
          </div>
          {service.status === "online" && service.response_time > 1000 && (
            <div className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 text-yellow-400 border border-yellow-500/30">
              <AlertTriangle size={10} />
              <span className="text-[10px] font-semibold">
                {t("service.stats.slow")}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Response Time */}
      <td className="px-3 py-2.5 hidden md:table-cell">
        {service.response_time ? (
          <div className="flex items-center gap-1">
            <Zap size={11} className="text-theme-primary" />
            <span className="text-xs font-bold text-theme-primary whitespace-nowrap">
              {Math.round(service.response_time)}ms
            </span>
          </div>
        ) : (
          <span className="text-xs text-theme-text-muted">—</span>
        )}
      </td>

      {/* Last Check */}
      <td className="px-3 py-2.5 hidden lg:table-cell">
        {service.last_check ? (
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-theme-text-muted" />
            <span className="text-xs font-bold text-theme-text whitespace-nowrap">
              {formatDistanceToNow(service.last_check)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-theme-text-muted">—</span>
        )}
      </td>

      {/* Upload */}
      <td className="px-3 py-2.5 hidden xl:table-cell">
        {serviceTraffic && serviceTraffic.bandwidth_up > 0 ? (
          <div className="flex items-center gap-1">
            <ArrowUp size={11} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-400 whitespace-nowrap">
              {formatBandwidth(serviceTraffic.bandwidth_up)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-theme-text-muted">—</span>
        )}
      </td>

      {/* Download */}
      <td className="px-3 py-2.5 hidden xl:table-cell">
        {serviceTraffic && serviceTraffic.bandwidth_down > 0 ? (
          <div className="flex items-center gap-1">
            <ArrowDown size={11} className="text-green-400" />
            <span className="text-xs font-bold text-green-400 whitespace-nowrap">
              {formatBandwidth(serviceTraffic.bandwidth_down)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-theme-text-muted">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div
          className="flex items-center gap-1 justify-end"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCheck(service.id);
            }}
            className="p-1.5 bg-theme-hover hover:bg-theme-primary/10 rounded-md transition-all duration-200 border border-theme hover:border-theme-primary shadow-sm hover:shadow-md group/btn"
            title={t("service.checkNow")}
          >
            <RefreshCw
              size={13}
              className="text-theme-text-muted group-hover/btn:text-theme-primary group-hover/btn:rotate-180 transition-all duration-300"
            />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(service);
            }}
            className="p-1.5 hover:bg-theme-hover rounded-md transition-colors border border-theme hover:border-theme-primary group/btn"
            title={t("service.edit")}
          >
            <Edit
              className="text-theme-text-muted group-hover/btn:text-theme-primary transition-colors"
              size={13}
            />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(service.id);
            }}
            className="p-1.5 hover:bg-theme-hover rounded-md transition-colors border border-theme hover:border-red-500/50 group/btn"
            title={t("service.delete")}
          >
            <Trash2
              className="text-theme-text-muted group-hover/btn:text-red-400 transition-colors"
              size={13}
            />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function DashboardServiceTable({
  services,
  trafficData,
  onCheck,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-theme-card border border-theme rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-theme-primary-80 border-b border-theme-primary">
              <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                {t("service.name", "Service")}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black hidden sm:table-cell">
                {t("service.type", "Type")}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                {t("service.status", "Status")}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black hidden md:table-cell">
                {t("service.stats.response", "Response")}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black hidden lg:table-cell">
                {t("service.stats.checked", "Last Check")}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black hidden xl:table-cell">
                {t("service.stats.upload", "Upload")}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black hidden xl:table-cell">
                {t("service.stats.download", "Download")}
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-black">
                {t("service.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                trafficData={trafficData}
                onCheck={onCheck}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
