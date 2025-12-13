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

  const plexServerName = plexLiveStatsData?.server_name || "Plex Server";
  const isFetching = useIsFetching();

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all col-span-2 sm:col-span-1">
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
      </div>

      {/* Users List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm animate-pulse"
            >
              <div className="flex items-start gap-4">
                {/* Avatar Skeleton */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-theme-hover"></div>
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Name and Status */}
                  <div className="flex items-center gap-2.5">
                    <div className="h-5 bg-theme-hover rounded w-32"></div>
                    <div className="h-6 bg-theme-hover rounded-lg w-16"></div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-4">
                    <div className="h-3 bg-theme-hover rounded w-24"></div>
                    <div className="h-3 bg-theme-hover rounded w-28"></div>
                  </div>

                  {/* Libraries */}
                  <div className="flex flex-wrap gap-2">
                    <div className="h-6 bg-theme-hover rounded-md w-20"></div>
                    <div className="h-6 bg-theme-hover rounded-md w-24"></div>
                    <div className="h-6 bg-theme-hover rounded-md w-16"></div>
                  </div>
                </div>

                {/* Action Buttons Skeleton */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="w-9 h-9 bg-theme-hover rounded-lg"></div>
                  <div className="w-9 h-9 bg-theme-hover rounded-lg"></div>
                  <div className="w-9 h-9 bg-theme-hover rounded-lg"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-theme-card border border-theme rounded-lg p-12 text-center shadow-sm">
          <div className="max-w-md mx-auto">
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
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="group bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md hover:border-theme-primary/50 transition-all duration-200 relative overflow-hidden"
            >
              {/* Plex Background */}
              <div
                className="absolute inset-0 opacity-5 bg-center bg-no-repeat bg-contain pointer-events-none"
                style={{ backgroundImage: "url(/streamnet.png)" }}
              />

              {/* Main Content */}
              <div className="flex items-start gap-4 relative z-10">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-green-500/20 border border-green-500/30">
                    {user.thumb ? (
                      <img
                        src={`/api/plex/proxy/image?url=${encodeURIComponent(
                          user.thumb
                        )}`}
                        alt={user.username || user.email}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-6 h-6 text-green-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* User Name and Status */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-theme-text truncate">
                        {user.username || user.email}
                      </h3>
                      {user.expires_at &&
                      new Date(user.expires_at) < new Date() ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">
                          <X className="w-3 h-3" />
                          {t("userAccounts.status.expired")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                          <Check className="w-3 h-3" />
                          {t("userAccounts.status.active")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-theme-text-muted">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{t("userAccounts.fields.inviteCode")}:</span>
                      <code className="text-theme-text font-semibold font-mono">
                        {user.inviteCode}
                      </code>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{t("userAccounts.fields.joined")}:</span>
                      <span className="text-theme-text font-semibold">
                        <FormattedDate date={user.created_at} />
                      </span>
                    </div>
                    {user.expires_at && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-orange-400" />
                        <span>{t("userAccounts.fields.expires")}:</span>
                        <span className="text-orange-400 font-semibold">
                          <FormattedDate date={user.expires_at} />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Libraries and Permissions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Libraries */}
                    {user.libraries.map((library, index) => {
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            library.type === "all"
                              ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                              : library.type === "movie"
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              : library.type === "show"
                              ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                              : library.type === "music"
                              ? "bg-pink-500/15 text-pink-400 border-pink-500/30"
                              : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                          }`}
                        >
                          {LibraryIcon && (
                            <LibraryIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          <span className="truncate max-w-[120px]">
                            {library.name}
                          </span>
                        </span>
                      );
                    })}

                    {/* Permissions */}
                    {!user.permissions.allowSync &&
                    !user.permissions.allowChannels &&
                    !user.permissions.plexHome ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Default Permissions
                      </span>
                    ) : (
                      <>
                        {user.permissions.allowSync && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            {t("invites.permissions.sync")}
                          </span>
                        )}
                        {user.permissions.allowChannels && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <Tv className="w-3.5 h-3.5" />
                            {t("invites.permissions.liveTV")}
                          </span>
                        )}
                        {user.permissions.plexHome && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                            </svg>
                            {t("invites.permissions.home")}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => handleRefreshUser(user)}
                    disabled={refreshingUsers.has(user.id)}
                    className="p-2.5 bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme hover:border-theme-primary/50 text-theme-primary hover:text-theme-primary/80 rounded-lg transition-all shadow-sm hover:shadow-md group/refresh disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      t("userAccounts.buttons.refreshUser") ||
                      "Refresh user info"
                    }
                  >
                    <RefreshCw
                      className={`w-4 h-4 transition-transform ${
                        refreshingUsers.has(user.id)
                          ? "animate-spin"
                          : "group-hover/refresh:rotate-180"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleEditUser(user)}
                    className="p-2.5 bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme hover:border-theme-primary/50 text-theme-primary hover:text-theme-primary/80 rounded-lg transition-all shadow-sm hover:shadow-md group/edit"
                    title={t("userAccounts.buttons.editUser")}
                  >
                    <Edit className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg transition-all shadow-sm hover:shadow-md group/delete"
                    title={t("userAccounts.buttons.removeUser")}
                  >
                    <Trash2 className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
