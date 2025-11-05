import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit,
  Trash2,
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

export default function ServiceCard({ service, onCheck, onEdit, onDelete }) {
  const { t } = useTranslation();
  const config = statusConfig[service.status] || statusConfig.offline;
  const StatusIcon = config.icon;

  return (
    <div
      className={`bg-theme-card border ${config.borderColor} rounded-lg p-5 hover:bg-theme-hover transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`${config.bgColor} p-2 rounded-lg`}>
            {service.icon ? (
              <img
                src={`http://localhost:8000${service.icon}`}
                alt={service.name}
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  // Fallback to status icon if image fails to load
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            ) : null}
            <StatusIcon
              className={`${config.color}`}
              size={24}
              style={{ display: service.icon ? "none" : "block" }}
            />
          </div>
          <div className="flex-1">
            {service.description && (
              <span className="inline-block px-2 py-0.5 mb-1.5 text-xs font-medium bg-theme-bg text-theme-text-muted border border-theme rounded">
                {service.description}
              </span>
            )}
            <h3 className="text-lg font-semibold text-theme-text">
              {service.name}
            </h3>
            <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium bg-theme-bg text-theme-text-muted border border-theme rounded">
              {t(`service.types.${service.type}`)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onCheck(service.id)}
            className="p-2 hover:bg-theme-bg-hover rounded-lg transition-colors"
            title={t("service.checkNow")}
          >
            <RefreshCw
              className="text-theme-text-muted hover:text-theme-primary"
              size={18}
            />
          </button>
          <button
            onClick={() => onEdit(service)}
            className="p-2 hover:bg-theme-bg-hover rounded-lg transition-colors"
            title={t("service.edit")}
          >
            <Edit
              className="text-theme-text-muted hover:text-theme-primary"
              size={18}
            />
          </button>
          <button
            onClick={() => onDelete(service.id)}
            className="p-2 hover:bg-theme-bg-hover rounded-lg transition-colors"
            title={t("service.delete")}
          >
            <Trash2
              className="text-theme-text-muted hover:text-red-500"
              size={18}
            />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-theme-bg border border-theme rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-text-muted">{t("service.url")}:</span>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-primary hover:text-theme-primary-hover truncate max-w-xs"
            >
              {service.url}
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t border-theme">
          <span className="text-theme-text-muted">{t("service.status")}:</span>
          <span className={`${config.color} font-medium capitalize`}>
            {t(`dashboard.${service.status}`)}
          </span>
        </div>

        {service.response_time && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-text-muted">
              {t("service.responseTime")}:
            </span>
            <span className="text-theme-text">
              {Math.round(service.response_time)}ms
            </span>
          </div>
        )}

        {service.last_check && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-text-muted">
              {t("service.lastCheck")}:
            </span>
            <span className="text-theme-text">
              {formatDistanceToNow(service.last_check)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
