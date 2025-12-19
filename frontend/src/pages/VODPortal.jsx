import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import {
  UserPlus,
  Server,
  Users,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  UserCheck,
  Shield,
  Crown,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";

const CACHE_KEY = "overseerr_users_cache";
const CACHE_TIMESTAMP_KEY = "overseerr_users_cache_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function VODPortal() {
  const { t } = useTranslation();
  const toast = useToast();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email_domain: "",
  });
  const [loading, setLoading] = useState(false);
  const [overseerrStatus, setOverseerrStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRequests, setUserRequests] = useState({});
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const usersPerPage = 10;
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    userId: null,
    username: "",
  });

  // Load cached users immediately for instant display
  useEffect(() => {
    const cachedUsers = loadUsersFromCache();
    if (cachedUsers) {
      setUsers(cachedUsers);
    }
  }, []);

  useEffect(() => {
    // Check Overseerr status and load settings
    checkOverseerrStatus();
    loadSettings();
    // Fetch fresh data (will use cache if recent, or fetch from API)
    fetchUsers(false, false); // skipCache=false, force=false
    fetchUserRequests();
  }, []);

  // Debounced search effect - skip cache for searches
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(true, false, searchTerm); // skipCache=true for searches
      setCurrentPage(1); // Reset to first page on search
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cache helper functions
  const loadUsersFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        // Return cached data if less than cache duration old
        if (age < CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.error("Failed to load users from cache:", err);
    }
    return null;
  };

  const saveUsersToCache = (usersData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(usersData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.error("Failed to save users to cache:", err);
    }
  };

  const clearUsersCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (err) {
      console.error("Failed to clear users cache:", err);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.get("/settings");
      if (data.overseerr?.email_domain) {
        setFormData((prev) => ({
          ...prev,
          email_domain: data.overseerr.email_domain,
        }));
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const checkOverseerrStatus = async () => {
    try {
      const data = await api.get("/overseerr/status");
      setOverseerrStatus(data);
    } catch (err) {
      console.error("Failed to check Overseerr status:", err);
    }
  };

  const fetchUserRequests = async () => {
    setRequestsLoading(true);
    try {
      const data = await api.get("/overseerr/requests");
      const requests = data.requests || [];

      // Count requests per user
      const requestsMap = {};
      requests.forEach((request) => {
        const userId = request.requestedBy?.id || request.userId;
        if (userId) {
          requestsMap[userId] = (requestsMap[userId] || 0) + 1;
        }
      });

      setUserRequests(requestsMap);
    } catch (err) {
      console.error("Failed to fetch user requests:", err);
      // Don't show error toast as this is supplementary data
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchUsers = async (skipCache = false, force = false, search = "") => {
    // If not searching and not forcing, try to use cache
    if (!skipCache && !force && !search) {
      const cachedUsers = loadUsersFromCache();
      if (cachedUsers) {
        setUsers(cachedUsers);
        return; // Use cached data, don't fetch
      }
    }

    setUsersLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await api.get(`/overseerr/users${params}`);
      const fetchedUsers = data.users || [];

      // Debug logging
      if (fetchedUsers.length > 0) {
        console.log("Sample user data:", fetchedUsers[0]);
        console.log(
          "Admin users (bit 2 set):",
          fetchedUsers
            .filter((u) => u.permissions && (u.permissions & 2) === 2)
            .map((u) => ({
              username: u.username,
              email: u.email,
              permissions: u.permissions,
              userType: u.userType,
            }))
        );
        console.log(
          "Total admin count:",
          fetchedUsers.filter((u) => u.permissions && (u.permissions & 2) === 2)
            .length
        );
      }

      setUsers(fetchedUsers);

      // Cache the results if not searching (full list only)
      if (!search) {
        saveUsersToCache(fetchedUsers);
      }
    } catch (err) {
      console.error("Failed to fetch Overseerr users:", err);
      toast.error(t("vodPortal.fetchUsersError") || "Failed to fetch users");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await api.post("/overseerr/users", {
        username: formData.username,
        password: formData.password,
        email_domain: formData.email_domain || undefined,
      });

      toast.success(
        t("vodPortal.userCreated") ||
          `User ${data.username} has been added to Overseerr`
      );
      // Reset form
      setFormData({
        username: "",
        password: "",
        email_domain: formData.email_domain, // Keep email domain
      });
      // Clear cache and force refresh to get updated list
      clearUsersCache();
      fetchUsers(true, true); // skipCache=true, force=true
      fetchUserRequests();
      setCurrentPage(1);
    } catch (err) {
      toast.error(
        err.message || t("vodPortal.error") || "Failed to create user"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.userId) return;

    try {
      await api.delete(`/overseerr/users/${deleteDialog.userId}`);

      toast.success(
        t("vodPortal.userDeleted") ||
          `User ${deleteDialog.username} has been deleted`
      );

      // Clear cache and refresh users
      clearUsersCache();
      fetchUsers(true, true);
      fetchUserRequests();

      // Close dialog
      setDeleteDialog({ isOpen: false, userId: null, username: "" });
    } catch (err) {
      toast.error(
        err.message || t("vodPortal.deleteError") || "Failed to delete user"
      );
    }
  };

  // Users are already filtered by backend, no need for local filtering
  const filteredUsers = users;

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Overseerr Status - Only show if not configured or not reachable */}
      {overseerrStatus &&
        (!overseerrStatus.configured || !overseerrStatus.reachable) && (
          <div className="p-4 rounded-xl border shadow-lg bg-yellow-500/10 border-yellow-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg backdrop-blur-sm bg-yellow-500/10">
                <Server className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium text-yellow-400">
                  {overseerrStatus.message}
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Header with Search & Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder={t("vodPortal.searchPlaceholder") || "Search users..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme rounded-lg text-theme-text text-sm placeholder-theme-text-muted transition-all focus:outline-none focus:border-theme-primary"
          />
        </div>

        <button
          onClick={() => {
            clearUsersCache();
            fetchUsers(true, true, searchTerm); // skipCache=true, force=true
          }}
          disabled={usersLoading}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
        >
          <RefreshCw
            size={16}
            className={`text-theme-primary transition-transform duration-500 ${
              usersLoading ? "animate-spin" : ""
            }`}
          />
          <span className="text-xs sm:text-sm">
            {usersLoading
              ? t("vodPortal.refreshing") || "Refreshing..."
              : t("vodPortal.refresh") || "Refresh"}
          </span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
        {/* Total Users */}
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-500" />
                {t("vodPortal.stats.totalUsers") || "Total Users"}
              </p>
              <p className="text-2xl font-bold text-blue-500 mt-1">
                {usersLoading ? "..." : users.length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Admin Users */}
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-500" />
                {t("vodPortal.stats.adminUsers") || "Admin Users"}
              </p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {usersLoading
                  ? "..."
                  : users.filter(
                      (u) => u.permissions && (u.permissions & 2) === 2
                    ).length}
              </p>
            </div>
            <Crown className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        {/* Plex Users */}
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-purple-500" />
                {t("vodPortal.stats.plexUsers") || "Plex Users"}
              </p>
              <p className="text-2xl font-bold text-purple-500 mt-1">
                {usersLoading
                  ? "..."
                  : users.filter((u) => u.plexToken || u.plexId).length}
              </p>
            </div>
            <Server className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        {/* Local Users */}
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-green-500" />
                {t("vodPortal.stats.localUsers") || "Local Users"}
              </p>
              <p className="text-2xl font-bold text-green-500 mt-1">
                {usersLoading
                  ? "..."
                  : users.filter((u) => !u.plexToken && !u.plexId).length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Create User Form */}
      <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

        <div className="relative">
          <h2 className="text-xl sm:text-2xl font-bold text-theme-text flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-theme-primary/10 backdrop-blur-sm">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary" />
            </div>
            {t("vodPortal.createUser") || "Add User to StreamNet VOD"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-theme-text mb-2"
                >
                  {t("vodPortal.username") || "Username"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-theme-card border border-theme rounded-lg text-theme-text text-sm placeholder-theme-text-muted transition-all focus:outline-none focus:border-theme-primary"
                  placeholder={
                    t("vodPortal.usernamePlaceholder") || "Enter username"
                  }
                  disabled={
                    !overseerrStatus?.configured || !overseerrStatus?.reachable
                  }
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-theme-text mb-2"
                >
                  {t("vodPortal.password") || "Password"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-theme-card border border-theme rounded-lg text-theme-text text-sm placeholder-theme-text-muted transition-all focus:outline-none focus:border-theme-primary"
                  placeholder={
                    t("vodPortal.passwordPlaceholder") || "Enter password"
                  }
                  disabled={
                    !overseerrStatus?.configured || !overseerrStatus?.reachable
                  }
                />
              </div>
            </div>

            {/* Email Domain */}
            <div className="md:w-1/2">
              <label
                htmlFor="email_domain"
                className="block text-sm font-medium text-theme-text mb-2"
              >
                {t("vodPortal.emailDomain") || "Email Domain"}{" "}
                <span className="text-theme-text-secondary text-xs">
                  ({t("vodPortal.optional") || "optional"})
                </span>
              </label>
              <input
                type="text"
                id="email_domain"
                name="email_domain"
                value={formData.email_domain}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-theme-card border border-theme rounded-lg text-theme-text text-sm placeholder-theme-text-muted transition-all focus:outline-none focus:border-theme-primary"
                placeholder={
                  t("vodPortal.emailDomainPlaceholder") || "example.com"
                }
                disabled={
                  !overseerrStatus?.configured || !overseerrStatus?.reachable
                }
              />
              <p className="text-xs text-theme-text-secondary mt-1">
                {t("vodPortal.emailDomainHelp") ||
                  "Email will be: username@domain.com"}
              </p>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={
                  loading ||
                  !overseerrStatus?.configured ||
                  !overseerrStatus?.reachable
                }
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4 text-theme-primary" />
                <span className="text-xs sm:text-sm">
                  {loading
                    ? t("vodPortal.creating") || "Creating..."
                    : t("vodPortal.createUser") || "Add User"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-theme-card rounded-xl border border-theme shadow-lg">
        <div className="p-4 sm:p-6 border-b border-theme">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-theme-primary" />
            <h2 className="text-lg sm:text-xl font-semibold text-theme-text">
              {t("vodPortal.existingUsers") || "Existing Users"}
            </h2>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {usersLoading ? (
            <div className="text-center py-8 text-theme-text-secondary">
              {t("vodPortal.loadingUsers") || "Loading users..."}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-theme-text-secondary">
              {searchTerm
                ? t("vodPortal.noSearchResults") || "No users match your search"
                : t("vodPortal.noUsers") || "No users found"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-theme-hover border-b border-theme">
                      <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                        {t("vodPortal.username") || "Username"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                        {t("vodPortal.email") || "Email"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                        {t("vodPortal.displayName") || "Display Name"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                        {t("vodPortal.userRole") || "User Role"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                        {t("vodPortal.userType") || "User Type"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                        {t("vodPortal.plexId") || "Plex ID"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                        {t("vodPortal.createdAt") || "Created"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                        {t("vodPortal.requests") || "Requests"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-theme-text-secondary">
                        {t("vodPortal.actions") || "Actions"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers
                      .slice(
                        (currentPage - 1) * usersPerPage,
                        currentPage * usersPerPage
                      )
                      .map((user) => {
                        const getUserType = (user) => {
                          // Check if admin bit (2) is set using bitwise AND
                          if (
                            user.permissions &&
                            (user.permissions & 2) === 2
                          ) {
                            // Check if owner bit (1) is also set
                            if ((user.permissions & 1) === 1) {
                              return {
                                label:
                                  t("vodPortal.userTypes.owner") || "Owner",
                                color: "text-red-500",
                              };
                            }
                            return {
                              label: t("vodPortal.userTypes.admin") || "Admin",
                              color: "text-amber-500",
                            };
                          }
                          // Regular user
                          return {
                            label: t("vodPortal.userTypes.user") || "User",
                            color: "text-gray-500",
                          };
                        };
                        const roleInfo = getUserType(user);

                        return (
                          <tr
                            key={user.id}
                            className="border-b border-theme hover:bg-theme-hover/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {user.avatar ? (
                                  <img
                                    src={user.avatar}
                                    alt={user.username || user.email}
                                    className="w-8 h-8 rounded-full"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-theme-primary/20 flex items-center justify-center">
                                    <span className="text-xs font-medium text-theme-primary">
                                      {(user.username || user.email || "?")
                                        .charAt(0)
                                        .toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <span className="text-sm text-theme-text font-medium">
                                  {user.username ||
                                    user.displayName ||
                                    user.email ||
                                    "N/A"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
                                <Mail className="w-4 h-4" />
                                {user.email}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-theme-text">
                              {user.displayName || "-"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Role Badge */}
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    roleInfo.label ===
                                    (t("vodPortal.userTypes.owner") || "Owner")
                                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                      : roleInfo.label ===
                                        (t("vodPortal.userTypes.admin") ||
                                          "Admin")
                                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                      : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                                  }`}
                                >
                                  {roleInfo.label ===
                                    (t("vodPortal.userTypes.owner") ||
                                      "Owner") && <Crown className="w-3 h-3" />}
                                  {roleInfo.label ===
                                    (t("vodPortal.userTypes.admin") ||
                                      "Admin") && (
                                    <Shield className="w-3 h-3" />
                                  )}
                                  {roleInfo.label}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {user.userType === 1 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                    <Server className="w-3 h-3" />
                                    Plex
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    <UserCheck className="w-3 h-3" />
                                    Local
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {user.plexId ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  <Server className="w-3 h-3" />
                                  {user.plexId}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                  <Server className="w-3 h-3" />
                                  {t("vodPortal.noPlexId") || "No Plex ID"}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-theme-text-secondary">
                              {user.createdAt
                                ? new Date(user.createdAt).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                                {requestsLoading
                                  ? "..."
                                  : userRequests[user.id] || 0}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() =>
                                  setDeleteDialog({
                                    isOpen: true,
                                    userId: user.id,
                                    username: user.username || user.email,
                                  })
                                }
                                className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-sm active:scale-95 transition-all"
                                title={
                                  t("vodPortal.deleteUser") || "Delete user"
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredUsers.length > usersPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme border border-theme rounded-xl p-5 shadow-sm">
          <div className="text-sm font-medium text-theme-text-muted">
            {t("vodPortal.showing") || "Showing"}{" "}
            <span className="text-theme-text font-semibold">
              {(currentPage - 1) * usersPerPage + 1}
            </span>{" "}
            {t("vodPortal.to") || "to"}{" "}
            <span className="text-theme-text font-semibold">
              {Math.min(currentPage * usersPerPage, filteredUsers.length)}
            </span>{" "}
            {t("vodPortal.of") || "of"}{" "}
            <span className="text-theme-text font-semibold">
              {filteredUsers.length}
            </span>{" "}
            {t("vodPortal.users") || "users"}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2.5 bg-theme hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
              title={t("vodPortal.previous") || "Previous"}
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-1.5">
              {[...Array(Math.ceil(filteredUsers.length / usersPerPage))].map(
                (_, index) => {
                  const page = index + 1;
                  const totalPages = Math.ceil(
                    filteredUsers.length / usersPerPage
                  );
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
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
                }
              )}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(
                    Math.ceil(filteredUsers.length / usersPerPage),
                    prev + 1
                  )
                )
              }
              disabled={
                currentPage === Math.ceil(filteredUsers.length / usersPerPage)
              }
              className="p-2.5 bg-theme-hover hover:bg-theme border border-theme hover:border-theme-primary rounded-lg text-theme-text hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-theme-hover disabled:hover:text-theme-text transition-all shadow-sm hover:shadow active:scale-95"
              title={t("vodPortal.next") || "Next"}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() =>
          setDeleteDialog({ isOpen: false, userId: null, username: "" })
        }
        onConfirm={handleDeleteUser}
        title={t("vodPortal.deleteUserTitle") || "Delete User"}
        message={
          t("vodPortal.deleteUserMessage") ||
          `Are you sure you want to delete ${deleteDialog.username}? This action cannot be undone.`
        }
        confirmText={t("vodPortal.delete") || "Delete"}
        confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
      />
    </div>
  );
}
