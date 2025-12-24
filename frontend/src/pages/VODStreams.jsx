import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../context/ToastContext";
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

const ActivityBadge = ({ type, t }) => {
  const styles = {
    download: {
      icon: Download,
      className: "bg-green-500/20 text-green-400 border border-green-500/30",
      label: t("vodStreams.badges.downloading"),
    },
    transcode: {
      icon: Play,
      className: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
      label: t("vodStreams.badges.transcoding"),
    },
    stream: {
      icon: Play,
      className: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
      label: t("vodStreams.badges.streaming"),
    },
    pause: {
      icon: Pause,
      className: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
      label: t("vodStreams.badges.paused"),
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

const ProgressBar = ({ progress, activity, startTime, completedInfo, t }) => {
  const percent = typeof progress === "number" ? Math.min(progress, 100) : 0;
  const isCompleted = percent >= 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Activity size={12} />
          {t("vodStreams.progress")}
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

const ActivityItem = ({ activity, startTime, completedInfo, t }) => {
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
            <ActivityBadge type={activity.type} t={t} />
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          progress={activity.progress}
          activity={activity}
          startTime={startTime}
          completedInfo={completedInfo}
          t={t}
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
  itemsPerPage,
  onItemsPerPageChange,
  t,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme border border-theme rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-theme-text-muted">
          {t("vodStreams.pagination.showing")}{" "}
          <span className="text-theme-text font-semibold">
            {startIndex + 1}
          </span>{" "}
          {t("vodStreams.pagination.to")}{" "}
          <span className="text-theme-text font-semibold">
            {Math.min(endIndex, totalItems)}
          </span>{" "}
          {t("vodStreams.pagination.of")}{" "}
          <span className="text-theme-text font-semibold">{totalItems}</span>{" "}
          {t("vodStreams.pagination.activities")}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-theme-text-muted">
            {t("vodStreams.pagination.itemsPerPage", "Items per page:")}
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-3 py-1.5 bg-theme-card border border-theme rounded-lg text-sm text-theme-text hover:border-theme-primary focus:outline-none focus:border-theme-primary transition-colors"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2.5 bg-theme hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
          title={t("vodStreams.pagination.previous")}
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
                      ? "bg-theme border border-theme-primary text-white shadow-md scale-105"
                      : "bg-theme-hover hover:bg-theme border border-theme text-theme-text hover:text-theme-primary hover:border-theme-primary"
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
          className="p-2.5 bg-theme-hover hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
          title={t("vodStreams.pagination.next")}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default function VODStreams() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Use React Query for Plex activities
  const {
    data: activities = [],
    isLoading: loading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["plexActivities"],
    queryFn: fetchPlexActivities,
    staleTime: 5000,
    refetchInterval: 5000,
    placeholderData: (previousData) => previousData,
  });

  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshInterval = useRef(null);
  const REFRESH_INTERVAL = 5000; // 5 seconds for real-time VOD stream monitoring
  const [plexConfigured, setPlexConfigured] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Process activities for timestamps and progress tracking
  useEffect(() => {
    if (!activities || activities.length === 0) return;

    const now = Date.now();
    const newTimestamps = { ...activityTimestamps };
    const newProgress = { ...activityProgress };
    const newCompleted = { ...completedActivities };
    const currentActivityIds = new Set();

    activities.forEach((activity) => {
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
              title: "Unknown",
              subtitle: "Activity cancelled or incomplete",
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

    // Update peak concurrent activities - save to database
    const currentCount = activities.length;
    const currentPeak = peakConcurrentRef.current;

    if (currentCount > currentPeak) {
      console.log(`Updating peak: ${currentPeak} -> ${currentCount}`);
      updatePeakConcurrent(currentCount)
        .then((result) => {
          setPeakConcurrent(result.peak_concurrent);
          peakConcurrentRef.current = result.peak_concurrent;
        })
        .catch((error) => {
          console.error("Error updating peak concurrent:", error);
        });
    }
  }, [activities]);

  const handleRefresh = async (isManual = false) => {
    if (isFetching) return;

    await queryClient.refetchQueries(["plexActivities"]);
    setLastRefreshTime(Date.now());
    if (isManual) {
      toast.success("Refreshed successfully!");
    }
  };

  const timeUntilNextRefresh = Math.max(
    0,
    REFRESH_INTERVAL - (Date.now() - lastRefreshTime)
  );
  const secondsUntilRefresh = Math.ceil(timeUntilNextRefresh / 1000);

  // Filter activities based on search query and active filter
  const filteredActivities = activities.filter((activity) => {
    // Apply type filter
    if (
      activeFilter === "downloading" &&
      !(activity.type === "download" || activity.type === "media.download")
    )
      return false;
    if (activeFilter === "paused" && activity.state !== "paused") return false;
    if (
      activeFilter === "transcoding" &&
      !(activity.transcodeSession && activity.state === "playing")
    )
      return false;
    if (
      activeFilter === "streaming" &&
      !(activity.state === "playing" && !activity.transcodeSession)
    )
      return false;

    // Apply search query
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

  // Reset to page 1 when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, itemsPerPage]);

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
            placeholder={t("vodStreams.searchPlaceholder")}
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
              {t("vodStreams.live")}
            </span>
          </div>
          <button
            onClick={() => handleRefresh(true)}
            disabled={isFetching}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
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
                : t("common.refresh")}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div
          onClick={() => setActiveFilter("all")}
          className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-theme-primary hover:bg-theme-primary/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-theme-primary" />
                {t("vodStreams.stats.total")}
              </p>
              <p className="text-2xl font-bold text-theme-text mt-1">
                {activities.length}
              </p>
            </div>
            <Server className="w-8 h-8 text-theme-primary" />
          </div>
        </div>

        <div
          onClick={() => setActiveFilter("downloading")}
          className={`bg-theme-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-green-500/10 ${
            activeFilter === "downloading"
              ? "border-green-500 ring-2 ring-green-500/20"
              : "border-theme hover:border-green-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Download className="w-3 h-3 text-green-500" />
                {t("vodStreams.stats.downloading")}
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

        <div
          onClick={() => setActiveFilter("paused")}
          className={`bg-theme-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-orange-500/10 ${
            activeFilter === "paused"
              ? "border-orange-500 ring-2 ring-orange-500/20"
              : "border-theme hover:border-orange-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Pause className="w-3 h-3 text-orange-500" />
                {t("vodStreams.stats.paused")}
              </p>
              <p className="text-2xl font-bold text-orange-500 mt-1">
                {activities.filter((a) => a.state === "paused").length}
              </p>
            </div>
            <Pause className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div
          onClick={() => setActiveFilter("transcoding")}
          className={`bg-theme-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-cyan-500/10 ${
            activeFilter === "transcoding"
              ? "border-cyan-500 ring-2 ring-cyan-500/20"
              : "border-theme hover:border-cyan-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Video className="w-3 h-3 text-cyan-500" />
                {t("vodStreams.stats.transcoding")}
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

        <div
          onClick={() => setActiveFilter("streaming")}
          className={`bg-theme-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-blue-500/10 ${
            activeFilter === "streaming"
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-theme hover:border-blue-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Play className="w-3 h-3 text-blue-500" />
                {t("vodStreams.stats.streaming")}
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
                {t("vodStreams.stats.peakConcurrent")}
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
                title={t("vodStreams.stats.resetPeak")}
              >
                <RefreshCw size={10} />
                {t("vodStreams.stats.resetPeak")}
              </button>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === "all"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("vodStreams.filter.all")}
            <span
              className={`ml-2 text-xs ${
                activeFilter === "all"
                  ? "text-white/80"
                  : "text-theme-text-muted"
              }`}
            >
              ({activities.length})
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("downloading")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === "downloading"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("vodStreams.filter.downloading")}
            <span
              className={`ml-2 text-xs ${
                activeFilter === "downloading"
                  ? "text-white/80"
                  : "text-theme-text-muted"
              }`}
            >
              (
              {
                activities.filter(
                  (a) => a.type === "download" || a.type === "media.download"
                ).length
              }
              )
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("paused")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === "paused"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("vodStreams.filter.paused")}
            <span
              className={`ml-2 text-xs ${
                activeFilter === "paused"
                  ? "text-white/80"
                  : "text-theme-text-muted"
              }`}
            >
              ({activities.filter((a) => a.state === "paused").length})
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("transcoding")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === "transcoding"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("vodStreams.filter.transcoding")}
            <span
              className={`ml-2 text-xs ${
                activeFilter === "transcoding"
                  ? "text-white/80"
                  : "text-theme-text-muted"
              }`}
            >
              (
              {
                activities.filter(
                  (a) => a.transcodeSession && a.state === "playing"
                ).length
              }
              )
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("streaming")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === "streaming"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("vodStreams.filter.streaming")}
            <span
              className={`ml-2 text-xs ${
                activeFilter === "streaming"
                  ? "text-white/80"
                  : "text-theme-text-muted"
              }`}
            >
              (
              {
                activities.filter(
                  (a) => a.state === "playing" && !a.transcodeSession
                ).length
              }
              )
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-theme-card border border-theme rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-theme-hover border-b border-theme">
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("vodStreams.table.title", "Title")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("vodStreams.table.user", "User")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("vodStreams.table.status", "Status")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("vodStreams.table.progress", "Progress")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center">
                    <LoadingItem />
                  </td>
                </tr>
              ) : !plexConfigured ? (
                <tr>
                  <td colSpan="4" className="py-12">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Server size={32} className="text-theme-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-theme-text mb-2">
                        {t("vodStreams.plexNotConfigured.title")}
                      </h3>
                      <p className="text-theme-muted mb-6">
                        {t("vodStreams.plexNotConfigured.description")}
                      </p>
                      <Link
                        to="/settings"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
                      >
                        <Server size={20} />
                        {t("vodStreams.plexNotConfigured.goToSettings")}
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" className="py-12">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} className="text-red-400" />
                      </div>
                      <h3 className="text-xl font-bold text-red-400 mb-2">
                        {t("vodStreams.loadError")}
                      </h3>
                      <p className="text-theme-muted">{error}</p>
                    </div>
                  </td>
                </tr>
              ) : !filteredActivities?.length ? (
                <tr>
                  <td colSpan="4" className="py-12">
                    <div className="text-center">
                      {searchQuery ? (
                        <>
                          <div className="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-theme-primary" />
                          </div>
                          <h3 className="text-xl font-bold text-theme-text mb-2">
                            {t("vodStreams.noMatching")}
                          </h3>
                          <p className="text-theme-muted mb-6">
                            {`${t(
                              "vodStreams.noMatchingDescription"
                            )} "${searchQuery}"`}
                          </p>
                          <button
                            onClick={() => setSearchQuery("")}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
                          >
                            {t("vodStreams.clearSearch")}
                          </button>
                        </>
                      ) : activeFilter === "all" ? (
                        <>
                          <div className="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Server size={32} className="text-theme-primary" />
                          </div>
                          <h3 className="text-xl font-bold text-theme-text mb-2">
                            {t("vodStreams.noActivities")}
                          </h3>
                          <p className="text-theme-muted">
                            {t("vodStreams.noActivitiesDescription")}
                          </p>
                        </>
                      ) : activeFilter === "downloading" ? (
                        <>
                          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Download size={32} className="text-green-500" />
                          </div>
                          <h3 className="text-xl font-bold text-theme-text mb-2">
                            No Downloading Streams
                          </h3>
                          <p className="text-theme-muted">
                            There are no active downloads at the moment
                          </p>
                        </>
                      ) : activeFilter === "paused" ? (
                        <>
                          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Pause size={32} className="text-orange-500" />
                          </div>
                          <h3 className="text-xl font-bold text-theme-text mb-2">
                            No Paused Streams
                          </h3>
                          <p className="text-theme-muted">
                            There are no paused streams at the moment
                          </p>
                        </>
                      ) : activeFilter === "transcoding" ? (
                        <>
                          <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Video size={32} className="text-cyan-500" />
                          </div>
                          <h3 className="text-xl font-bold text-theme-text mb-2">
                            No Transcoding Streams
                          </h3>
                          <p className="text-theme-muted">
                            There are no active transcoding sessions at the
                            moment
                          </p>
                        </>
                      ) : activeFilter === "streaming" ? (
                        <>
                          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Play size={32} className="text-blue-500" />
                          </div>
                          <h3 className="text-xl font-bold text-theme-text mb-2">
                            No Streaming Sessions
                          </h3>
                          <p className="text-theme-muted">
                            There are no active streaming sessions at the moment
                          </p>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {currentItems.map((activity) => {
                    const percent =
                      typeof activity.progress === "number"
                        ? Math.min(activity.progress, 100)
                        : 0;
                    const isCompleted = percent >= 100;

                    return (
                      <tr
                        key={activity.uuid || `activity-${Math.random()}`}
                        className="border-b border-theme hover:bg-theme-hover/30 transition-colors"
                      >
                        {/* Title Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Video
                              size={14}
                              className="text-theme-primary flex-shrink-0"
                            />
                            <span className="text-sm font-medium text-theme-text truncate max-w-xs">
                              {activity.title || "Unknown"}
                            </span>
                          </div>
                        </td>

                        {/* User Column */}
                        <td className="py-3 px-4">
                          <span className="text-sm text-theme-text-muted truncate max-w-xs block">
                            {activity.subtitle || "—"}
                          </span>
                        </td>

                        {/* Status Column */}
                        <td className="py-3 px-4">
                          <ActivityBadge type={activity.type} t={t} />
                        </td>

                        {/* Progress Column */}
                        <td className="py-3 px-4">
                          <div className="space-y-1.5 min-w-[200px]">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-theme-text-muted">
                                {t("vodStreams.progress")}
                              </span>
                              <span
                                className={`text-xs font-medium ${
                                  isCompleted
                                    ? "text-green-400"
                                    : "text-theme-primary"
                                }`}
                              >
                                {percent.toFixed(1)}%
                              </span>
                            </div>
                            <div className="relative h-2 bg-theme-hover rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ease-out ${
                                  isCompleted
                                    ? "bg-green-500"
                                    : "bg-theme-primary"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination - Full Width */}
      {!loading &&
        !error &&
        plexConfigured &&
        filteredActivities?.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            t={t}
          />
        )}
    </div>
  );
}
