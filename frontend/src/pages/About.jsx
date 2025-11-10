import { useState, useEffect } from "react";
import {
  Info,
  ExternalLink,
  Github,
  Heart,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import ReleasesSection from "../components/ReleasesSection";

const API_URL = "/api";
const REPO_URL = "https://github.com/cyb3rgh05t/komandorr/releases/latest";

function About() {
  const { t } = useTranslation();
  const [version, setVersion] = useState({
    local: null,
    remote: null,
    is_update_available: false,
    loading: true,
  });
  const [timezone, setTimezone] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchVersion();
    fetchConfig();

    // Check for updates every 12 hours
    const versionCheckInterval = setInterval(fetchVersion, 12 * 60 * 60 * 1000);

    return () => {
      clearInterval(versionCheckInterval);
    };
  }, []);

  const fetchVersion = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/version`);
      const data = await response.json();

      setVersion({
        local: data.local,
        remote: data.remote,
        is_update_available: data.is_update_available || false,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching version:", error);
      setVersion({
        local: null,
        remote: null,
        is_update_available: false,
        loading: false,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/config`);
      const data = await response.json();
      setTimezone(data.timezone);
    } catch (error) {
      console.error("Error fetching config:", error);
      // Fallback to browser timezone
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  };

  const isOutOfDate = () => {
    if (version.is_update_available !== undefined) {
      return version.is_update_available;
    }
    if (!version.local || !version.remote) return false;
    return version.local !== version.remote;
  };

  const VersionDisplay = () => {
    if (version.loading) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-theme-text">{t("common.loading")}</span>
          <Loader2 className="w-4 h-4 text-theme-muted animate-spin" />
        </div>
      );
    }

    const outOfDate = isOutOfDate();

    return (
      <div className="flex items-center gap-2">
        <span className="text-theme-text font-medium">
          {version.local || t("about.unknown")}
        </span>
        {version.remote &&
          (outOfDate ? (
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-medium border border-orange-500/30 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t("about.outOfDate")}
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium border border-green-500/30 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {t("about.upToDate")}
            </span>
          ))}
      </div>
    );
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* About Komandorr Section */}
      <div className="bg-theme-card border border-theme rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h2 className="text-xl sm:text-2xl font-bold text-theme-text flex items-center gap-2">
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary" />
            {t("about.title")}
          </h2>
          <button
            onClick={fetchVersion}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm w-full sm:w-auto justify-center"
          >
            <RefreshCw
              className={`w-4 h-4 text-theme-primary ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span className="text-sm">{t("common.refresh")}</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Version */}
          <div className="flex justify-between items-center py-3 border-b border-theme">
            <span className="text-theme-muted font-medium">
              {t("about.version")}
            </span>
            <VersionDisplay />
          </div>

          {/* Latest Available (if out of date) */}
          {isOutOfDate() && version.remote && (
            <div className="flex justify-between items-center py-3 border-b border-theme">
              <span className="text-theme-muted font-medium">
                {t("about.latestAvailable")}
              </span>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 font-medium hover:underline"
              >
                <span>{version.remote}</span>
              </a>
            </div>
          )}

          {/* Time Zone */}
          <div className="flex justify-between items-center py-3">
            <span className="text-theme-muted font-medium">
              {t("about.timeZone")}
            </span>
            <span className="text-theme-text">
              {timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
        </div>
      </div>

      {/* Releases Section */}
      <ReleasesSection />

      {/* Getting Support Section*/}
      <div className="bg-theme-card border border-theme rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-theme-text flex items-center gap-2">
          <ExternalLink className="w-6 h-6 text-theme-primary" />
          {t("about.gettingSupport")}
        </h2>

        <div className="space-y-3">
          <a
            href="https://cyb3rgh05t.github.io/komandorr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-theme-hover hover:bg-theme-primary/20 border border-theme rounded-lg transition-all group"
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-theme-primary" />
              <span className="text-theme-text font-medium">
                {t("about.documentation") || "Documentation"}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-theme-muted group-hover:text-theme-primary transition-colors" />
          </a>

          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-theme-hover hover:bg-theme-primary/20 border border-theme rounded-lg transition-all group"
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-theme-primary" />
              <span className="text-theme-text font-medium">
                {t("about.apiDocumentation") || "API Documentation"}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-theme-muted group-hover:text-theme-primary transition-colors" />
          </a>

          <a
            href="https://github.com/cyb3rgh05t/komandorr/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-theme-hover hover:bg-theme-primary/20 border border-theme rounded-lg transition-all group"
          >
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5 text-theme-primary" />
              <span className="text-theme-text font-medium">
                {t("about.githubIssues")}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-theme-muted group-hover:text-theme-primary transition-colors" />
          </a>

          <a
            href="https://t.me/cyb3rgh05t_01"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-theme-hover hover:bg-theme-primary/20 border border-theme rounded-lg transition-all group"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-theme-primary"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              <span className="text-theme-text font-medium">
                {t("about.telegramSupport")}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-theme-muted group-hover:text-theme-primary transition-colors" />
          </a>
        </div>
      </div>

      {/* Support Komandorr Section*/}
      <div className="bg-theme-card border border-theme rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-theme-text flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-400" />
          {t("about.supportKomandorr")}
        </h2>

        <a
          href="https://ko-fi.com/streamnetclub"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 bg-theme-hover hover:bg-theme-primary/20 border border-theme-primary/30 rounded-lg transition-all group"
        >
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-theme-primary" />
            <div>
              <p className="text-theme-text font-medium">
                {t("about.helpPayForCoffee")}
              </p>
              <p className="text-theme-muted text-sm">
                {t("about.supportDevelopment")}
              </p>
            </div>
          </div>
          <div className="px-3 py-1 bg-theme-primary/20 text-theme-primary rounded-full text-xs font-medium">
            {t("about.preferred")}
          </div>
        </a>
      </div>

      {/* WebUI Developer Credit */}
      <div className="bg-theme-card border border-theme rounded-lg p-4">
        <p className="text-theme-muted text-sm text-center flex items-center justify-center gap-2">
          {t("about.webuiDevelopedWith")}
          <Heart className="w-4 h-4 text-red-400 inline" />
          {t("about.by")}
          <a
            href="https://github.com/cyb3rgh05t"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme-primary hover:underline font-medium"
          >
            cyb3rgh05t
          </a>
          {t("about.forTheCommunity")}
        </p>
      </div>
    </div>
  );
}

export default About;
