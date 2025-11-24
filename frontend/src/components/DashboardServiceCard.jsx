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

export default function DashboardServiceCard({
  service,
  trafficData,
  onCheck,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();
  const config = statusConfig[service.status] || statusConfig.offline;
  const StatusIcon = config.icon;

  // Find traffic data for this service
  const serviceTraffic = trafficData?.services?.find(
    (s) => s.id === service.id
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
      className="group block bg-theme-card hover border border-theme rounded-xl p-4 hover:border-theme-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-theme-primary/10 cursor-pointer"
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Service Icon with glow effect */}
          {service.icon && (
            <div className="relative flex-shrink-0">
              <img
                src={service.icon}
                alt={service.name}
                className="w-8 h-8 object-contain relative z-10 transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-theme-primary/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-theme-text mb-3 truncate group-hover:text-theme-primary transition-colors">
              {service.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {service.description && (
                <span className="px-2.5 py-1 bg-theme-hover/50 border border-theme rounded-lg text-xs font-medium text-theme-text-muted backdrop-blur-sm">
                  {service.description}
                </span>
              )}
              <span className="px-2.5 py-1 bg-theme-hover/50 border border-theme rounded-lg text-xs font-medium text-theme-text-muted backdrop-blur-sm">
                {t(`service.types.${service.type}`)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 ml-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {service.status === "online" && service.response_time > 1000 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 text-yellow-400 border border-yellow-500/30 shadow-md shadow-yellow-500/20">
                <AlertTriangle size={14} />
                <span className="text-xs font-semibold">
                  {t("service.stats.slow")}
                </span>
              </div>
            )}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bgColor} ${config.color} border ${config.borderColor} shadow-md ${config.shadowColor}`}
            >
              <StatusIcon size={14} />
              <span className="text-xs font-semibold capitalize">
                {t(`dashboard.${service.status}`)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.preventDefault()}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCheck(service.id);
              }}
              className="p-1.5 bg-theme-hover hover:bg-theme-primary/10 rounded-lg transition-all duration-200 border border-theme hover:border-theme-primary/50 shadow-sm hover:shadow-md group/btn"
              title={t("service.checkNow")}
            >
              <RefreshCw
                size={14}
                className="text-theme-text-muted group-hover/btn:text-theme-primary group-hover/btn:rotate-180 transition-all duration-300"
              />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(service);
              }}
              className="p-1.5 hover:bg-theme-hover rounded transition-colors border border-theme hover:border-theme-primary/50"
              title={t("service.edit")}
            >
              <Edit
                className="text-theme-text-muted group-hover/btn:text-theme-primary transition-colors"
                size={14}
              />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(service.id);
              }}
              className="p-1.5 hover:bg-theme-hover rounded transition-colors border border-theme hover:border-red-500/50"
              title={t("service.delete")}
            >
              <Trash2
                className="text-theme-text-muted group-hover/btn:text-red-400 transition-colors"
                size={14}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section - Enhanced Cards */}
      <div
        className={`grid gap-2 mb-4 ${
          serviceTraffic &&
          (serviceTraffic.bandwidth_up > 0 || serviceTraffic.bandwidth_down > 0)
            ? "grid-cols-4"
            : "grid-cols-2"
        }`}
      >
        {/* Response Time */}
        {service.response_time && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-gradient-to-br from-theme-hover to-theme-card border border-theme rounded-lg hover:border-theme-primary/30 transition-all shadow-sm">
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-theme-primary" />
              <span className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wide">
                {t("service.stats.response")}
              </span>
            </div>
            <span className="text-sm font-bold text-theme-primary">
              {Math.round(service.response_time)}ms
            </span>
          </div>
        )}

        {/* Last Check */}
        {service.last_check && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-gradient-to-br from-theme-hover to-theme-card border border-theme rounded-lg hover:border-theme-primary/30 transition-all shadow-sm">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-theme-text-muted" />
              <span className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wide">
                {t("service.stats.checked")}
              </span>
            </div>
            <span className="text-sm font-bold text-theme-text">
              {formatDistanceToNow(service.last_check)}
            </span>
          </div>
        )}

        {/* Traffic Upload */}
        {serviceTraffic && serviceTraffic.bandwidth_up > 0 && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg hover:border-blue-500/40 transition-all shadow-sm shadow-blue-500/10">
            <div className="flex items-center gap-1.5">
              <ArrowUp size={12} className="text-blue-400" />
              <span className="text-[10px] font-semibold text-blue-400/80 uppercase tracking-wide">
                {t("service.stats.upload")}
              </span>
            </div>
            <span className="text-sm font-bold text-blue-400">
              {formatBandwidth(serviceTraffic.bandwidth_up)}
            </span>
          </div>
        )}

        {/* Traffic Download */}
        {serviceTraffic && serviceTraffic.bandwidth_down > 0 && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg hover:border-green-500/40 transition-all shadow-sm shadow-green-500/10">
            <div className="flex items-center gap-1.5">
              <ArrowDown size={12} className="text-green-400" />
              <span className="text-[10px] font-semibold text-green-400/80 uppercase tracking-wide">
                {t("service.stats.download")}
              </span>
            </div>
            <span className="text-sm font-bold text-green-400">
              {formatBandwidth(serviceTraffic.bandwidth_down)}
            </span>
          </div>
        )}
      </div>
    </a>
  );
}
