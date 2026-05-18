import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Shield,
  HardDrive,
  Database,
  Download,
  Upload,
  Image as ImageIcon,
  Scan,
  Server,
  ChevronRight,
} from "lucide-react";
import { api } from "@/services/api";
import { uploaderApi } from "@/services/uploaderApi";
import { arrActivityApi } from "@/services/arrActivityApi";

/* -------------------------------------------------------------------------- */
/*  Shared chart helpers (custom SVG, project convention)                     */
/* -------------------------------------------------------------------------- */

function DonutChart({
  size = 130,
  thickness = 16,
  segments,
  centerLabel,
  centerSub,
}) {
  // segments: [{ value, color }]
  const total = segments.reduce((acc, s) => acc + (s.value || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((seg, i) => {
            const value = seg.value || 0;
            if (value <= 0) return null;
            const len = (value / total) * circumference;
            const dasharray = `${len} ${circumference - len}`;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={dasharray}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-theme-text leading-none">
          {centerLabel}
        </span>
        {centerSub && (
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted mt-1">
            {centerSub}
          </span>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value, max = 100, color = "#22d3ee", label, right }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-theme-text truncate">{label}</span>
        <span className="text-theme-text-muted shrink-0 ml-2">{right}</span>
      </div>
      <div className="h-2 rounded-full bg-theme-hover overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ChartCard({
  icon: Icon,
  title,
  onClick,
  footer,
  children,
  iconColor = "text-theme-primary",
}) {
  return (
    <div
      className={`group bg-theme-card border border-theme rounded-xl p-4 flex flex-col gap-4 transition-all ${
        onClick
          ? "cursor-pointer hover:border-theme-primary/60 hover:shadow-md"
          : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className={`w-5 h-5 ${iconColor} shrink-0`} />}
          <h3 className="text-sm font-semibold text-theme-text truncate">
            {title}
          </h3>
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 text-theme-text-muted group-hover:text-theme-primary transition-colors shrink-0" />
        )}
      </div>
      <div className="flex-1 min-h-[150px] flex flex-col items-center justify-center">
        {children}
      </div>
      {footer && (
        <div className="text-[11px] text-theme-text-muted text-center border-t border-theme pt-2">
          {footer}
        </div>
      )}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: it.color }}
          />
          <span className="text-theme-text-muted">{it.label}</span>
          <span className="text-theme-text font-medium">{it.value}</span>
        </span>
      ))}
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <p className="text-xs text-theme-text-muted italic text-center">{text}</p>
  );
}

function StatTile({ label, value, color }) {
  return (
    <div className="bg-theme-hover/40 border border-theme rounded-lg px-3 py-2 flex flex-col items-start">
      <span
        className="text-xl font-bold leading-none"
        style={{ color: color || "var(--theme-text)" }}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-theme-text-muted mt-1">
        {label}
      </span>
    </div>
  );
}

function StatGrid({ tiles }) {
  if (!tiles || tiles.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      {tiles.map((tile) => (
        <StatTile key={tile.label} {...tile} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Per-page chart cards                                                      */
/* -------------------------------------------------------------------------- */

function PlexCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: instancesData } = useQuery({
    queryKey: ["plex-instances"],
    queryFn: async () => {
      try {
        return await api.get("/plex/instances");
      } catch {
        return { instances: [] };
      }
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const instances = instancesData?.instances || [];

  const { data: sessionsAgg } = useQuery({
    queryKey: ["dash-plex-sessions", instances.map((i) => i.id).join(",")],
    queryFn: async () => {
      if (instances.length === 0) {
        try {
          const res = await api.get("/plex/sessions");
          return { sessions: res?.sessions || [], message: res?.message };
        } catch {
          return { sessions: [], message: "not configured" };
        }
      }
      const results = await Promise.all(
        instances.map(async (inst) => {
          try {
            return await api.get(
              `/plex/sessions?instance_id=${encodeURIComponent(inst.id)}`,
            );
          } catch {
            return { sessions: [] };
          }
        }),
      );
      return { sessions: results.flatMap((r) => r?.sessions || []) };
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const sessions = sessionsAgg?.sessions || [];
  const transcoding = sessions.filter(
    (s) =>
      s?.transcoding ||
      s?.transcodeDecision === "transcode" ||
      s?.TranscodeSession,
  ).length;
  const direct = sessions.length - transcoding;
  const users = new Set(
    sessions
      .map((s) => s?.user || s?.user_title || s?.username)
      .filter(Boolean),
  ).size;
  const movies = sessions.filter(
    (s) => (s?.type || s?.media_type || "").toLowerCase() === "movie",
  ).length;
  const episodes = sessions.filter((s) => {
    const t = (s?.type || s?.media_type || "").toLowerCase();
    return t === "episode" || t === "show";
  }).length;
  const audio = sessions.filter((s) => {
    const t = (s?.type || s?.media_type || "").toLowerCase();
    return t === "track" || t === "music";
  }).length;

  return (
    <ChartCard
      icon={Activity}
      title={t("dashboard.charts.plex", "Plex Activity")}
      onClick={() => navigate("/plex-activity")}
      footer={`${instances.length} ${t(
        "dashboard.charts.instances",
        "instance(s)",
      )}`}
    >
      <DonutChart
        segments={[
          { value: direct, color: "#22c55e" },
          { value: transcoding, color: "#f59e0b" },
        ]}
        centerLabel={sessions.length}
        centerSub={t("dashboard.charts.sessions", "sessions")}
      />
      <Legend
        items={[
          {
            label: t("dashboard.charts.direct", "Direct"),
            value: direct,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.transcode", "Transcode"),
            value: transcoding,
            color: "#f59e0b",
          },
        ]}
      />
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.sessions", "Sessions"),
            value: sessions.length,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.users", "Users"),
            value: users,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.direct", "Direct"),
            value: direct,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.transcode", "Transcode"),
            value: transcoding,
            color: "#f59e0b",
          },
          {
            label: t("dashboard.charts.movies", "Movies"),
            value: movies,
            color: "#a78bfa",
          },
          {
            label: t("dashboard.charts.episodes", "Episodes"),
            value: episodes + audio,
            color: "#f472b6",
          },
        ]}
      />
    </ChartCard>
  );
}

const isVpnRunning = (s) => {
  const lower = (typeof s === "string" ? s : String(s || "")).toLowerCase();
  return lower === "running" || lower === "healthy" || lower === "starting";
};
const isVpnStopped = (s) => {
  const lower = (typeof s === "string" ? s : String(s || "")).toLowerCase();
  return ["stopped", "exited", "dead", "removed"].includes(lower);
};
const isVpnInfoConnected = (info) => {
  const st = (
    typeof info?.vpn_status === "string"
      ? info.vpn_status
      : String(info?.vpn_status || "")
  ).toLowerCase();
  return (
    ["running", "healthy", "connected"].includes(st) && Boolean(info?.public_ip)
  );
};

export function VpnCard({
  containers: containersProp,
  vpnInfoMap: vpnInfoMapProp,
  depsMap: depsMapProp,
  instances: instancesProp,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const hasProps = Array.isArray(containersProp);

  // Self-fetch fallback (used when card is rendered inside the chart grid)
  const { data: instData } = useQuery({
    queryKey: ["vpn-proxy-instances"],
    queryFn: async () => {
      try {
        return await api.get("/vpn-proxy/instances");
      } catch {
        return { instances: [] };
      }
    },
    staleTime: 60000,
    refetchInterval: 60000,
    enabled: !hasProps,
  });
  const fetchedInstances = instData?.instances || [];

  const { data: agg } = useQuery({
    queryKey: [
      "dash-vpn-containers",
      fetchedInstances.map((i) => i.id).join(","),
    ],
    queryFn: async () => {
      const ids =
        fetchedInstances.length > 0
          ? fetchedInstances.map((i) => i.id)
          : [null];
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const url = id
              ? `/vpn-proxy/containers?vpn_id=${encodeURIComponent(id)}`
              : "/vpn-proxy/containers";
            const res = await api.get(url);
            const list = Array.isArray(res) ? res : res?.containers || [];
            const infoUrl = id
              ? `/vpn-proxy/containers/vpn-info-batch?vpn_id=${encodeURIComponent(id)}`
              : "/vpn-proxy/containers/vpn-info-batch";
            const depsUrl = id
              ? `/vpn-proxy/containers/dependents?vpn_id=${encodeURIComponent(id)}`
              : "/vpn-proxy/containers/dependents";
            const [info, deps] = await Promise.all([
              api.get(infoUrl).catch(() => ({})),
              api.get(depsUrl).catch(() => []),
            ]);
            return {
              list,
              info: info || {},
              deps: Array.isArray(deps) ? deps : [],
            };
          } catch {
            return { list: [], info: {}, deps: [] };
          }
        }),
      );
      const containers = results.flatMap((r) => r.list);
      const infoMap = results.reduce(
        (acc, r) => Object.assign(acc, r.info || {}),
        {},
      );
      const depsMap = {};
      results.forEach((r) => {
        r.deps.forEach((dep) => {
          const vpnParent = dep.vpn_container_name || dep.vpn_parent;
          if (!vpnParent) return;
          const parent = r.list.find(
            (c) =>
              c.name === vpnParent ||
              c.docker_name === vpnParent ||
              vpnParent === `gluetun-${c.name}`,
          );
          if (parent) {
            if (!depsMap[parent.id]) depsMap[parent.id] = [];
            depsMap[parent.id].push(dep);
          }
        });
      });
      return { containers, infoMap, depsMap };
    },
    refetchInterval: 15000,
    staleTime: 8000,
    enabled: !hasProps,
  });

  const containers = hasProps ? containersProp : agg?.containers || [];
  const vpnInfoMap = hasProps ? vpnInfoMapProp || {} : agg?.infoMap || {};
  const depsMap = hasProps ? depsMapProp || {} : agg?.depsMap || {};
  const instances = hasProps ? instancesProp || [] : fetchedInstances;

  const total = containers.length;
  const running = containers.filter((c) =>
    isVpnRunning(c?.docker_status ?? c?.state ?? c?.status),
  ).length;
  const stopped = containers.filter((c) =>
    isVpnStopped(c?.docker_status ?? c?.state ?? c?.status),
  ).length;
  const connected = containers.filter((c) =>
    isVpnInfoConnected(vpnInfoMap?.[c.id] || {}),
  ).length;
  const providers = new Set(
    containers.map((c) => c?.vpn_provider).filter(Boolean),
  ).size;
  const clients = Object.values(depsMap || {}).reduce(
    (acc, deps) => acc + (Array.isArray(deps) ? deps.length : 0),
    0,
  );

  return (
    <div
      className="group bg-theme-card border border-theme rounded-xl p-4 flex flex-col gap-4 cursor-pointer hover:border-theme-primary/60 hover:shadow-md transition-all h-full"
      onClick={() => navigate("/vpn-proxy")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-5 h-5 text-theme-primary shrink-0" />
          <h3 className="text-sm font-semibold text-theme-text truncate">
            {t("dashboard.charts.vpn", "VPN Proxy")}
          </h3>
        </div>
        <ChevronRight className="w-4 h-4 text-theme-text-muted group-hover:text-theme-primary transition-colors shrink-0" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <DonutChart
          size={160}
          thickness={18}
          segments={[
            { value: running, color: "#22c55e" },
            { value: stopped, color: "#ef4444" },
            {
              value: Math.max(0, total - running - stopped),
              color: "#f59e0b",
            },
          ]}
          centerLabel={total}
          centerSub={t("dashboard.charts.containers", "containers")}
        />
        <Legend
          items={[
            {
              label: t("dashboard.charts.running", "Running"),
              value: running,
              color: "#22c55e",
            },
            {
              label: t("dashboard.charts.stopped", "Stopped"),
              value: stopped,
              color: "#ef4444",
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label={t("dashboard.charts.total", "Total")}
          value={total}
          color="var(--theme-primary)"
        />
        <StatTile
          label={t("dashboard.charts.running", "Running")}
          value={running}
          color="#22c55e"
        />
        <StatTile
          label={t("dashboard.charts.connected", "Connected")}
          value={connected}
          color="#22d3ee"
        />
        <StatTile
          label={t("dashboard.charts.stopped", "Stopped")}
          value={stopped}
          color="#ef4444"
        />
        <StatTile
          label={t("dashboard.charts.providers", "Providers")}
          value={providers}
          color="#a78bfa"
        />
        <StatTile
          label={t("dashboard.charts.clients", "Clients")}
          value={clients}
          color="#f59e0b"
        />
      </div>

      <div className="text-[11px] text-theme-text-muted text-center border-t border-theme pt-2">
        {instances.length || 1} {t("dashboard.charts.instances", "instance(s)")}
      </div>
    </div>
  );
}

function NfsCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ["dash-nfs"],
    queryFn: async () => {
      try {
        return await api.get("/nfs-mount/dashboard");
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Backend returns { managers: [{ nfs_mounts, nfs_mount_statuses: {id: {mounted}}, system_stats }] }
  const managers = Array.isArray(data?.managers) ? data.managers : [];

  let mountsUp = 0;
  let mountsDown = 0;
  managers.forEach((mgr) => {
    const mounts = mgr?.nfs_mounts || [];
    const statuses = mgr?.nfs_mount_statuses || {};
    mounts.forEach((m) => {
      const id = m?.id;
      const ok = id != null ? !!statuses[id]?.mounted : !!m?.mounted;
      if (ok) mountsUp += 1;
      else mountsDown += 1;
    });
  });
  const total = mountsUp + mountsDown;
  const instances = managers;

  // Average CPU/RAM/Disk across managers (when available)
  const avg = (vals) => {
    const arr = vals.filter((v) => Number.isFinite(v));
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  };
  const cpu = avg(
    managers.map((m) =>
      Number(
        m?.system_stats?.cpu_percent ??
          m?.system_stats?.cpu ??
          m?.system_status?.cpu_percent ??
          NaN,
      ),
    ),
  );
  const ram = avg(
    managers.map((m) =>
      Number(
        m?.system_stats?.memory_percent ??
          m?.system_stats?.ram_percent ??
          m?.system_status?.memory_percent ??
          NaN,
      ),
    ),
  );
  const disk = avg(
    managers.map((m) =>
      Number(
        m?.system_stats?.disk_percent ?? m?.system_status?.disk_percent ?? NaN,
      ),
    ),
  );

  return (
    <ChartCard
      icon={HardDrive}
      title={t("dashboard.charts.nfs", "NFS Manager")}
      onClick={() => navigate("/nfs-mount")}
      footer={`${instances.length} ${t(
        "dashboard.charts.instances",
        "instance(s)",
      )}`}
    >
      <DonutChart
        segments={[
          { value: mountsUp, color: "#22c55e" },
          { value: mountsDown, color: "#ef4444" },
        ]}
        centerLabel={total}
        centerSub={t("dashboard.charts.mounts", "mounts")}
      />
      <Legend
        items={[
          {
            label: t("dashboard.charts.up", "Up"),
            value: mountsUp,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.down", "Down"),
            value: mountsDown,
            color: "#ef4444",
          },
        ]}
      />
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.mounts", "Mounts"),
            value: total,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.managers", "Managers"),
            value: instances.length,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.up", "Up"),
            value: mountsUp,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.down", "Down"),
            value: mountsDown,
            color: "#ef4444",
          },
          {
            label: t("dashboard.charts.cpu", "CPU"),
            value: `${cpu}%`,
            color: cpu >= 80 ? "#ef4444" : cpu >= 60 ? "#f59e0b" : "#22c55e",
          },
          {
            label: t("dashboard.charts.ram", "RAM"),
            value: `${ram}%`,
            color: ram >= 80 ? "#ef4444" : ram >= 60 ? "#f59e0b" : "#22c55e",
          },
        ]}
      />
    </ChartCard>
  );
}

function StorageCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Summary for aggregate KPIs
  const { data: summary } = useQuery({
    queryKey: ["dash-storage-summary"],
    queryFn: async () => {
      try {
        return await api.get("/storage/summary");
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Per-service storage_paths for top pools list
  const { data: services } = useQuery({
    queryKey: ["dash-storage-services"],
    queryFn: async () => {
      try {
        const res = await api.get("/services/");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const pools = useMemo(() => {
    const list = [];
    (services || []).forEach((svc) => {
      const paths = svc?.storage?.storage_paths || [];
      paths.forEach((p) => {
        const pct = Number(p?.percent ?? 0);
        list.push({
          name: `${svc?.name || "service"} • ${p?.path?.split("/").pop() || p?.path}`,
          pct: isFinite(pct) ? pct : 0,
        });
      });
    });
    return list;
  }, [services]);

  const topPools = useMemo(
    () => [...pools].sort((a, b) => b.pct - a.pct).slice(0, 4),
    [pools],
  );

  const totalPaths = pools.length;
  const avgUsage = Number(summary?.average_usage_percent ?? 0);
  const critical = pools.filter((p) => p.pct >= 90).length;
  const warning = pools.filter((p) => p.pct >= 75 && p.pct < 90).length;
  const healthy = pools.filter((p) => p.pct < 75).length;
  const servicesWithStorage = (services || []).filter(
    (svc) => (svc?.storage?.storage_paths || []).length > 0,
  ).length;

  return (
    <ChartCard
      icon={Database}
      title={t("dashboard.charts.storage", "Storage")}
      onClick={() => navigate("/storage")}
      footer={`${totalPaths} ${t("dashboard.charts.paths", "path(s)")} • ${avgUsage.toFixed(0)}% ${t("dashboard.charts.avg", "avg")}`}
    >
      {topPools.length === 0 ? (
        <EmptyHint text={t("dashboard.charts.noData", "No data available")} />
      ) : (
        <div className="w-full space-y-3">
          {topPools.map((p) => (
            <ProgressBar
              key={p.name}
              value={p.pct}
              max={100}
              color={
                p.pct >= 90 ? "#ef4444" : p.pct >= 75 ? "#f59e0b" : "#22d3ee"
              }
              label={p.name}
              right={`${p.pct.toFixed(0)}%`}
            />
          ))}
        </div>
      )}
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.paths", "Paths"),
            value: totalPaths,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.services", "Services"),
            value: servicesWithStorage,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.avg", "Avg"),
            value: `${avgUsage.toFixed(0)}%`,
            color:
              avgUsage >= 90
                ? "#ef4444"
                : avgUsage >= 75
                  ? "#f59e0b"
                  : "#22c55e",
          },
          {
            label: t("dashboard.charts.healthy", "Healthy"),
            value: healthy,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.warning", "Warning"),
            value: warning,
            color: "#f59e0b",
          },
          {
            label: t("dashboard.charts.critical", "Critical"),
            value: critical,
            color: "#ef4444",
          },
        ]}
      />
    </ChartCard>
  );
}

function DownloadsCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ["dash-arr-queue"],
    queryFn: () => arrActivityApi.getQueue().catch(() => null),
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // /api/arr-activity/queue returns { [instanceId]: { name, type, records, totalRecords, error } }
  const rows = useMemo(() => {
    if (!data || typeof data !== "object") return [];
    return Object.values(data)
      .filter((s) => s && Array.isArray(s.records))
      .map((s) => {
        const items = s.records || [];
        const active = items.filter((i) => {
          const raw = i?.status ?? i?.trackedDownloadStatus ?? "";
          const st = (
            typeof raw === "string" ? raw : String(raw || "")
          ).toLowerCase();
          return (
            st.includes("download") ||
            st === "queued" ||
            st === "active" ||
            st.includes("import")
          );
        }).length;
        const queued = items.filter((i) => {
          const raw = i?.status ?? i?.trackedDownloadStatus ?? "";
          const st = (
            typeof raw === "string" ? raw : String(raw || "")
          ).toLowerCase();
          return st === "queued" || st === "delay" || st === "paused";
        }).length;
        const completed = items.filter((i) => {
          const raw = i?.status ?? i?.trackedDownloadStatus ?? "";
          const st = (
            typeof raw === "string" ? raw : String(raw || "")
          ).toLowerCase();
          return st === "completed" || st.includes("complete");
        }).length;
        const stuck = items.filter((i) => {
          const raw = i?.status ?? i?.trackedDownloadStatus ?? "";
          const st = (
            typeof raw === "string" ? raw : String(raw || "")
          ).toLowerCase();
          return (
            st === "stalled" ||
            st.includes("warn") ||
            st.includes("error") ||
            st.includes("fail")
          );
        }).length;
        return {
          name: s.name || s.type || "queue",
          active,
          queued,
          completed,
          stuck,
          total: items.length,
        };
      })
      .filter((r) => r.total > 0);
  }, [data]);

  const topRows = useMemo(
    () => [...rows].sort((a, b) => b.total - a.total).slice(0, 4),
    [rows],
  );

  const totalItems = rows.reduce((a, r) => a + r.total, 0);
  const totalActive = rows.reduce((a, r) => a + r.active, 0);
  const totalQueued = rows.reduce((a, r) => a + r.queued, 0);
  const totalCompleted = rows.reduce((a, r) => a + r.completed, 0);
  const totalStuck = rows.reduce((a, r) => a + r.stuck, 0);
  const instances = rows.length;

  return (
    <ChartCard
      icon={Download}
      title={t("dashboard.charts.downloads", "Downloads")}
      onClick={() => navigate("/arr-activity")}
      footer={`${totalActive} ${t(
        "dashboard.charts.active",
        "active",
      )} • ${totalStuck} ${t("dashboard.charts.stuck", "stuck")}`}
    >
      {topRows.length === 0 ? (
        <EmptyHint text={t("dashboard.charts.noData", "No data available")} />
      ) : (
        <div className="w-full space-y-3">
          {topRows.map((r) => {
            const max = Math.max(1, r.total);
            return (
              <div key={r.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-theme-text truncate">{r.name}</span>
                  <span className="text-theme-text-muted shrink-0 ml-2">
                    {r.active} / {r.total}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-theme-hover overflow-hidden flex">
                  <div
                    className="h-full"
                    style={{
                      width: `${(r.active / max) * 100}%`,
                      backgroundColor: "#22c55e",
                    }}
                  />
                  <div
                    className="h-full"
                    style={{
                      width: `${(r.stuck / max) * 100}%`,
                      backgroundColor: "#ef4444",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.total", "Total"),
            value: totalItems,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.instances", "Instances"),
            value: instances,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.active", "Active"),
            value: totalActive,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.queued", "Queued"),
            value: totalQueued,
            color: "#a78bfa",
          },
          {
            label: t("dashboard.charts.completed", "Completed"),
            value: totalCompleted,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.stuck", "Stuck"),
            value: totalStuck,
            color: "#ef4444",
          },
        ]}
      />
    </ChartCard>
  );
}

function UploadsCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: inProgress } = useQuery({
    queryKey: ["dash-uploader-inprogress"],
    queryFn: () => uploaderApi.getInProgress().catch(() => null),
    refetchInterval: 5000,
    staleTime: 2000,
  });
  const { data: failedCount } = useQuery({
    queryKey: ["dash-uploader-failed"],
    queryFn: () => uploaderApi.getFailedCount().catch(() => null),
    refetchInterval: 15000,
    staleTime: 10000,
  });
  const { data: queue } = useQuery({
    queryKey: ["dash-uploader-queue"],
    queryFn: () => uploaderApi.getQueue().catch(() => null),
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const active = Number(
    inProgress?.jobs?.length ??
      (Array.isArray(inProgress) ? inProgress.length : 0),
  );
  const failed = Number(failedCount?.count ?? 0);
  const queued = Number(queue?.files?.length ?? 0);
  const total = active + failed + queued;
  const idle = total === 0;

  return (
    <ChartCard
      icon={Upload}
      title={t("dashboard.charts.uploads", "Uploads")}
      onClick={() => navigate("/uploader")}
      footer={`${total} ${t("dashboard.charts.items", "items")}`}
    >
      <DonutChart
        segments={[
          { value: active, color: "#22d3ee" },
          { value: queued, color: "#a78bfa" },
          { value: failed, color: "#ef4444" },
        ]}
        centerLabel={total}
        centerSub={t("dashboard.charts.items", "items")}
      />
      <Legend
        items={[
          {
            label: t("dashboard.charts.active", "Active"),
            value: active,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.queued", "Queued"),
            value: queued,
            color: "#a78bfa",
          },
          {
            label: t("dashboard.charts.failed", "Failed"),
            value: failed,
            color: "#ef4444",
          },
        ]}
      />
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.total", "Total"),
            value: total,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.active", "Active"),
            value: active,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.queued", "Queued"),
            value: queued,
            color: "#a78bfa",
          },
          {
            label: t("dashboard.charts.failed", "Failed"),
            value: failed,
            color: "#ef4444",
          },
          {
            label: t("dashboard.charts.status", "Status"),
            value: idle
              ? t("dashboard.charts.idle", "Idle")
              : t("dashboard.charts.busy", "Busy"),
            color: idle ? "#94a3b8" : "#22c55e",
          },
          {
            label: t("dashboard.charts.failureRate", "Failure %"),
            value: total > 0 ? `${Math.round((failed / total) * 100)}%` : "0%",
            color: total > 0 && failed / total >= 0.2 ? "#ef4444" : "#22c55e",
          },
        ]}
      />
    </ChartCard>
  );
}

function PosterizarrCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: instData } = useQuery({
    queryKey: ["posterizarr-instances"],
    queryFn: async () => {
      try {
        return await api.get("/posterizarr/instances");
      } catch {
        return { instances: [] };
      }
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const instances = instData?.instances || [];

  const { data: agg } = useQuery({
    queryKey: ["dash-posterizarr", instances.map((i) => i.id).join(",")],
    queryFn: async () => {
      const ids = instances.length > 0 ? instances.map((i) => i.id) : [null];
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const url = id
              ? `/posterizarr/dashboard?instance_id=${encodeURIComponent(id)}`
              : "/posterizarr/dashboard";
            return await api.get(url);
          } catch {
            return null;
          }
        }),
      );
      return { items: results.filter(Boolean) };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // /posterizarr/dashboard returns { status: { running, manual_running, scheduler_running }, ... }
  const items = agg?.items || [];
  let running = 0;
  let idle = 0;
  let error = 0;
  let manual = 0;
  let scheduler = 0;
  items.forEach((d) => {
    if (d?.success === false || d?.error) {
      error += 1;
      return;
    }
    const status = d?.status || {};
    if (status.manual_running === true) manual += 1;
    if (status.scheduler_running === true) scheduler += 1;
    const isRunning =
      status.running === true ||
      status.manual_running === true ||
      status.scheduler_running === true;
    if (isRunning) running += 1;
    else idle += 1;
  });
  const totalInst = running + idle + error;

  return (
    <ChartCard
      icon={ImageIcon}
      title={t("dashboard.charts.posterizarr", "Posterizarr")}
      onClick={() => navigate("/posterizarr")}
      footer={`${instances.length || 1} ${t(
        "dashboard.charts.instances",
        "instance(s)",
      )}`}
    >
      <DonutChart
        segments={[
          { value: running, color: "#22d3ee" },
          { value: idle, color: "#94a3b8" },
          { value: error, color: "#ef4444" },
        ]}
        centerLabel={totalInst}
        centerSub={t("dashboard.charts.total", "total")}
      />
      <Legend
        items={[
          {
            label: t("dashboard.charts.running", "Running"),
            value: running,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.idle", "Idle"),
            value: idle,
            color: "#94a3b8",
          },
          {
            label: t("dashboard.charts.error", "Error"),
            value: error,
            color: "#ef4444",
          },
        ]}
      />
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.instances", "Instances"),
            value: totalInst,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.running", "Running"),
            value: running,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.idle", "Idle"),
            value: idle,
            color: "#94a3b8",
          },
          {
            label: t("dashboard.charts.error", "Error"),
            value: error,
            color: "#ef4444",
          },
          {
            label: t("dashboard.charts.manual", "Manual"),
            value: manual,
            color: "#a78bfa",
          },
          {
            label: t("dashboard.charts.scheduler", "Scheduler"),
            value: scheduler,
            color: "#22c55e",
          },
        ]}
      />
    </ChartCard>
  );
}

function AutoscanCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ["dash-autoscan"],
    queryFn: async () => {
      try {
        return await api.get("/autoscan/dashboard");
      } catch {
        return null;
      }
    },
    refetchInterval: 20000,
    staleTime: 10000,
  });

  const instances = Array.isArray(data?.instances)
    ? data.instances
    : data
      ? [data]
      : [];

  let queue = 0;
  let processed = 0;
  let failed = 0;
  let targets = 0;
  let triggers = 0;
  instances.forEach((inst) => {
    const stats = inst?.stats || {};
    const qLen = Array.isArray(inst?.queue) ? inst.queue.length : 0;
    queue += Number(stats.scans_remaining ?? qLen ?? 0) || 0;
    processed += Number(stats.scans_processed ?? 0) || 0;
    failed += Number(stats.scans_failed ?? stats.errors ?? 0) || 0;
    targets += Array.isArray(inst?.scan_targets)
      ? inst.scan_targets.length
      : Number(stats.targets ?? 0) || 0;
    triggers += Array.isArray(inst?.triggers)
      ? inst.triggers.length
      : Number(stats.triggers ?? 0) || 0;
  });

  const max = Math.max(1, queue, processed, failed);

  return (
    <ChartCard
      icon={Scan}
      title={t("dashboard.charts.autoscan", "Autoscan")}
      onClick={() => navigate("/autoscan")}
      footer={`${instances.length} ${t(
        "dashboard.charts.instances",
        "instance(s)",
      )}`}
    >
      <div className="w-full space-y-3">
        <ProgressBar
          value={queue}
          max={max}
          color="#a78bfa"
          label={t("dashboard.charts.queue", "Queue")}
          right={queue}
        />
        <ProgressBar
          value={processed}
          max={max}
          color="#22c55e"
          label={t("dashboard.charts.processed", "Processed")}
          right={processed}
        />
        <ProgressBar
          value={failed}
          max={max}
          color="#ef4444"
          label={t("dashboard.charts.failed", "Failed")}
          right={failed}
        />
      </div>
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.instances", "Instances"),
            value: instances.length,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.targets", "Targets"),
            value: targets,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.queue", "Queue"),
            value: queue,
            color: "#a78bfa",
          },
          {
            label: t("dashboard.charts.processed", "Processed"),
            value: processed,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.triggers", "Triggers"),
            value: triggers,
            color: "#f59e0b",
          },
          {
            label: t("dashboard.charts.failed", "Failed"),
            value: failed,
            color: "#ef4444",
          },
        ]}
      />
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grid wrapper                                                              */
/* -------------------------------------------------------------------------- */

function ServersCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: services = [] } = useQuery({
    queryKey: ["dash-services"],
    queryFn: async () => {
      try {
        const res = await api.get("/services/");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
    staleTime: 8000,
  });

  const total = services.length;
  const online = services.filter((s) => s?.status === "online").length;
  const offline = services.filter((s) => s?.status === "offline").length;
  const problem = services.filter((s) => s?.status === "problem").length;
  const categories = new Set(services.map((s) => s?.category).filter(Boolean))
    .size;
  const avgRt =
    total > 0
      ? Math.round(
          services.reduce((a, s) => a + (Number(s?.response_time) || 0), 0) /
            total,
        )
      : 0;

  return (
    <ChartCard
      icon={Server}
      title={t("dashboard.charts.servers", "Servers")}
      onClick={() => navigate("/services")}
      footer={`${total} ${t("dashboard.charts.services", "service(s)")}`}
    >
      <DonutChart
        segments={[
          { value: online, color: "#22c55e" },
          { value: problem, color: "#f59e0b" },
          { value: offline, color: "#ef4444" },
        ]}
        centerLabel={total}
        centerSub={t("dashboard.charts.servers", "servers")}
      />
      <Legend
        items={[
          {
            label: t("dashboard.charts.online", "Online"),
            value: online,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.problem", "Problem"),
            value: problem,
            color: "#f59e0b",
          },
          {
            label: t("dashboard.charts.offline", "Offline"),
            value: offline,
            color: "#ef4444",
          },
        ]}
      />
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.total", "Total"),
            value: total,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.categories", "Categories"),
            value: categories,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.online", "Online"),
            value: online,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.problem", "Problem"),
            value: problem,
            color: "#f59e0b",
          },
          {
            label: t("dashboard.charts.offline", "Offline"),
            value: offline,
            color: "#ef4444",
          },
          {
            label: t("dashboard.charts.avgRt", "Avg RT"),
            value: `${avgRt}ms`,
            color:
              avgRt >= 1000 ? "#ef4444" : avgRt >= 500 ? "#f59e0b" : "#22c55e",
          },
        ]}
      />
    </ChartCard>
  );
}

export default function DashboardPageCharts() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <ServersCard />
      <PlexCard />
      <NfsCard />
      <StorageCard />
      <DownloadsCard />
      <UploadsCard />
      <PosterizarrCard />
      <AutoscanCard />
    </div>
  );
}
