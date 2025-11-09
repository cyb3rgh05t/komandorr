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
} from "lucide-react";
import { formatDistanceToNow } from "@/utils/dateUtils";

const statusConfig = {
  online: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  offline: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  problem: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
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
    <div className="bg-theme-card border border-theme rounded-lg p-6 hover:border-theme-primary/50 transition-all duration-200 shadow-sm hover:shadow-md">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Service Icon (only if available) */}
          {service.icon && (
            <img
              src={`http://localhost:8000${service.icon}`}
              alt={service.name}
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={(e) => {
                // Hide icon if it fails to load
                e.target.style.display = "none";
              }}
            />
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-theme-text mb-2 truncate">
              {service.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {service.description && (
                <span className="px-2.5 py-1 bg-theme-hover border border-theme rounded-md text-xs font-medium text-theme-text-muted">
                  {service.description}
                </span>
              )}
              <span className="px-2.5 py-1 bg-theme-hover border border-theme rounded-md text-xs font-medium text-theme-text-muted">
                {t(`service.types.${service.type}`)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}
          >
            <StatusIcon size={14} />
            <span className="text-xs font-medium capitalize">
              {t(`dashboard.${service.status}`)}
            </span>
          </div>
        </div>
      </div>

      {/* URL Section */}
      <div className="mb-4">
        <a
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2 bg-theme-hover border border-theme rounded-md text-sm text-theme-primary hover:text-theme-primary-hover hover:border-theme-primary/50 transition-all truncate"
        >
          {service.url}
        </a>
      </div>

      {/* Stats Section - Horizontal Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Response Time */}
        {service.response_time && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-theme-hover border border-theme rounded-md flex-1 min-w-0">
            <span className="text-xs text-theme-text-muted whitespace-nowrap">
              Response Time:
            </span>
            <span className="text-sm font-medium text-theme-primary">
              {Math.round(service.response_time)}ms
            </span>
          </div>
        )}

        {/* Last Check */}
        {service.last_check && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-theme-hover border border-theme rounded-md flex-1 min-w-0">
            <span className="text-xs text-theme-text-muted whitespace-nowrap">
              Last Check:
            </span>
            <span className="text-sm font-medium text-theme-text">
              {formatDistanceToNow(service.last_check)}
            </span>
          </div>
        )}

        {/* Traffic Upload */}
        {serviceTraffic && serviceTraffic.bandwidth_up > 0 && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-theme-hover border border-theme rounded-md flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <ArrowUp size={12} className="text-blue-500 flex-shrink-0" />
              <span className="text-xs text-theme-text-muted whitespace-nowrap">
                Upload Speed
              </span>
            </div>
            <span className="text-sm font-medium text-blue-500">
              {formatBandwidth(serviceTraffic.bandwidth_up)}
            </span>
          </div>
        )}

        {/* Traffic Download */}
        {serviceTraffic && serviceTraffic.bandwidth_down > 0 && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-theme-hover border border-theme rounded-md flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <ArrowDown size={12} className="text-green-500 flex-shrink-0" />
              <span className="text-xs text-theme-text-muted whitespace-nowrap">
                Download Speed
              </span>
            </div>
            <span className="text-sm font-medium text-green-500">
              {formatBandwidth(serviceTraffic.bandwidth_down)}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-theme">
        <button
          onClick={() => onCheck(service.id)}
          className="flex-1 px-3 py-2 bg-theme-hover hover:bg-theme-primary/10 border border-theme hover:border-theme-primary/50 rounded-md transition-all text-sm font-medium text-theme-text hover:text-theme-primary flex items-center justify-center gap-2"
          title={t("service.checkNow")}
        >
          <RefreshCw size={14} />
          {t("service.checkNow")}
        </button>
        <button
          onClick={() => onEdit(service)}
          className="p-2 hover:bg-theme-hover rounded-md transition-colors border border-theme hover:border-theme-primary/50"
          title={t("service.edit")}
        >
          <Edit
            className="text-theme-text-muted hover:text-theme-primary"
            size={16}
          />
        </button>
        <button
          onClick={() => onDelete(service.id)}
          className="p-2 hover:bg-theme-hover rounded-md transition-colors border border-theme hover:border-red-500/50"
          title={t("service.delete")}
        >
          <Trash2
            className="text-theme-text-muted hover:text-red-500"
            size={16}
          />
        </button>
      </div>
    </div>
  );
}
