import { useTranslation } from "react-i18next";
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

  const getIcon = (iconName) => {
    if (!iconName) return AppWindow;
    return iconMap[iconName.toLowerCase()] || AppWindow;
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Refresh Button */}
      <div className="flex items-center justify-between">
        <div />
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

      {/* Apps Grid */}
      {apps.length === 0 ? (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <AppWindow className="w-16 h-16 mx-auto text-theme-text-muted/50 mb-4" />
          <h3 className="text-lg font-semibold text-theme-text mb-2">
            No External Apps Configured
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            Add external apps in Settings to see them here. Each app will appear
            as a card with a link to its panel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {apps.map((app) => {
            const IconComponent = getIcon(app.icon);
            const isImageUrl =
              app.icon &&
              (app.icon.startsWith("http://") ||
                app.icon.startsWith("https://") ||
                app.icon.startsWith("/"));

            return (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-theme-card border border-theme rounded-xl p-5 flex flex-col items-center gap-3 hover:border-theme-primary hover:shadow-lg hover:shadow-theme-primary/10 transition-all duration-300 relative overflow-hidden"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-theme-primary/0 to-theme-primary/0 group-hover:from-theme-primary/5 group-hover:to-transparent transition-all duration-300" />

                {/* Icon */}
                <div className="relative w-14 h-14 rounded-xl bg-theme-hover border border-theme group-hover:border-theme-primary/50 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                  {isImageUrl ? (
                    <img
                      src={app.icon}
                      alt={app.name}
                      className="w-8 h-8 object-contain rounded"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : (
                    <IconComponent
                      size={28}
                      className="text-theme-primary transition-colors"
                    />
                  )}
                  {isImageUrl && (
                    <div
                      className="hidden items-center justify-center w-full h-full"
                      style={{ display: "none" }}
                    >
                      <AppWindow
                        size={28}
                        className="text-theme-primary transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Name */}
                <span className="relative text-sm font-semibold text-theme-text text-center group-hover:text-theme-primary transition-colors line-clamp-2">
                  {app.name}
                </span>

                {/* External link indicator */}
                <ExternalLink
                  size={12}
                  className="absolute top-2.5 right-2.5 text-theme-text-muted/40 group-hover:text-theme-primary transition-colors"
                />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
