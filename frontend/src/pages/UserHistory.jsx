import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useIsFetching } from "@tanstack/react-query";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/dateUtils";
import {
  Clock,
  Film,
  Tv,
  Music,
  Play,
  Pause,
  Eye,
  Calendar,
  TrendingUp,
  User,
  Search,
  RefreshCw,
  BarChart3,
  Activity,
} from "lucide-react";

// Helper component to format dates with timezone support
const FormattedDate = ({ date }) => {
  const [formattedDate, setFormattedDate] = useState("...");
  const { t } = useTranslation();

  useEffect(() => {
    if (!date) {
      setFormattedDate(t("common.never", "Never"));
      return;
    }

    formatDateTime(date, true).then(setFormattedDate);
  }, [date, t]);

  return <>{formattedDate}</>;
};

const UserHistory = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch all users from invites
  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      return await api.get("/invites/");
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - user list doesn't change often
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // Fetch Plex watch history - this is the slow one
  const { data: watchHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["plexWatchHistory"],
    queryFn: async () => {
      try {
        return await api.get("/plex/watch-history");
      } catch (error) {
        console.warn("Watch history endpoint not available:", error);
        return [];
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - watch history updates slowly
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on every mount if data is fresh
    placeholderData: (previousData) => previousData, // Show old data while fetching
    retry: false, // Don't retry if endpoint doesn't exist yet
  });

  const isFetching = useIsFetching();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all"); // all, today, week, month
  const [typeFilter, setTypeFilter] = useState("all"); // all, movie, episode, track

  // Extract all users from invites
  const getAllUsers = () => {
    const users = [];
    invites.forEach((invite) => {
      if (invite.users && invite.users.length > 0) {
        invite.users.forEach((user) => {
          users.push({
            ...user,
            inviteCode: invite.code,
            inviteId: invite.id,
          });
        });
      }
    });
    return users;
  };

  const allUsers = getAllUsers();

  // Filter users by search term
  const filteredUsers = allUsers.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower)
    );
  });

  const handleRefresh = async () => {
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["invites"] }),
        queryClient.refetchQueries({ queryKey: ["plexWatchHistory"] }),
      ]);
      toast.success(t("userHistory.refreshed") || "Refreshed");
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error(t("userHistory.refreshError") || "Failed to refresh");
    }
  };

  // Filter watch history for selected user and filters
  const getFilteredHistory = () => {
    if (!selectedUser) return [];

    let filtered = watchHistory.filter(
      (item) =>
        item.user_id === selectedUser.plex_id ||
        item.email === selectedUser.email
    );

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((item) => item.type === typeFilter);
    }

    // Apply time filter
    if (timeFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      if (timeFilter === "today") {
        filterDate.setHours(0, 0, 0, 0);
      } else if (timeFilter === "week") {
        filterDate.setDate(now.getDate() - 7);
      } else if (timeFilter === "month") {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter(
        (item) => new Date(item.viewed_at) >= filterDate
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.viewed_at) - new Date(a.viewed_at)
    );
  };

  const userHistory = getFilteredHistory();

  // Calculate user stats
  const getUserStats = (user) => {
    const userWatchData = watchHistory.filter(
      (item) => item.user_id === user.plex_id || item.email === user.email
    );

    const totalWatched = userWatchData.length;
    const movies = userWatchData.filter((item) => item.type === "movie").length;
    const episodes = userWatchData.filter(
      (item) => item.type === "episode"
    ).length;
    // duration is in seconds, convert to hours and minutes
    const totalSeconds = userWatchData.reduce(
      (sum, item) => sum + (item.duration || 0),
      0
    );
    const totalMinutes = Math.floor(totalSeconds / 60);

    return {
      totalWatched,
      movies,
      episodes,
      totalHours: Math.floor(totalMinutes / 60),
      totalMinutes: totalMinutes % 60,
    };
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0m";
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case "movie":
        return Film;
      case "episode":
        return Tv;
      case "track":
        return Music;
      default:
        return Play;
    }
  };

  const loading = loadingInvites || loadingHistory;
  const hasData = invites.length > 0 || watchHistory.length > 0;

  // Only show skeleton on initial load, not on background refetches
  if (loading && !hasData) {
    return (
      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-theme-hover rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-theme-card border border-theme rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate global stats
  const globalStats = (() => {
    // Get user IDs from filtered users
    const filteredUserIds = filteredUsers.map((u) => u.plex_id);
    const filteredEmails = filteredUsers.map((u) => u.email);

    // Filter watch history to only include filtered users
    const filteredWatchHistory = watchHistory.filter(
      (item) =>
        filteredUserIds.includes(item.user_id) ||
        filteredEmails.includes(item.email)
    );

    return {
      totalViews: filteredWatchHistory.length,
      totalUsers: filteredUsers.length,
      totalMovies: filteredWatchHistory.filter((item) => item.type === "movie")
        .length,
      totalEpisodes: filteredWatchHistory.filter(
        (item) => item.type === "episode"
      ).length,
      totalWatchTime: filteredWatchHistory.reduce(
        (sum, item) => sum + (item.duration || 0),
        0
      ),
    };
  })();

  const formatWatchTime = (seconds) => {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Search Bar & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder={
              t("userHistory.searchPlaceholder") || "Search users..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
          />
        </div>

        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:border-theme-primary hover:bg-theme-primary/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-left flex-1">
              <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                {t("userHistory.totalViews", "Total Views")}
              </div>
              <div className="text-3xl font-bold text-theme-text">
                {globalStats.totalViews}
              </div>
            </div>
            <div className="text-theme-text-muted opacity-60">
              <Eye className="w-10 h-10" strokeWidth={1} />
            </div>
          </div>
        </div>

        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:border-blue-500/50 hover:bg-blue-500/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-left flex-1">
              <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                {t("userHistory.movies") || "Movies"}
              </div>
              <div className="text-3xl font-bold text-blue-400">
                {globalStats.totalMovies}
              </div>
            </div>
            <div className="text-blue-400 opacity-60">
              <Film className="w-10 h-10" strokeWidth={1} />
            </div>
          </div>
        </div>

        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:border-purple-500/50 hover:bg-purple-500/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-left flex-1">
              <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                {t("userHistory.episodes") || "Episodes"}
              </div>
              <div className="text-3xl font-bold text-purple-400">
                {globalStats.totalEpisodes}
              </div>
            </div>
            <div className="text-purple-400 opacity-60">
              <Tv className="w-10 h-10" strokeWidth={1} />
            </div>
          </div>
        </div>

        <div className="relative bg-theme-card border border-theme rounded-lg p-4 transition-all hover:shadow-md hover:border-green-500/50 hover:bg-green-500/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-left flex-1">
              <div className="text-[10px] uppercase tracking-widest text-theme-text-muted font-semibold mb-1.5">
                {t("userHistory.watchTime") || "Watch Time"}
              </div>
              <div className="text-3xl font-bold text-green-400">
                {formatWatchTime(globalStats.totalWatchTime)}
              </div>
            </div>
            <div className="text-green-400 opacity-60">
              <Clock className="w-10 h-10" strokeWidth={1} />
            </div>
          </div>
        </div>
      </div>

      {/* User Selection */}
      <div className=" border border-theme rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <User className="text-theme-primary" size={20} />
          <h2 className="text-lg font-semibold text-theme-text">
            {t("userHistory.selectUser") || "Select User"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredUsers.map((user) => {
            const stats = getUserStats(user);
            const isSelected = selectedUser?.id === user.id;

            return (
              <div
                key={user.id}
                onClick={() => {
                  setSelectedUser(user);
                  setShowStatsModal(true);
                }}
                className={`cursor-pointer relative bg-theme-card border rounded-lg p-4 transition-all hover:shadow-md hover:border-theme-primary hover:bg-theme-primary/10 ${
                  isSelected
                    ? "bg-theme-primary/10 border-theme-primary"
                    : "border-theme"
                }`}
              >
                {/* Plex Background */}
                <div
                  className="absolute inset-0 opacity-5 bg-center bg-no-repeat bg-contain pointer-events-none"
                  style={{ backgroundImage: "url(/streamnet.png)" }}
                />
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-theme-primary text-white"
                        : "bg-theme-primary/20 text-theme-primary"
                    }`}
                  >
                    {user.thumb ? (
                      <img
                        src={user.thumb}
                        alt={user.username || user.email}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <User size={22} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold truncate text-sm ${
                        isSelected ? "text-theme-primary" : "text-theme-text"
                      }`}
                    >
                      {user.username || user.email}
                    </div>
                    <div className="text-xs text-theme-text-muted truncate">
                      {user.email}
                    </div>
                  </div>
                </div>

                {/* Stats with labels */}
                <div className="space-y-2 pt-2 border-t border-theme">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-theme-text-muted font-medium">
                      {t("userHistory.movies") || "Movies"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs font-semibold text-blue-400">
                      <Film size={11} />
                      {stats.movies}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-theme-text-muted font-medium">
                      {t("userHistory.episodes") || "Episodes"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-semibold text-purple-400">
                      <Tv size={11} />
                      {stats.episodes}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-theme-text-muted font-medium">
                      {t("userHistory.watchTime") || "Watch Time"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-xs font-semibold text-green-400">
                      <Clock size={11} />
                      {stats.totalHours}h {stats.totalMinutes}m
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-theme-text-muted">
            {t("userHistory.noUsers") || "No users found"}
          </div>
        )}
      </div>

      {/* Stats Modal */}
      {showStatsModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowStatsModal(false)}
        >
          <div
            className="bg-theme-bg border border-theme rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center">
                  {selectedUser.thumb ? (
                    <img
                      src={selectedUser.thumb}
                      alt={selectedUser.username || selectedUser.email}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User size={24} className="text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-theme-text">
                    {selectedUser.username || selectedUser.email}
                  </h2>
                  <p className="text-sm text-theme-text-muted">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-theme-text-muted hover:text-theme-text transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {(() => {
                const stats = getUserStats(selectedUser);
                return (
                  <>
                    <div className="bg-theme-card border border-theme rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-theme-text-muted uppercase tracking-wider">
                            {t("userHistory.totalWatched") || "Total Watched"}
                          </p>
                          <p className="text-3xl font-bold text-theme-text mt-2">
                            {stats.totalWatched}
                          </p>
                        </div>
                        <Eye className="text-theme-primary" size={32} />
                      </div>
                    </div>

                    <div className="bg-theme-card border border-theme rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-theme-text-muted uppercase tracking-wider">
                            {t("userHistory.watchTime") || "Watch Time"}
                          </p>
                          <p className="text-3xl font-bold text-green-400 mt-2">
                            {stats.totalHours}h {stats.totalMinutes}m
                          </p>
                        </div>
                        <Clock className="text-green-400" size={32} />
                      </div>
                    </div>

                    <div className="bg-theme-card border border-theme rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-theme-text-muted uppercase tracking-wider">
                            {t("userHistory.movies") || "Movies"}
                          </p>
                          <p className="text-3xl font-bold text-blue-400 mt-2">
                            {stats.movies}
                          </p>
                        </div>
                        <Film className="text-blue-400" size={32} />
                      </div>
                    </div>

                    <div className="bg-theme-card border border-theme rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-theme-text-muted uppercase tracking-wider">
                            {t("userHistory.episodes") || "Episodes"}
                          </p>
                          <p className="text-3xl font-bold text-purple-400 mt-2">
                            {stats.episodes}
                          </p>
                        </div>
                        <Tv className="text-purple-400" size={32} />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Filters */}
            <div className="bg-theme-card border border-theme rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("userHistory.timeRange") || "Time Range"}
                  </label>
                  <div className="flex gap-2">
                    {["all", "today", "week", "month"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTimeFilter(filter)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          timeFilter === filter
                            ? "bg-theme-hover text-white shadow-md"
                            : "bg-theme-accent text-theme-text hover:bg-theme-hover"
                        }`}
                      >
                        {t(`userHistory.filter.${filter}`) ||
                          filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("userHistory.mediaType") || "Media Type"}
                  </label>
                  <div className="flex gap-2">
                    {["all", "movie", "episode"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTypeFilter(filter)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          typeFilter === filter
                            ? "bg-theme-hover text-white shadow-md"
                            : "bg-theme-accent text-theme-text hover:bg-theme-hover"
                        }`}
                      >
                        {t(`userHistory.type.${filter}`) ||
                          filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Watch History */}
            <div className="bg-theme-card border border-theme rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="text-theme-primary" size={20} />
                <h2 className="text-lg font-semibold text-theme-text">
                  {t("userHistory.watchHistory") || "Watch History"}
                </h2>
                <span className="ml-auto text-sm text-theme-text-muted">
                  {userHistory.length} {t("userHistory.items") || "items"}
                </span>
              </div>

              {userHistory.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                  {userHistory.map((item, index) => {
                    const Icon = getMediaIcon(item.type);
                    return (
                      <div
                        key={index}
                        className="group relative flex gap-4 p-4 bg-theme-card border border-theme rounded-xl hover:border-theme-primary/50 hover:shadow-lg transition-all duration-200"
                      >
                        {/* Type Badge - Upper Right Corner */}
                        <div
                          className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${
                            item.type === "movie"
                              ? "bg-blue-500/20 border border-blue-500/40 text-blue-400"
                              : item.type === "episode"
                              ? "bg-purple-500/20 border border-purple-500/40 text-purple-400"
                              : "bg-pink-500/20 border border-pink-500/40 text-pink-400"
                          }`}
                        >
                          <Icon size={10} />
                          {item.type === "movie"
                            ? "MOVIE"
                            : item.type === "episode"
                            ? "TV"
                            : "MUSIC"}
                        </div>

                        {/* Thumbnail */}
                        {item.thumb ? (
                          <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-black/10">
                            <img
                              src={item.thumb}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.parentElement.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center ${
                                    item.type === "movie"
                                      ? "bg-blue-500/20"
                                      : item.type === "episode"
                                      ? "bg-purple-500/20"
                                      : "bg-pink-500/20"
                                  }">
                                    <svg class="${
                                      item.type === "movie"
                                        ? "text-blue-400"
                                        : item.type === "episode"
                                        ? "text-purple-400"
                                        : "text-pink-400"
                                    }" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      ${
                                        item.type === "movie"
                                          ? '<rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="7 2 12 7 17 2"/>'
                                          : '<rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>'
                                      }
                                    </svg>
                                  </div>
                                `;
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-20 h-28 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              item.type === "movie"
                                ? "bg-blue-500/20 border border-blue-500/30"
                                : item.type === "episode"
                                ? "bg-purple-500/20 border border-purple-500/30"
                                : "bg-pink-500/20 border border-pink-500/30"
                            }`}
                          >
                            <Icon
                              className={`${
                                item.type === "movie"
                                  ? "text-blue-400"
                                  : item.type === "episode"
                                  ? "text-purple-400"
                                  : "text-pink-400"
                              }`}
                              size={32}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col">
                          {/* Title Section */}
                          <div className="mb-2">
                            <h3 className="font-bold text-theme-text text-sm leading-tight mb-1 line-clamp-2">
                              {item.title}
                            </h3>
                            {item.year && (
                              <div className="text-[10px] text-theme-text-muted font-medium">
                                {item.year}
                              </div>
                            )}
                            {item.grandparent_title && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-theme-text-muted font-medium truncate">
                                  {item.grandparent_title}
                                </span>
                                {item.parent_index && item.index && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-theme-hover border border-theme rounded text-[10px] font-bold text-theme-text flex-shrink-0">
                                    S{item.parent_index}E{item.index}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Info badges - organized in rows */}
                          <div className="space-y-1.5 mt-auto">
                            {/* Primary info row */}
                            <div className="flex flex-wrap items-center gap-1">
                              {/* Date */}
                              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-theme-hover border border-theme rounded text-[10px] text-theme-text-muted">
                                <Calendar size={9} />
                                <FormattedDate date={item.viewed_at} />
                              </div>

                              {/* Duration */}
                              {item.duration && (
                                <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-[10px] font-bold text-green-400">
                                  <Clock size={9} />
                                  {formatDuration(item.duration)}
                                </div>
                              )}

                              {/* Content Rating */}
                              {item.content_rating && (
                                <div className="inline-flex items-center px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/40 rounded text-[10px] font-bold text-orange-400">
                                  {item.content_rating}
                                </div>
                              )}

                              {/* Rating */}
                              {item.rating && (
                                <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-[10px] font-bold text-yellow-400">
                                  ⭐ {item.rating.toFixed(1)}
                                </div>
                              )}
                            </div>

                            {/* Secondary info row - genres */}
                            {item.genres && item.genres.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {item.genres.slice(0, 2).map((genre, idx) => (
                                  <div
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 bg-cyan-500/15 border border-cyan-500/30 rounded text-[9px] font-semibold text-cyan-400"
                                  >
                                    {genre}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-theme-text-muted">
                  <Activity size={48} className="mx-auto mb-4 opacity-50" />
                  <p>
                    {t("userHistory.noHistory") ||
                      "No watch history found for this user"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedUser && (
        <div className="bg-theme-card border border-theme rounded-xl p-12 text-center">
          <User
            size={64}
            className="mx-auto mb-4 text-theme-text-muted opacity-50"
          />
          <p className="text-lg text-theme-text-muted">
            {t("userHistory.selectUserPrompt") ||
              "Select a user to view their watch history"}
          </p>
        </div>
      )}
    </div>
  );
};

export default UserHistory;
