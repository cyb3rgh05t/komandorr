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
} from "lucide-react";
import { formatDistanceToNow } from "@/utils/dateUtils";

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

export default function DashboardServiceListItem({
  service,
  trafficData,
  onCheck,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();
  const config = statusConfig[service.status] || statusConfig.offline;
  const StatusIcon = config.icon;

  const serviceTraffic = trafficData?.services?.find(
    (s) => s.id === service.id,
  );

  const formatBandwidth = (mbps) => {
    if (!mbps || mbps === 0) return "0 KB/s";
    if (mbps < 1) {
      return `${(mbps * 1024).toFixed(1)} KB/s`;
    }
    return `${mbps.toFixed(1)} MB/s`;
  };

  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 bg-theme-card border border-theme rounded-lg px-4 py-3 hover:border-theme-primary hover:shadow-lg transition-all"
    >
      {/* Icon */}
      {service.icon && (
        <div className="relative flex-shrink-0">
          <img
            src={service.icon}
            alt={service.name}
            className="w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      )}

      {/* Name + Badges */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <h3 className="text-sm font-bold text-theme-text truncate group-hover:text-theme-primary transition-colors">
          {service.name}
        </h3>
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {service.description && (
            <span className="px-2 py-0.5 bg-theme-hover/50 border border-theme rounded-md text-[10px] font-medium text-theme-text-muted">
              {service.description}
            </span>
          )}
          <span className="px-2 py-0.5 bg-theme-hover/50 border border-theme rounded-md text-[10px] font-medium text-theme-text-muted">
            {t(`service.types.${service.type}`)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-3 flex-shrink-0">
        {/* Response Time */}
        {service.response_time && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-br from-theme-hover to-theme-card border border-theme rounded-md">
            <Zap size={11} className="text-theme-primary" />
            <span className="text-xs font-bold text-theme-primary">
              {Math.round(service.response_time)}ms
            </span>
          </div>
        )}

        {/* Last Check */}
        {service.last_check && (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-gradient-to-br from-theme-hover to-theme-card border border-theme rounded-md">
            <Clock size={11} className="text-theme-text-muted" />
            <span className="text-xs font-bold text-theme-text">
              {formatDistanceToNow(service.last_check)}
            </span>
          </div>
        )}

        {/* Traffic Upload */}
        {serviceTraffic && serviceTraffic.bandwidth_up > 0 && (
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-md">
            <ArrowUp size={11} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-400">
              {formatBandwidth(serviceTraffic.bandwidth_up)}
            </span>
          </div>
        )}

        {/* Traffic Download */}
        {serviceTraffic && serviceTraffic.bandwidth_down > 0 && (
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-md">
            <ArrowDown size={11} className="text-green-400" />
            <span className="text-xs font-bold text-green-400">
              {formatBandwidth(serviceTraffic.bandwidth_down)}
            </span>
          </div>
        )}
      </div>

      {/* Slow Warning */}
      {service.status === "online" && service.response_time > 1000 && (
        <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex-shrink-0">
          <AlertTriangle size={11} />
          <span className="text-[10px] font-semibold">
            {t("service.stats.slow")}
          </span>
        </div>
      )}

      {/* Status Badge */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${config.bgColor} ${config.color} border ${config.borderColor} shadow-sm ${config.shadowColor} flex-shrink-0`}
      >
        <StatusIcon size={13} />
        <span className="text-xs font-semibold capitalize">
          {t(`dashboard.${service.status}`)}
        </span>
      </div>

      {/* Action Buttons */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onClick={(e) => e.preventDefault()}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCheck(service.id);
          }}
          className="p-2 bg-theme-primary/10 hover:bg-theme border border-theme hover:border-theme-primary text-theme-primary rounded transition-all"
          title={t("service.checkNow")}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(service);
          }}
          className="p-2 bg-theme-primary/10 hover:bg-theme border border-theme hover:border-theme-primary text-theme-primary rounded transition-all"
          title={t("service.edit")}
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(service.id);
          }}
          className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-all"
          title={t("service.delete")}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </a>
  );
}
