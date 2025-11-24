import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
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
} from "lucide-react";

const InvitesManager = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [invites, setInvites] = useState([]);
  const [stats, setStats] = useState(null);
  const [plexUsersCount, setPlexUsersCount] = useState(0);
  const [plexServerName, setPlexServerName] = useState("Plex Server");
  const [plexLiveStats, setPlexLiveStats] = useState({
    total_movies: 0,
    total_tv_shows: 0,
    total_episodes: 0,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [plexServers, setPlexServers] = useState([]);
  const [plexLibraries, setPlexLibraries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Custom dropdown states
  const [usageDropdownOpen, setUsageDropdownOpen] = useState(false);
  const [expiryDropdownOpen, setExpiryDropdownOpen] = useState(false);
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [libraryDropdownOpen, setLibraryDropdownOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    usage_limit: "",
    expires_in_days: "",
    allow_sync: false,
    allow_camera_upload: false,
    allow_channels: false,
    plex_home: false,
    plex_server: "default",
    libraries: [],
  });

  useEffect(() => {
    fetchInvites();
    fetchStats();
    fetchPlexConfig();
    fetchPlexUsersCount();
    fetchPlexServerName();
    fetchPlexLiveStats();

    // Auto-refresh Plex stats every 60 seconds
    const statsInterval = setInterval(() => {
      fetchPlexLiveStats();
    }, 60000);

    // Auto-refresh invites, stats, and Plex users every 10 seconds
    const invitesInterval = setInterval(() => {
      fetchInvites();
      fetchStats();
      fetchPlexUsersCount();
    }, 10000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(invitesInterval);
    };
  }, []);

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

  const fetchInvites = async () => {
    try {
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
      setInvites(data);
    } catch (error) {
      console.error("Error fetching invites:", error);
      toast.error(t("invites.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.get("/invites/stats");
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchPlexConfig = async () => {
    try {
      const data = await api.get("/invites/plex/config");
      setPlexServers(data.servers || []);
      setPlexLibraries(data.libraries || []);
    } catch (error) {
      console.error("Error fetching Plex config:", error);
    }
  };

  const fetchPlexUsersCount = async () => {
    try {
      const data = await api.get("/plex/users/count");
      console.log("Plex users count response:", data);
      const count = data?.count || 0;
      console.log("Setting plexUsersCount to:", count);
      setPlexUsersCount(count);
    } catch (error) {
      console.error("Error fetching Plex users count:", error);
      setPlexUsersCount(0);
    }
  };

  const fetchPlexServerName = async () => {
    try {
      const data = await api.get("/plex/stats");
      if (data?.server_name) {
        setPlexServerName(data.server_name);
        console.log("Fetched Plex server name:", data.server_name);
      }
    } catch (error) {
      console.error("Error fetching Plex server name:", error);
    }
  };

  const fetchPlexLiveStats = async () => {
    try {
      const data = await api.get("/plex/stats/live");
      setPlexLiveStats({
        total_movies: data.total_movies || 0,
        total_tv_shows: data.total_tv_shows || 0,
        total_episodes: data.total_episodes || 0,
      });
      if (data.server_name) {
        setPlexServerName(data.server_name);
      }
    } catch (error) {
      console.error("Error fetching live Plex stats:", error);
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...createForm,
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
        usage_limit: "",
        expires_in_days: "",
        allow_sync: false,
        allow_camera_upload: false,
        allow_channels: false,
        plex_home: false,
        plex_server: "default",
        libraries: [],
      });

      fetchInvites();
      fetchStats();
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
      fetchInvites();
      fetchStats();
      fetchPlexLiveStats(); // Force refresh Plex stats
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

  const formatDate = (dateString) => {
    if (!dateString) return t("invites.fields.never");
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
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
      {/* Header with Buttons */}
      <div className="flex justify-end items-center gap-2">
        <button
          onClick={async () => {
            setRefreshing(true);
            await Promise.all([
              fetchInvites(),
              fetchStats(),
              fetchPlexUsersCount(),
            ]);
            setRefreshing(false);
            toast.success(t("invites.refreshed"));
          }}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={`text-theme-primary ${refreshing ? "animate-spin" : ""}`}
          />
          <span className="text-xs sm:text-sm">{t("invites.refresh")}</span>
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3 text-blue-500" />
                  {t("invites.stats.totalInvites")}
                </p>
                <p className="text-2xl font-bold text-blue-500 mt-1">
                  {stats.total_invites || 0}
                </p>
              </div>
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
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

          <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  {t("invites.stats.plexUsers")}
                </p>
                <p className="text-2xl font-bold text-theme-primary mt-1">
                  {plexUsersCount}
                </p>
              </div>
              <svg
                className="w-8 h-8 text-theme-primary"
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
      )}

      {/* Invites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invites.map((invite) => {
          const status = getInviteStatus(invite);
          return (
            <div
              key={invite.id}
              className="bg-theme-card border border-theme rounded-lg p-5 shadow-sm hover:shadow-md transition-all"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-theme">
                <div className="flex items-center gap-2">
                  <code className="bg-theme-hover px-3 py-1.5 rounded font-mono text-sm font-bold text-theme-text">
                    {invite.code}
                  </code>
                  <button
                    onClick={() => handleCopyCode(invite.code)}
                    className="p-1.5 hover:bg-theme-hover rounded transition-colors"
                    title="Copy invite link"
                  >
                    {copiedCode === invite.code ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clipboard className="w-4 h-4 text-theme-muted" />
                    )}
                  </button>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
                >
                  {status.text}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted">
                    {t("invites.fields.created")}:
                  </span>
                  <div className="text-right">
                    <div className="text-theme-text font-medium">
                      {formatDate(invite.created_at)}
                    </div>
                    {invite.created_by && (
                      <div className="text-xs text-theme-muted">
                        {t("invites.fields.by")} {invite.created_by}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted">
                    {t("invites.fields.expires")}:
                  </span>
                  <span className="text-theme-text font-medium">
                    {formatDate(invite.expires_at)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted">
                    {t("invites.fields.usage")}:
                  </span>
                  <span className="text-theme-text font-medium">
                    <span className="text-theme-primary">
                      {invite.used_count}
                    </span>{" "}
                    / {invite.usage_limit || "∞"}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted">
                    {t("invites.fields.server")}:
                  </span>
                  <span className="text-theme-text font-medium">
                    {plexServerName}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted">
                    {t("invites.fields.libraries")}:
                  </span>
                  <span className="text-theme-text font-medium">
                    {invite.libraries === "all"
                      ? t("invites.fields.allLibraries")
                      : invite.libraries}
                  </span>
                </div>

                {/* Permissions - Always show */}
                <div className="pt-2 border-t border-theme">
                  <div className="text-xs text-theme-muted mb-2">
                    {t("invites.fields.permissions")}:
                  </div>
                  {!invite.allow_sync &&
                  !invite.allow_channels &&
                  !invite.plex_home ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      {t("invites.fields.none")}
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {invite.allow_sync && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                          {t("invites.permissions.sync")}
                        </span>
                      )}
                      {invite.allow_channels && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                          {t("invites.permissions.liveTV")}
                        </span>
                      )}
                      {invite.plex_home && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                          {t("invites.permissions.home")}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {invite.users && invite.users.length > 0 && (
                  <div className="pt-2 border-t border-theme">
                    <div className="text-xs text-theme-muted mb-2">
                      {t("invites.fields.redeemedBy")}:
                    </div>
                    {invite.users.map((user) => (
                      <div
                        key={user.id}
                        className="bg-theme-hover px-2 py-1.5 rounded text-sm mb-1"
                      >
                        <div className="text-theme-text font-medium">
                          {user.username || user.email}
                        </div>
                        <div className="text-xs text-theme-muted">
                          {formatDate(user.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyCode(invite.code)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2  hover:bg-theme-primary/20 border border-theme hover:border-theme-primary/50 text-theme-text hover:text-theme-primary rounded-lg transition-all text-sm font-medium shadow-sm"
                >
                  {copiedCode === invite.code ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t("invites.buttons.copied")}</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-4 h-4" />
                      <span>{t("invites.buttons.copyLink")}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteInvite(invite.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-theme-hover hover:bg-red-500/20 border border-theme hover:border-red-500/50 text-theme-text hover:text-red-500 rounded-lg transition-all text-sm font-medium shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t("invites.buttons.delete")}</span>
                </button>
              </div>
            </div>
          );
        })}
        {invites.length === 0 && (
          <div className="col-span-full bg-theme-card border border-theme rounded-lg p-8 text-center shadow-sm">
            <Mail size={48} className="mx-auto mb-4 text-theme-text-muted" />
            <h3 className="text-lg font-semibold text-theme-text mb-2">
              {t("invites.empty.title")}
            </h3>
            <p className="text-theme-text-muted mb-6">
              {t("invites.empty.description")}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
            >
              <Plus size={20} className="text-theme-primary" />
              <span>{t("invites.createInvite")}</span>
            </button>
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
