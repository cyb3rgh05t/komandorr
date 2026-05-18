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
    </ChartCard>
  );
}

function VpnCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
  });
  const instances = instData?.instances || [];

  const { data: agg } = useQuery({
    queryKey: ["dash-vpn-containers", instances.map((i) => i.id).join(",")],
    queryFn: async () => {
      const ids = instances.length > 0 ? instances.map((i) => i.id) : [null];
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const url = id
              ? `/vpn-proxy/containers?vpn_id=${encodeURIComponent(id)}`
              : "/vpn-proxy/containers";
            const res = await api.get(url);
            return Array.isArray(res) ? res : res?.containers || [];
          } catch {
            return [];
          }
        }),
      );
      return { containers: results.flat() };
    },
    refetchInterval: 15000,
    staleTime: 8000,
  });

  const containers = (agg?.containers || []).filter(Boolean);
  const running = containers.filter((c) => {
    const raw = c?.docker_status ?? c?.state ?? c?.status ?? "";
    const s = (typeof raw === "string" ? raw : String(raw || "")).toLowerCase();
    return s === "running" || s === "healthy" || s === "up";
  }).length;
  const stopped = containers.length - running;

  return (
    <ChartCard
      icon={Shield}
      title={t("dashboard.charts.vpn", "VPN Proxy")}
      onClick={() => navigate("/vpn-proxy")}
      footer={`${instances.length || 1} ${t(
        "dashboard.charts.instances",
        "instance(s)",
      )}`}
    >
      <DonutChart
        segments={[
          { value: running, color: "#22c55e" },
          { value: stopped, color: "#ef4444" },
        ]}
        centerLabel={containers.length}
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
    </ChartCard>
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

  // Backend returns { managers: [{ nfs_mounts, nfs_mount_statuses: {id: {mounted}} }] }
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
    return list.sort((a, b) => b.pct - a.pct).slice(0, 4);
  }, [services]);

  const avgUsage = Number(summary?.average_usage_percent ?? 0);

  return (
    <ChartCard
      icon={Database}
      title={t("dashboard.charts.storage", "Storage")}
      onClick={() => navigate("/storage")}
      footer={`${pools.length} ${t("dashboard.charts.paths", "path(s)")} • ${avgUsage.toFixed(0)}% ${t("dashboard.charts.avg", "avg")}`}
    >
      {pools.length === 0 ? (
        <EmptyHint text={t("dashboard.charts.noData", "No data available")} />
      ) : (
        <div className="w-full space-y-3">
          {pools.map((p) => (
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
          stuck,
          total: items.length,
        };
      })
      .filter((r) => r.total > 0)
      .slice(0, 4);
  }, [data]);

  const totalActive = rows.reduce((a, r) => a + r.active, 0);
  const totalStuck = rows.reduce((a, r) => a + r.stuck, 0);

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
      {rows.length === 0 ? (
        <EmptyHint text={t("dashboard.charts.noData", "No data available")} />
      ) : (
        <div className="w-full space-y-3">
          {rows.map((r) => {
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
  items.forEach((d) => {
    if (d?.success === false || d?.error) {
      error += 1;
      return;
    }
    const status = d?.status || {};
    const isRunning =
      status.running === true ||
      status.manual_running === true ||
      status.scheduler_running === true;
    if (isRunning) running += 1;
    else idle += 1;
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
      <DonutChart
        segments={[
          { value: running, color: "#22d3ee" },
          { value: idle, color: "#94a3b8" },
          { value: error, color: "#ef4444" },
        ]}
        centerLabel={running + idle + error}
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
  instances.forEach((inst) => {
    const stats = inst?.stats || {};
    const qLen = Array.isArray(inst?.queue) ? inst.queue.length : 0;
    queue += Number(stats.scans_remaining ?? qLen ?? 0) || 0;
    processed += Number(stats.scans_processed ?? 0) || 0;
    failed += Number(stats.scans_failed ?? stats.errors ?? 0) || 0;
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
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grid wrapper                                                              */
/* -------------------------------------------------------------------------- */

export default function DashboardPageCharts() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <PlexCard />
      <VpnCard />
      <NfsCard />
      <StorageCard />
      <DownloadsCard />
      <UploadsCard />
      <PosterizarrCard />
      <AutoscanCard />
    </div>
  );
}
