import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Video,
  Download,
  Play,
  Pause,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Search,
  Server,
  Activity,
} from "lucide-react";
import { fetchPlexActivities } from "@/services/plexService";
import { Link } from "react-router-dom";

const ActivityBadge = ({ type }) => {
  const styles = {
    download: {
      icon: Download,
      className: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
      label: "Downloading...",
    },
    transcode: {
      icon: Play,
      className: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
      label: "Transcoding...",
    },
    stream: {
      icon: Play,
      className: "bg-green-500/20 text-green-400 border border-green-500/30",
      label: "Streaming...",
    },
    pause: {
      icon: Pause,
      className: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
      label: "Paused",
    },
  };

  const activityType = type ? type.toLowerCase() : "download";
  const style = styles[activityType] || styles.download;
  const Icon = style.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${style.className}`}
    >
      <Icon size={14} />
      <span className="text-xs font-medium">{style.label}</span>
    </div>
  );
};

const ProgressBar = ({ progress }) => {
  const percent = typeof progress === "number" ? Math.min(progress, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="h-2 bg-theme-hover rounded-full overflow-hidden">
        <div
          className="h-full bg-theme-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-end">
        <span className="text-xs font-medium text-theme-muted">
          {percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  if (!activity || typeof activity !== "object") {
    return null;
  }

  return (
    <div className="bg-theme-card border border-theme rounded-lg p-4 hover:border-theme-primary transition-all">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-theme-text font-medium truncate">
              {activity.subtitle || "Unknown"}
            </h3>
            <p className="text-theme-muted text-sm truncate">
              {activity.title || "Unknown"}
            </p>
          </div>
          <ActivityBadge type={activity.type} />
        </div>

        <ProgressBar progress={activity.progress} />
      </div>
    </div>
  );
};

const LoadingItem = () => (
  <div className="bg-theme-card border border-theme rounded-lg p-4">
    <div className="space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-theme-hover rounded w-2/3" />
          <div className="h-4 bg-theme-hover rounded w-1/2" />
        </div>
        <div className="h-6 w-24 bg-theme-hover rounded-full" />
      </div>
      <div className="h-2 bg-theme-hover rounded-full" />
    </div>
  </div>
);

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-theme bg-theme-card text-theme-muted hover:bg-theme-hover hover:text-theme-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
              currentPage === page
                ? "bg-theme-primary text-white"
                : "bg-theme-card text-theme-muted hover:bg-theme-primary hover:text-white border border-theme"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-theme bg-theme-card text-theme-muted hover:bg-theme-hover hover:text-theme-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default function VODStreams() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshInterval = useRef(null);
  const REFRESH_INTERVAL = 10000; // 10 seconds
  const [plexConfigured, setPlexConfigured] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchActivities = async () => {
    try {
      const processedActivities = await fetchPlexActivities();
      setActivities(processedActivities);
      setError(null);
      setPlexConfigured(true);
    } catch (error) {
      console.error("Error fetching activities:", error);

      // Check if error is due to Plex not being configured
      if (error.message && error.message.includes("Plex not configured")) {
        setPlexConfigured(false);
        setError(null);
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    await fetchActivities();
    setIsRefreshing(false);
    setLastRefreshTime(Date.now());
  };

  useEffect(() => {
    fetchActivities();
    setLastRefreshTime(Date.now());

    refreshInterval.current = setInterval(() => {
      handleRefresh();
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  const timeUntilNextRefresh = Math.max(
    0,
    REFRESH_INTERVAL - (Date.now() - lastRefreshTime)
  );
  const secondsUntilRefresh = Math.ceil(timeUntilNextRefresh / 1000);

  // Filter activities based on search query
  const filteredActivities = activities.filter((activity) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const title = (activity.title || "").toLowerCase();
    const subtitle = (activity.subtitle || "").toLowerCase();
    const type = (activity.type || "").toLowerCase();

    return (
      title.includes(query) || subtitle.includes(query) || type.includes(query)
    );
  });

  const totalItems = filteredActivities?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const currentItems = filteredActivities
    ? filteredActivities.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : [];

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Search Bar, Live Indicator & Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={20}
          />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme rounded-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-theme-text">LIVE</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={18}
              className={`text-theme-primary transition-transform duration-500 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span className="text-sm">{t("common.refresh")}</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Server className="text-theme-primary" size={24} />
            <div>
              <p className="text-sm text-theme-text-muted">Total</p>
              <p className="text-2xl font-bold text-theme-text">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Download className="text-green-500" size={24} />
            <div>
              <p className="text-sm text-theme-text-muted">Online</p>
              <p className="text-2xl font-bold text-green-500">
                {
                  filteredActivities.filter(
                    (a) => a.type === "download" || a.type === "media.download"
                  ).length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-yellow-500" size={24} />
            <div>
              <p className="text-sm text-theme-text-muted">Problem</p>
              <p className="text-2xl font-bold text-yellow-500">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <>
            <LoadingItem />
            <LoadingItem />
            <LoadingItem />
          </>
        ) : !plexConfigured ? (
          <div className="bg-theme-card border border-theme rounded-lg p-8 text-center">
            <Server size={48} className="mx-auto mb-4 text-theme-primary" />
            <h3 className="text-lg font-semibold text-theme-text mb-2">
              Plex Server Not Configured
            </h3>
            <p className="text-theme-muted mb-6">
              Configure your Plex server in Settings to start monitoring sync
              activities.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
            >
              <Server size={20} />
              Go to Settings
            </Link>
          </div>
        ) : error ? (
          <div className="bg-theme-card border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle size={24} className="text-red-400 mx-auto mb-3" />
            <p className="text-red-400">{t("vodStreams.loadError")}</p>
            <p className="text-theme-muted text-sm mt-2">{error}</p>
          </div>
        ) : !filteredActivities?.length ? (
          <div className="text-center py-12 bg-theme-card rounded-lg border border-theme">
            <Download size={48} className="mx-auto mb-4 text-theme-muted" />
            <h3 className="text-lg font-semibold text-theme-text mb-2">
              {searchQuery
                ? "No matching activities"
                : t("vodStreams.noActivities")}
            </h3>
            <p className="text-theme-muted mb-4">
              {searchQuery
                ? `No activities found matching "${searchQuery}"`
                : t("vodStreams.noActivitiesDescription")}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            {currentItems.map((activity) => (
              <ActivityItem
                key={activity.uuid || `activity-${Math.random()}`}
                activity={activity}
              />
            ))}

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}

            {totalPages > 1 && (
              <div className="text-center text-sm text-theme-muted">
                {t("vodStreams.showing", {
                  from: (currentPage - 1) * itemsPerPage + 1,
                  to: Math.min(currentPage * itemsPerPage, totalItems),
                  total: totalItems,
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
