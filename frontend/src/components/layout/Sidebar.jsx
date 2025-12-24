import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
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
} from "lucide-react";
import VersionBadge from "../VersionBadge";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTabs, setExpandedTabs] = useState({
    plex: false,
    services: false,
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
    { path: "/uploader", label: t("nav.uploader"), icon: Upload },
    { path: "/settings", label: t("nav.settings"), icon: Settings },
    { path: "/about", label: t("nav.about"), icon: Info },
  ];

  const isActive = (path) => location.pathname === path;

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

                  // Check if Plex tab has any subtabs with badges
                  const hasPlexBadge =
                    item.tabName === "plex" &&
                    (expiredUnusedCount > 0 ||
                      expiredUsersCount > 0 ||
                      activeSessions.length > 0);

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
                        {hasPlexBadge && (
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-orange-500 text-white ${
                              isOpen ? "" : "md:hidden 2xl:inline-flex"
                            }`}
                          >
                            !
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
                            const showBadge =
                              invitesExpiredBadge ||
                              usersExpiredBadge ||
                              vodActivityBadge;
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
