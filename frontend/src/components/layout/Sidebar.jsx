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
  Video,
  Mail,
  Users,
  BarChart3,
} from "lucide-react";
import VersionBadge from "../VersionBadge";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

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
    { path: "/services", label: t("nav.services"), icon: Server },
    { path: "/monitor", label: t("nav.monitor"), icon: Activity },
    { path: "/traffic", label: t("nav.traffic"), icon: TrendingUp },
    { path: "/vod-streams", label: t("nav.vodStreams"), icon: Video },
    { path: "/vod-activity", label: t("nav.vodActivity"), icon: Users },
    { path: "/invites", label: t("nav.invites"), icon: Mail },
    { path: "/user-accounts", label: t("nav.userAccounts"), icon: Users },
    { path: "/user-history", label: t("nav.userHistory"), icon: BarChart3 },
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

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen z-40
          w-64 bg-theme-card border-r border-theme
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center p-4 h-20">
            <img
              src="/logo.svg"
              alt="Komandorr Logo"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const invitesExpiredBadge =
                  item.path === "/invites" && expiredUnusedCount > 0;
                const usersExpiredBadge =
                  item.path === "/user-accounts" && expiredUsersCount > 0;
                const vodActivityBadge =
                  item.path === "/vod-activity" && activeSessions.length > 0;
                const showBadge =
                  invitesExpiredBadge || usersExpiredBadge || vodActivityBadge;
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
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg
                        transition-colors duration-200
                        ${
                          active
                            ? "bg-theme-hover text-white"
                            : "text-theme-text hover:bg-theme-hover hover:text-theme-text-hover"
                        }
                      `}
                    >
                      <Icon size={20} />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span
                          className={`inline-flex items-center justify-center min-w-6 px-2 py-1 text-xs font-bold rounded-full ${badgeColor} text-white`}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4">
            <VersionBadge />
          </div>
        </div>
      </aside>
    </>
  );
}
