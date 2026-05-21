import {
  useMemo,
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
} from "react";
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
  ChevronUp,
  ChevronDown,
  GripVertical,
  Pencil,
  Check,
  RotateCcw,
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
  tabs,
  iconColor = "text-theme-primary",
}) {
  return (
    <div
      className={`group bg-theme-card border border-theme rounded-xl p-4 flex flex-col gap-3 h-full transition-all ${
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
      {tabs}
      <div className="flex-1 min-h-[150px] flex flex-col items-center justify-start gap-4 pt-3">
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
    `px-2.5 py-1 rounded-lg text-xs font-medium border transition-all truncate max-w-[140px] ${
      active
        ? "bg-theme-primary/15 border-theme-primary text-theme-primary"
        : "bg-theme-card border-theme text-theme-text-muted hover:text-theme-text hover:border-theme-primary"
    }`;
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 w-full"
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
  size = 76,
  thickness = 9,
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
        {pct > 0 && (
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
        )}
      </svg>
      {centerLabel != null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`font-bold text-theme-text leading-none ${
              size >= 100
                ? "text-2xl"
                : size >= 80
                  ? "text-base"
                  : "text-[11px]"
            }`}
          >
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function MiniMulti({ segments, size = 76, thickness = 9, centerLabel }) {
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
          <span
            className={`font-bold text-theme-text leading-none ${
              size >= 100
                ? "text-2xl"
                : size >= 80
                  ? "text-base"
                  : "text-[11px]"
            }`}
          >
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

  // Per-instance library stats (movies / shows / episodes)
  const { data: libraryAgg } = useQuery({
    queryKey: ["dash-plex-library", instances.map((i) => i.id).join(",")],
    queryFn: async () => {
      if (instances.length === 0) {
        try {
          const res = await api.get("/plex/stats/live");
          return { byInstance: { _default: res || {} } };
        } catch {
          return { byInstance: {} };
        }
      }
      const results = await Promise.all(
        instances.map(async (inst) => {
          try {
            const res = await api.get(
              `/plex/stats/live?instance_id=${encodeURIComponent(inst.id)}`,
            );
            return [inst.id, res || {}];
          } catch {
            return [inst.id, {}];
          }
        }),
      );
      return { byInstance: Object.fromEntries(results) };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const libByInst = libraryAgg?.byInstance || {};
  const libraryEntries =
    selectedId == null
      ? Object.values(libByInst)
      : [libByInst[selectedId] || {}];
  const movies = libraryEntries.reduce(
    (a, l) => a + (Number(l?.total_movies) || 0),
    0,
  );
  const shows = libraryEntries.reduce(
    (a, l) => a + (Number(l?.total_tv_shows) || 0),
    0,
  );
  const episodes = libraryEntries.reduce(
    (a, l) => a + (Number(l?.total_episodes) || 0),
    0,
  );

  // Per-instance breakdown for donuts
  const instanceList =
    instances.length > 0
      ? instances
      : [{ id: "_default", name: t("dashboard.charts.plex", "Plex") }];
  const perInstance = instanceList.map((inst) => {
    const sess = byInstance[inst.id] || [];
    const trans = sess.filter(
      (s) =>
        s?.transcoding ||
        s?.transcodeDecision === "transcode" ||
        s?.TranscodeSession,
    ).length;
    const dir = sess.length - trans;
    const usrs = new Set(
      sess.map((s) => s?.user || s?.user_title || s?.username).filter(Boolean),
    ).size;
    return {
      id: inst.id,
      name: inst.name || inst.id,
      total: sess.length,
      direct: dir,
      transcoding: trans,
      users: usrs,
    };
  });

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
      <div className="flex items-center justify-around w-full px-2 sm:px-4 flex-wrap gap-4 sm:gap-6 xl:gap-8">
        {perInstance.map((inst) => {
          const isActive = selectedId === inst.id;
          return (
            <button
              key={inst.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(isActive ? null : inst.id);
              }}
              className={`flex flex-col items-center gap-2 min-w-0 rounded-lg p-1 transition-all cursor-pointer ${
                isActive
                  ? "ring-2 ring-theme-primary bg-theme-primary/5"
                  : "hover:ring-2 hover:ring-theme-primary hover:bg-theme-hover"
              }`}
            >
              <MiniMulti
                segments={[
                  { value: inst.direct, color: "#22c55e" },
                  { value: inst.transcoding, color: "#f59e0b" },
                ]}
                size={110}
                thickness={14}
                centerLabel={
                  <span className="flex flex-col items-center leading-tight">
                    <span className="text-2xl font-bold text-theme-text">
                      {inst.total}
                    </span>
                    <span className="text-[10px] font-medium text-theme-text-muted">
                      {inst.users}{" "}
                      {t("dashboard.charts.users", "Users").toLowerCase()}
                    </span>
                  </span>
                }
              />
              <span className="text-[10px] uppercase tracking-wide text-theme-text-muted truncate max-w-[140px] text-center">
                {inst.name}
              </span>
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium">
                <span
                  style={{ color: "#22c55e" }}
                  title={t("dashboard.charts.direct", "Direct")}
                >
                  {inst.direct}
                </span>
                <span className="text-theme-text-muted">·</span>
                <span
                  style={{ color: "#f59e0b" }}
                  title={t("dashboard.charts.transcode", "Transcode")}
                >
                  {inst.transcoding}
                </span>
              </div>
            </button>
          );
        })}
      </div>
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
            label: t("dashboard.charts.shows", "Shows"),
            value: shows,
            color: "#f472b6",
          },
          {
            label: t("dashboard.charts.episodes", "Episodes"),
            value: episodes,
            color: "#22d3ee",
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

  const countableContainers = containers.filter((c) => {
    const s = (c?.docker_status ?? c?.state ?? c?.status ?? "")
      .toString()
      .toLowerCase();
    return s !== "created";
  });
  const total = countableContainers.length;
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
      className="group bg-theme-card border border-theme rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:border-theme-primary/60 hover:shadow-md transition-all h-full min-h-0 overflow-auto"
      onClick={() => navigate("/vpn-proxy")}
    >
      <div className="flex items-center justify-between shrink-0">
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

      <div className="flex items-center justify-around w-full px-2 sm:px-4 shrink-0">
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={total > 0 ? (running / total) * 100 : 0}
            color="#22c55e"
            size={100}
            thickness={13}
            centerLabel={running}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.running", "Running")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={total > 0 ? (connected / total) * 100 : 0}
            color="#22d3ee"
            size={100}
            thickness={13}
            centerLabel={connected}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.connected", "Connected")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={total > 0 ? (stopped / total) * 100 : 0}
            color="#ef4444"
            size={100}
            thickness={13}
            centerLabel={stopped}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.stopped", "Stopped")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 shrink-0">
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

      <div className="text-[11px] text-theme-text-muted text-center border-t border-theme pt-2 mt-auto shrink-0">
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

  // Per-instance breakdown for donuts
  const perInstance = allManagers.map((mgr, i) => {
    const id = mgr?.id ?? mgr?.instance_id ?? mgr?.name ?? `mgr-${i}`;
    const name = mgr?.name || mgr?.id || `Manager ${i + 1}`;
    const mounts = mgr?.nfs_mounts || [];
    const statuses = mgr?.nfs_mount_statuses || {};
    let up = 0;
    let down = 0;
    mounts.forEach((m) => {
      const mid = m?.id;
      const ok = mid != null ? !!statuses[mid]?.mounted : !!m?.mounted;
      if (ok) up += 1;
      else down += 1;
    });
    const mergerCfgs = mgr?.mergerfs_configs || [];
    const mergerStatusMap = mgr?.mergerfs_statuses || {};
    let mUp = 0;
    let mDown = 0;
    mergerCfgs.forEach((c) => {
      if (mergerStatusMap[c.id]?.mounted) mUp += 1;
      else mDown += 1;
    });
    return {
      id,
      name,
      up,
      down,
      total: up + down,
      mUp,
      mDown,
      mTotal: mUp + mDown,
    };
  });

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
      <div className="flex items-center justify-around w-full px-2 sm:px-4 flex-wrap gap-4 sm:gap-6 xl:gap-8">
        {perInstance.map((inst) => {
          const isActive = selectedId === inst.id;
          return (
            <button
              key={inst.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(isActive ? null : inst.id);
              }}
              className={`flex flex-col items-center gap-2 min-w-0 rounded-lg p-1 transition-all cursor-pointer ${
                isActive
                  ? "ring-2 ring-theme-primary bg-theme-primary/5"
                  : "hover:ring-2 hover:ring-theme-primary hover:bg-theme-hover"
              }`}
            >
              <div className="flex items-end gap-3">
                <div className="flex flex-col items-center gap-1">
                  <MiniMulti
                    segments={[
                      { value: inst.up, color: "#22c55e" },
                      { value: inst.down, color: "#ef4444" },
                    ]}
                    size={96}
                    thickness={12}
                    centerLabel={inst.total}
                  />
                  <span className="text-[9px] uppercase tracking-wide text-theme-text-muted">
                    {t("dashboard.charts.mounts", "Mounts")}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium">
                    <span
                      style={{ color: "#22c55e" }}
                      title={t("dashboard.charts.up", "Up")}
                    >
                      {inst.up}
                    </span>
                    <span className="text-theme-text-muted">·</span>
                    <span
                      style={{ color: "#ef4444" }}
                      title={t("dashboard.charts.down", "Down")}
                    >
                      {inst.down}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <MiniMulti
                    segments={[
                      { value: inst.mUp, color: "#a78bfa" },
                      { value: inst.mDown, color: "#ef4444" },
                    ]}
                    size={96}
                    thickness={12}
                    centerLabel={inst.mTotal}
                  />
                  <span className="text-[9px] uppercase tracking-wide text-theme-text-muted">
                    {t("dashboard.charts.mergerfs", "MergerFS")}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium">
                    <span
                      style={{ color: "#a78bfa" }}
                      title={t("dashboard.charts.up", "Up")}
                    >
                      {inst.mUp}
                    </span>
                    <span className="text-theme-text-muted">·</span>
                    <span
                      style={{ color: "#ef4444" }}
                      title={t("dashboard.charts.down", "Down")}
                    >
                      {inst.mDown}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-theme-text-muted truncate max-w-[220px] text-center">
                {inst.name}
              </span>
            </button>
          );
        })}
      </div>
      <StatGrid
        tiles={[
          {
            label: t("dashboard.charts.managers", "Managers"),
            value: instanceCount,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.mounts", "Mounts"),
            value: `${mountsUp}/${total}`,
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
            label: t("dashboard.charts.tunnels", "Tunnels"),
            value: `${tunnelsUp}/${tunnelsTotal}`,
            color: "#f59e0b",
          },
          {
            label: t("dashboard.charts.down", "Down"),
            value: mountsDown,
            color: mountsDown > 0 ? "#ef4444" : "#22c55e",
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
        const free = Number(p?.free ?? 0);
        const total = Number(p?.total ?? 0);
        const fullPath = p?.path || "";
        const leaf = fullPath.split("/").filter(Boolean).pop() || fullPath;
        list.push({
          serviceName: svc?.name || "service",
          pathLeaf: leaf,
          fullLabel: `${svc?.name || "service"} • ${leaf}`,
          pct: isFinite(pct) ? pct : 0,
          free: isFinite(free) ? free : 0,
          total: isFinite(total) ? total : 0,
        });
      });
    });
    return list;
  }, [services]);

  const topPools = useMemo(
    () => [...pools].sort((a, b) => b.pct - a.pct).slice(0, 8),
    [pools],
  );

  // Storage values are reported in GB by the storage agent
  const formatGB = (gb) => {
    if (!gb || !isFinite(gb)) return "0 GB";
    if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
    if (gb >= 1) return `${gb.toFixed(0)} GB`;
    return `${(gb * 1024).toFixed(0)} MB`;
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {topPools.map((p) => {
            const isCrit = p.pct >= 90;
            const isWarn = p.pct >= 75 && p.pct < 90;
            const ringCol = isCrit ? "#ef4444" : isWarn ? "#f59e0b" : "#22d3ee";
            const freeCol = isCrit
              ? "text-red-400"
              : isWarn
                ? "text-yellow-400"
                : "text-emerald-400";
            const barCol = isCrit
              ? "bg-red-500"
              : isWarn
                ? "bg-yellow-500"
                : "bg-emerald-500";
            const statusBg = isCrit
              ? "bg-red-500/10 ring-red-500/30"
              : isWarn
                ? "bg-yellow-500/10 ring-yellow-500/30"
                : "bg-theme-hover ring-theme-border";
            return (
              <div
                key={p.fullLabel}
                className={`group relative flex flex-col gap-2 ${statusBg} ring-1 rounded-xl p-3 min-w-0 transition-all hover:ring-theme-primary/60 hover:shadow-lg cursor-default`}
                title={p.fullLabel}
              >
                {/* Top row: ring + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <MiniRing
                    percent={p.pct}
                    color={ringCol}
                    size={56}
                    thickness={7}
                    centerLabel={`${p.pct.toFixed(0)}%`}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-wide text-theme-text-muted truncate">
                      {p.serviceName}
                    </span>
                    <span className="text-xs font-semibold text-theme-text truncate">
                      {p.pathLeaf}
                    </span>
                  </div>
                </div>

                {/* Free space - prominent */}
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className={`text-base font-bold ${freeCol} truncate`}>
                    {formatGB(p.free)}
                  </span>
                  <span className="text-[10px] text-theme-text-muted uppercase tracking-wide">
                    {t("dashboard.charts.free", "free")}
                  </span>
                </div>

                {/* Progress bar + total */}
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 w-full bg-theme-bg/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barCol} transition-all rounded-full`}
                      style={{ width: `${Math.min(100, p.pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-theme-text-muted">
                    <span>
                      {formatGB(p.total - p.free)}{" "}
                      {t("dashboard.charts.used", "used")}
                    </span>
                    <span>
                      {formatGB(p.total)} {t("dashboard.charts.total", "total")}
                    </span>
                  </div>
                </div>
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

  const { data } = useQuery({
    queryKey: ["dash-arr-queue"],
    queryFn: () => arrActivityApi.getQueue().catch(() => null),
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // /api/arr-activity/queue returns { [instanceId]: { name, type, records, totalRecords, error } }
  const allRows = useMemo(() => {
    if (!data || typeof data !== "object") return [];
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return Object.entries(data)
      .filter(([, s]) => s && typeof s === "object")
      .map(([id, s]) => {
        const items = Array.isArray(s.records) ? s.records : [];
        let active = 0;
        let queued = 0;
        let completed = 0;
        let stuck = 0;
        items.forEach((i) => {
          const statusLower = (i?.status || "").toLowerCase();
          const trackedState = (i?.trackedDownloadState || "").toLowerCase();
          const trackedStatus = (i?.trackedDownloadStatus || "").toLowerCase();

          const isActive =
            statusLower.includes("download") || statusLower.includes("import");
          const isQueued =
            statusLower === "queued" ||
            statusLower === "delay" ||
            statusLower === "paused";
          const isCompletedBase =
            (statusLower.includes("complet") &&
              (i?.sizeleft === 0 || i?.sizeleft == null)) ||
            trackedState === "importpending";
          const isImportBlocked =
            (trackedStatus === "warning" || trackedStatus === "error") &&
            (trackedState === "importblocked" ||
              trackedState === "importpending" ||
              trackedState === "importfailed" ||
              trackedState === "failedpending");

          if (isActive) active++;
          if (isQueued) queued++;

          if (isImportBlocked) {
            stuck++;
          } else if (isCompletedBase) {
            const addedTime = i?.added ? new Date(i.added).getTime() : 0;
            if (addedTime && addedTime < fiveMinutesAgo) {
              stuck++;
            } else {
              completed++;
            }
          }
        });
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

  const rows = allRows;
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.total - a.total),
    [rows],
  );
  const visibleRows = sortedRows.slice(0, 6);

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
      {visibleRows.length === 0 ? (
        <EmptyHint text={t("dashboard.charts.noData", "No data available")} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full justify-items-center">
          {visibleRows.map((r) => {
            const idle = Math.max(0, r.total - r.active - r.queued - r.stuck);
            return (
              <div
                key={r.id}
                className="flex flex-col items-center gap-1 min-w-0 max-w-full"
              >
                <MiniMulti
                  segments={[
                    { value: r.active, color: "#22c55e" },
                    { value: r.queued, color: "#a78bfa" },
                    { value: r.stuck, color: "#ef4444" },
                    { value: idle, color: "#94a3b8" },
                  ]}
                  size={110}
                  thickness={12}
                  centerLabel={r.total}
                />
                <div className="min-w-0 w-full text-center">
                  <p className="text-[10px] text-theme-text truncate">
                    {r.name}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium">
                    <span
                      style={{ color: "#22c55e" }}
                      title={t("dashboard.charts.active", "Active")}
                    >
                      {r.active}
                    </span>
                    <span className="text-theme-text-muted">·</span>
                    <span
                      style={{ color: "#a78bfa" }}
                      title={t("dashboard.charts.queued", "Queued")}
                    >
                      {r.queued}
                    </span>
                    <span className="text-theme-text-muted">·</span>
                    <span
                      style={{ color: "#ef4444" }}
                      title={t("dashboard.charts.stuck", "Stuck")}
                    >
                      {r.stuck}
                    </span>
                  </div>
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
      <div className="flex items-center justify-around w-full px-2 sm:px-4">
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={total > 0 ? (active / total) * 100 : 0}
            color="#22d3ee"
            size={100}
            thickness={13}
            centerLabel={active}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.active", "Active")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={total > 0 ? (queued / total) * 100 : 0}
            color="#a78bfa"
            size={100}
            thickness={13}
            centerLabel={queued}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.queued", "Queued")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={total > 0 ? (failed / total) * 100 : 0}
            color="#ef4444"
            size={100}
            thickness={13}
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
              : t("dashboard.charts.running", "Running"),
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

  // Per-instance state for donuts
  const instanceList =
    instances.length > 0
      ? instances
      : [
          {
            id: "_default",
            name: t("dashboard.charts.posterizarr", "Posterizarr"),
          },
        ];
  const perInstance = instanceList.map((inst) => {
    const d = byInstance[inst.id];
    const status = d?.status || {};
    const hasError = !!d && (d?.success === false || d?.error);
    const manualOn = status.manual_running === true;
    const schedulerOn = status.scheduler_running === true;
    const runningOn = status.running === true && !manualOn && !schedulerOn;
    const isIdle = !hasError && !manualOn && !schedulerOn && !runningOn;
    let state = "idle";
    if (hasError) state = "error";
    else if (manualOn) state = "manual";
    else if (schedulerOn) state = "scheduler";
    else if (runningOn) state = "running";
    return {
      id: inst.id,
      name: inst.name || inst.id,
      state,
      isIdle,
      segments: [
        { value: runningOn ? 1 : 0, color: "#22d3ee" },
        { value: manualOn ? 1 : 0, color: "#a78bfa" },
        { value: schedulerOn ? 1 : 0, color: "#f59e0b" },
        { value: hasError ? 1 : 0, color: "#ef4444" },
      ],
    };
  });

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
      <div className="flex items-center justify-around w-full px-2 sm:px-4 flex-wrap gap-4 sm:gap-6 xl:gap-8">
        {perInstance.map((inst) => {
          const isActive = selectedId === inst.id;
          return (
            <button
              key={inst.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(isActive ? null : inst.id);
              }}
              className={`flex flex-col items-center gap-2 min-w-0 rounded-lg p-1 transition-all cursor-pointer ${
                isActive
                  ? "ring-2 ring-theme-primary bg-theme-primary/5"
                  : "hover:ring-2 hover:ring-theme-primary hover:bg-theme-hover"
              }`}
            >
              <MiniMulti
                segments={inst.segments}
                size={110}
                thickness={14}
                centerLabel={
                  inst.isIdle
                    ? "-"
                    : inst.state === "error"
                      ? t("dashboard.charts.error", "Error")
                      : inst.state === "manual"
                        ? t("dashboard.charts.manual", "Manual")
                        : inst.state === "scheduler"
                          ? t("dashboard.charts.scheduler", "Scheduler")
                          : t("dashboard.charts.running", "Running")
                }
              />
              <span className="text-[10px] uppercase tracking-wide text-theme-text-muted truncate max-w-[110px] text-center">
                {inst.name}
              </span>
            </button>
          );
        })}
      </div>
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
  let targetsUp = 0;
  instances.forEach((inst) => {
    const stats = inst?.stats || {};
    const config = inst?.config || {};
    const qLen = Array.isArray(inst?.queue) ? inst.queue.length : 0;
    queue += Number(stats.scans_remaining ?? qLen ?? 0) || 0;
    processed += Number(stats.scans_processed ?? 0) || 0;
    failed += Number(stats.scans_failed ?? stats.errors ?? 0) || 0;

    // Flatten config.targets (object keyed by type → array or object of configs)
    const targetsAvailable = stats.targets_available || {};
    const resolveAvailable = (displayName, type, url) => {
      if (!targetsAvailable || typeof targetsAvailable !== "object")
        return true;
      const candidates = [
        displayName,
        type,
        url,
        typeof displayName === "string" ? displayName.toLowerCase() : null,
        typeof type === "string" ? type.toLowerCase() : null,
      ].filter(Boolean);
      for (const key of candidates) {
        if (key in targetsAvailable) return targetsAvailable[key] !== false;
      }
      return true;
    };
    const configTargets = config.targets || {};
    Object.entries(configTargets).forEach(([type, items]) => {
      if (!items) return;
      const list = Array.isArray(items)
        ? items
        : typeof items === "object"
          ? Object.entries(items).map(([name, cfg]) => ({
              ...(cfg || {}),
              _name: name,
            }))
          : [];
      list.forEach((cfg, idx) => {
        const c = cfg || {};
        const displayName =
          c.name || c._name || (list.length > 1 ? `${type} ${idx + 1}` : type);
        targets += 1;
        if (resolveAvailable(displayName, type, c.url)) targetsUp += 1;
      });
    });
  });

  const max = Math.max(1, queue, processed, failed);

  return (
    <ChartCard
      icon={Scan}
      title={t("dashboard.charts.autoscan", "Autoscan")}
      onClick={() => navigate("/autoscan")}
      tabs={
        <InstanceToggle
          instances={instanceList}
          value={selectedId}
          onChange={setSelectedId}
          allLabel={t("dashboard.charts.all", "All")}
        />
      }
      footer={`${allInstances.length} ${t(
        "dashboard.charts.instances",
        "instance(s)",
      )}`}
    >
      <div className="flex items-center justify-around w-full px-2 sm:px-4">
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={(queue / max) * 100}
            color="#a78bfa"
            size={100}
            thickness={13}
            centerLabel={queue}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.queue", "Queue")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={(processed / max) * 100}
            color="#22c55e"
            size={100}
            thickness={13}
            centerLabel={processed}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.processed", "Processed")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={(failed / max) * 100}
            color="#ef4444"
            size={100}
            thickness={13}
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
            label: t("dashboard.charts.targetsUp", "Targets Up"),
            value: targetsUp,
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

  // Live sessions filtered to the VOD-Sync Plex instance (plex_sync.instance_id)
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
    queryKey: ["dash-vodsync-activities", syncInstanceId || "default"],
    queryFn: async () => {
      try {
        const qs = syncInstanceId
          ? `?instance_id=${encodeURIComponent(syncInstanceId)}`
          : "";
        return await api.get(`/downloads${qs}`);
      } catch {
        return { activities: [] };
      }
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
  const vodActivities = Array.isArray(sessionsData?.activities)
    ? sessionsData.activities
    : [];
  const activeStreams = vodActivities.length;

  const movies = Number(stats?.total_movies ?? 0) || 0;
  const shows = Number(stats?.total_tv_shows ?? 0) || 0;
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
  const last7 = peakRows.slice(-7);
  const last7Values = last7.map((p) => Number(p?.peak) || 0);
  const weekPeak = last7Values.length ? Math.max(...last7Values) : 0;
  const weekMin = last7Values.length ? Math.min(...last7Values) : 0;
  const weekAvg = last7Values.length
    ? Math.round(last7Values.reduce((a, b) => a + b, 0) / last7Values.length)
    : 0;
  const daysTracked = peakRows.length;
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
      {/* Live streams on the VOD-Sync Plex instance */}
      <div className="flex items-center justify-center gap-8 w-full">
        <div className="flex items-center gap-3">
          <MiniRing
            percent={
              allTimePeak > 0
                ? Math.min(100, (activeStreams / allTimePeak) * 100)
                : activeStreams > 0
                  ? 100
                  : 0
            }
            color="#22c55e"
            size={120}
            thickness={12}
            centerLabel={activeStreams}
          />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-theme-text-muted leading-tight">
              {t("dashboard.charts.liveStreams", "Live Streams")}
            </p>
            <p className="text-xs text-theme-text-muted">
              {t("dashboard.charts.now", "now")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MiniRing
            percent={allTimePeak > 0 ? 100 : 0}
            color="#a78bfa"
            size={120}
            thickness={12}
            centerLabel={allTimePeak}
          />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-theme-text-muted leading-tight">
              {t("dashboard.charts.highestPeak", "Highest Peak")}
            </p>
            <p className="text-xs text-theme-text-muted">
              {t("dashboard.charts.allTime", "all-time")}
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
                  <div className="w-full flex items-end justify-center h-12 relative">
                    <div
                      className="w-full rounded-t transition-all relative flex items-start justify-center"
                      style={{
                        height: `${Math.max(2, h)}%`,
                        backgroundColor: isToday ? "#22c55e" : "#a78bfa",
                      }}
                    >
                      <span className="text-[10px] font-bold text-white leading-none mt-0.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                        {v}
                      </span>
                    </div>
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
            label: t("dashboard.charts.library", "Library"),
            value: total,
            color: "var(--theme-primary)",
          },
          {
            label: t("dashboard.charts.allTimePeak", "All-Time Peak"),
            value: allTimePeak,
            color: "#a78bfa",
          },
          {
            label: t("dashboard.charts.weekPeak", "7-Day Peak"),
            value: weekPeak,
            color: "#f59e0b",
          },
          {
            label: t("dashboard.charts.weekAvg", "7-Day Avg"),
            value: weekAvg,
            color: "#22d3ee",
          },
          {
            label: t("dashboard.charts.todayPeak", "Today"),
            value: todayPeak,
            color: "#f472b6",
          },
          {
            label: t("dashboard.charts.daysTracked", "Days Tracked"),
            value: daysTracked,
            color: "#22c55e",
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
      <div className="flex items-center justify-around w-full px-2 sm:px-4">
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={total > 0 ? (online / total) * 100 : 0}
            color="#22c55e"
            size={100}
            thickness={13}
            centerLabel={online}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.online", "Online")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={total > 0 ? (problem / total) * 100 : 0}
            color="#f59e0b"
            size={100}
            thickness={13}
            centerLabel={problem}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.problem", "Problem")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <MiniRing
            percent={total > 0 ? (offline / total) * 100 : 0}
            color="#ef4444"
            size={100}
            thickness={13}
            centerLabel={offline}
          />
          <span className="text-[10px] uppercase tracking-wide text-theme-text-muted">
            {t("dashboard.charts.offline", "Offline")}
          </span>
        </div>
      </div>
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

/* -------------------------------------------------------------------------- */
/*  Dashboard layout context (edit mode + card order, shared with toolbar)    */
/* -------------------------------------------------------------------------- */

const DEFAULT_DASHBOARD_CARD_ORDER = [
  "servers",
  "plex",
  "vodSync",
  "nfs",
  "storage",
  "downloads",
  "uploads",
  "posterizarr",
  "autoscan",
];

const DashboardLayoutContext = createContext(null);

export function DashboardLayoutProvider({ children }) {
  const [order, setOrder] = useState(() => {
    try {
      const raw = localStorage.getItem("dashboardCardOrder");
      if (!raw) return DEFAULT_DASHBOARD_CARD_ORDER;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_DASHBOARD_CARD_ORDER;
      const known = parsed.filter((id) =>
        DEFAULT_DASHBOARD_CARD_ORDER.includes(id),
      );
      const missing = DEFAULT_DASHBOARD_CARD_ORDER.filter(
        (id) => !known.includes(id),
      );
      return [...known, ...missing];
    } catch {
      return DEFAULT_DASHBOARD_CARD_ORDER;
    }
  });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("dashboardCardOrder", JSON.stringify(order));
    } catch {
      /* ignore */
    }
  }, [order]);

  const resetOrder = useCallback(
    () => setOrder(DEFAULT_DASHBOARD_CARD_ORDER),
    [],
  );

  const value = useMemo(
    () => ({ order, setOrder, editMode, setEditMode, resetOrder }),
    [order, editMode, resetOrder],
  );

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) {
    throw new Error(
      "useDashboardLayout must be used inside <DashboardLayoutProvider>",
    );
  }
  return ctx;
}

export function DashboardLayoutToolbar() {
  const { t } = useTranslation();
  const { editMode, setEditMode, resetOrder } = useDashboardLayout();
  return (
    <>
      {editMode && (
        <button
          type="button"
          onClick={resetOrder}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm"
          title={t("dashboard.layout.reset", "Reset order")}
        >
          <RotateCcw size={16} className="text-theme-primary" />
          <span className="text-xs sm:text-sm">
            {t("dashboard.layout.reset", "Reset")}
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditMode((v) => !v)}
        className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border rounded-lg text-sm font-medium transition-all shadow-sm ${
          editMode
            ? "bg-theme-primary/15 border-theme-primary/40 text-theme-primary"
            : "bg-theme-card hover:bg-theme-hover border-theme hover:border-theme-primary"
        }`}
        title={
          editMode
            ? t("dashboard.layout.done", "Done")
            : t("dashboard.layout.edit", "Edit layout")
        }
      >
        {editMode ? (
          <>
            <Check size={16} className="text-theme-primary" />
            <span className="text-xs sm:text-sm">
              {t("dashboard.layout.done", "Done")}
            </span>
          </>
        ) : (
          <>
            <Pencil size={16} className="text-theme-primary" />
            <span className="text-xs sm:text-sm">
              {t("dashboard.layout.edit", "Edit layout")}
            </span>
          </>
        )}
      </button>
    </>
  );
}

export default function DashboardPageCharts() {
  const { t } = useTranslation();

  // Registry of all available cards. Order in this array = default order.
  const CARDS = useMemo(
    () => [
      {
        id: "servers",
        label: t("dashboard.cards.servers", "Servers"),
        Component: ServersCard,
      },
      {
        id: "plex",
        label: t("dashboard.cards.plex", "Plex"),
        Component: PlexCard,
      },
      {
        id: "vodSync",
        label: t("dashboard.cards.vodSync", "VOD Sync"),
        Component: VodSyncCard,
      },
      { id: "nfs", label: t("dashboard.cards.nfs", "NFS"), Component: NfsCard },
      {
        id: "storage",
        label: t("dashboard.cards.storage", "Storage"),
        Component: StorageCard,
      },
      {
        id: "downloads",
        label: t("dashboard.cards.downloads", "Downloads"),
        Component: DownloadsCard,
      },
      {
        id: "uploads",
        label: t("dashboard.cards.uploads", "Uploads"),
        Component: UploadsCard,
      },
      {
        id: "posterizarr",
        label: t("dashboard.cards.posterizarr", "Posterizarr"),
        Component: PosterizarrCard,
      },
      {
        id: "autoscan",
        label: t("dashboard.cards.autoscan", "Autoscan"),
        Component: AutoscanCard,
      },
    ],
    [t],
  );

  const defaultOrder = useMemo(() => CARDS.map((c) => c.id), [CARDS]);

  const { editMode, order, setOrder } = useDashboardLayout();
  const dragId = useRef(null);

  // Keep stored order in sync with default order if registry changes
  useEffect(() => {
    setOrder((prev) => {
      const known = prev.filter((id) => defaultOrder.includes(id));
      const missing = defaultOrder.filter((id) => !known.includes(id));
      const next = [...known, ...missing];
      const same =
        next.length === prev.length && next.every((v, i) => v === prev[i]);
      return same ? prev : next;
    });
  }, [defaultOrder, setOrder]);

  const moveCard = (id, dir) => {
    setOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleDragStart = (id) => (e) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* ignore */
    }
  };
  const handleDragOver = (e) => {
    if (!editMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (targetId) => (e) => {
    if (!editMode) return;
    e.preventDefault();
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;
    setOrder((prev) => {
      const from = prev.indexOf(sourceId);
      const to = prev.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const orderedCards = useMemo(
    () => order.map((id) => CARDS.find((c) => c.id === id)).filter(Boolean),
    [order, CARDS],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 xl:gap-5 items-stretch">
        {orderedCards.map(({ id, label, Component }, idx) => (
          <div
            key={id}
            draggable={editMode}
            onDragStart={editMode ? handleDragStart(id) : undefined}
            onDragOver={handleDragOver}
            onDrop={editMode ? handleDrop(id) : undefined}
            className={`relative h-full flex flex-col ${
              editMode
                ? "ring-2 ring-theme-primary/40 ring-offset-2 ring-offset-theme-bg rounded-2xl transition-all hover:ring-theme-primary/80 cursor-move"
                : ""
            }`}
          >
            {editMode && (
              <div className="absolute inset-x-0 -top-2 z-20 flex items-center justify-between gap-1 px-2 pointer-events-none">
                <div className="pointer-events-auto inline-flex items-center gap-1 px-2 py-1 bg-theme-card border border-theme-primary/40 rounded-md shadow-md">
                  <GripVertical className="w-3.5 h-3.5 text-theme-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-theme-text">
                    {label}
                  </span>
                </div>
                <div className="pointer-events-auto inline-flex items-center gap-1 bg-theme-card border border-theme-border rounded-md shadow-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => moveCard(id, -1)}
                    disabled={idx === 0}
                    className="p-1 text-theme-text-muted hover:text-theme-primary hover:bg-theme-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title={t("dashboard.layout.moveUp", "Move up")}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCard(id, 1)}
                    disabled={idx === orderedCards.length - 1}
                    className="p-1 text-theme-text-muted hover:text-theme-primary hover:bg-theme-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title={t("dashboard.layout.moveDown", "Move down")}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <div
              className={`flex-1 h-full ${editMode ? "pointer-events-none opacity-90" : ""}`}
            >
              <Component />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
