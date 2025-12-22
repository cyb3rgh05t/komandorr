import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useIsFetching } from "@tanstack/react-query";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/dateUtils";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  Users,
  Trash2,
  Check,
  Mail,
  Clock,
  Search,
  RefreshCw,
  Film,
  Tv,
  Music,
  User,
  Edit,
  X,
  Calendar,
  Repeat,
  Home,
  Radio,
  Eye,
  BarChart3,
  Activity,
  Play,
} from "lucide-react";

// Helper component to format dates with timezone support
const FormattedDate = ({ date }) => {
  const [formattedDate, setFormattedDate] = useState("...");
  const { t } = useTranslation();

  useEffect(() => {
    if (!date) {
      setFormattedDate(t("invites.fields.never"));
      return;
    }

    formatDateTime(date, false).then(setFormattedDate);
  }, [date, t]);

  return <>{formattedDate}</>;
};

// Thumbnail component with fallback for watch history
const ThumbnailWithFallback = ({ item, Icon }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div
        className={`w-20 h-28 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg ring-1 ring-black/10 ${
          item.type === "movie"
            ? "bg-blue-500/20"
            : item.type === "episode"
            ? "bg-purple-500/20"
            : "bg-pink-500/20"
        }`}
      >
        <Icon
          size={28}
          className={`${
            item.type === "movie"
              ? "text-blue-400"
              : item.type === "episode"
              ? "text-purple-400"
              : "text-pink-400"
          }`}
        />
      </div>
    );
  }

  return (
    <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-black/10">
      <img
        src={item.thumb}
        alt={item.title}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

const UserAccounts = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Use React Query for invites to get users
  const { data: invites = [], isLoading: loading } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const data = await api.get("/invites/");
      return data || [];
    },
    staleTime: 10000,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for Plex config (contains libraries)
  const { data: plexConfig } = useQuery({
    queryKey: ["plexConfig"],
    queryFn: () => api.get("/invites/plex/config"),
    staleTime: 60000,
    placeholderData: (previousData) => previousData,
  });

  const plexLibraries = plexConfig?.libraries || [];

  // Use React Query for Plex live stats
  const { data: plexLiveStatsData } = useQuery({
    queryKey: ["plexLiveStats"],
    queryFn: () => api.get("/plex/stats/live"),
    staleTime: 60000,
    refetchInterval: 60000,
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for Plex users count
  const { data: plexUsersData } = useQuery({
    queryKey: ["plexUsersCount"],
    queryFn: async () => {
      const data = await api.get("/plex/users/count");
      return data;
    },
    staleTime: 10000,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  const plexUsersCount = plexUsersData?.count || 0;
  const plexServerName = plexLiveStatsData?.server_name || "Plex Server";
  const plexLiveStats = {
    total_movies: plexLiveStatsData?.total_movies || 0,
    total_tv_shows: plexLiveStatsData?.total_tv_shows || 0,
    total_episodes: plexLiveStatsData?.total_episodes || 0,
  };
  const isFetching = useIsFetching();

  // Fetch Plex watch history
  const { data: watchHistory = [] } = useQuery({
    queryKey: ["plexWatchHistory"],
    queryFn: async () => {
      try {
        return await api.get("/plex/watch-history");
      } catch (error) {
        console.warn("Watch history endpoint not available:", error);
        return [];
      }
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
    retry: false,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    userId: null,
    userName: null,
  });
  const [editModal, setEditModal] = useState({
    isOpen: false,
    user: null,
    expirationDate: "",
    expirationTime: "00:00",
  });
  const [refreshingUsers, setRefreshingUsers] = useState(new Set());

  // Stats modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Extract all users from redeemed invites
  const getAllUsers = () => {
    const usersMap = new Map();

    invites.forEach((invite) => {
      if (invite.users && invite.users.length > 0) {
        invite.users.forEach((user) => {
          if (!usersMap.has(user.id)) {
            // Get library names for this invite
            const getLibraryNames = (librariesString) => {
              if (!librariesString || librariesString === "all") {
                return [
                  { name: t("invites.fields.allLibraries"), type: "all" },
                ];
              }

              const libraryIds = librariesString
                .split(",")
                .map((id) => id.trim());
              return libraryIds.map((id) => {
                const lib = plexLibraries.find((l) => l.id.toString() === id);
                return lib
                  ? { name: lib.name, type: lib.type }
                  : { name: id, type: "unknown" };
              });
            };

            usersMap.set(user.id, {
              ...user,
              inviteCode: invite.code,
              inviteId: invite.id,
              expires_at: user.expires_at, // Use user's own expiration, not invite's
              libraries: getLibraryNames(invite.libraries),
              permissions: {
                allowSync: invite.allow_sync,
                allowChannels: invite.allow_channels,
                plexHome: invite.plex_home,
              },
            });
          }
        });
      }
    });

    return Array.from(usersMap.values());
  };

  const allUsers = getAllUsers();

  // Calculate watch history stats
  const watchHistoryStats = (() => {
    // Get user IDs from all users
    const userPlexIds = allUsers.map((u) => u.plex_id).filter(Boolean);
    const userEmails = allUsers.map((u) => u.email);

    // Filter watch history to only include current users
    const userWatchHistory = watchHistory.filter(
      (item) =>
        userPlexIds.includes(item.user_id) || userEmails.includes(item.email)
    );

    const totalWatchTime = userWatchHistory.reduce(
      (sum, item) => sum + (item.duration || 0),
      0
    );

    return {
      totalViews: userWatchHistory.length,
      totalMovies: userWatchHistory.filter((item) => item.type === "movie")
        .length,
      totalEpisodes: userWatchHistory.filter((item) => item.type === "episode")
        .length,
      totalWatchTime,
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

  // Helper functions for stats modal
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

  const getUserStats = (user) => {
    const userWatchData = watchHistory.filter(
      (item) => item.user_id === user.plex_id || item.email === user.email
    );

    const totalWatched = userWatchData.length;
    const movies = userWatchData.filter((item) => item.type === "movie").length;
    const episodes = userWatchData.filter(
      (item) => item.type === "episode"
    ).length;
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

  // Filter users by search term
  const filteredUsers = allUsers.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.username && user.username.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      user.inviteCode.toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteUser = (user) => {
    setConfirmDialog({
      isOpen: true,
      userId: user.id,
      userName: user.username || user.email,
    });
  };

  const handleEditUser = (user) => {
    // Get current expiration date from user
    const currentExpiration = user.expires_at || "";
    let expirationDate = "";
    let expirationTime = "00:00";

    if (currentExpiration) {
      const date = new Date(currentExpiration);
      expirationDate = currentExpiration.split("T")[0];
      expirationTime = `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`;
    }

    setEditModal({
      isOpen: true,
      user: user,
      expirationDate: expirationDate,
      expirationTime: expirationTime,
    });
  };

  const confirmEditUser = async () => {
    try {
      let expiresAt = null;

      if (editModal.expirationDate) {
        // Combine date and time
        const [hours, minutes] = editModal.expirationTime.split(":");
        const dateTime = new Date(editModal.expirationDate);
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        expiresAt = dateTime.toISOString();
      }

      const updateData = {
        expires_at: expiresAt,
      };

      console.log("Updating user expiration:", {
        userId: editModal.user.id,
        updateData,
      });

      await api.put(
        `/invites/users/${editModal.user.id}/expiration`,
        updateData
      );
      queryClient.invalidateQueries(["invites"]);
      queryClient.invalidateQueries(["inviteStats"]);
      toast.success(t("userAccounts.userUpdated"));
      setEditModal({
        isOpen: false,
        user: null,
        expirationDate: "",
        expirationTime: "00:00",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      console.error("Error response:", error.response?.data);
      toast.error(t("userAccounts.errorUpdating"));
    }
  };

  const confirmDeleteUser = async () => {
    try {
      await api.delete(`/invites/users/${confirmDialog.userId}`);
      queryClient.invalidateQueries(["invites"]);
      queryClient.invalidateQueries(["inviteStats"]);
      queryClient.invalidateQueries(["plexLiveStats"]);
      toast.success(t("userAccounts.userDeleted"));
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(t("userAccounts.errorDeleting"));
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.refetchQueries(["invites"]),
      queryClient.refetchQueries(["plexConfig"]),
      queryClient.refetchQueries(["plexLiveStats"]),
    ]);
    toast.success(t("userAccounts.refreshed") || "Refreshed");
  };

  const handleRefreshUser = async (user) => {
    // Add user to refreshing set
    setRefreshingUsers((prev) => new Set(prev).add(user.id));

    try {
      await api.post(`/invites/users/${user.id}/refresh`);
      queryClient.invalidateQueries(["invites"]);
      queryClient.invalidateQueries(["inviteStats"]);
      toast.success(
        t("userAccounts.userRefreshed") ||
          `Updated info for ${user.username || user.email}`
      );
    } catch (error) {
      console.error("Error refreshing user:", error);
      toast.error(
        t("userAccounts.errorRefreshing") || "Failed to refresh user info"
      );
    } finally {
      // Remove user from refreshing set
      setRefreshingUsers((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header with Search & Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder={
              t("userAccounts.searchPlaceholder") || "Search users..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme rounded-lg text-theme-text text-sm placeholder-theme-text-muted transition-all focus:outline-none focus:border-theme-primary"
          />
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading || isFetching}
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

      {/* Stats Cards */}
      {/* Row 1: 6 columns - Plex Server, Plex Users, Total Users, Redeemed Invites */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                  />
                </svg>
                {t("userAccounts.stats.plexServer")}
              </p>
              <p className="text-lg font-semibold text-indigo-500 mt-1 truncate">
                {plexServerName}
              </p>
            </div>
            <svg
              className="w-8 h-8 text-indigo-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
          </div>
        </div>

        {/* Plex Users Card */}
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                {t("invites.stats.plexUsers")}
              </p>
              <p className="text-2xl font-bold text-purple-500 mt-1">
                {plexUsersCount}
              </p>
            </div>
            <svg
              className="w-8 h-8 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-500" />
                {t("userAccounts.stats.totalUsers")}
              </p>
              <p className="text-2xl font-bold text-blue-500 mt-1">
                {allUsers.length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3 h-3 text-green-500" />
                {t("userAccounts.stats.redeemedInvites")}
              </p>
              <p className="text-2xl font-bold text-green-500 mt-1">
                {invites.filter((i) => i.users && i.users.length > 0).length}
              </p>
            </div>
            <Mail className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Row 2: 3 columns - Movies, TV Shows, Episodes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Film className="w-3 h-3 text-amber-500" />
                {t("invites.stats.movies")}
              </p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {plexLiveStats.total_movies}
              </p>
            </div>
            <Film className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Tv className="w-3 h-3 text-indigo-500" />
                {t("invites.stats.tvShows")}
              </p>
              <p className="text-2xl font-bold text-indigo-500 mt-1">
                {plexLiveStats.total_tv_shows}
              </p>
            </div>
            <Tv className="w-8 h-8 text-indigo-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-rose-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                {t("invites.stats.episodes")}
              </p>
              <p className="text-2xl font-bold text-rose-500 mt-1">
                {plexLiveStats.total_episodes}
              </p>
            </div>
            <svg
              className="w-8 h-8 text-rose-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Row 3: 4 columns - Watch History Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-theme-primary hover:bg-theme-primary/10 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Eye className="w-3 h-3 text-theme-primary" />
                {t("userHistory.totalViews", "Total Views")}
              </p>
              <p className="text-2xl font-bold text-theme-text mt-1">
                {watchHistoryStats.totalViews}
              </p>
            </div>
            <Eye className="w-8 h-8 text-theme-primary opacity-60" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-500/50 hover:bg-blue-500/10 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Film className="w-3 h-3 text-blue-400" />
                {t("userHistory.moviesWatched", "Movies Watched")}
              </p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {watchHistoryStats.totalMovies}
              </p>
            </div>
            <Film className="w-8 h-8 text-blue-400 opacity-60" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-purple-500/50 hover:bg-purple-500/10 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Tv className="w-3 h-3 text-purple-400" />
                {t("userHistory.episodesWatched", "Episodes Watched")}
              </p>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {watchHistoryStats.totalEpisodes}
              </p>
            </div>
            <Tv className="w-8 h-8 text-purple-400 opacity-60" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-green-500/50 hover:bg-green-500/10 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-green-400" />
                {t("userHistory.watchTime", "Watch Time")}
              </p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {formatWatchTime(watchHistoryStats.totalWatchTime)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-green-400 opacity-60" />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-theme-card border border-theme rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-theme-hover border-b border-theme">
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.user") || "User"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.email") || "Email"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.status") || "Status"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.inviteCode") || "Invite Code"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.joined") || "Joined"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.expires") || "Expires"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.libraries") || "Libraries"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.permissions") || "Permissions"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.watchTime") || "Watch Time"}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("userAccounts.fields.actions") || "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, index) => (
                  <tr
                    key={index}
                    className="border-b border-theme animate-pulse"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-theme-hover"></div>
                        <div className="h-4 bg-theme-hover rounded w-24"></div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-theme-hover rounded w-32"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-6 bg-theme-hover rounded w-16"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-theme-hover rounded w-20"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-theme-hover rounded w-24"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-theme-hover rounded w-24"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <div className="h-6 bg-theme-hover rounded w-16"></div>
                        <div className="h-6 bg-theme-hover rounded w-16"></div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <div className="h-6 bg-theme-hover rounded w-16"></div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-theme-hover rounded w-20"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <div className="w-9 h-9 bg-theme-hover rounded"></div>
                        <div className="w-9 h-9 bg-theme-hover rounded"></div>
                        <div className="w-9 h-9 bg-theme-hover rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} className="text-theme-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-theme-text mb-2">
                        {searchTerm
                          ? t("userAccounts.noResults")
                          : t("userAccounts.noUsers")}
                      </h3>
                      <p className="text-theme-text-muted">
                        {searchTerm
                          ? t("userAccounts.noResultsMessage")
                          : t("userAccounts.noUsersMessage")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-theme hover:bg-theme-hover/30 transition-colors"
                  >
                    {/* User Column (Avatar + Username) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-green-500/20 border border-green-500/30 flex-shrink-0">
                          {user.thumb ? (
                            <img
                              src={`/api/plex/proxy/image?url=${encodeURIComponent(
                                user.thumb
                              )}`}
                              alt={user.username || user.email}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-5 h-5 text-green-400" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-theme-text truncate max-w-[150px]">
                          {user.username || user.email}
                        </span>
                      </div>
                    </td>

                    {/* Email Column */}
                    <td className="py-3 px-4">
                      <span className="text-sm text-theme-text truncate max-w-[200px] block">
                        {user.email}
                      </span>
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-4">
                      {user.expires_at &&
                      new Date(user.expires_at) < new Date() ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                          <X className="w-3 h-3" />
                          {t("userAccounts.status.expired")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                          <Check className="w-3 h-3" />
                          {t("userAccounts.status.active")}
                        </span>
                      )}
                    </td>

                    {/* Invite Code Column */}
                    <td className="py-3 px-4">
                      <code className="text-sm font-mono font-semibold text-theme-text">
                        {user.inviteCode}
                      </code>
                    </td>

                    {/* Joined Column */}
                    <td className="py-3 px-4">
                      <span className="text-sm text-theme-text">
                        <FormattedDate date={user.created_at} />
                      </span>
                    </td>

                    {/* Expires Column */}
                    <td className="py-3 px-4">
                      {user.expires_at ? (
                        <span
                          className={`text-sm ${
                            new Date(user.expires_at) < new Date()
                              ? "text-red-400 font-semibold"
                              : "text-orange-400"
                          }`}
                        >
                          <FormattedDate date={user.expires_at} />
                        </span>
                      ) : (
                        <span className="text-sm text-theme-muted">-</span>
                      )}
                    </td>

                    {/* Libraries Column */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.libraries.slice(0, 2).map((library, index) => {
                          const LibraryIcon =
                            library.type === "movie"
                              ? Film
                              : library.type === "show"
                              ? Tv
                              : library.type === "music"
                              ? Music
                              : null;

                          return (
                            <span
                              key={index}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${
                                library.type === "all"
                                  ? "bg-cyan-500/15 text-cyan-400"
                                  : library.type === "movie"
                                  ? "bg-blue-500/15 text-blue-400"
                                  : library.type === "show"
                                  ? "bg-purple-500/15 text-purple-400"
                                  : library.type === "music"
                                  ? "bg-pink-500/15 text-pink-400"
                                  : "bg-gray-500/15 text-gray-400"
                              }`}
                              title={library.name}
                            >
                              {LibraryIcon && (
                                <LibraryIcon className="w-3 h-3" />
                              )}
                              <span className="max-w-[80px] truncate">
                                {library.name}
                              </span>
                            </span>
                          );
                        })}
                        {user.libraries.length > 2 && (
                          <span className="text-xs text-theme-muted">
                            +{user.libraries.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Permissions Column */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {!user.permissions.allowSync &&
                        !user.permissions.allowChannels &&
                        !user.permissions.plexHome ? (
                          <span className="inline-flex items-center gap-1 bg-gray-500/15 px-2 py-0.5 rounded text-xs text-gray-400 font-semibold">
                            {t("invites.fields.none")}
                          </span>
                        ) : (
                          <>
                            {user.permissions.allowSync && (
                              <span className="inline-flex items-center gap-1 bg-blue-500/15 px-2 py-0.5 rounded text-xs text-blue-400 font-semibold">
                                <Repeat className="w-3 h-3" />
                                {t("invites.permissions.sync")}
                              </span>
                            )}
                            {user.permissions.allowChannels && (
                              <span className="inline-flex items-center gap-1 bg-purple-500/15 px-2 py-0.5 rounded text-xs text-purple-400 font-semibold">
                                <Radio className="w-3 h-3" />
                                {t("invites.permissions.liveTV")}
                              </span>
                            )}
                            {user.permissions.plexHome && (
                              <span className="inline-flex items-center gap-1 bg-green-500/15 px-2 py-0.5 rounded text-xs text-green-400 font-semibold">
                                <Home className="w-3 h-3" />
                                {t("invites.permissions.home")}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Watch Time Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-theme-text-muted" />
                        <span className="text-sm text-theme-text font-medium">
                          {(() => {
                            const stats = getUserStats(user);
                            if (
                              stats.totalHours === 0 &&
                              stats.totalMinutes === 0
                            ) {
                              return "0m";
                            }
                            if (stats.totalHours === 0) {
                              return `${stats.totalMinutes}m`;
                            }
                            return `${stats.totalHours}h ${stats.totalMinutes}m`;
                          })()}
                        </span>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowStatsModal(true);
                            setTimeFilter("all");
                            setTypeFilter("all");
                          }}
                          className="p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-400 rounded transition-all"
                          title={
                            t("userAccounts.buttons.viewStats") ||
                            "View watch stats"
                          }
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRefreshUser(user)}
                          disabled={refreshingUsers.has(user.id)}
                          className="p-2 bg-theme-primary/10 hover:bg-theme border border-theme hover:border-theme-primary text-theme-primary rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            t("userAccounts.buttons.refreshUser") ||
                            "Refresh user info"
                          }
                        >
                          <RefreshCw
                            className={`w-4 h-4 transition-transform ${
                              refreshingUsers.has(user.id) ? "animate-spin" : ""
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 bg-theme-primary/10 hover:bg-theme border border-theme hover:border-theme-primary text-theme-primary rounded transition-all"
                          title={t("userAccounts.buttons.editUser")}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-all"
                          title={t("userAccounts.buttons.removeUser")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-theme-card border border-theme rounded-lg shadow-2xl max-w-md w-full animate-scaleIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-theme">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-theme-primary/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-theme-primary" />
                </div>
                <h3 className="text-xl font-bold text-theme-text">
                  {t("userAccounts.editUser")}
                </h3>
              </div>
              <button
                onClick={() =>
                  setEditModal({
                    isOpen: false,
                    user: null,
                    expirationDate: "",
                  })
                }
                className="p-2 hover:bg-theme-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-theme-text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-theme-text-muted mb-4">
                  {t("userAccounts.editUserMessage", {
                    name: editModal.user?.username || editModal.user?.email,
                  })}
                </p>

                <div className="space-y-4">
                  {/* Date Input */}
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-2">
                      {t("userAccounts.expirationDate")}
                    </label>
                    <input
                      type="date"
                      value={editModal.expirationDate}
                      onChange={(e) =>
                        setEditModal({
                          ...editModal,
                          expirationDate: e.target.value,
                        })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-2.5 bg-theme-card border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary transition-colors"
                    />
                  </div>

                  {/* Time Input */}
                  {editModal.expirationDate && (
                    <div>
                      <label className="block text-sm font-medium text-theme-text mb-2">
                        {t("userAccounts.expirationTime") || "Expiration Time"}
                      </label>
                      <input
                        type="time"
                        value={editModal.expirationTime}
                        onChange={(e) =>
                          setEditModal({
                            ...editModal,
                            expirationTime: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-theme-card border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary transition-colors"
                      />
                      <p className="text-xs text-theme-text-muted mt-2">
                        {t("userAccounts.expirationTimeHint") ||
                          "User access will expire at this time"}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-theme-text-muted">
                    {t("userAccounts.expirationHint")}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
              <button
                onClick={() =>
                  setEditModal({
                    isOpen: false,
                    user: null,
                    expirationDate: "",
                    expirationTime: "00:00",
                  })
                }
                className="px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme rounded-lg text-theme-text font-medium transition-all"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmEditUser}
                className="px-4 py-2 bg-theme-hover hover:bg-theme-primary/90 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watch Stats Modal */}
      {showStatsModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowStatsModal(false)}
        >
          <div
            className="bg-theme border border-theme rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6"
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
                            {t("userHistory.stats.totalWatched") ||
                              "Total Watched"}
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
                            {t("userHistory.stats.watchTime") || "Watch Time"}
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
                            {t("userHistory.stats.movies") || "Movies"}
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
                            {t("userHistory.stats.episodes") || "Episodes"}
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
                    {t("userHistory.filters.timeRange") || "Time Range"}
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
                        {t(`userHistory.filters.${filter}`) ||
                          filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("userHistory.filters.mediaType") || "Media Type"}
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
                        {t(`userHistory.filters.${filter}`) ||
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
                  {getFilteredHistory().length}{" "}
                  {t("userHistory.items") || "items"}
                </span>
              </div>

              {getFilteredHistory().length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                  {getFilteredHistory().map((item, index) => {
                    const Icon = getMediaIcon(item.type);
                    return (
                      <div
                        key={index}
                        className="group relative flex gap-4 p-4 bg-theme-card border border-theme rounded-xl hover:border-theme-primary/50 hover:shadow-lg transition-all duration-200"
                      >
                        {/* Type Badge */}
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
                          <ThumbnailWithFallback item={item} Icon={Icon} />
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

                          {/* Info badges */}
                          <div className="space-y-1.5 mt-auto">
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

                            {/* Genres */}
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, userId: null, userName: null })
        }
        onConfirm={confirmDeleteUser}
        title={t("userAccounts.confirmDelete")}
        message={t("userAccounts.confirmDeleteMessage", {
          name: confirmDialog.userName,
        })}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        variant="danger"
      />
    </div>
  );
};

export default UserAccounts;
