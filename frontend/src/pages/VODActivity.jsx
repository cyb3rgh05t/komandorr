import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../context/ToastContext";
import {
  Video,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  Users,
  Monitor,
  Cpu,
  Activity,
  Server,
  Search,
} from "lucide-react";
import { api } from "@/services/api";

const StateBadge = ({ state }) => {
  const { t } = useTranslation();
  const styles = {
    playing: {
      icon: Play,
      className: "bg-green-500/20 text-green-400 border border-green-500/30",
      label: t("vodActivity.states.playing", "Playing"),
    },
    paused: {
      icon: Pause,
      className: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
      label: t("vodActivity.states.paused", "Paused"),
    },
    buffering: {
      icon: RefreshCw,
      className:
        "bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse",
      label: t("vodActivity.states.buffering", "Buffering"),
    },
    stopped: {
      icon: AlertCircle,
      className: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
      label: t("vodActivity.states.stopped", "Stopped"),
    },
  };

  const style = styles[state?.toLowerCase()] || styles.stopped;
  const Icon = style.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${style.className}`}
    >
      <Icon size={14} className={state === "buffering" ? "animate-spin" : ""} />
      <span className="text-xs font-medium">{style.label}</span>
    </div>
  );
};

const ProgressBar = ({ progress, position_ms, duration_ms }) => {
  const percent = typeof progress === "number" ? Math.min(progress, 100) : 0;

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-theme-text-muted">
        <span>{formatTime(position_ms)}</span>
        <span>{formatTime(duration_ms)}</span>
      </div>
      <div className="relative h-2 bg-theme-hover rounded-full overflow-hidden">
        <div
          className="h-full bg-theme-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const SessionCard = ({ session }) => {
  const { t } = useTranslation();

  const formatBitrate = (kbps) => {
    if (!kbps || kbps === 0) return "0 Kbps";
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${kbps} Kbps`;
  };

  return (
    <div className="bg-theme-card border border-theme rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all shadow-sm hover:shadow-md relative">
      {/* Background Fanart */}
      {session.media.art && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={`/api/plex/proxy/image?url=${encodeURIComponent(
              session.media.art
            )}`}
            alt=""
            className="w-full h-auto object-cover object-center opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-black/55" />
        </div>
      )}

      <div className="flex relative z-10">
        {/* Left: Poster */}
        <div className="flex-shrink-0 w-32 self-stretch bg-theme-hover/50 relative z-10">
          {session.media.thumb ? (
            <img
              src={`/api/plex/proxy/image?url=${encodeURIComponent(
                session.media.thumb
              )}`}
              alt={session.media.title}
              className="w-full h-full object-cover rounded-l-lg"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video size={32} className="text-theme-text-muted" />
            </div>
          )}
        </div>

        {/* Right: Content */}
        <div className="flex-1 p-4 min-w-0 relative z-10">
          <div className="space-y-3">
            {/* Title & User with Avatar */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-theme-text mb-1 line-clamp-2">
                  {session.media.title}
                </h3>
                <div className="flex items-center flex-wrap gap-1.5">
                  <Users
                    size={12}
                    className="text-theme-text-muted flex-shrink-0"
                  />
                  <span className="text-sm bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium">
                    {session.user.name}
                  </span>
                  <span className="text-theme-text-muted">•</span>
                  <Monitor
                    size={12}
                    className="text-theme-text-muted flex-shrink-0"
                  />
                  <span className="text-sm text-theme-text-muted truncate">
                    {session.device.client ||
                      t("vodActivity.labels.unknown", "Unknown")}
                  </span>
                </div>
              </div>

              {/* User Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 relative z-20">
                {session.user.thumb ? (
                  <img
                    src={`/api/plex/proxy/image?url=${encodeURIComponent(
                      session.user.thumb
                    )}`}
                    alt={session.user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-theme-primary/20 flex items-center justify-center">
                    <Users size={18} className="text-theme-primary" />
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                  session.media.type === "movie"
                    ? "bg-purple-500/20 border border-purple-500/30 text-purple-400"
                    : session.media.type === "episode"
                    ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400"
                    : "bg-theme-primary/20 border border-theme-primary/30 text-theme-primary"
                }`}
              >
                {session.media.type}
              </span>
              {session.media.year && (
                <span className="px-2 py-0.5 bg-slate-500/20 border border-slate-500/30 rounded text-xs font-semibold text-slate-300">
                  {session.media.year}
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  session.stream.video_resolution >= 2160
                    ? "bg-pink-500/20 border border-pink-500/30 text-pink-400"
                    : session.stream.video_resolution >= 1080
                    ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-400"
                    : session.stream.video_resolution >= 720
                    ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
                    : "bg-gray-500/20 border border-gray-500/30 text-gray-400"
                }`}
              >
                {session.stream.video_resolution
                  ? `${session.stream.video_resolution}p`
                  : t("vodActivity.labels.unknown", "Unknown")}
              </span>
              {session.stream.container && (
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs font-semibold text-emerald-400 uppercase">
                  {session.stream.container}
                </span>
              )}
              {session.transcode.is_transcoding ? (
                <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded text-xs font-semibold text-orange-400">
                  {t("vodActivity.labels.transcoding", "Transcoding")}
                  {session.transcode.speed
                    ? ` ${session.transcode.speed.toFixed(1)}x`
                    : ""}
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-xs font-semibold text-green-400">
                  {t("vodActivity.labels.directPlay", "Direct Play")}
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                  session.stream.location === "lan"
                    ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
                    : "bg-purple-500/20 border border-purple-500/30 text-purple-400"
                }`}
              >
                {session.stream.location === "lan"
                  ? t("vodActivity.labels.lan", "LAN")
                  : session.stream.location === "wan"
                  ? t("vodActivity.labels.wan", "WAN")
                  : t("vodActivity.labels.unknown", "Unknown")}
              </span>
            </div>

            {/* Progress Bar */}
            <ProgressBar
              progress={session.playback.progress}
              position_ms={session.playback.position_ms}
              duration_ms={session.playback.duration_ms}
            />

            {/* Technical Details */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-theme">
              <div className="flex items-center flex-wrap gap-3 text-theme-text-muted">
                <div className="flex items-center gap-1.5">
                  <Server size={12} className="flex-shrink-0" />
                  <span className="truncate">
                    {session.device.platform ||
                      t("vodActivity.labels.unknown", "Unknown")}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Video size={12} className="flex-shrink-0" />
                  <span className="truncate uppercase">
                    {session.stream.video_codec || "?"} /{" "}
                    {session.stream.audio_codec || "?"}
                  </span>
                </div>
                {session.stream.bandwidth > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Activity size={12} className="flex-shrink-0" />
                      <span className="truncate">
                        {formatBitrate(session.stream.bandwidth)}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <StateBadge state={session.playback.state} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingCard = () => (
  <div className="bg-theme-card border border-theme rounded-lg p-6">
    <div className="space-y-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-theme-hover" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-theme-hover rounded w-3/4" />
          <div className="h-3 bg-theme-hover rounded w-1/2" />
          <div className="flex gap-2">
            <div className="h-6 bg-theme-hover rounded w-16" />
            <div className="h-6 bg-theme-hover rounded w-16" />
          </div>
          <div className="h-2 bg-theme-hover rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

const VODActivity = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch sessions with auto-refresh using React Query
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["plex-sessions"],
    queryFn: async () => {
      const response = await api.get("/plex/sessions");
      return response;
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 3000,
    placeholderData: (previousData) => previousData,
  });

  const sessions = data?.sessions || [];
  const hasError = data?.error || isError;
  const errorMessage = data?.message || error?.message;

  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["plex-sessions"] });
      showToast(t("vodActivity.refreshSuccess"), "success");
    } catch (err) {
      showToast(t("vodActivity.refreshError"), "error");
    }
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const userName = (session.user.name || "").toLowerCase();
    const mediaTitle = (session.media.title || "").toLowerCase();
    const mediaType = (session.media.type || "").toLowerCase();
    const deviceClient = (session.device.client || "").toLowerCase();
    const devicePlatform = (session.device.platform || "").toLowerCase();

    return (
      userName.includes(query) ||
      mediaTitle.includes(query) ||
      mediaType.includes(query) ||
      deviceClient.includes(query) ||
      devicePlatform.includes(query)
    );
  });

  // Calculate stats from filtered sessions
  const totalSessions = filteredSessions.length;
  const transcodingSessions = filteredSessions.filter(
    (s) => s.transcode.is_transcoding
  ).length;
  const playingSessions = filteredSessions.filter(
    (s) => s.playback.state === "playing"
  ).length;
  const pausedSessions = filteredSessions.filter(
    (s) => s.playback.state === "paused"
  ).length;

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Search Bar, Live Indicator & Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder={t(
              "vodStreams.searchPlaceholder",
              "Search sessions..."
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted transition-colors focus:outline-none focus:border-theme-primary"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-theme-card border border-theme rounded-lg flex-1 sm:flex-initial justify-center">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-theme-text">
              {t("vodStreams.live", "Live")}
            </span>
          </div>
          <button
            onClick={handleRefresh}
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
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-theme-primary" />
                {t("vodActivity.stats.totalSessions", "Total")}
              </p>
              <p className="text-2xl font-bold text-theme-text mt-1">
                {totalSessions}
              </p>
            </div>
            <Users className="w-8 h-8 text-theme-primary" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Play className="w-3 h-3 text-green-500" />
                {t("vodActivity.stats.playing", "Playing")}
              </p>
              <p className="text-2xl font-bold text-green-500 mt-1">
                {playingSessions}
              </p>
            </div>
            <Play className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Pause className="w-3 h-3 text-orange-500" />
                {t("vodActivity.stats.paused", "Paused")}
              </p>
              <p className="text-2xl font-bold text-orange-500 mt-1">
                {pausedSessions}
              </p>
            </div>
            <Pause className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3 h-3 text-cyan-500" />
                {t("vodActivity.stats.transcoding", "Transcoding")}
              </p>
              <p className="text-2xl font-bold text-cyan-500 mt-1">
                {transcodingSessions}
              </p>
            </div>
            <Cpu className="w-8 h-8 text-cyan-500" />
          </div>
        </div>
      </div>

      {/* Error State */}
      {hasError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={20} />
            <p className="font-medium">
              {errorMessage ||
                t("vodActivity.error", "Failed to load sessions")}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !data && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading &&
        !hasError &&
        filteredSessions.length === 0 &&
        sessions.length === 0 && (
          <div className="bg-theme-card border border-theme rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-theme-primary/20 flex items-center justify-center mx-auto">
                <Activity size={32} className="text-theme-primary" />
              </div>
              <h3 className="text-xl font-semibold text-theme-text">
                {t("vodActivity.noSessions", "No Active Sessions")}
              </h3>
              <p className="text-theme-text-muted">
                {t(
                  "vodActivity.noSessionsDesc",
                  "There are currently no active streaming sessions on your Plex server."
                )}
              </p>
            </div>
          </div>
        )}

      {/* No Search Results */}
      {!isLoading &&
        !hasError &&
        filteredSessions.length === 0 &&
        sessions.length > 0 && (
          <div className="bg-theme-card border border-theme rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-theme-primary/20 flex items-center justify-center mx-auto">
                <Search size={32} className="text-theme-primary" />
              </div>
              <h3 className="text-xl font-semibold text-theme-text">
                {t("vodActivity.noMatching", "No matching sessions")}
              </h3>
              <p className="text-theme-text-muted">
                {t("vodActivity.noMatchingDesc", "No sessions found matching")}{" "}
                "{searchQuery}"
              </p>
            </div>
          </div>
        )}

      {/* Sessions List */}
      {!isLoading && !hasError && filteredSessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {filteredSessions.map((session) => (
            <SessionCard key={session.session_id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
};

export default VODActivity;
