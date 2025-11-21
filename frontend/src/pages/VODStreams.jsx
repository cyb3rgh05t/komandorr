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
import {
  fetchPlexActivities,
  getPlexStats,
  updatePeakConcurrent,
  resetPeakConcurrent,
} from "@/services/plexService";
import { Link } from "react-router-dom";

const ActivityBadge = ({ type }) => {
  const styles = {
    download: {
      icon: Download,
      className: "bg-green-500/20 text-green-400 border border-green-500/30",
      label: "Downloading...",
    },
    transcode: {
      icon: Play,
      className: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
      label: "Transcoding...",
    },
    stream: {
      icon: Play,
      className: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
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

const ProgressBar = ({ progress, activity, startTime, completedInfo }) => {
  const percent = typeof progress === "number" ? Math.min(progress, 100) : 0;
  const isCompleted = percent >= 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Activity size={12} />
          Progress
        </span>
        <div
          className={`px-2.5 py-1 bg-theme-hover border border-theme rounded-md text-xs font-medium flex items-center gap-1.5 ${
            isCompleted ? "text-green-400" : "text-theme-primary"
          }`}
        >
          {percent.toFixed(1)}%
        </div>
      </div>
      <div className="relative h-2.5 bg-theme-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isCompleted ? "bg-green-500" : "bg-theme-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const ActivityItem = ({ activity, startTime, completedInfo }) => {
  if (!activity || typeof activity !== "object") {
    return null;
  }

  return (
    <div className="bg-theme-card border border-theme rounded-lg p-6 hover:border-theme-primary/50 transition-all shadow-sm hover:shadow-md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-theme-text mb-2 truncate">
              {activity.subtitle || "Unknown"}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-theme-hover border border-theme rounded-md text-xs font-medium text-theme-text-muted flex items-center gap-1.5 truncate max-w-xs">
                <Video size={12} />
                {activity.title || "Unknown"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ActivityBadge type={activity.type} />
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          progress={activity.progress}
          activity={activity}
          startTime={startTime}
          completedInfo={completedInfo}
        />
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

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  totalItems,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme-card border border-theme rounded-xl p-5 shadow-sm">
      <div className="text-sm font-medium text-theme-text-muted">
        Showing{" "}
        <span className="text-theme-text font-semibold">{startIndex + 1}</span>{" "}
        to{" "}
        <span className="text-theme-text font-semibold">
          {Math.min(endIndex, totalItems)}
        </span>{" "}
        of <span className="text-theme-text font-semibold">{totalItems}</span>{" "}
        activities
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2.5 bg-theme-hover hover:bg-theme-primary border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
          title="Previous page"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-1.5">
          {[...Array(totalPages)].map((_, index) => {
            const page = index + 1;
            // Show first page, last page, current page, and pages around current
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                    currentPage === page
                      ? "bg-theme-primary text-white shadow-md scale-105"
                      : "bg-theme-hover hover:bg-theme-primary/20 border border-theme text-theme-text hover:text-theme-primary hover:border-theme-primary/50"
                  }`}
                >
                  {page}
                </button>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <span key={page} className="text-theme-text-muted px-2">
                  •••
                </span>
              );
            }
            return null;
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2.5 bg-theme-hover hover:bg-theme-primary border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
          title="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>
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
  const REFRESH_INTERVAL = 5000; // 5 seconds for real-time VOD stream monitoring
  const [plexConfigured, setPlexConfigured] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Track activity timestamps and completion times
  const [activityTimestamps, setActivityTimestamps] = useState(() => {
    const stored = localStorage.getItem("plexActivityTimestamps");
    return stored ? JSON.parse(stored) : {};
  });
  const [activityProgress, setActivityProgress] = useState(() => {
    const stored = localStorage.getItem("plexActivityProgress");
    return stored ? JSON.parse(stored) : {};
  });
  const [completedActivities, setCompletedActivities] = useState(() => {
    const stored = localStorage.getItem("plexCompletedActivities");
    return stored ? JSON.parse(stored) : {};
  });

  // Track peak concurrent activities - load from DB
  const [peakConcurrent, setPeakConcurrent] = useState(0);
  const [loadingPeak, setLoadingPeak] = useState(true);

  // Use a ref to track the latest peak value to avoid stale closures
  const peakConcurrentRef = useRef(peakConcurrent);

  // Update ref whenever state changes
  useEffect(() => {
    peakConcurrentRef.current = peakConcurrent;
  }, [peakConcurrent]);

  // Load peak concurrent from database on mount
  useEffect(() => {
    const loadPeakStats = async () => {
      try {
        const stats = await getPlexStats();
        setPeakConcurrent(stats.peak_concurrent);
        peakConcurrentRef.current = stats.peak_concurrent;
      } catch (error) {
        console.error("Error loading peak stats:", error);
      } finally {
        setLoadingPeak(false);
      }
    };

    loadPeakStats();
  }, []);

  // Save timestamps to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "plexActivityTimestamps",
      JSON.stringify(activityTimestamps)
    );
  }, [activityTimestamps]);

  useEffect(() => {
    localStorage.setItem(
      "plexActivityProgress",
      JSON.stringify(activityProgress)
    );
  }, [activityProgress]);

  useEffect(() => {
    localStorage.setItem(
      "plexCompletedActivities",
      JSON.stringify(completedActivities)
    );
  }, [completedActivities]);

  const fetchActivities = async () => {
    try {
      const processedActivities = await fetchPlexActivities();

      // Track timestamps for new activities
      const now = Date.now();
      const newTimestamps = { ...activityTimestamps };
      const newProgress = { ...activityProgress };
      const newCompleted = { ...completedActivities };
      const currentActivityIds = new Set();

      processedActivities.forEach((activity) => {
        currentActivityIds.add(activity.uuid);
        const currentProgress = activity.progress;
        const previousProgress = newProgress[activity.uuid];
        const existingTimestamp = newTimestamps[activity.uuid];

        // Determine start time
        if (existingTimestamp === undefined) {
          // This is the first time we see this activity
          if (currentProgress < 2) {
            // Activity just started, use current time
            newTimestamps[activity.uuid] = now;
          } else {
            // Activity already in progress
            // Set timestamp to null initially, will be set after 1% progress
            newTimestamps[activity.uuid] = null;
          }
        } else if (
          existingTimestamp === null &&
          previousProgress !== undefined &&
          currentProgress >= previousProgress + 1
        ) {
          // Progress has increased by at least 1%, now we can start tracking
          newTimestamps[activity.uuid] = now;
        } else if (typeof existingTimestamp === "number") {
          // Already tracking, keep the existing timestamp
          // No need to do anything, it's already in newTimestamps from the spread
        }

        // Track progress history (do this AFTER checking for changes)
        newProgress[activity.uuid] = currentProgress;

        // If activity is complete (100%), record completion time
        if (currentProgress >= 100 && !newCompleted[activity.uuid]) {
          const startTime = newTimestamps[activity.uuid];
          if (startTime) {
            const elapsedMs = now - startTime;
            newCompleted[activity.uuid] = {
              completedAt: now,
              elapsedMs: elapsedMs,
              title: activity.title,
              subtitle: activity.subtitle,
            };
          }
        }
      });

      // Clean up old timestamps for activities that are no longer present
      // Keep them for 1 hour in case they reappear
      const oneHourAgo = now - 60 * 60 * 1000;
      Object.keys(newTimestamps).forEach((uuid) => {
        if (!currentActivityIds.has(uuid)) {
          const timestamp = newTimestamps[uuid];
          if (timestamp && timestamp < oneHourAgo) {
            // Check if it was completed
            if (!newCompleted[uuid]) {
              // Activity disappeared without completing, might have been cancelled
              const elapsedMs = now - timestamp;
              newCompleted[uuid] = {
                completedAt: now,
                elapsedMs: elapsedMs,
                cancelled: true,
              };
            }
            delete newTimestamps[uuid];
            delete newProgress[uuid];
          }
        }
      });

      // Clean up old completed activities (older than 24 hours)
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      Object.keys(newCompleted).forEach((uuid) => {
        if (newCompleted[uuid].completedAt < oneDayAgo) {
          delete newCompleted[uuid];
        }
      });

      setActivityTimestamps(newTimestamps);
      setActivityProgress(newProgress);
      setCompletedActivities(newCompleted);
      setActivities(processedActivities);
      setError(null);
      setPlexConfigured(true);

      // Update peak concurrent activities - save to database
      const currentCount = processedActivities.length;
      const currentPeak = peakConcurrentRef.current;

      if (currentCount > currentPeak) {
        console.log(`Updating peak: ${currentPeak} -> ${currentCount}`);
        try {
          const result = await updatePeakConcurrent(currentCount);
          setPeakConcurrent(result.peak_concurrent);
          peakConcurrentRef.current = result.peak_concurrent;
        } catch (error) {
          console.error("Error updating peak concurrent:", error);
        }
      }
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

  // Pagination indexes
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = currentPage * itemsPerPage;

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
    ? filteredActivities.slice(startIndex, endIndex)
    : [];

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Search Bar, Live Indicator & Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-theme-card border border-theme rounded-lg flex-1 sm:flex-initial justify-center">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-theme-text">
              LIVE
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
          >
            <RefreshCw
              size={16}
              className={`text-theme-primary transition-transform duration-500 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span className="text-xs sm:text-sm">{t("common.refresh")}</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-theme-primary" />
                Total
              </p>
              <p className="text-2xl font-bold text-theme-text mt-1">
                {totalItems}
              </p>
            </div>
            <Server className="w-8 h-8 text-theme-primary" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Download className="w-3 h-3 text-green-500" />
                Downloading
              </p>
              <p className="text-2xl font-bold text-green-500 mt-1">
                {
                  activities.filter(
                    (a) => a.type === "download" || a.type === "media.download"
                  ).length
                }
              </p>
            </div>
            <Download className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Pause className="w-3 h-3 text-orange-500" />
                Paused
              </p>
              <p className="text-2xl font-bold text-orange-500 mt-1">
                {activities.filter((a) => a.state === "paused").length}
              </p>
            </div>
            <Pause className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Video className="w-3 h-3 text-cyan-500" />
                Transcoding
              </p>
              <p className="text-2xl font-bold text-cyan-500 mt-1">
                {
                  activities.filter(
                    (a) => a.transcodeSession && a.state === "playing"
                  ).length
                }
              </p>
            </div>
            <Video className="w-8 h-8 text-cyan-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Play className="w-3 h-3 text-blue-500" />
                Streaming
              </p>
              <p className="text-2xl font-bold text-blue-500 mt-1">
                {
                  activities.filter(
                    (a) => a.state === "playing" && !a.transcodeSession
                  ).length
                }
              </p>
            </div>
            <Play className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-purple-500" />
                Peak Concurrent
              </p>
              <p className="text-2xl font-bold text-purple-500 mt-1">
                {peakConcurrent}
              </p>
              <button
                onClick={async () => {
                  try {
                    const result = await resetPeakConcurrent();
                    setPeakConcurrent(result.peak_concurrent);
                    peakConcurrentRef.current = result.peak_concurrent;
                  } catch (error) {
                    console.error("Error resetting peak:", error);
                  }
                }}
                className="mt-2 text-xs text-theme-text-muted hover:text-purple-500 transition-colors flex items-center gap-1"
                title="Reset peak counter"
              >
                <RefreshCw size={10} />
                Reset Peak
              </button>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                startTime={activityTimestamps[activity.uuid]}
                completedInfo={completedActivities[activity.uuid]}
              />
            ))}
          </>
        )}
      </div>

      {/* Pagination - Full Width */}
      {!loading &&
        !error &&
        plexConfigured &&
        filteredActivities?.length > 0 &&
        totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
          />
        )}
    </div>
  );
}
