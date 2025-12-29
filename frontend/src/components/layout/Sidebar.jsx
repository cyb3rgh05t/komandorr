import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { uploaderApi } from "../../services/uploaderApi";
import {
  LayoutDashboard,
  Settings,
  Info,
  Menu,
  X,
  Server,
  Activity,
  TrendingUp,
  HardDrive,
  Video,
  Mail,
  Users,
  BarChart3,
  Upload,
  ChevronDown,
  TvIcon,
  Tv2Icon,
  FilmIcon,
  Download,
  Tv,
  Film,
  AlertCircle,
  Clock,
  ListOrdered,
} from "lucide-react";
import VersionBadge from "../VersionBadge";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTabs, setExpandedTabs] = useState({
    plex: false,
    services: false,
    downloads: false,
    uploader: false,
  });

  // Toggle tab expansion
  const toggleTab = (tabName) => {
    setExpandedTabs((prev) => ({
      ...prev,
      [tabName]: !prev[tabName],
    }));
  };

  // Fetch invites to count expired/unused
  const { data: invites = [] } = useQuery({
    queryKey: ["invites"],
    queryFn: () => api.get("/invites/"),
    staleTime: 10000,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  // Fetch Plex sessions for active session count
  const { data: sessionsData } = useQuery({
    queryKey: ["plex-sessions"],
    queryFn: async () => {
      try {
        const response = await api.get("/plex/sessions");
        return response;
      } catch {
        return { sessions: [] };
      }
    },
    refetchInterval: 5000,
    staleTime: 3000,
    placeholderData: (previousData) => previousData,
  });

  const activeSessions = sessionsData?.sessions || [];

  // Fetch Plex activities for VOD Streams badge
  const { data: plexActivities = [] } = useQuery({
    queryKey: ["plexActivities"],
    queryFn: async () => {
      try {
        const response = await api.get("/plex/activities");
        return response?.activities || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 5000,
    staleTime: 3000,
    placeholderData: (previousData) => previousData,
  });

  const vodStreamsCount = Array.isArray(plexActivities)
    ? plexActivities.length
    : 0;

  // Fetch arr-activity queue for Downloads badges
  const { data: arrQueueData = {} } = useQuery({
    queryKey: ["arr-activity", "queue"],
    queryFn: async () => {
      try {
        const response = await api.get("/arr-activity/queue");
        return response || {};
      } catch {
        return {};
      }
    },
    refetchInterval: 5000,
    staleTime: 3000,
    placeholderData: (previousData) => previousData,
  });

  // Calculate download counts for Sonarr and Radarr
  const downloadCounts = useMemo(() => {
    const instances = Object.values(arrQueueData);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    let sonarrActive = 0;
    let sonarrStuck = 0;
    let radarrActive = 0;
    let radarrStuck = 0;

    instances.forEach((inst) => {
      if (!inst.enabled || !inst.records) return;
      const isSonarr = inst.type === "sonarr";

      inst.records.forEach((record) => {
        const statusLower = (record.status || "").toLowerCase();
        const isActive =
          statusLower.includes("download") || statusLower.includes("import");
        const isCompleted =
          statusLower.includes("complet") && record.sizeleft === 0;

        if (isActive) {
          if (isSonarr) sonarrActive++;
          else radarrActive++;
        }

        if (isCompleted) {
          // Check if stuck (completed for more than 5 minutes)
          const addedTime = record.added ? new Date(record.added).getTime() : 0;
          if (addedTime && addedTime < fiveMinutesAgo) {
            if (isSonarr) sonarrStuck++;
            else radarrStuck++;
          }
        }
      });
    });

    return { sonarrActive, sonarrStuck, radarrActive, radarrStuck };
  }, [arrQueueData]);

  // Fetch uploader in-progress for Active Uploads badge
  const { data: uploaderInProgress } = useQuery({
    queryKey: ["uploader", "inprogress-sidebar"],
    queryFn: async () => {
      try {
        return await uploaderApi.getInProgress();
      } catch {
        return { jobs: [] };
      }
    },
    refetchInterval: 5000,
    staleTime: 3000,
    placeholderData: (previousData) => previousData,
  });

  const activeUploadsCount = uploaderInProgress?.jobs?.length || 0;

  // Fetch uploader failed count for Failed Items badge
  const { data: uploaderFailedCount } = useQuery({
    queryKey: ["uploader", "failed-count-sidebar"],
    queryFn: async () => {
      try {
        return await uploaderApi.getFailedCount();
      } catch {
        return { count: 0 };
      }
    },
    refetchInterval: 15000,
    staleTime: 10000,
    placeholderData: (previousData) => previousData,
  });

  const failedUploadsCount = uploaderFailedCount?.count || 0;

  // Fetch services for status badges
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.getServices(),
    staleTime: 10000,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  // Count services by status
  const offlineServices = services.filter((s) => s.status === "offline").length;
  const problemServices = services.filter((s) => s.status === "problem").length;
  const errorServices = services.filter((s) => s.status === "error").length;
  const totalIssues = offlineServices + problemServices + errorServices;

  // Count expired invites that are not redeemed
  const expiredUnusedCount = invites.filter(
    (invite) =>
      invite.is_expired && (!invite.users || invite.users.length === 0)
  ).length;

  // Extract all users from invites
  const getAllUsers = () => {
    const usersMap = new Map();
    invites.forEach((invite) => {
      if (invite.users && invite.users.length > 0) {
        invite.users.forEach((user) => {
          if (!usersMap.has(user.id)) {
            usersMap.set(user.id, user);
          }
        });
      }
    });
    return Array.from(usersMap.values());
  };

  const allUsers = getAllUsers();

  // Count expired user accounts
  const expiredUsersCount = allUsers.filter((user) => {
    if (!user.expires_at) return false;
    const expiryDate = new Date(user.expires_at);
    return expiryDate < new Date();
  }).length;

  const menuItems = [
    { path: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    {
      label: t("nav.services"),
      icon: Server,
      isTab: true,
      tabName: "services",
      items: [
        { path: "/services", label: t("nav.services"), icon: Server },
        { path: "/monitor", label: t("nav.monitor"), icon: Activity },
        { path: "/traffic", label: t("nav.traffic"), icon: TrendingUp },
      ],
    },
    {
      label: t("nav.plex"),
      icon: Tv2Icon,
      isTab: true,
      tabName: "plex",
      items: [
        { path: "/vod-activity", label: t("nav.vodActivity"), icon: Activity },
        { path: "/user-accounts", label: t("nav.userAccounts"), icon: Users },
        { path: "/invites", label: t("nav.invites"), icon: Mail },
      ],
    },
    { path: "/vod-streams", label: t("nav.vodStreams"), icon: FilmIcon },
    { path: "/vod-portal", label: t("nav.vodPortal"), icon: TvIcon },
    { path: "/storage", label: t("nav.storage", "Storage"), icon: HardDrive },
    {
      label: t("nav.uploader"),
      icon: Upload,
      isTab: true,
      tabName: "uploader",
      items: [
        {
          path: "/uploader?tab=active",
          label: t("uploader.tabs.active", "Active Uploads"),
          icon: Upload,
        },
        {
          path: "/uploader?tab=queue",
          label: t("uploader.tabs.queue", "Queue"),
          icon: ListOrdered,
        },
        {
          path: "/uploader?tab=history",
          label: t("uploader.tabs.history", "History"),
          icon: Clock,
        },
        {
          path: "/uploader?tab=failed",
          label: t("uploader.tabs.failedItems", "Failed Items"),
          icon: AlertCircle,
        },
      ],
    },
    {
      label: t("nav.arrActivity", "Downloads"),
      icon: Download,
      isTab: true,
      tabName: "downloads",
      items: [
        {
          path: "/arr-activity?tab=tvshows",
          label: t("arrActivity.tabs.tvShows", "TV Shows"),
          icon: Tv,
        },
        {
          path: "/arr-activity?tab=movies",
          label: t("arrActivity.tabs.movies", "Movies"),
          icon: Film,
        },
      ],
    },
    { path: "/settings", label: t("nav.settings"), icon: Settings },
    { path: "/about", label: t("nav.about"), icon: Info },
  ];

  const isActive = (path) => {
    // Handle paths with query params
    if (path.includes("?")) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-theme-card rounded-lg border border-theme text-theme-text"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Tablet/Desktop Toggle Button - Shows on md and up, hides on 2xl+ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:block 2xl:hidden fixed top-4 left-4 z-50 p-2 bg-theme-card rounded-lg border border-theme text-theme-text hover:bg-theme-hover transition-colors"
        title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile/tablet when expanded */}
      {isOpen && (
        <div
          className="2xl:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Collapsed on tablet (md-2xl), expanded on large desktop (2xl+) */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen z-40
          bg-theme-card border-r border-theme
          transition-all duration-300 ease-in-out
          ${
            isOpen
              ? "w-64 translate-x-0"
              : "-translate-x-full md:translate-x-0 md:w-16 2xl:w-64"
          }
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo - Hidden when collapsed on tablet */}
          <div
            className={`flex items-center justify-center p-4 h-20 overflow-hidden transition-all ${
              isOpen ? "" : "md:p-2 2xl:p-4"
            }`}
          >
            <img
              src="/logo.svg"
              alt="Komandorr Logo"
              className={`h-12 w-auto object-contain transition-all ${
                isOpen ? "" : "md:h-8 2xl:h-12"
              }`}
            />
          </div>

          {/* Navigation */}
          <nav
            className={`flex-1 transition-all ${
              isOpen ? "p-4" : "md:p-2 2xl:p-4"
            }`}
          >
            <ul className="space-y-2">
              {menuItems.map((item) => {
                if (item.isTab) {
                  // Tab with subtabs
                  const Icon = item.icon;
                  const isExpanded = expandedTabs[item.tabName];
                  const hasActiveSub = item.items.some((sub) =>
                    isActive(sub.path)
                  );

                  // Check if Plex tab has any subtabs with warning badges (expired invites/users)
                  const hasPlexBadge =
                    item.tabName === "plex" &&
                    (expiredUnusedCount > 0 || expiredUsersCount > 0);

                  // Check if Plex tab has active streams
                  const hasPlexActivityBadge =
                    item.tabName === "plex" && activeSessions.length > 0;

                  // Check if Services tab has any issues
                  const hasServicesBadge =
                    item.tabName === "services" && totalIssues > 0;

                  // Check if Uploader tab has active or failed uploads
                  const hasUploaderBadge =
                    item.tabName === "uploader" &&
                    (activeUploadsCount > 0 || failedUploadsCount > 0);
                  const uploaderBadgeCount =
                    activeUploadsCount + failedUploadsCount;
                  // Green if only active, red if any failed
                  const uploaderBadgeColor =
                    failedUploadsCount > 0 ? "bg-red-500" : "bg-green-500";

                  // Check if Downloads tab has active or stuck downloads
                  const totalActiveDownloads =
                    downloadCounts.sonarrActive + downloadCounts.radarrActive;
                  const totalStuckDownloads =
                    downloadCounts.sonarrStuck + downloadCounts.radarrStuck;
                  const hasDownloadsBadge =
                    item.tabName === "downloads" &&
                    (totalActiveDownloads > 0 || totalStuckDownloads > 0);
                  const downloadsBadgeCount =
                    totalActiveDownloads + totalStuckDownloads;
                  // Green if only active, yellow if any stuck
                  const downloadsBadgeColor =
                    totalStuckDownloads > 0 ? "bg-yellow-500" : "bg-green-500";

                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleTab(item.tabName)}
                        className={`
                          w-full flex items-center gap-3 rounded-lg
                          transition-all duration-200
                          ${
                            isOpen
                              ? "px-4 py-3"
                              : "md:px-2 md:py-3 md:justify-center 2xl:px-4 2xl:justify-start"
                          }
                          ${
                            hasActiveSub
                              ? "bg-theme-hover text-white"
                              : "text-theme-text hover:bg-theme-hover hover:text-theme-text-hover"
                          }
                        `}
                        title={!isOpen ? item.label : ""}
                      >
                        <Icon size={20} className="flex-shrink-0" />
                        <span
                          className={`flex-1 transition-all overflow-hidden whitespace-nowrap text-left ${
                            isOpen ? "" : "md:hidden 2xl:block"
                          }`}
                        >
                          {item.label}
                        </span>
                        {(hasPlexBadge || hasServicesBadge) && (
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-yellow-500 text-white ${
                              isOpen ? "" : "md:hidden 2xl:inline-flex"
                            }`}
                          >
                            !
                          </span>
                        )}
                        {hasPlexActivityBadge && (
                          <span
                            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-green-500 text-white ${
                              isOpen ? "" : "md:hidden 2xl:inline-flex"
                            }`}
                          >
                            {activeSessions.length}
                          </span>
                        )}
                        {hasUploaderBadge && (
                          <span
                            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${uploaderBadgeColor} text-white ${
                              isOpen ? "" : "md:hidden 2xl:inline-flex"
                            }`}
                          >
                            {uploaderBadgeCount}
                          </span>
                        )}
                        {hasDownloadsBadge && (
                          <span
                            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${downloadsBadgeColor} text-white ${
                              isOpen ? "" : "md:hidden 2xl:inline-flex"
                            }`}
                          >
                            {downloadsBadgeCount}
                          </span>
                        )}
                        <ChevronDown
                          size={16}
                          className={`flex-shrink-0 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          } ${isOpen ? "" : "md:hidden 2xl:block"}`}
                        />
                      </button>

                      {/* Subtabs - Show when expanded AND sidebar is open (or on 2xl+ screens) */}
                      {isExpanded && (
                        <ul
                          className={`mt-1 ml-4 space-y-1 border-l border-theme-border transition-all ${
                            isOpen ? "" : "hidden 2xl:block"
                          }`}
                        >
                          {item.items.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const active = isActive(subItem.path);
                            const invitesExpiredBadge =
                              subItem.path === "/invites" &&
                              expiredUnusedCount > 0;
                            const usersExpiredBadge =
                              subItem.path === "/user-accounts" &&
                              expiredUsersCount > 0;
                            const vodActivityBadge =
                              subItem.path === "/vod-activity" &&
                              activeSessions.length > 0;
                            const servicesBadge =
                              subItem.path === "/services" && totalIssues > 0;
                            const monitorBadge =
                              subItem.path === "/monitor" && totalIssues > 0;
                            const trafficBadge = subItem.path === "/traffic";

                            // Downloads subtab badges
                            const isTvShows =
                              subItem.path === "/arr-activity?tab=tvshows";
                            const isMovies =
                              subItem.path === "/arr-activity?tab=movies";
                            const tvShowsActiveBadge =
                              isTvShows && downloadCounts.sonarrActive > 0;
                            const tvShowsStuckBadge =
                              isTvShows && downloadCounts.sonarrStuck > 0;
                            const moviesActiveBadge =
                              isMovies && downloadCounts.radarrActive > 0;
                            const moviesStuckBadge =
                              isMovies && downloadCounts.radarrStuck > 0;

                            // Uploader Active Uploads badge
                            const isActiveUploads =
                              subItem.path === "/uploader?tab=active";
                            const activeUploadsBadge =
                              isActiveUploads && activeUploadsCount > 0;

                            // Uploader Failed Items badge
                            const isFailedItems =
                              subItem.path === "/uploader?tab=failed";
                            const failedUploadsBadge =
                              isFailedItems && failedUploadsCount > 0;

                            const showBadge =
                              invitesExpiredBadge ||
                              usersExpiredBadge ||
                              vodActivityBadge ||
                              servicesBadge ||
                              monitorBadge ||
                              tvShowsActiveBadge ||
                              tvShowsStuckBadge ||
                              moviesActiveBadge ||
                              moviesStuckBadge ||
                              activeUploadsBadge ||
                              failedUploadsBadge;
                            let badgeCount = 0;
                            let badgeColor = "bg-red-500";

                            if (invitesExpiredBadge) {
                              badgeCount = expiredUnusedCount;
                              badgeColor = "bg-red-500";
                            } else if (usersExpiredBadge) {
                              badgeCount = expiredUsersCount;
                              badgeColor = "bg-red-500";
                            } else if (vodActivityBadge) {
                              badgeCount = activeSessions.length;
                              badgeColor = "bg-green-500";
                            } else if (servicesBadge || monitorBadge) {
                              badgeCount = totalIssues;
                              badgeColor = "bg-red-500";
                            } else if (tvShowsActiveBadge) {
                              badgeCount = downloadCounts.sonarrActive;
                              badgeColor = "bg-green-500";
                            } else if (tvShowsStuckBadge) {
                              badgeCount = downloadCounts.sonarrStuck;
                              badgeColor = "bg-yellow-500";
                            } else if (moviesActiveBadge) {
                              badgeCount = downloadCounts.radarrActive;
                              badgeColor = "bg-green-500";
                            } else if (moviesStuckBadge) {
                              badgeCount = downloadCounts.radarrStuck;
                              badgeColor = "bg-yellow-500";
                            } else if (activeUploadsBadge) {
                              badgeCount = activeUploadsCount;
                              badgeColor = "bg-green-500";
                            } else if (failedUploadsBadge) {
                              badgeCount = failedUploadsCount;
                              badgeColor = "bg-red-500";
                            }

                            return (
                              <li key={subItem.path}>
                                <Link
                                  to={subItem.path}
                                  onClick={() => setIsOpen(false)}
                                  className={`
                                    flex items-center gap-3 rounded-lg px-3 py-2
                                    transition-all duration-200 relative
                                    ${
                                      active
                                        ? "bg-theme-hover text-white"
                                        : "text-theme-text hover:bg-theme-hover hover:text-theme-text-hover"
                                    }
                                  `}
                                >
                                  <SubIcon
                                    size={18}
                                    className="flex-shrink-0"
                                  />
                                  <span className="flex-1 overflow-hidden whitespace-nowrap text-sm">
                                    {subItem.label}
                                  </span>
                                  {showBadge && (
                                    <span
                                      className={`inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 text-xs font-bold rounded-full ${badgeColor} text-white`}
                                    >
                                      {badgeCount}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                } else {
                  // Regular menu item
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  // Check for VOD Streams badge
                  const isVodStreams = item.path === "/vod-streams";
                  const showVodStreamsBadge =
                    isVodStreams && vodStreamsCount > 0;

                  return (
                    <li key={item.path} className="relative group">
                      <Link
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`
                          flex items-center gap-3 rounded-lg
                          transition-all duration-200 relative
                          ${
                            isOpen
                              ? "px-4 py-3"
                              : "md:px-2 md:py-3 md:justify-center 2xl:px-4 2xl:justify-start"
                          }
                          ${
                            active
                              ? "bg-theme-hover text-white"
                              : "text-theme-text hover:bg-theme-hover hover:text-theme-text-hover"
                          }
                        `}
                        title={!isOpen ? item.label : ""}
                      >
                        <Icon size={20} className="flex-shrink-0" />
                        <span
                          className={`flex-1 transition-all overflow-hidden whitespace-nowrap ${
                            isOpen ? "" : "md:hidden 2xl:block"
                          }`}
                        >
                          {item.label}
                        </span>
                        {showVodStreamsBadge && (
                          <span
                            className={`inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 text-xs font-bold rounded-full bg-green-500 text-white ${
                              isOpen ? "" : "md:hidden 2xl:inline-flex"
                            }`}
                          >
                            {vodStreamsCount}
                          </span>
                        )}
                      </Link>
                      {/* Tooltip for collapsed state on tablets */}
                      {!isOpen && (
                        <div className="hidden md:group-hover:block 2xl:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-3 py-2 bg-theme-card border border-theme rounded-lg shadow-lg whitespace-nowrap text-sm">
                          {item.label}
                        </div>
                      )}
                    </li>
                  );
                }
              })}
            </ul>
          </nav>

          {/* Footer - Hidden when collapsed on tablet */}
          <div
            className={`transition-all overflow-hidden ${
              isOpen ? "p-4" : "md:p-0 md:h-0 2xl:p-4 2xl:h-auto"
            }`}
          >
            <VersionBadge />
          </div>
        </div>
      </aside>
    </>
  );
}
