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
    color: "text-green-400",
    bg: "bg-gradient-to-br from-green-500/20 to-green-500/10",
    text: "text-green-400",
    shadowColor: "rgba(34, 197, 94, 0.2)",
  },
  offline: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-gradient-to-br from-red-500/20 to-red-500/10",
    text: "text-red-400",
    shadowColor: "rgba(239, 68, 68, 0.2)",
  },
  problem: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-gradient-to-br from-yellow-500/20 to-yellow-500/10",
    text: "text-yellow-400",
    shadowColor: "rgba(234, 179, 8, 0.2)",
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
    <div className="group bg-theme-card  border border-theme rounded-xl p-4 hover:border-theme-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-theme-primary/10">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Service Icon with glow effect */}
          {service.icon && (
            <div className="relative flex-shrink-0">
              <img
                src={`http://localhost:8000${service.icon}`}
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
            <h3 className="text-base font-bold text-theme-text mb-2 truncate group-hover:text-theme-primary transition-colors">
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

        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {service.status === "online" && service.response_time > 1000 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 text-yellow-400 border border-yellow-500/30 shadow-md shadow-yellow-500/20">
              <AlertTriangle size={14} />
              <span className="text-xs font-semibold">Slow</span>
            </div>
          )}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
              config.bg
            } ${config.text} border border-${
              service.status === "online"
                ? "green"
                : service.status === "offline"
                ? "red"
                : "yellow"
            }-500/30 shadow-md`}
            style={{
              boxShadow: `0 4px 12px ${config.shadowColor}`,
            }}
          >
            <StatusIcon size={14} />
            <span className="text-xs font-semibold capitalize">
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
          className="block px-3 py-2 bg-gradient-to-r from-theme-hover to-theme-card border border-theme rounded-lg text-xs text-theme-primary hover:text-theme-primary-hover hover:border-theme-primary/50 hover:shadow-md transition-all truncate font-medium"
        >
          {service.url}
        </a>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Response Time */}
        {service.response_time && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-gradient-to-br from-theme-hover to-theme-card border border-theme rounded-lg hover:border-theme-primary/30 transition-all shadow-sm">
            <span className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wide">
              {t("service.responseTime")}
            </span>
            <span className="text-sm font-bold text-theme-primary">
              {Math.round(service.response_time)}ms
            </span>
          </div>
        )}

        {/* Last Check */}
        {service.last_check && (
          <div className="flex flex-col gap-1 px-3 py-2 bg-gradient-to-br from-theme-hover to-theme-card border border-theme rounded-lg hover:border-theme-primary/30 transition-all shadow-sm">
            <span className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wide">
              {t("service.lastCheck")}
            </span>
            <span className="text-sm font-bold text-theme-text">
              {formatDistanceToNow(service.last_check)}
            </span>
          </div>
        )}

        {/* Service ID */}
        <div className="col-span-2 flex items-center justify-between px-3 py-2 bg-gradient-to-br from-theme-hover to-theme-card border border-theme rounded-lg">
          <span className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wide">
            Service ID
          </span>
          <div className="flex items-center gap-1.5">
            <code className="text-xs text-theme-text-muted font-mono bg-theme-hover px-2 py-0.5 rounded border border-theme">
              {service.id}...
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
      <div className="flex items-center gap-1.5 pt-3 border-t border-theme/50">
        <button
          onClick={() => onCheck(service.id)}
          className="flex-1 px-2 py-1.5 bg-theme-hover hover:from-theme-primary/30 hover:to-theme-primary/20 border border-theme hover:border-theme-primary/50 rounded-lg transition-all duration-200 text-[10px] font-semibold text-theme-primary hover:text-theme-primary-hover flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md group"
          title={t("service.checkNow")}
        >
          <RefreshCw
            size={12}
            className="group-hover:rotate-180 transition-transform duration-300"
          />
          {t("service.checkNow")}
        </button>
        <button
          onClick={() => onEdit(service)}
          className="p-1.5 bg-theme-hover hover:bg-theme-primary/10 rounded-lg transition-all duration-200 border border-theme hover:border-theme-primary/50 shadow-sm hover:shadow-md hover:shadow-theme-primary/10 group"
          title={t("service.edit")}
        >
          <Edit
            className="text-theme-text-muted group-hover:text-theme-primary transition-colors"
            size={14}
          />
        </button>
        <button
          onClick={() => onDelete(service.id)}
          className="p-1.5 bg-theme-hover hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-theme hover:border-red-500/50 shadow-sm hover:shadow-md hover:shadow-red-500/20 group"
          title={t("service.delete")}
        >
          <Trash2
            className="text-theme-text-muted group-hover:text-red-400 transition-colors"
            size={14}
          />
        </button>
      </div>
    </div>
  );
}
