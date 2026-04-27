import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Webhook,
  Clock,
  CheckCircle,
  XCircle,
  WifiOff,
  ListOrdered,
  Server,
  FileText,
  Target,
  Tag,
} from "lucide-react";
import { api } from "../services/api";
import PageHeader from "../components/PageHeader";

function formatUptime(seconds) {
  if (!seconds || seconds <= 0) return "\u2014";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(value) {
  if (!value) return "\u2014";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function StatCard({ label, value, icon: Icon, color = "theme-primary" }) {
  return (
    <div className="bg-theme-card border border-theme rounded-xl p-4 hover:border-theme-primary/50 transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}/10`}>
          <Icon className={`w-5 h-5 text-${color}`} />
        </div>
        <div>
          <p className="text-xs text-theme-muted uppercase tracking-wider">
            {label}
          </p>
          <p className="text-lg font-bold text-theme-text">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InstanceSection({ instance, tabsSlot }) {
  const stats = instance.stats || {};
  const queue = instance.queue || [];
  const history = instance.history || [];
  const logs = instance.logs || [];
  const config = instance.config || {};
  const targetsAvailable = stats.targets_available || {};
  const targets = config.targets || {};

  const targetEntries = Object.entries(targets).flatMap(([type, items]) => {
    if (!items) return [];
    const list = Array.isArray(items)
      ? items
      : typeof items === "object"
        ? Object.entries(items).map(([name, cfg]) => ({
            ...(cfg || {}),
            _name: name,
          }))
        : [];
    return list.map((cfg, idx) => {
      const c = cfg || {};
      const displayName =
        c.name || c._name || (list.length > 1 ? `${type} ${idx + 1}` : type);
      return {
        type,
        name: displayName,
        cfg: c,
        available: targetsAvailable[displayName] !== false,
      };
    });
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Instance"
          value={instance.name || instance.id || "—"}
          icon={Tag}
          color="theme-primary"
        />
        <StatCard
          label="Queue Pending"
          value={stats.scans_remaining ?? queue.length}
          icon={ListOrdered}
          color="cyan-400"
        />
        <StatCard
          label="Processed"
          value={stats.scans_processed ?? 0}
          icon={CheckCircle}
          color="emerald-400"
        />
        <StatCard
          label="Uptime"
          value={formatUptime(stats.uptime_seconds)}
          icon={Clock}
          color="amber-400"
        />
        <StatCard
          label="Targets"
          value={`${
            Object.values(targetsAvailable).filter(Boolean).length
          }/${Object.keys(targetsAvailable).length || targetEntries.length}`}
          icon={Target}
          color="purple-400"
        />
      </div>

      {tabsSlot}

      {targetEntries.length > 0 && (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-theme">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-theme-primary" />
              <h3 className="text-base font-semibold text-theme-text">
                Target Status
              </h3>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {targetEntries.map((tg) => (
              <div
                key={`${tg.type}-${tg.name}`}
                className="bg-theme-hover border border-theme rounded-lg p-4 flex items-center gap-3"
              >
                <Server className="w-4 h-4 text-theme-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-theme-text truncate">
                    {tg.name}
                  </p>
                  {tg.cfg.url && (
                    <p className="text-xs text-theme-text-muted font-mono truncate mt-0.5">
                      {tg.cfg.url}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${
                    tg.available
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/15 text-red-400 border-red-500/30"
                  }`}
                >
                  {tg.available ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {tg.available ? "Available" : "Unavailable"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-theme-card rounded-xl border border-theme shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-theme flex items-center gap-3">
          <ListOrdered className="w-5 h-5 text-theme-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-theme-text">
              Pending Scans
            </h3>
            <p className="text-xs text-theme-text-muted mt-0.5">
              {queue.length === 0
                ? "No folders waiting right now"
                : `${queue.length} folder${queue.length === 1 ? "" : "s"} queued`}
            </p>
          </div>
        </div>
        {queue.length === 0 ? (
          <div className="p-4">
            <div className="border border-dashed border-theme rounded-lg px-4 py-3 text-sm text-theme-text-muted">
              Queue is empty
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {queue.map((q, i) => (
              <div
                key={`${q.folder || i}-${i}`}
                className="bg-theme-hover border border-theme rounded-lg p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-theme-text truncate">
                    {q.folder}
                  </p>
                  <p className="text-xs text-theme-text-muted mt-0.5">
                    {formatTime(q.time)}
                  </p>
                </div>
                {q.priority !== undefined && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                    prio {q.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-theme flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-theme-primary" />
            <h3 className="text-base font-semibold text-theme-text">
              Scan History
            </h3>
            <span className="ml-auto text-xs text-theme-text-muted">
              Last {Math.min(history.length, 10)} events
            </span>
          </div>
          <div className="p-4 space-y-2">
            {history.slice(0, 10).map((h, i) => {
              const ok =
                (h.status || "").toLowerCase() === "success" ||
                (h.status || "").toLowerCase() === "ok";
              const rawTs =
                h.completed_at ||
                h.attempted_at ||
                h.timestamp ||
                h.time ||
                h.date ||
                h.created_at;
              const time = (() => {
                if (!rawTs) return "";
                try {
                  const d = new Date(rawTs);
                  if (isNaN(d.getTime())) return String(rawTs);
                  return d.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  });
                } catch {
                  return String(rawTs);
                }
              })();
              const rawTarget = h.target || h.target_name || h.targetType || "";
              // Strip URLs / extract bare name (e.g. "plex (http://...)" -> "plex")
              const targetLabel = (() => {
                const s = String(rawTarget);
                const m = s.match(/^[a-zA-Z0-9_\-]+/);
                return m ? m[0].toLowerCase() : s.toLowerCase();
              })();
              return (
                <div
                  key={`${h.folder || i}-${i}`}
                  className="bg-theme-hover/40 border border-theme rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {ok ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    {time && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono rounded-md border border-theme bg-theme-card text-theme-text-muted">
                        {time}
                      </span>
                    )}
                    {h.target && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-purple-500/15 text-purple-300 border-purple-500/30 lowercase">
                        {targetLabel}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                        ok
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                      }`}
                    >
                      {h.status || "?"}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-theme-text-muted truncate pl-6">
                    {h.folder}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-theme flex items-center gap-2">
            <FileText className="w-5 h-5 text-theme-primary" />
            <h3 className="text-base font-semibold text-theme-text">
              Recent Logs
            </h3>
            <span className="text-xs text-theme-text-muted font-mono">
              Last {Math.min(logs.length, 50)} entries
            </span>
          </div>
          <div
            className="max-h-[28rem] overflow-auto bg-theme-bg/40"
            ref={(el) => {
              if (el) el.scrollTop = el.scrollHeight;
            }}
          >
            {logs.slice(-50).map((line, i) => {
              const raw = String(line || "");
              // Try to extract: timestamp [LEVEL] message
              const m = raw.match(
                /^([\d\-/: T.,Z+]+?)\s+(?:\[)?(INFO|DEBUG|WARN|WARNING|ERROR|TRACE|FATAL)(?:\])?\s+(.*)$/i,
              );
              const ts = m ? m[1].trim() : "";
              const level = (m ? m[2] : "").toUpperCase();
              const msg = m ? m[3] : raw;
              const levelStyle = (() => {
                switch (level) {
                  case "ERROR":
                  case "FATAL":
                    return "bg-red-500/15 text-red-400 border-red-500/30";
                  case "WARN":
                  case "WARNING":
                    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
                  case "DEBUG":
                  case "TRACE":
                    return "bg-purple-500/15 text-purple-400 border-purple-500/30";
                  case "INFO":
                    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                  default:
                    return "bg-theme-hover text-theme-text-muted border-theme";
                }
              })();
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-1 text-xs font-mono leading-tight"
                >
                  {ts && (
                    <span className="text-theme-text-muted shrink-0">{ts}</span>
                  )}
                  {level && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[52px] px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-md border shrink-0 ${levelStyle}`}
                    >
                      {level}
                    </span>
                  )}
                  <span className="text-theme-text truncate">{msg}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Autoscan() {
  const { data: connStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["autoscan-status"],
    queryFn: () => api.get("/autoscan/status"),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const {
    data: dashboard,
    isLoading: dashLoading,
    isFetching: dashFetching,
    refetch: refetchDash,
  } = useQuery({
    queryKey: ["autoscan-dashboard"],
    queryFn: () => api.get("/autoscan/dashboard"),
    staleTime: 5000,
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
    enabled: connStatus?.instances?.length > 0,
  });

  const anyConnected = connStatus?.any_connected;
  const instances = connStatus?.instances || [];
  const dashInstances = dashboard?.instances || [];
  const notConfigured = instances.length === 0 && !dashLoading;

  const [activeTab, setActiveTab] = useState(null);
  const effectiveTab =
    activeTab && dashInstances.find((i) => i.id === activeTab)
      ? activeTab
      : dashInstances.length > 0
        ? dashInstances[0].id
        : null;
  const activeInstance = dashInstances.find((i) => i.id === effectiveTab);

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Not Configured Banner */}
      {notConfigured && (
        <Link
          to="/settings?tab=autoscan"
          className="block p-4 rounded-xl border shadow-lg bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg backdrop-blur-sm bg-yellow-500/10">
              <WifiOff className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-yellow-400">
                Autoscan is not configured
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Manager Tabs (shown here only when active instance is disconnected) */}
      {dashInstances.length > 1 &&
        activeInstance &&
        !activeInstance.connected && (
          <div>
            <div className="inline-flex items-center bg-theme-card border border-theme rounded-xl p-1 gap-0.5 overflow-x-auto">
              {dashInstances.map((inst) => {
                const isActive = effectiveTab === inst.id;
                return (
                  <button
                    key={inst.id}
                    onClick={() => setActiveTab(inst.id)}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-theme-primary text-black shadow-md shadow-theme-primary/25"
                        : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/60"
                    }`}
                  >
                    {inst.name}
                    <span
                      className={`inline-block w-2 h-2 rounded-full ml-2 ${
                        inst.connected ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

      <PageHeader
        icon={Webhook}
        title="Autoscan"
        actions={
          <>
            {anyConnected ? (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-theme-card border border-theme rounded-lg">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-xs sm:text-sm font-medium text-theme-text">
                  Live
                </span>
              </div>
            ) : instances.length > 0 ? (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-theme-card border border-theme rounded-lg">
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-xs sm:text-sm font-medium text-theme-text">
                  Offline
                </span>
              </div>
            ) : null}
            {instances.length > 0 && (
              <button
                onClick={() => {
                  refetchStatus();
                  refetchDash();
                }}
                disabled={dashFetching}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-4 h-4 text-theme-primary ${dashFetching ? "animate-spin" : ""}`}
                />
                <span className="text-xs sm:text-sm">Refresh</span>
              </button>
            )}
            {instances.length === 0 && (
              <button
                onClick={() => refetchStatus()}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm"
              >
                <RefreshCw className="w-4 h-4 text-theme-primary" />
                <span className="text-xs sm:text-sm">Refresh</span>
              </button>
            )}
          </>
        }
      />

      {/* Active instance */}
      {activeInstance && (
        <div className="space-y-4">
          {activeInstance.connected ? (
            <InstanceSection
              instance={activeInstance}
              tabsSlot={
                dashInstances.length > 1 ? (
                  <div>
                    <div className="inline-flex items-center bg-theme-card border border-theme rounded-xl p-1 gap-0.5 overflow-x-auto">
                      {dashInstances.map((inst) => {
                        const isActive = effectiveTab === inst.id;
                        return (
                          <button
                            key={inst.id}
                            onClick={() => setActiveTab(inst.id)}
                            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                              isActive
                                ? "bg-theme-primary text-black shadow-md shadow-theme-primary/25"
                                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/60"
                            }`}
                          >
                            {inst.name}
                            <span
                              className={`inline-block w-2 h-2 rounded-full ml-2 ${
                                inst.connected ? "bg-emerald-400" : "bg-red-400"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              }
            />
          ) : (
            <div className="bg-theme-card border border-theme rounded-xl p-6 text-center">
              <WifiOff className="w-10 h-10 text-theme-muted mx-auto mb-3 opacity-30" />
              <p className="text-theme-muted text-sm">
                {activeInstance.error ||
                  "Cannot connect to this Autoscan instance"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {anyConnected && dashLoading && !dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-theme-card border border-theme rounded-lg p-4"
            >
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-theme-hover rounded w-2/3" />
                <div className="h-7 bg-theme-hover rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Not Configured State */}
      {notConfigured && (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <WifiOff className="w-16 h-16 mx-auto text-theme-text-muted mb-4" />
          <h3 className="text-base font-semibold text-theme-text mb-2">
            Autoscan Not Configured
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto mb-4">
            Configure one or more docker-autoscan instances in the settings to
            monitor scan triggers, targets and queue activity.
          </p>
          <Link
            to="/settings?tab=autoscan"
            className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-black rounded-lg text-sm font-medium hover:opacity-90 transition-all"
          >
            Open Settings
          </Link>
        </div>
      )}
    </div>
  );
}
