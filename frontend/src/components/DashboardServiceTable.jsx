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
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "@/utils/dateUtils";

const typeConfig = {
  app: {
    icon: Layout,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  website: {
    icon: Globe,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
  },
  panel: {
    icon: Layout,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  project: {
    icon: Layers,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
  },
  server: {
    icon: Server,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  http: {
    icon: Globe,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  https: {
    icon: Globe,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  tcp: {
    icon: Terminal,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  ping: {
    icon: Radio,
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/20",
  },
  dns: {
    icon: Search,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
  },
  api: {
    icon: Code,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
  },
  websocket: {
    icon: Wifi,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
  database: {
    icon: Database,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
  },
  custom: {
    icon: Settings,
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20",
  },
};

const defaultTypeConfig = {
  icon: Layers,
  color: "text-gray-400",
  bgColor: "bg-gray-500/10",
  borderColor: "border-gray-500/20",
};

const statusConfig = {
  online: {
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-emerald-500/5",
    borderColor: "border-emerald-500/10",
    dotColor: "bg-green-400",
  },
  offline: {
    icon: XCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/5",
    borderColor: "border-red-500/10",
    dotColor: "bg-red-400",
  },
  problem: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/5",
    borderColor: "border-yellow-500/10",
    dotColor: "bg-yellow-400",
  },
};

const formatBandwidth = (mbps) => {
  if (!mbps || mbps === 0) return null;
  if (mbps < 1) {
    return `${(mbps * 1024).toFixed(1)} KB/s`;
  }
  return `${mbps.toFixed(1)} MB/s`;
};

function ServiceCard({ service, trafficData, onCheck, onEdit, onDelete }) {
  const { t } = useTranslation();
  const config = statusConfig[service.status] || statusConfig.offline;
  const tc = typeConfig[service.type] || defaultTypeConfig;
  const TypeIcon = tc.icon;
  const serviceTraffic = trafficData?.services?.find(
    (s) => s.id === service.id,
  );
  const uploadBw = formatBandwidth(serviceTraffic?.bandwidth_up);
  const downloadBw = formatBandwidth(serviceTraffic?.bandwidth_down);

  return (
    <div
      onClick={() => window.open(service.url, "_blank", "noopener,noreferrer")}
      className="bg-theme-card border border-theme rounded-lg p-3 hover:border-theme-primary transition-colors cursor-pointer group"
    >
      {/* Header: Icon + Name + Status */}
      <div className="flex items-center gap-3 mb-2.5">
        {service.icon ? (
          <div className="w-9 h-9 rounded-lg bg-theme-hover flex items-center justify-center flex-shrink-0">
            <img
              src={service.icon}
              alt={service.name}
              className="w-5 h-5 object-contain transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                e.target.style.display = "none";
                if (e.target.nextSibling)
                  e.target.nextSibling.classList.remove("hidden");
              }}
            />
            <TypeIcon className={`w-4 h-4 ${tc.color} hidden`} />
          </div>
        ) : (
          <div
            className={`w-9 h-9 rounded-lg ${tc.bgColor} flex items-center justify-center flex-shrink-0`}
          >
            <TypeIcon className={`w-4 h-4 ${tc.color}`} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-theme-text font-semibold truncate group-hover:text-theme-primary transition-colors">
              {service.name}
            </p>
            {service.description && (
              <span className="text-[10px] text-theme-text-muted bg-theme-hover px-1.5 py-0.5 rounded-full truncate max-w-[150px] hidden sm:inline">
                {service.description}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${tc.bgColor} ${tc.color} border ${tc.borderColor}`}
            >
              <TypeIcon size={9} />
              {t(`service.types.${service.type}`)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgColor} border ${config.borderColor}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${config.dotColor} ${service.status === "online" ? "animate-pulse" : ""}`}
            />
            <span
              className={`text-[10px] font-semibold capitalize ${config.color}`}
            >
              {t(`dashboard.${service.status}`)}
            </span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-primary transition-colors" />
        </div>
      </div>

      {/* Info mini-cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2.5">
        {service.response_time != null && (
          <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5">
            <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-400 leading-tight">
                {Math.round(service.response_time)}ms
              </p>
              <p className="text-[9px] text-amber-400/60 uppercase tracking-wider">
                Response
              </p>
            </div>
          </div>
        )}
        {service.status === "online" && service.response_time > 1000 && (
          <div className="flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/10 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-yellow-400 leading-tight">
                {t("service.stats.slow")}
              </p>
              <p className="text-[9px] text-yellow-400/60 uppercase tracking-wider">
                Warning
              </p>
            </div>
          </div>
        )}
        {service.last_check && (
          <div className="flex items-center gap-2 bg-gray-500/5 border border-gray-500/10 rounded-lg px-2.5 py-1.5">
            <Clock className="w-3 h-3 text-theme-text-muted flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-theme-text leading-tight truncate">
                {formatDistanceToNow(service.last_check)}
              </p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">
                Last Check
              </p>
            </div>
          </div>
        )}
        {uploadBw && (
          <div className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/10 rounded-lg px-2.5 py-1.5">
            <ArrowUp className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-400 leading-tight font-mono">
                {uploadBw}
              </p>
              <p className="text-[9px] text-blue-400/60 uppercase tracking-wider">
                Upload
              </p>
            </div>
          </div>
        )}
        {downloadBw && (
          <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/10 rounded-lg px-2.5 py-1.5">
            <ArrowDown className="w-3 h-3 text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-green-400 leading-tight font-mono">
                {downloadBw}
              </p>
              <p className="text-[9px] text-green-400/60 uppercase tracking-wider">
                Download
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-theme">
        <div
          className="flex items-center gap-1.5 ml-auto"
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
            className="p-1.5 bg-theme-hover hover:bg-theme-hover border border-theme hover:border-theme-primary text-theme-primary rounded transition-all"
            title={t("service.checkNow")}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(service);
            }}
            className="p-1.5 bg-theme-hover hover:bg-theme-hover border border-theme hover:border-theme-primary text-theme-primary rounded transition-all"
            title={t("service.edit")}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(service);
            }}
            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-all"
            title={t("service.delete")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardServiceTable({
  services,
  trafficData,
  onCheck,
  onEdit,
  onDelete,
}) {
  return (
    <div className="space-y-3">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          trafficData={trafficData}
          onCheck={onCheck}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
