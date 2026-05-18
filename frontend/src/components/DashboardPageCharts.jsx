import { useMemo, useState } from "react";
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
  RefreshCcw,
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
      className={`group bg-theme-card border border-theme rounded-xl p-4 flex flex-col gap-4 h-full transition-all ${
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
      <div className="flex-1 min-h-[150px] flex flex-col items-center justify-center gap-4">
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

function InstanceToggle({ instances, value, onChange, allLabel = "All" }) {
  if (!Array.isArray(instances) || instances.length < 2) return null;
  const btn = (active) =>
    `text-[10px] px-2 py-0.5 rounded-full border transition-colors truncate max-w-[110px] ${
      active
        ? "bg-theme-primary/15 border-theme-primary/60 text-theme-primary"
        : "bg-theme-hover/40 border-theme text-theme-text-muted hover:text-theme-text"
    }`;
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1 w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={btn(value === null || value === undefined)}
        onClick={() => onChange(null)}
      >
        {allLabel}
      </button>
      {instances.map((inst) => (
        <button
          key={inst.id ?? inst.name}
          type="button"
          className={btn(value === (inst.id ?? inst.name))}
          onClick={() => onChange(inst.id ?? inst.name)}
          title={inst.name || inst.id}
        >
          {inst.name || inst.id}
        </button>
      ))}
    </div>
  );
}

function MiniRing({
  percent,
  color = "#22d3ee",
  size = 56,
  thickness = 7,
  centerLabel,
}) {
  const radius = (size - thickness) / 2;
  const c = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const len = (pct / 100) * c;
  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${len} ${c - len}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {centerLabel != null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-bold text-theme-text leading-none">
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function MiniMulti({ segments, size = 56, thickness = 7, centerLabel }) {
  const radius = (size - thickness) / 2;
  const c = 2 * Math.PI * radius;
  const total = segments.reduce((a, s) => a + (Number(s.value) || 0), 0);
  let offset = 0;
  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((s, i) => {
            const v = Number(s.value) || 0;
            if (v <= 0) return null;
            const len = (v / total) * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      {centerLabel != null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-bold text-theme-text leading-none">
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Per-page chart cards                                                      */
/* -------------------------------------------------------------------------- */

function PlexCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(null);

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
          return { byInstance: { _default: res?.sessions || [] } };
        } catch {
          return { byInstance: {} };
        }
      }
      const results = await Promise.all(
        instances.map(async (inst) => {
          try {
            const res = await api.get(
              `/plex/sessions?instance_id=${encodeURIComponent(inst.id)}`,
            );
            return [inst.id, res?.sessions || []];
          } catch {
            return [inst.id, []];
          }
        }),
      );
      return { byInstance: Object.fromEntries(results) };
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const byInstance = sessionsAgg?.byInstance || {};
  const sessions =
    selectedId == null
      ? Object.values(byInstance).flat()
      : byInstance[selectedId] || [];
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
    const tt = (s?.type || s?.media_type || "").toLowerCase();
    return tt === "episode" || tt === "show";
  }).length;
  const audio = sessions.filter((s) => {
    const tt = (s?.type || s?.media_type || "").toLowerCase();
    return tt === "track" || tt === "music";
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
      <InstanceToggle
        instances={instances}
        value={selectedId}
        onChange={setSelectedId}
        allLabel={t("dashboard.charts.all", "All")}
      />
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
  const [selectedId, setSelectedId] = useState(null);

  const hasProps = Array.isArray(containersProp);

  // Self-fetch fallback (used when card is rendered inside the chart grid)
  const { data: instData } = useQuery({
    queryKey: ["vpn-proxy-instances"],
    queryFn: async () => {
      try {
        return await api.get("/vpn-proxy/instances");
      } catch {
        return [];
      }
    },
    staleTime: 60000,
    refetchInterval: 60000,
    enabled: !hasProps,
  });
  const fetchedInstances = Array.isArray(instData)
    ? instData
    : instData?.instances || [];

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
            const taggedList = list.map((c) => ({ ...c, _instance_id: id }));
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
              id,
              list: taggedList,
              info: info || {},
              deps: Array.isArray(deps) ? deps : [],
            };
          } catch {
            return { id, list: [], info: {}, deps: [] };
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

  const allContainers = hasProps ? containersProp : agg?.containers || [];
  const vpnInfoMap = hasProps ? vpnInfoMapProp || {} : agg?.infoMap || {};
  const allDepsMap = hasProps ? depsMapProp || {} : agg?.depsMap || {};
  const instances = hasProps ? instancesProp || [] : fetchedInstances;

  const containers =
    selectedId == null
      ? allContainers
      : allContainers.filter((c) => c._instance_id === selectedId);

  // Filter depsMap: only keep entries whose parent container is in filtered list
  const containerIds = new Set(containers.map((c) => c.id));
  const depsMap =
    selectedId == null
      ? allDepsMap
      : Object.fromEntries(
          Object.entries(allDepsMap).filter(([k]) => containerIds.has(k)),
        );

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

      <InstanceToggle
        instances={instances}
        value={selectedId}
        onChange={setSelectedId}
        allLabel={t("dashboard.charts.all", "All")}
      />

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
  const [selectedId, setSelectedId] = useState(null);

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
  const allManagers = Array.isArray(data?.managers) ? data.managers : [];
  const instances = allManagers.map((m, i) => ({
    id: m?.id ?? m?.instance_id ?? m?.name ?? `mgr-${i}`,
    name: m?.name || m?.id || `Manager ${i + 1}`,
  }));
  const managers =
    selectedId == null
      ? allManagers
      : allManagers.filter((m, i) => {
          const id = m?.id ?? m?.instance_id ?? m?.name ?? `mgr-${i}`;
          return id === selectedId;
        });

  let mountsUp = 0;
  let mountsDown = 0;
  let exportsActive = 0;
  let exportsTotal = 0;
  let mergerUp = 0;
  let mergerTotal = 0;
  let tunnelsUp = 0;
  let tunnelsTotal = 0;
  managers.forEach((mgr) => {
    const mounts = mgr?.nfs_mounts || [];
    const mountStatuses = mgr?.nfs_mount_statuses || {};
    mounts.forEach((m) => {
      const id = m?.id;
      const ok = id != null ? !!mountStatuses[id]?.mounted : !!m?.mounted;
      if (ok) mountsUp += 1;
      else mountsDown += 1;
    });
    const exports = mgr?.nfs_exports || [];
    const exportStatuses = mgr?.nfs_export_statuses || {};
    exports.forEach((e) => {
      exportsTotal += 1;
      if (exportStatuses[e.id]?.is_active || e.is_active) exportsActive += 1;
    });
    const mergerCfgs = mgr?.mergerfs_configs || [];
    const mergerStatuses = mgr?.mergerfs_statuses || {};
    mergerCfgs.forEach((c) => {
      mergerTotal += 1;
      if (mergerStatuses[c.id]?.mounted) mergerUp += 1;
    });
    const tunnels = mgr?.vpn_configs || [];
    const tunnelStatuses = mgr?.vpn_statuses || {};
    tunnels.forEach((v) => {
      tunnelsTotal += 1;
      if (tunnelStatuses[v.id]?.connected) tunnelsUp += 1;
    });
  });
  const total = mountsUp + mountsDown;
  const instanceCount = allManagers.length;

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
      footer={`${instanceCount} ${t(
        "dashboard.charts.instances",
        "instance(s)",
      )}`}
    >
      <InstanceToggle
        instances={instances}
        value={selectedId}
        onChange={setSelectedId}
        allLabel={t("dashboard.charts.all", "All")}
      />
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
      <div className="grid grid-cols-3 gap-2 w-full">
        <div className="flex flex-col items-center gap-1">
          <MiniRing
            percent={exportsTotal ? (exportsActive / exportsTotal) * 100 : 0}
            color="#3b82f6"
            centerLabel={`${exportsActive}/${exportsTotal}`}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.exports", "Exports")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MiniRing
            percent={mergerTotal ? (mergerUp / mergerTotal) * 100 : 0}
            color="#a78bfa"
            centerLabel={`${mergerUp}/${mergerTotal}`}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.mergerfs", "MergerFS")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MiniRing
            percent={tunnelsTotal ? (tunnelsUp / tunnelsTotal) * 100 : 0}
            color="#f59e0b"
            centerLabel={`${tunnelsUp}/${tunnelsTotal}`}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.tunnels", "Tunnels")}
          </span>
        </div>
      </div>
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.mounts", "Mounts"),
            value: `${mountsUp}/${total}`,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.managers", "Managers"),
            value: instanceCount,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.exports", "Exports"),
            value: `${exportsActive}/${exportsTotal}`,
            color: "#3b82f6",
          },
          {
            label: t("dashboard.charts.mergerfs", "MergerFS"),
            value: `${mergerUp}/${mergerTotal}`,
            color: "#a78bfa",
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
        <div className="grid grid-cols-2 gap-2 w-full">
          {topPools.map((p) => {
            const col =
              p.pct >= 90 ? "#ef4444" : p.pct >= 75 ? "#f59e0b" : "#22d3ee";
            return (
              <div key={p.name} className="flex items-center gap-2 min-w-0">
                <MiniRing
                  percent={p.pct}
                  color={col}
                  centerLabel={`${p.pct.toFixed(0)}%`}
                />
                <span className="text-[10px] text-theme-text truncate min-w-0">
                  {p.name}
                </span>
              </div>
            );
          })}
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
  const [selectedId, setSelectedId] = useState(null);

  const { data } = useQuery({
    queryKey: ["dash-arr-queue"],
    queryFn: () => arrActivityApi.getQueue().catch(() => null),
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // /api/arr-activity/queue returns { [instanceId]: { name, type, records, totalRecords, error } }
  const allRows = useMemo(() => {
    if (!data || typeof data !== "object") return [];
    return Object.entries(data)
      .filter(([, s]) => s && typeof s === "object")
      .map(([id, s]) => {
        const items = Array.isArray(s.records) ? s.records : [];
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
          id,
          name: s.name || s.type || id,
          active,
          queued,
          completed,
          stuck,
          total: items.length,
        };
      });
  }, [data]);

  const instances = allRows.map((r) => ({ id: r.id, name: r.name }));
  const rows =
    selectedId == null ? allRows : allRows.filter((r) => r.id === selectedId);
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.total - a.total),
    [rows],
  );
  const visibleRows = selectedId == null ? sortedRows.slice(0, 6) : sortedRows;

  const totalItems = rows.reduce((a, r) => a + r.total, 0);
  const totalActive = rows.reduce((a, r) => a + r.active, 0);
  const totalQueued = rows.reduce((a, r) => a + r.queued, 0);
  const totalCompleted = rows.reduce((a, r) => a + r.completed, 0);
  const totalStuck = rows.reduce((a, r) => a + r.stuck, 0);
  const instanceCount = rows.length;

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
      <InstanceToggle
        instances={instances}
        value={selectedId}
        onChange={setSelectedId}
        allLabel={t("dashboard.charts.all", "All")}
      />
      {visibleRows.length === 0 ? (
        <EmptyHint text={t("dashboard.charts.noData", "No data available")} />
      ) : (
        <div className="grid grid-cols-2 gap-2 w-full">
          {visibleRows.map((r) => {
            const idle = Math.max(0, r.total - r.active - r.queued - r.stuck);
            return (
              <div key={r.id} className="flex items-center gap-2 min-w-0">
                <MiniMulti
                  segments={[
                    { value: r.active, color: "#22c55e" },
                    { value: r.queued, color: "#a78bfa" },
                    { value: r.stuck, color: "#ef4444" },
                    { value: idle, color: "#94a3b8" },
                  ]}
                  centerLabel={r.total}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-theme-text truncate">
                    {r.name}
                  </p>
                  <p className="text-[10px] text-theme-text-muted">
                    {r.active} / {r.total}
                  </p>
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
            value: instanceCount,
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
  const [selectedId, setSelectedId] = useState(null);

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
            const res = await api.get(url);
            return [id ?? "_default", res];
          } catch {
            return [id ?? "_default", null];
          }
        }),
      );
      return { byInstance: Object.fromEntries(results) };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // /posterizarr/dashboard returns { status: { running, manual_running, scheduler_running }, ... }
  const byInstance = agg?.byInstance || {};
  const items =
    selectedId == null
      ? Object.values(byInstance).filter(Boolean)
      : byInstance[selectedId]
        ? [byInstance[selectedId]]
        : [];
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
      <InstanceToggle
        instances={instances}
        value={selectedId}
        onChange={setSelectedId}
        allLabel={t("dashboard.charts.all", "All")}
      />
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
  const [selectedId, setSelectedId] = useState(null);

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

  const allInstances = Array.isArray(data?.instances)
    ? data.instances
    : data
      ? [data]
      : [];
  const instanceList = allInstances.map((inst, i) => ({
    id: inst?.id ?? inst?.instance_id ?? inst?.name ?? `as-${i}`,
    name: inst?.name || inst?.id || `Instance ${i + 1}`,
  }));
  const instances =
    selectedId == null
      ? allInstances
      : allInstances.filter((inst, i) => {
          const id = inst?.id ?? inst?.instance_id ?? inst?.name ?? `as-${i}`;
          return id === selectedId;
        });

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
      footer={`${allInstances.length} ${t(
        "dashboard.charts.instances",
        "instance(s)",
      )}`}
    >
      <InstanceToggle
        instances={instanceList}
        value={selectedId}
        onChange={setSelectedId}
        allLabel={t("dashboard.charts.all", "All")}
      />
      <div className="grid grid-cols-3 gap-2 w-full">
        <div className="flex flex-col items-center gap-1">
          <MiniRing
            percent={(queue / max) * 100}
            color="#a78bfa"
            centerLabel={queue}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.queue", "Queue")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MiniRing
            percent={(processed / max) * 100}
            color="#22c55e"
            centerLabel={processed}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.processed", "Processed")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MiniRing
            percent={(failed / max) * 100}
            color="#ef4444"
            centerLabel={failed}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.failed", "Failed")}
          </span>
        </div>
      </div>
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.instances", "Instances"),
            value: allInstances.length,
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

function VodSyncCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ["dash-vodsync-stats"],
    queryFn: async () => {
      try {
        return await api.get("/plex/stats");
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: peaks } = useQuery({
    queryKey: ["dash-vodsync-peaks"],
    queryFn: async () => {
      try {
        return await api.get("/plex/stats/daily-peaks?days=7");
      } catch {
        return null;
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // VOD Sync only tracks ONE Plex instance — read it from /settings
  const { data: settingsData } = useQuery({
    queryKey: ["dash-vodsync-settings"],
    queryFn: async () => {
      try {
        return await api.get("/settings");
      } catch {
        return null;
      }
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const syncInstanceId = settingsData?.plex_sync?.instance_id || null;

  const { data: sessionsData } = useQuery({
    queryKey: ["dash-vodsync-sessions", syncInstanceId || "default"],
    queryFn: async () => {
      try {
        const qs = syncInstanceId
          ? `?instance_id=${encodeURIComponent(syncInstanceId)}`
          : "";
        return await api.get(`/plex/sessions${qs}`);
      } catch {
        return { sessions: [] };
      }
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const vodSessions = Array.isArray(sessionsData?.sessions)
    ? sessionsData.sessions
    : [];
  const activeStreams = vodSessions.length;
  const activeUsers = new Set(
    vodSessions
      .map((s) => s?.user || s?.user_title || s?.username)
      .filter(Boolean),
  ).size;

  const movies = Number(stats?.total_movies ?? 0) || 0;
  const shows = Number(stats?.total_tv_shows ?? 0) || 0;
  const users = Number(stats?.total_users ?? 0) || 0;
  const allTimePeak = Number(stats?.peak_concurrent ?? 0) || 0;
  const configured = !!stats?.token_configured;

  const peakRows = Array.isArray(peaks?.daily_peaks)
    ? peaks.daily_peaks
    : Array.isArray(peaks)
      ? peaks
      : [];
  const todayIso = new Date().toISOString().split("T")[0];
  const todayPeak = Number(
    peakRows.find((p) => (p?.date || "").startsWith(todayIso))?.peak ?? 0,
  );
  const weekPeak = peakRows.length
    ? Math.max(...peakRows.map((p) => Number(p?.peak) || 0))
    : 0;
  const lastSync = stats?.last_updated
    ? new Date(stats.last_updated).toLocaleString()
    : "—";

  const total = movies + shows;

  return (
    <ChartCard
      icon={RefreshCcw}
      title={t("dashboard.charts.vodSync", "VOD Sync")}
      onClick={() => navigate("/vod-streams-history")}
      footer={
        configured
          ? `${t("dashboard.charts.lastSync", "Last sync")}: ${lastSync}`
          : t("dashboard.charts.notConfigured", "Not configured")
      }
    >
      <DonutChart
        segments={[
          { value: movies, color: "#a78bfa" },
          { value: shows, color: "#f472b6" },
        ]}
        centerLabel={total}
        centerSub={t("dashboard.charts.library", "library")}
      />
      <Legend
        items={[
          {
            label: t("dashboard.charts.movies", "Movies"),
            value: movies,
            color: "#a78bfa",
          },
          {
            label: t("dashboard.charts.shows", "Shows"),
            value: shows,
            color: "#f472b6",
          },
        ]}
      />

      {/* Active activity row */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <div className="flex items-center gap-2">
          <MiniRing
            percent={
              allTimePeak > 0
                ? Math.min(100, (activeStreams / allTimePeak) * 100)
                : activeStreams > 0
                  ? 100
                  : 0
            }
            color="#22c55e"
            centerLabel={activeStreams}
          />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-theme-text-muted leading-tight">
              {t("dashboard.charts.activeStreams", "Active Streams")}
            </p>
            <p className="text-[10px] text-theme-text-muted">
              {t("dashboard.charts.now", "now")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MiniRing
            percent={users > 0 ? (activeUsers / users) * 100 : 0}
            color="#22d3ee"
            centerLabel={activeUsers}
          />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-theme-text-muted leading-tight">
              {t("dashboard.charts.activeUsers", "Active Users")}
            </p>
            <p className="text-[10px] text-theme-text-muted">
              {users} {t("dashboard.charts.total", "total")}
            </p>
          </div>
        </div>
      </div>

      {/* 7-day peak trend mini bar chart */}
      {peakRows.length > 0 && (
        <div className="w-full">
          <div className="flex items-end justify-between gap-1 h-16 px-1">
            {peakRows.slice(-7).map((p, i) => {
              const v = Number(p?.peak) || 0;
              const h = weekPeak > 0 ? (v / weekPeak) * 100 : 0;
              const isToday = (p?.date || "").startsWith(todayIso);
              const d = p?.date ? new Date(p.date) : null;
              const label = d
                ? d
                    .toLocaleDateString(undefined, { weekday: "short" })
                    .slice(0, 2)
                : "";
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 min-w-0"
                  title={`${p?.date || ""}: ${v}`}
                >
                  <div className="w-full flex items-end h-12">
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${Math.max(2, h)}%`,
                        backgroundColor: isToday ? "#22c55e" : "#a78bfa",
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-theme-text-muted leading-none">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.activeStreams", "Active Streams"),
            value: activeStreams,
            color: "#22c55e",
          },
          {
            label: t("dashboard.charts.activeUsers", "Active Users"),
            value: activeUsers,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.users", "Users"),
            value: users,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.allTimePeak", "All-Time Peak"),
            value: allTimePeak,
            color: "#a78bfa",
          },
          {
            label: t("dashboard.charts.todayPeak", "Today"),
            value: todayPeak,
            color: "#f472b6",
          },
          {
            label: t("dashboard.charts.weekPeak", "7-Day Peak"),
            value: weekPeak,
            color: "#f59e0b",
          },
        ]}
      />
    </ChartCard>
  );
}

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
      <VodSyncCard />
      <NfsCard />
      <StorageCard />
      <DownloadsCard />
      <UploadsCard />
      <PosterizarrCard />
      <AutoscanCard />
    </div>
  );
}
