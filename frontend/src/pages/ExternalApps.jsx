import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  ExternalLink,
  RefreshCw,
  AppWindow,
  Globe,
  Server,
  Shield,
  Database,
  Monitor,
  Cloud,
  Tv,
  Film,
  Music,
  Download,
  Upload,
  HardDrive,
  Wifi,
  Radio,
  Cog,
  Terminal,
  FileText,
  BarChart3,
  Image,
  Mail,
  MessageSquare,
  GitBranch,
  Box,
  Layers,
  Zap,
  BookOpen,
  Search,
  Plus,
} from "lucide-react";

// Map icon names to lucide components
const iconMap = {
  globe: Globe,
  server: Server,
  shield: Shield,
  database: Database,
  monitor: Monitor,
  cloud: Cloud,
  tv: Tv,
  film: Film,
  music: Music,
  download: Download,
  upload: Upload,
  harddrive: HardDrive,
  wifi: Wifi,
  radio: Radio,
  cog: Cog,
  terminal: Terminal,
  filetext: FileText,
  barchart: BarChart3,
  image: Image,
  mail: Mail,
  message: MessageSquare,
  git: GitBranch,
  box: Box,
  layers: Layers,
  zap: Zap,
  book: BookOpen,
  app: AppWindow,
  external: ExternalLink,
};

export default function ExternalApps() {
  const { t } = useTranslation();

  const {
    data: settingsData,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["settings-external-apps"],
    queryFn: () => api.get("/settings"),
    staleTime: 60000,
  });

  const apps = settingsData?.external_apps?.apps || [];
  const [searchQuery, setSearchQuery] = useState("");

  const filteredApps = apps.filter(
    (app) =>
      !searchQuery ||
      app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.url?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getIcon = (iconName) => {
    if (!iconName) return AppWindow;
    return iconMap[iconName.toLowerCase()] || AppWindow;
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Not Configured Banner */}
      {apps.length === 0 && !isFetching && (
        <Link
          to="/settings?tab=external_apps"
          className="block p-4 rounded-xl border shadow-lg bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg backdrop-blur-sm bg-yellow-500/10">
              <AppWindow className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-yellow-400">
                {t("externalApps.notConfigured")}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Header with Search & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-theme-primary/10 border border-theme-primary/20">
            <AppWindow className="w-5 h-5 text-theme-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-theme-text">
              {t("externalApps.title", "External Apps")}
            </h1>
            {apps.length > 0 && (
              <p className="text-xs text-theme-text-muted">
                {filteredApps.length} {t("externalApps.appsCount", "apps")}
                {searchQuery && ` — ${t("externalApps.filtered", "filtered")}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
            <input
              type="text"
              placeholder={t("externalApps.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme hover:border-theme-primary rounded-lg text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
            />
          </div>
          <Link
            to="/settings?tab=external_apps"
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <Plus size={16} className="text-theme-primary" />
            <span className="text-xs sm:text-sm">External App</span>
          </Link>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={16}
              className={`text-theme-primary transition-transform duration-500 ${
                isFetching ? "animate-spin" : ""
              }`}
            />
            <span className="text-xs sm:text-sm">
              {isFetching
                ? t("common.refreshing", "Refreshing")
                : t("common.refresh", "Refresh")}
            </span>
          </button>
        </div>
      </div>

      {/* Apps Grid */}
      {apps.length === 0 ? (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <AppWindow className="w-16 h-16 mx-auto text-theme-text-muted/50 mb-4" />
          <h3 className="text-lg font-semibold text-theme-text mb-2">
            {t("externalApps.noApps")}
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            {t("externalApps.noAppsDesc")}
          </p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <Search className="w-16 h-16 mx-auto text-theme-text-muted/50 mb-4" />
          <h3 className="text-lg font-semibold text-theme-text mb-2">
            {t("externalApps.noResults")}
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            {t("externalApps.noResultsDesc")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {filteredApps.map((app) => {
            const IconComponent = getIcon(app.icon);
            const isImageUrl =
              app.icon &&
              (app.icon.startsWith("http://") ||
                app.icon.startsWith("https://") ||
                app.icon.startsWith("/"));

            // Extract hostname from URL for display
            let displayUrl = "";
            try {
              const url = new URL(app.url);
              displayUrl = url.hostname + (url.port ? `:${url.port}` : "");
            } catch {
              displayUrl = app.url;
            }

            return (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-theme-card border border-theme rounded-xl p-5 flex flex-col items-center gap-4 hover:border-theme-primary/50 hover:shadow-xl hover:shadow-theme-primary/5 transition-all duration-300 relative overflow-hidden"
              >
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-theme-primary/0 via-transparent to-theme-primary/0 group-hover:from-theme-primary/5 group-hover:to-theme-primary/3 transition-all duration-500" />
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-theme-primary/0 group-hover:bg-theme-primary/5 rounded-full blur-2xl transition-all duration-500" />

                {/* Icon */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-theme-hover to-theme-card border border-theme group-hover:border-theme-primary/40 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-theme-primary/10">
                  {isImageUrl ? (
                    <img
                      src={app.icon}
                      alt={app.name}
                      className="w-9 h-9 object-contain rounded-lg"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : (
                    <IconComponent
                      size={30}
                      className="text-theme-primary transition-colors"
                    />
                  )}
                  {isImageUrl && (
                    <div
                      className="hidden items-center justify-center w-full h-full"
                      style={{ display: "none" }}
                    >
                      <AppWindow
                        size={30}
                        className="text-theme-primary transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Name & URL */}
                <div className="relative text-center space-y-1 w-full">
                  <h3 className="text-sm font-bold text-theme-text group-hover:text-theme-primary transition-colors line-clamp-1">
                    {app.name}
                  </h3>
                  <p className="text-[11px] text-theme-text-muted truncate px-1">
                    {displayUrl}
                  </p>
                </div>

                {/* Open link badge */}
                <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-hover/50 border border-theme group-hover:border-theme-primary/30 group-hover:bg-theme-primary/10 transition-all duration-300">
                  <ExternalLink
                    size={12}
                    className="text-theme-text-muted group-hover:text-theme-primary transition-colors"
                  />
                  <span className="text-[10px] font-medium text-theme-text-muted group-hover:text-theme-primary transition-colors uppercase tracking-wider">
                    {t("externalApps.open", "Open")}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
