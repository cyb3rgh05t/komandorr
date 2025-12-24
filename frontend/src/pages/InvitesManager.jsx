import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useIsFetching } from "@tanstack/react-query";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/dateUtils";
import ConfirmDialog from "../components/ConfirmDialog";
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
  Edit,
  Calendar,
  Server,
  Repeat,
  Home,
  Radio,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    inviteId: null,
    inviteCode: null,
    hasUsers: false,
    userCount: 0,
  });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvite, setEditingInvite] = useState(null);
  const [editForm, setEditForm] = useState({
    usage_limit: "",
    expires_in_days: "",
  });

  // Custom dropdown states
  const [usageDropdownOpen, setUsageDropdownOpen] = useState(false);
  const [expiryDropdownOpen, setExpiryDropdownOpen] = useState(false);
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [libraryDropdownOpen, setLibraryDropdownOpen] = useState(false);
  const [editUsageDropdownOpen, setEditUsageDropdownOpen] = useState(false);
  const [editExpiryDropdownOpen, setEditExpiryDropdownOpen] = useState(false);

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

  const handleEditInvite = (invite) => {
    setEditingInvite(invite);

    // Calculate days until expiration
    let expiresInDays = "";
    if (invite.expires_at) {
      const expiryDate = new Date(invite.expires_at);
      const now = new Date();
      const diffTime = expiryDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        expiresInDays = diffDays.toString();
      }
    }

    setEditForm({
      usage_limit: invite.usage_limit ? invite.usage_limit.toString() : "",
      expires_in_days: expiresInDays,
    });
    setShowEditModal(true);
  };

  const handleUpdateInvite = async (e) => {
    e.preventDefault();

    try {
      const updateData = {};

      // Update usage limit
      if (editForm.usage_limit === "") {
        updateData.usage_limit = null;
      } else {
        updateData.usage_limit = parseInt(editForm.usage_limit);
      }

      // Update expiration
      if (editForm.expires_in_days === "") {
        updateData.expires_at = null;
      } else {
        const expiryDate = new Date();
        expiryDate.setDate(
          expiryDate.getDate() + parseInt(editForm.expires_in_days)
        );
        updateData.expires_at = expiryDate.toISOString();
      }

      await api.put(`/invites/${editingInvite.id}`, updateData);

      setShowEditModal(false);
      setEditingInvite(null);
      setEditForm({
        usage_limit: "",
        expires_in_days: "",
      });

      queryClient.invalidateQueries(["invites"]);
      queryClient.invalidateQueries(["inviteStats"]);
      toast.success(
        t("invites.inviteUpdated") || "Invite updated successfully"
      );
    } catch (error) {
      console.error("Error updating invite:", error);
      toast.error(t("invites.errorUpdating") || "Failed to update invite");
    }
  };

  const handleDeleteInvite = (invite) => {
    setConfirmDialog({
      isOpen: true,
      inviteId: invite.id,
      inviteCode: invite.code,
      hasUsers: invite.users && invite.users.length > 0,
      userCount: invite.users ? invite.users.length : 0,
    });
  };

  const confirmDeleteInvite = async () => {
    try {
      await api.delete(`/invites/${confirmDialog.inviteId}`);
      queryClient.invalidateQueries(["invites"]);
      queryClient.invalidateQueries(["inviteStats"]);
      queryClient.invalidateQueries(["plexLiveStats"]);
      toast.success(t("invites.inviteDeleted"));
    } catch (error) {
      console.error("Error deleting invite:", error);
      // Check if error is due to users existing
      if (error.message && error.message.includes("active user")) {
        toast.error(
          t("invites.errorDeletingWithUsers") ||
            "Cannot delete invite with active users. Remove users first from User Accounts page."
        );
      } else {
        toast.error(t("invites.errorDeleting"));
      }
    }
  };

  const handleCopyCode = (code) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success(t("invites.linkCopied"));
  };

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, itemsPerPage]);

  const getInviteStatus = (invite) => {
    const badges = [];

    // If manually disabled
    if (!invite.is_active) {
      badges.push({
        text: t("invites.status.disabled"),
        color: "bg-gray-500/20 text-gray-400",
      });
      return badges;
    }

    // If invite has been redeemed (has users), show as Redeemed
    if (invite.users && invite.users.length > 0) {
      badges.push({
        text: t("invites.status.redeemed"),
        color: "bg-green-500/20 text-green-400",
      });

      // Also add expired/used up badges if applicable
      if (invite.is_expired) {
        badges.push({
          text: t("invites.status.expired"),
          color: "bg-red-500/20 text-red-400",
        });
      }
      if (invite.is_exhausted) {
        badges.push({
          text: t("invites.status.usedUp"),
          color: "bg-orange-500/20 text-orange-400",
        });
      }

      return badges;
    }

    // For unredeemed invites, check if expired or used up
    if (invite.is_expired) {
      badges.push({
        text: t("invites.status.expired"),
        color: "bg-red-500/20 text-red-400",
      });
      return badges;
    }
    if (invite.is_exhausted) {
      badges.push({
        text: t("invites.status.usedUp"),
        color: "bg-orange-500/20 text-orange-400",
      });
      return badges;
    }

    // Default: Active (not redeemed yet but still valid)
    badges.push({
      text: t("invites.status.active"),
      color: "bg-green-500/20 text-green-400",
    });
    return badges;
  };

  if (loading) {
    return (
      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold text-green-500">
                      {stats.active_invites || 0}
                    </p>
                    {invites.filter(
                      (inv) =>
                        inv.users &&
                        inv.users.length > 0 &&
                        !inv.is_expired &&
                        !inv.is_exhausted &&
                        inv.is_active
                    ).length > 0 && (
                      <p className="text-sm text-theme-text-muted">
                        (
                        {
                          invites.filter(
                            (inv) =>
                              inv.users &&
                              inv.users.length > 0 &&
                              !inv.is_expired &&
                              !inv.is_exhausted &&
                              inv.is_active
                          ).length
                        }{" "}
                        redeemed)
                      </p>
                    )}
                  </div>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div
              onClick={() => setFilter("redeemed")}
              className={`bg-theme-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-blue-500/10 ${
                filter === "redeemed"
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : "border-theme hover:border-blue-500/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <svg
                      className="w-3 h-3 text-blue-500"
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
                    {t("invites.stats.redeemed")}
                  </p>
                  <p className="text-2xl font-bold text-blue-500 mt-1">
                    {
                      invites.filter((inv) => inv.users && inv.users.length > 0)
                        .length
                    }
                  </p>
                </div>
                <svg
                  className="w-8 h-8 text-blue-500"
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
            onClick={() => setFilter("redeemed")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === "redeemed"
                ? "bg-theme-hover text-white shadow-md"
                : "bg-theme-accent text-theme-text hover:bg-theme-hover"
            }`}
          >
            {t("invites.filter.redeemed")}
            <span
              className={`ml-2 text-xs ${
                filter === "redeemed"
                  ? "text-white/80"
                  : "text-theme-text-muted"
              }`}
            >
              (
              {
                invites.filter((inv) => inv.users && inv.users.length > 0)
                  .length
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

      {/* Invites Table */}
      <div className="bg-theme-card border border-theme rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-theme-hover border-b border-theme">
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("invites.fields.code") || "Code"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("invites.fields.status") || "Status"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("invites.fields.usage") || "Usage"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("invites.fields.expires") || "Expires"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("invites.fields.libraries") || "Libraries"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("invites.fields.server") || "Server"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("invites.fields.permissions") || "Permissions"}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("invites.fields.redeemedBy") || "Redeemed By"}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-theme-text-secondary">
                  {t("invites.fields.actions") || "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Apply filters
                const filteredInvites = invites
                  .filter((invite) => {
                    // Filter by status
                    if (filter === "all") return true;
                    if (filter === "active")
                      return (
                        !invite.is_expired &&
                        !invite.is_exhausted &&
                        invite.is_active
                      );
                    if (filter === "redeemed")
                      return invite.users && invite.users.length > 0;
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
                        invite.custom_code
                          .toLowerCase()
                          .includes(searchLower)) ||
                      (invite.created_by &&
                        invite.created_by.toLowerCase().includes(searchLower))
                    );
                  });

                // Calculate pagination
                const totalItems = filteredInvites.length;
                const totalPages = Math.max(
                  1,
                  Math.ceil(totalItems / itemsPerPage)
                );
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedInvites = filteredInvites.slice(
                  startIndex,
                  endIndex
                );

                // Store for use in pagination component below
                window.__invitePaginationData = {
                  totalItems,
                  totalPages,
                  startIndex,
                  endIndex,
                };

                return paginatedInvites.map((invite) => {
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
                      const lib = plexLibraries.find(
                        (l) => l.id.toString() === id
                      );
                      return lib
                        ? { name: lib.name, type: lib.type }
                        : { name: id, type: "unknown" };
                    });
                  };

                  const libraries = getLibraryNames(invite.libraries);

                  return (
                    <tr
                      key={invite.id}
                      className="border-b border-theme hover:bg-theme-hover/30 transition-colors"
                    >
                      {/* Code Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm font-bold text-theme-text">
                            {invite.code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(invite.code)}
                            className="p-1.5 hover:bg-theme-hover rounded transition-colors"
                            title={t("invites.buttons.copyLink")}
                          >
                            {copiedCode === invite.code ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Clipboard className="w-3.5 h-3.5 text-theme-muted hover:text-theme-primary" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {status.map((badge, index) => (
                            <span
                              key={index}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${badge.color}`}
                            >
                              {badge.text}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Usage Column */}
                      <td className="py-3 px-4">
                        {invite.usage_limit ? (
                          <span
                            className={`text-sm font-semibold ${
                              usagePercentage >= 100
                                ? "text-red-400"
                                : usagePercentage >= 75
                                ? "text-orange-400"
                                : "text-theme-text"
                            }`}
                          >
                            {invite.used_count}/{invite.usage_limit}
                          </span>
                        ) : (
                          <span className="text-sm text-theme-muted">
                            {t("invites.fields.unlimited") || "Unlimited"}
                          </span>
                        )}
                      </td>

                      {/* Expires Column */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-sm ${
                            invite.is_expired
                              ? "text-red-400 font-semibold"
                              : invite.expires_at
                              ? "text-theme-text"
                              : "text-theme-primary"
                          }`}
                        >
                          <FormattedDate date={invite.expires_at} />
                        </span>
                      </td>

                      {/* Libraries Column */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {libraries.slice(0, 2).map((library, index) => {
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
                          {libraries.length > 2 && (
                            <span className="text-xs text-theme-muted">
                              +{libraries.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Server Column */}
                      <td className="py-3 px-4">
                        {invite.plex_server ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded text-xs text-emerald-400 font-semibold">
                            <Server className="w-3 h-3" />
                            {invite.plex_server}
                          </span>
                        ) : (
                          <span className="text-sm text-theme-muted">-</span>
                        )}
                      </td>

                      {/* Permissions Column */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {invite.allow_sync && (
                            <span className="inline-flex items-center gap-1 bg-blue-500/15 px-2 py-0.5 rounded text-xs text-blue-400 font-semibold">
                              <Repeat className="w-3 h-3" />
                              {t("invites.permissions.sync") || "Sync"}
                            </span>
                          )}
                          {invite.allow_channels && (
                            <span className="inline-flex items-center gap-1 bg-purple-500/15 px-2 py-0.5 rounded text-xs text-purple-400 font-semibold">
                              <Radio className="w-3 h-3" />
                              {t("invites.permissions.liveTV") || "Live TV"}
                            </span>
                          )}
                          {invite.allow_camera_upload && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded text-xs text-amber-400 font-semibold">
                              <UploadCloud className="w-3 h-3" />
                              {t("invites.permissions.cameraUpload") ||
                                "Camera Upload"}
                            </span>
                          )}
                          {invite.plex_home && (
                            <span className="inline-flex items-center gap-1 bg-green-500/15 px-2 py-0.5 rounded text-xs text-green-400 font-semibold">
                              <Home className="w-3 h-3" />
                              {t("invites.permissions.home") || "Plex Home"}
                            </span>
                          )}
                          {!invite.allow_sync &&
                            !invite.allow_channels &&
                            !invite.allow_camera_upload &&
                            !invite.plex_home && (
                              <span className="inline-flex items-center gap-1 bg-gray-500/15 px-2 py-0.5 rounded text-xs text-gray-400 font-semibold">
                                {t("invites.fields.none")}
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Redeemed By Column */}
                      <td className="py-3 px-4">
                        {invite.users && invite.users.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {invite.users.slice(0, 2).map((user) => (
                              <span
                                key={user.id}
                                className="inline-flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded text-xs text-green-400 font-semibold"
                                title={user.username || user.email}
                              >
                                <Check className="w-3 h-3" />
                                <span className="max-w-[80px] truncate">
                                  {user.username || user.email}
                                </span>
                              </span>
                            ))}
                            {invite.users.length > 2 && (
                              <span className="text-xs text-theme-muted">
                                +{invite.users.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-theme-muted">-</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditInvite(invite)}
                            className="p-2 bg-theme-primary/10 hover:bg-theme border border-theme hover:border-theme-primary text-theme-primary rounded transition-all"
                            title={t("invites.buttons.edit") || "Edit"}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvite(invite)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-all"
                            title={t("invites.buttons.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {(() => {
        const paginationData = window.__invitePaginationData || {
          totalItems: 0,
          totalPages: 1,
          startIndex: 0,
          endIndex: 0,
        };
        if (paginationData.totalItems === 0) return null;

        return (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme border border-theme rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-theme-text-muted">
                {t("invites.pagination.showing", "Showing")}{" "}
                <span className="text-theme-text font-semibold">
                  {paginationData.startIndex + 1}
                </span>{" "}
                {t("invites.pagination.to", "to")}{" "}
                <span className="text-theme-text font-semibold">
                  {Math.min(paginationData.endIndex, paginationData.totalItems)}
                </span>{" "}
                {t("invites.pagination.of", "of")}{" "}
                <span className="text-theme-text font-semibold">
                  {paginationData.totalItems}
                </span>{" "}
                {t("invites.pagination.invites", "invites")}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-theme-text-muted">
                  {t("invites.pagination.itemsPerPage", "Items per page:")}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
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
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2.5 bg-theme hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                title={t("invites.pagination.previous", "Previous")}
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1.5">
                {[...Array(paginationData.totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === paginationData.totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                          currentPage === page
                            ? "bg-theme border border-theme-primary text-white shadow-md scale-105"
                            : "bg-theme-hover hover:bg-theme border border-theme text-theme-text hover:text-theme-primary hover:border-theme-primary"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
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
                onClick={() =>
                  setCurrentPage(
                    Math.min(paginationData.totalPages, currentPage + 1)
                  )
                }
                disabled={currentPage === paginationData.totalPages}
                className="p-2.5 bg-theme-hover hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
                title={t("invites.pagination.next", "Next")}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        );
      })()}

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

      {/* Edit Modal */}
      {showEditModal && editingInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-theme-card border border-theme rounded-lg shadow-2xl max-w-md w-full animate-scaleIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-theme">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-theme-primary/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-theme-primary" />
                </div>
                <h3 className="text-xl font-bold text-theme-text">
                  {t("invites.editInvite") || "Edit Invite"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingInvite(null);
                }}
                className="p-2 hover:bg-theme-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-theme-text-muted" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateInvite} className="p-6 space-y-6">
              {/* Invite Code Display */}
              <div className="bg-theme-hover border border-theme rounded-lg p-4">
                <p className="text-xs text-theme-text-muted uppercase tracking-wider mb-1">
                  {t("invites.fields.code")}
                </p>
                <p className="text-lg font-mono font-semibold text-theme-text">
                  {editingInvite.code}
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
                    onClick={() =>
                      setEditUsageDropdownOpen(!editUsageDropdownOpen)
                    }
                    className="w-full px-4 py-3 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary  cursor-pointer transition-all flex items-center justify-between"
                  >
                    <span>
                      {editForm.usage_limit || t("invites.form.unlimited")}
                      {editForm.usage_limit && ` ${t("invites.form.uses")}`}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        editUsageDropdownOpen ? "rotate-180" : ""
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

                  {editUsageDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-theme-card border border-theme rounded-lg shadow-lg overflow-hidden">
                      {["", "1", "5", "10", "25", "50", "100"].map((value) => (
                        <div
                          key={value || "unlimited"}
                          onClick={() => {
                            setEditForm({ ...editForm, usage_limit: value });
                            setEditUsageDropdownOpen(false);
                          }}
                          className={`px-4 py-3 cursor-pointer transition-colors ${
                            editForm.usage_limit === value
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
                <p className="text-xs text-theme-text-muted">
                  {t("invites.currentUsage") || "Current usage"}:{" "}
                  {editingInvite.used_count || 0}
                </p>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-theme-text">
                  {t("invites.form.expiresIn")}
                </label>
                <div className="relative custom-dropdown">
                  <button
                    type="button"
                    onClick={() =>
                      setEditExpiryDropdownOpen(!editExpiryDropdownOpen)
                    }
                    className="w-full px-4 py-3 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary  cursor-pointer transition-all flex items-center justify-between"
                  >
                    <span>
                      {editForm.expires_in_days || t("invites.fields.never")}
                      {editForm.expires_in_days && ` ${t("invites.form.days")}`}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        editExpiryDropdownOpen ? "rotate-180" : ""
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

                  {editExpiryDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-theme-card border border-theme rounded-lg shadow-lg overflow-hidden">
                      {["", "1", "7", "14", "30", "60", "90", "365"].map(
                        (value) => (
                          <div
                            key={value || "never"}
                            onClick={() => {
                              setEditForm({
                                ...editForm,
                                expires_in_days: value,
                              });
                              setEditExpiryDropdownOpen(false);
                            }}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              editForm.expires_in_days === value
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
                {editingInvite.expires_at && (
                  <p className="text-xs text-theme-text-muted">
                    {t("invites.currentExpiry") || "Current expiry"}:{" "}
                    <FormattedDate date={editingInvite.expires_at} />
                  </p>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingInvite(null);
                }}
                className="px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme rounded-lg text-theme-text font-medium transition-all"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleUpdateInvite}
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
          setConfirmDialog({
            isOpen: false,
            inviteId: null,
            inviteCode: null,
            hasUsers: false,
            userCount: 0,
          })
        }
        onConfirm={confirmDeleteInvite}
        title={t("invites.confirmDelete")}
        message={
          confirmDialog.hasUsers
            ? t("invites.confirmDeleteWithUsers", {
                count: confirmDialog.userCount,
              })
            : t("invites.confirmDeleteMessage")
        }
        confirmText={t("invites.buttons.delete")}
        cancelText={t("invites.buttons.cancel")}
        variant="danger"
      />
    </div>
  );
};

export default InvitesManager;
