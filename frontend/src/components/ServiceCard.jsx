import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "@/utils/dateUtils";
import { useState } from "react";

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
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(service.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-theme-card border border-theme rounded-lg p-4 hover:border-theme-primary/50 transition-all duration-200 shadow-sm hover:shadow-md">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Service Icon (only if available) */}
          {service.icon && (
            <img
              src={`http://localhost:8000${service.icon}`}
              alt={service.name}
              className="w-6 h-6 object-contain flex-shrink-0"
              onError={(e) => {
                // Hide icon if it fails to load
                e.target.style.display = "none";
              }}
            />
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-theme-text mb-1.5 truncate">
              {service.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {service.description && (
                <span className="px-2 py-0.5 bg-theme-hover border border-theme rounded text-xs font-medium text-theme-text-muted">
                  {service.description}
                </span>
              )}
              <span className="px-2 py-0.5 bg-theme-hover border border-theme rounded text-xs font-medium text-theme-text-muted">
                {t(`service.types.${service.type}`)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {service.status === "online" && service.response_time > 1000 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
              <AlertTriangle size={12} />
              <span className="text-xs font-medium">Slow</span>
            </div>
          )}
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}
          >
            <StatusIcon size={12} />
            <span className="text-xs font-medium capitalize">
              {t(`dashboard.${service.status}`)}
            </span>
          </div>
        </div>
      </div>

      {/* URL Section */}
      <div className="mb-3">
        <a
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-2.5 py-1.5 bg-theme-hover border border-theme rounded text-xs text-theme-primary hover:text-theme-primary-hover hover:border-theme-primary/50 transition-all truncate"
        >
          {service.url}
        </a>
      </div>

      {/* Stats Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-theme-text-muted">
            {t("service.responseTime")}:
          </span>
          {service.response_time ? (
            <span className="px-2 py-0.5 bg-theme-hover border border-theme rounded text-xs font-medium text-theme-primary">
              {Math.round(service.response_time)}ms
            </span>
          ) : (
            <span className="text-theme-text-muted">-</span>
          )}
        </div>

        {service.last_check && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-theme-text-muted">
              {t("service.lastCheck")}:
            </span>
            <span className="px-2 py-0.5 bg-theme-hover border border-theme rounded text-xs font-medium text-theme-text">
              {formatDistanceToNow(service.last_check)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs pt-2 border-t border-theme">
          <span className="text-theme-text-muted text-xs">Service ID:</span>
          <div className="flex items-center gap-1.5">
            <code className="text-xs text-theme-text-muted font-mono bg-theme-hover px-1.5 py-0.5 rounded border border-theme">
              {service.id.slice(0, 8)}...
            </code>
            <button
              onClick={handleCopyId}
              className="p-1 hover:bg-theme-hover rounded transition-colors border border-transparent hover:border-theme"
              title="Copy Service ID"
            >
              {copied ? (
                <Check className="text-green-500" size={12} />
              ) : (
                <Copy
                  className="text-theme-text-muted hover:text-theme-primary"
                  size={12}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-theme">
        <button
          onClick={() => onCheck(service.id)}
          className="flex-1 px-2.5 py-1.5 bg-theme-hover hover:bg-theme-primary/10 border border-theme hover:border-theme-primary/50 rounded transition-all text-xs font-medium text-theme-text hover:text-theme-primary flex items-center justify-center gap-1.5"
          title={t("service.checkNow")}
        >
          <RefreshCw size={12} />
          {t("service.checkNow")}
        </button>
        <button
          onClick={() => onEdit(service)}
          className="p-1.5 hover:bg-theme-hover rounded transition-colors border border-theme hover:border-theme-primary/50"
          title={t("service.edit")}
        >
          <Edit
            className="text-theme-text-muted hover:text-theme-primary"
            size={14}
          />
        </button>
        <button
          onClick={() => onDelete(service.id)}
          className="p-1.5 hover:bg-theme-hover rounded transition-colors border border-theme hover:border-red-500/50"
          title={t("service.delete")}
        >
          <Trash2
            className="text-theme-text-muted hover:text-red-500"
            size={14}
          />
        </button>
      </div>
    </div>
  );
}
