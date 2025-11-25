import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useIsFetching } from "@tanstack/react-query";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/dateUtils";
import {
  Plus,
  Trash2,
  Clipboard,
  Check,
  Mail,
  X,
  Film,
  Tv,
  Music,
  RefreshCw,
  Clock,
  Search,
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

const InvitesManager = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Use React Query for invites
  const { data: invites = [], isLoading: loading } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const data = await api.get("/invites/");
      console.log("Invites data:", data);
      if (data && data.length > 0) {
        console.log(
          "First invite full object:",
          JSON.stringify(data[0], null, 2)
        );
        console.log("First invite plex_server:", data[0].plex_server);
        console.log("First invite keys:", Object.keys(data[0]));
      }
      return data;
    },
    staleTime: 10000,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for stats
  const { data: stats = null } = useQuery({
    queryKey: ["inviteStats"],
    queryFn: () => api.get("/invites/stats"),
    staleTime: 10000,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for Plex config
  const { data: plexConfig } = useQuery({
    queryKey: ["plexConfig"],
    queryFn: () => api.get("/invites/plex/config"),
    staleTime: 60000,
    placeholderData: (previousData) => previousData,
  });

  const plexServers = plexConfig?.servers || [];
  const plexLibraries = plexConfig?.libraries || [];

  // Use React Query for Plex users count
  const { data: plexUsersData } = useQuery({
    queryKey: ["plexUsersCount"],
    queryFn: async () => {
      const data = await api.get("/plex/users/count");
      console.log("Plex users count response:", data);
      return data;
    },
    staleTime: 10000,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  const plexUsersCount = plexUsersData?.count || 0;

  // Use React Query for Plex live stats
  const { data: plexLiveStatsData } = useQuery({
    queryKey: ["plexLiveStats"],
    queryFn: () => api.get("/plex/stats/live"),
    staleTime: 60000,
    refetchInterval: 60000,
    placeholderData: (previousData) => previousData,
  });

  const plexLiveStats = {
    total_movies: plexLiveStatsData?.total_movies || 0,
    total_tv_shows: plexLiveStatsData?.total_tv_shows || 0,
    total_episodes: plexLiveStatsData?.total_episodes || 0,
  };

  const plexServerName = plexLiveStatsData?.server_name || "Plex Server";

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const isFetching = useIsFetching();
  const [filter, setFilter] = useState("all"); // all, active, expired, used-up, disabled
  const [searchTerm, setSearchTerm] = useState("");

  // Custom dropdown states
  const [usageDropdownOpen, setUsageDropdownOpen] = useState(false);
  const [expiryDropdownOpen, setExpiryDropdownOpen] = useState(false);
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [libraryDropdownOpen, setLibraryDropdownOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    custom_code: "",
    usage_limit: "",
    expires_in_days: "",
    allow_sync: false,
    allow_camera_upload: false,
    allow_channels: false,
    plex_home: false,
    plex_server: "default",
    libraries: [],
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".custom-dropdown")) {
        setUsageDropdownOpen(false);
        setExpiryDropdownOpen(false);
        setServerDropdownOpen(false);
      }
    };

    if (usageDropdownOpen || expiryDropdownOpen || serverDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [usageDropdownOpen, expiryDropdownOpen, serverDropdownOpen]);

  const handleCreateInvite = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...createForm,
        custom_code: createForm.custom_code.trim() || null,
        usage_limit: createForm.usage_limit
          ? parseInt(createForm.usage_limit)
          : null,
        expires_in_days: createForm.expires_in_days
          ? parseInt(createForm.expires_in_days)
          : null,
        libraries:
          createForm.libraries.length > 0
            ? createForm.libraries.join(",")
            : "all",
      };

      await api.post("/invites/", payload);

      setShowCreateModal(false);
      setCreateForm({
        custom_code: "",
        usage_limit: "",
        expires_in_days: "",
        allow_sync: false,
        allow_camera_upload: false,
        allow_channels: false,
        plex_home: false,
        plex_server: "default",
        libraries: [],
      });

      queryClient.invalidateQueries(["invites"]);
      queryClient.invalidateQueries(["inviteStats"]);
      toast.success(t("invites.inviteCreated"));
    } catch (error) {
      console.error("Error creating invite:", error);
      toast.error(t("invites.errorCreating"));
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    if (!window.confirm(t("invites.confirmDelete"))) {
      return;
    }

    try {
      await api.delete(`/invites/${inviteId}`);
      queryClient.invalidateQueries(["invites"]);
      queryClient.invalidateQueries(["inviteStats"]);
      queryClient.invalidateQueries(["plexLiveStats"]);
      toast.success(t("invites.inviteDeleted"));
    } catch (error) {
      console.error("Error deleting invite:", error);
      toast.error(t("invites.errorDeleting"));
    }
  };

  const handleCopyCode = (code) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success(t("invites.linkCopied"));
  };

  const getInviteStatus = (invite) => {
    if (!invite.is_active)
      return {
        text: t("invites.status.disabled"),
        color: "bg-gray-500/20 text-gray-400",
      };
    if (invite.is_expired)
      return {
        text: t("invites.status.expired"),
        color: "bg-red-500/20 text-red-400",
      };
    if (invite.is_exhausted)
      return {
        text: t("invites.status.usedUp"),
        color: "bg-orange-500/20 text-orange-400",
      };
    return {
      text: t("invites.status.active"),
      color: "bg-green-500/20 text-green-400",
    };
  };

  if (loading) {
    return (
      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-theme-card border border-theme rounded-xl p-5 shadow-sm"
            >
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-theme-hover rounded w-24" />
                <div className="h-8 bg-theme-hover rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header with Search & Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder={t("invites.searchPlaceholder") || "Search invites..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme rounded-lg text-theme-text text-sm placeholder-theme-text-muted transition-all focus:outline-none focus:border-theme-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={async () => {
              await Promise.all([
                queryClient.refetchQueries(["invites"]),
                queryClient.refetchQueries(["inviteStats"]),
                queryClient.refetchQueries(["plexUsersCount"]),
              ]);
              toast.success(t("invites.refreshed"));
            }}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
            disabled={isFetching}
          >
            <RefreshCw
              size={16}
              className={`text-theme-primary ${
                isFetching ? "animate-spin" : ""
              }`}
            />
            <span className="text-xs sm:text-sm">
              {isFetching
                ? t("common.refreshing", "Refreshing")
                : t("invites.refresh")}
            </span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <Plus size={16} className="text-theme-primary" />
            <span className="text-xs sm:text-sm">
              {t("invites.createInvite")}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="space-y-3">
          {/* Invite Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div
              onClick={() => setFilter("all")}
              className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-theme-primary hover:bg-theme-primary/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3 text-theme-primary" />
                    {t("invites.stats.totalInvites")}
                  </p>
                  <p className="text-2xl font-bold text-theme-text mt-1">
                    {stats.total_invites || 0}
                  </p>
                </div>
                <Mail className="w-8 h-8 text-theme-primary" />
              </div>
            </div>

            <div
              onClick={() => setFilter("active")}
              className={`bg-theme-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-green-500/10 ${
                filter === "active"
                  ? "border-green-500 ring-2 ring-green-500/20"
                  : "border-theme hover:border-green-500/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-500" />
                    {t("invites.stats.activeInvites")}
                  </p>
                  <p className="text-2xl font-bold text-green-500 mt-1">
                    {stats.active_invites || 0}
                  </p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div
              onClick={() => setFilter("used-up")}
              className={`bg-theme-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-orange-500/10 ${
                filter === "used-up"
                  ? "border-orange-500 ring-2 ring-orange-500/20"
                  : "border-theme hover:border-orange-500/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <X className="w-3 h-3 text-orange-500" />
                    {t("invites.stats.usedUp")}
                  </p>
                  <p className="text-2xl font-bold text-orange-500 mt-1">
                    {stats.used_up_invites || 0}
                  </p>
                </div>
                <X className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div
              onClick={() => setFilter("expired")}
              className={`bg-theme-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-red-500/10 ${
                filter === "expired"
                  ? "border-red-500 ring-2 ring-red-500/20"
                  : "border-theme hover:border-red-500/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-red-500" />
                    {t("invites.stats.expired")}
                  </p>
                  <p className="text-2xl font-bold text-red-500 mt-1">
                    {invites.filter((inv) => inv.is_expired).length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {t("invites.stats.totalRedemptions")}
                  </p>
                  <p className="text-2xl font-bold text-purple-500 mt-1">
                    {stats.total_redemptions || 0}
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Plex Media Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
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

            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
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

            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
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

            <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
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
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === "all"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("invites.filter.all")}
            <span
              className={`ml-2 text-xs ${
                filter === "all" ? "text-white/80" : "text-theme-text-muted"
              }`}
            >
              ({invites.length})
            </span>
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === "active"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("invites.filter.active")}
            <span
              className={`ml-2 text-xs ${
                filter === "active" ? "text-white/80" : "text-theme-text-muted"
              }`}
            >
              (
              {
                invites.filter(
                  (inv) => !inv.is_expired && !inv.is_exhausted && inv.is_active
                ).length
              }
              )
            </span>
          </button>
          <button
            onClick={() => setFilter("expired")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === "expired"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("invites.filter.expired")}
            <span
              className={`ml-2 text-xs ${
                filter === "expired" ? "text-white/80" : "text-theme-text-muted"
              }`}
            >
              ({invites.filter((inv) => inv.is_expired).length})
            </span>
          </button>
          <button
            onClick={() => setFilter("used-up")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === "used-up"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("invites.filter.usedUp")}
            <span
              className={`ml-2 text-xs ${
                filter === "used-up" ? "text-white/80" : "text-theme-text-muted"
              }`}
            >
              ({invites.filter((inv) => inv.is_exhausted).length})
            </span>
          </button>
        </div>
      </div>

      {/* Invites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {invites
          .filter((invite) => {
            // Filter by status
            if (filter === "all") return true;
            if (filter === "active")
              return (
                !invite.is_expired && !invite.is_exhausted && invite.is_active
              );
            if (filter === "expired") return invite.is_expired;
            if (filter === "used-up") return invite.is_exhausted;
            if (filter === "disabled") return !invite.is_active;
            return true;
          })
          .filter((invite) => {
            // Filter by search term
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            return (
              invite.code.toLowerCase().includes(searchLower) ||
              (invite.custom_code &&
                invite.custom_code.toLowerCase().includes(searchLower)) ||
              (invite.created_by &&
                invite.created_by.toLowerCase().includes(searchLower))
            );
          })
          .map((invite) => {
            const status = getInviteStatus(invite);
            const usagePercentage = invite.usage_limit
              ? (invite.used_count / invite.usage_limit) * 100
              : 0;

            // Get library names from IDs
            const getLibraryNames = (librariesString) => {
              if (librariesString === "all")
                return [
                  { name: t("invites.fields.allLibraries"), type: "all" },
                ];

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

            const libraries = getLibraryNames(invite.libraries);

            return (
              <div
                key={invite.id}
                className="group bg-theme-card border border-theme rounded-xl p-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden"
              >
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

                {/* Header */}
                <div className="relative space-y-2.5 mb-3">
                  {/* Status, Usage & Redeemed Users Row */}
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        status.color
                      } border backdrop-blur-sm ${
                        status.text === t("invites.status.active")
                          ? "border-green-500/30 shadow-sm shadow-green-500/20"
                          : status.text === t("invites.status.expired")
                          ? "border-red-500/30 shadow-sm shadow-red-500/20"
                          : status.text === t("invites.status.usedUp")
                          ? "border-orange-500/30 shadow-sm shadow-orange-500/20"
                          : "border-gray-500/30"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          status.text === t("invites.status.active")
                            ? "bg-green-400 animate-pulse"
                            : status.text === t("invites.status.expired")
                            ? "bg-red-400"
                            : status.text === t("invites.status.usedUp")
                            ? "bg-orange-400"
                            : "bg-gray-400"
                        }`}
                      />
                      {status.text}
                    </span>
                  </div>

                  {/* Code Display */}
                  <div className="flex items-center gap-2 bg-theme-hover/50 backdrop-blur-sm border border-theme rounded-lg p-2.5 group-hover:border-theme-primary/30 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-theme-primary flex-shrink-0" />
                    <code className="flex-1 font-mono text-sm font-bold text-theme-text tracking-wide">
                      {invite.code}
                    </code>
                    {!invite.is_expired && !invite.is_exhausted && (
                      <button
                        onClick={() => handleCopyCode(invite.code)}
                        className="p-1.5 hover:bg-theme-card rounded-md transition-colors group/btn"
                        title="Copy invite link"
                      >
                        {copiedCode === invite.code ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Clipboard className="w-3.5 h-3.5 text-theme-muted group-hover/btn:text-theme-primary transition-colors" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="relative space-y-2 mb-3">
                  {/* Created, Expiry & Usage */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-theme-hover/30">
                      <div className="flex items-center gap-1.5 text-theme-muted mb-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="text-xs font-medium">
                          {t("invites.fields.created")}
                        </span>
                      </div>
                      <div className="text-xs text-theme-text font-semibold">
                        <FormattedDate date={invite.created_at} />
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-theme-hover/30">
                      <div className="flex items-center gap-1.5 text-theme-muted mb-1">
                        <svg
                          className="w-3 h-3 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs font-medium">
                          {t("invites.fields.expires")}
                        </span>
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          invite.is_expired
                            ? "text-red-400"
                            : invite.expires_at
                            ? "text-theme-text"
                            : "text-theme-primary"
                        }`}
                      >
                        <FormattedDate date={invite.expires_at} />
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm border ${
                          invite.usage_limit
                            ? usagePercentage >= 100
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : usagePercentage >= 90
                              ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                              : usagePercentage >= 75
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : usagePercentage >= 50
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                        }`}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        {invite.used_count}/{invite.usage_limit || "∞"}
                      </span>
                    </div>
                  </div>

                  {/* Server Row */}
                  <div className="p-2 rounded-lg bg-theme-hover/30">
                    <div className="flex items-center gap-1.5 text-theme-muted mb-1.5">
                      <svg
                        className="w-3 h-3 flex-shrink-0"
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
                      <span className="text-xs font-medium">
                        {t("invites.fields.server")}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      <svg
                        className="w-3 h-3 flex-shrink-0"
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
                      <span className="truncate max-w-[200px]">
                        {plexServerName}
                      </span>
                    </span>
                  </div>

                  {/* Libraries Row */}
                  <div className="p-2 rounded-lg bg-theme-hover/30">
                    <div className="flex items-center gap-1.5 text-theme-muted mb-1.5">
                      <svg
                        className="w-3 h-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <span className="text-xs font-medium">
                        {t("invites.fields.libraries")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {libraries.map((library, index) => {
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
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border ${
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
                            {LibraryIcon ? (
                              <LibraryIcon className="w-3 h-3 flex-shrink-0" />
                            ) : (
                              <svg
                                className="w-3 h-3 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                            )}
                            <span className="truncate max-w-[150px]">
                              {library.name}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Permissions Row */}
                  <div className="p-2 rounded-lg bg-theme-hover/30">
                    <div className="flex items-center gap-1.5 text-theme-muted mb-1">
                      <svg
                        className="w-3 h-3 flex-shrink-0"
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
                      <span className="text-xs font-medium">
                        {t("invites.fields.permissions")}
                      </span>
                    </div>
                    {!invite.allow_sync &&
                    !invite.allow_channels &&
                    !invite.plex_home ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        Default Permissions
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {invite.allow_sync && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            <svg
                              className="w-3 h-3"
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
                        {invite.allow_channels && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <Tv className="w-3 h-3" />
                            {t("invites.permissions.liveTV")}
                          </span>
                        )}
                        {invite.plex_home && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                            <svg
                              className="w-3 h-3"
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
                      </div>
                    )}
                  </div>
                </div>

                {/* Redeemed Users */}
                {invite.users && invite.users.length > 0 && (
                  <div className="relative mb-3 p-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-theme-primary mb-2">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="text-xs font-medium uppercase tracking-wider">
                        {t("invites.fields.redeemedBy")}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {invite.users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between gap-2 bg-green-500/20 backdrop-blur-sm px-2.5 py-1.5 rounded-md border border-theme"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-theme-primary/20 border border-theme-primary/30 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-3 h-3 text-theme-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-theme-text font-semibold truncate">
                                {user.username || user.email}
                              </div>
                              <div className="text-[10px] text-theme-muted">
                                <FormattedDate date={user.created_at} />
                              </div>
                            </div>
                          </div>
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="relative flex gap-2">
                  {!invite.is_expired && !invite.is_exhausted ? (
                    <>
                      <button
                        onClick={() => handleCopyCode(invite.code)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2  hover:bg-theme-hover border border-theme hover:border-theme-primary/50 text-theme-text hover:text-theme-primary rounded-lg transition-all text-sm font-semibold shadow-sm hover:shadow-md group/copy"
                      >
                        {copiedCode === invite.code ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{t("invites.buttons.copied")}</span>
                          </>
                        ) : (
                          <>
                            <Clipboard className="w-3.5 h-3.5 group-hover/copy:scale-110 transition-transform" />
                            <span>{t("invites.buttons.copyLink")}</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteInvite(invite.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg transition-all text-sm font-semibold shadow-sm hover:shadow-md group/delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 group-hover/delete:scale-110 transition-transform" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDeleteInvite(invite.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg transition-all text-sm font-semibold shadow-sm hover:shadow-md group/delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 group-hover/delete:scale-110 transition-transform" />
                      <span>{t("invites.buttons.delete")}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        {invites.filter((invite) => {
          if (filter === "all") return true;
          if (filter === "active")
            return (
              !invite.is_expired && !invite.is_exhausted && invite.is_active
            );
          if (filter === "expired") return invite.is_expired;
          if (filter === "used-up") return invite.is_exhausted;
          if (filter === "disabled") return !invite.is_active;
          return true;
        }).length === 0 && (
          <div className="col-span-full">
            {filter === "all" ? (
              <div className="bg-theme-card border border-theme rounded-xl p-8 text-center shadow-lg">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail size={32} className="text-theme-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-theme-text mb-2">
                    {t("invites.empty.title")}
                  </h3>
                  <p className="text-theme-muted mb-6">
                    {t("invites.empty.description")}
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
                  >
                    <Plus size={20} />
                    <span>{t("invites.createInvite")}</span>
                  </button>
                </div>
              </div>
            ) : filter === "active" ? (
              <div className="bg-theme-card border border-theme rounded-xl p-8 text-center shadow-lg">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-theme-text mb-2">
                    No Active Invites
                  </h3>
                  <p className="text-theme-muted mb-6">
                    You don't have any active invites at the moment. Create a
                    new invite to get started.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
                  >
                    <Plus size={20} />
                    <span>Create Active Invite</span>
                  </button>
                </div>
              </div>
            ) : filter === "expired" ? (
              <div className="bg-theme-card border border-theme rounded-xl p-8 text-center shadow-lg">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-theme-text mb-2">
                    No Expired Invites
                  </h3>
                  <p className="text-theme-muted mb-6">
                    Great news! You don't have any expired invites. All your
                    invites are either active or have been used.
                  </p>
                  <button
                    onClick={() => setFilter("all")}
                    className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
                  >
                    <Mail size={20} className="text-theme-primary" />
                    <span>View All Invites</span>
                  </button>
                </div>
              </div>
            ) : filter === "used-up" ? (
              <div className="bg-theme-card border border-theme rounded-xl p-8 text-center shadow-lg">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X size={32} className="text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-theme-text mb-2">
                    No Used Up Invites
                  </h3>
                  <p className="text-theme-muted mb-6">
                    None of your invites have reached their usage limit yet. All
                    invites are still available for use.
                  </p>
                  <button
                    onClick={() => setFilter("all")}
                    className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
                  >
                    <Mail size={20} className="text-theme-primary" />
                    <span>View All Invites</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-theme-card border border-theme rounded-xl p-8 text-center shadow-lg">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail size={32} className="text-theme-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-theme-text mb-2">
                    No Invites Found
                  </h3>
                  <p className="text-theme-muted mb-6">
                    No invites match the current filter. Try selecting a
                    different filter or create a new invite.
                  </p>
                  <button
                    onClick={() => setFilter("all")}
                    className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
                  >
                    <Mail size={20} className="text-theme-primary" />
                    <span>View All Invites</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Invite Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-theme-card rounded-lg shadow-xl max-w-2xl w-full border border-theme max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-theme">
              <h2 className="text-xl font-semibold text-theme-text">
                {t("invites.createNew")}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-theme-hover rounded-lg transition-colors"
                type="button"
              >
                <X className="w-5 h-5 text-theme-text-muted" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateInvite} className="p-6 space-y-6">
              {/* Custom Code (Optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-theme-text">
                  {t("invites.form.customCode")}{" "}
                  <span className="text-theme-muted text-xs">
                    ({t("invites.form.optional")})
                  </span>
                </label>
                <input
                  type="text"
                  value={createForm.custom_code}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      custom_code: e.target.value,
                    })
                  }
                  placeholder={t("invites.form.customCodePlaceholder")}
                  className="w-full px-4 py-3 bg-theme-hover border border-theme rounded-lg text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all"
                  maxLength="32"
                />
                <p className="text-xs text-theme-muted">
                  {t("invites.form.customCodeDesc")}
                </p>
              </div>

              {/* Usage Limit */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-theme-text">
                  {t("invites.form.usageLimit")}
                </label>
                <div className="relative custom-dropdown">
                  <button
                    type="button"
                    onClick={() => setUsageDropdownOpen(!usageDropdownOpen)}
                    className="w-full px-4 py-3 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <span>
                      {createForm.usage_limit || t("invites.form.unlimited")}
                      {createForm.usage_limit && ` ${t("invites.form.uses")}`}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        usageDropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {usageDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-theme-card border border-theme rounded-lg shadow-lg overflow-hidden">
                      {["", "1", "5", "10", "25", "50", "100"].map((value) => (
                        <div
                          key={value || "unlimited"}
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              usage_limit: value,
                            });
                            setUsageDropdownOpen(false);
                          }}
                          className={`px-4 py-3 cursor-pointer transition-colors ${
                            createForm.usage_limit === value
                              ? "bg-theme-primary/20 text-theme-primary"
                              : "hover:bg-theme-hover text-theme-text"
                          }`}
                        >
                          {value || t("invites.form.unlimited")}
                          {value && ` ${t("invites.form.uses")}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-theme-text">
                  {t("invites.form.expiresIn")}
                </label>
                <div className="relative custom-dropdown">
                  <button
                    type="button"
                    onClick={() => setExpiryDropdownOpen(!expiryDropdownOpen)}
                    className="w-full px-4 py-3 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <span>
                      {createForm.expires_in_days || t("invites.fields.never")}
                      {createForm.expires_in_days &&
                        ` ${t("invites.form.days")}`}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        expiryDropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {expiryDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-theme-card border border-theme rounded-lg shadow-lg overflow-hidden">
                      {["", "1", "7", "14", "30", "60", "90", "365"].map(
                        (value) => (
                          <div
                            key={value || "never"}
                            onClick={() => {
                              setCreateForm({
                                ...createForm,
                                expires_in_days: value,
                              });
                              setExpiryDropdownOpen(false);
                            }}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              createForm.expires_in_days === value
                                ? "bg-theme-primary/20 text-theme-primary"
                                : "hover:bg-theme-hover text-theme-text"
                            }`}
                          >
                            {value || t("invites.fields.never")}
                            {value && ` ${t("invites.form.days")}`}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-theme-text">
                  {t("invites.form.permissionsTitle")}
                </label>

                <label className="flex items-center justify-between p-3 bg-theme-hover rounded-lg cursor-pointer hover:bg-theme-primary/10 transition-colors">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-theme-text">
                      {t("invites.form.allowSync")}
                    </div>
                    <div className="text-xs text-theme-muted">
                      {t("invites.form.allowSyncDesc")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm({
                        ...createForm,
                        allow_sync: !createForm.allow_sync,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-theme-bg ${
                      createForm.allow_sync ? "bg-green-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        createForm.allow_sync
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between p-3 bg-theme-hover rounded-lg cursor-pointer hover:bg-theme-primary/10 transition-colors">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-theme-text">
                      {t("invites.form.allowLiveTV")}
                    </div>
                    <div className="text-xs text-theme-muted">
                      {t("invites.form.allowLiveTVDesc")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm({
                        ...createForm,
                        allow_channels: !createForm.allow_channels,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-theme-bg ${
                      createForm.allow_channels ? "bg-green-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        createForm.allow_channels
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between p-3 bg-theme-hover rounded-lg cursor-pointer hover:bg-theme-primary/10 transition-colors">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-theme-text">
                      {t("invites.form.plexHome")}
                    </div>
                    <div className="text-xs text-theme-muted">
                      {t("invites.form.plexHomeDesc")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm({
                        ...createForm,
                        plex_home: !createForm.plex_home,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-theme-bg ${
                      createForm.plex_home ? "bg-green-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        createForm.plex_home ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* Library Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-theme-text">
                  {t("invites.form.libraryAccess")}
                </label>

                {/* All Libraries Option */}
                <label className="flex items-center justify-between p-3 bg-theme-hover rounded-lg cursor-pointer hover:bg-theme-primary/10 transition-colors">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-theme-text">
                      {t("invites.form.allLibrariesTitle")}
                    </div>
                    <div className="text-xs text-theme-muted">
                      {t("invites.form.allLibrariesDesc")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateForm({
                        ...createForm,
                        libraries: [],
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-theme-bg ${
                      createForm.libraries.length === 0
                        ? "bg-green-500"
                        : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        createForm.libraries.length === 0
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>

                {/* Individual Libraries Grid */}
                {plexLibraries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider px-1">
                      {t("invites.form.selectSpecific")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto p-1">
                      {plexLibraries.map((library) => {
                        const isSelected = createForm.libraries.includes(
                          library.id.toString()
                        );
                        const LibraryIcon =
                          library.type === "movie"
                            ? Film
                            : library.type === "show"
                            ? Tv
                            : Music;

                        return (
                          <label
                            key={library.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "bg-theme-primary/10"
                                : "bg-theme-hover hover:bg-theme-primary/5"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                library.type === "movie"
                                  ? "bg-blue-500/20 border border-blue-500/30"
                                  : library.type === "show"
                                  ? "bg-purple-500/20 border border-purple-500/30"
                                  : "bg-pink-500/20 border border-pink-500/30"
                              }`}
                            >
                              <LibraryIcon
                                className={`w-5 h-5 ${
                                  library.type === "movie"
                                    ? "text-blue-400"
                                    : library.type === "show"
                                    ? "text-purple-400"
                                    : "text-pink-400"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-sm font-medium truncate ${
                                  isSelected
                                    ? "text-theme-primary"
                                    : "text-theme-text"
                                }`}
                              >
                                {library.name}
                              </div>
                              <div className="text-xs text-theme-text-muted capitalize">
                                {t(`invites.libraryTypes.${library.type}`)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const libId = library.id.toString();
                                const newLibraries = isSelected
                                  ? createForm.libraries.filter(
                                      (id) => id !== libId
                                    )
                                  : [...createForm.libraries, libId];

                                setCreateForm({
                                  ...createForm,
                                  libraries:
                                    newLibraries.length > 0 ? newLibraries : [],
                                });
                              }}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-theme-bg flex-shrink-0 ${
                                isSelected ? "bg-green-500" : "bg-gray-600"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isSelected ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No Libraries Found */}
                {plexLibraries.length === 0 && (
                  <div className="p-6 text-center bg-theme-hover rounded-lg border border-theme">
                    <p className="text-sm text-theme-text-muted">
                      {t("invites.form.noLibraries")}
                    </p>
                    <p className="text-xs text-theme-text-muted mt-1">
                      {t("invites.form.noLibrariesDesc")}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 bg-theme-hover hover:bg-theme-primary/20 border border-theme rounded-lg transition-all font-semibold text-theme-text"
                >
                  {t("invites.buttons.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 items-center justify-center gap-2 sm:px-4 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
                >
                  {t("invites.buttons.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitesManager;
