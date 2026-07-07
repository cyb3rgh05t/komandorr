import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Tv2,
  RefreshCw,
  Activity,
  Users,
  Server,
  PlayCircle,
  HardDrive,
  Gauge,
  Wifi,
  WifiOff,
  Flame,
  BarChart3,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
} from "lucide-react";

import { api } from "@/services/api";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useToast } from "@/context/ToastContext";

const TIME_RANGES = [
  { key: "7d", label: "7 Days", days: 7 },
  { key: "14d", label: "14 Days", days: 14 },
  { key: "30d", label: "30 Days", days: 30 },
  { key: "90d", label: "90 Days", days: 90 },
  { key: "all", label: "All Time", days: 0 },
];

function formatUptime(totalSeconds) {
  const sec = Number(totalSeconds) || 0;
  if (sec <= 0) return "-";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getPathValue(source, path) {
  if (!source || !path) return undefined;
  return path.split(".").reduce((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return acc[key];
  }, source);
}

function getDayOfWeek(dateStr) {
  const text = String(dateStr || "").trim();

  // Try format "DD.MM." (German format with dots) - e.g., "24.05."
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\./);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = new Date().getFullYear(); // Use current year
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      const dayOfWeek = d.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday";
    }
  }

  // Try ISO format: "2026-06-22"
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const d = new Date(text + "T00:00:00");
    if (!isNaN(d.getTime())) {
      const dayOfWeek = d.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday";
    }
  }

  // Fallback to weekday
  return "weekday";
}

function pickNumber(source, paths, fallback = 0) {
  for (const path of paths) {
    const value = toNumber(getPathValue(source, path), Number.NaN);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function formatPeakLabel(label) {
  if (label == null) return "-";
  const text = String(label);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(8);
  return text;
}

function formatMonthShortLabel(label) {
  if (label == null) return "-";

  const text = String(label).trim();
  const ymMatch = text.match(/^(\d{4})[-/.](\d{1,2})/);
  if (ymMatch) {
    const date = new Date(Number(ymMatch[1]), Number(ymMatch[2]) - 1, 1);
    return date.toLocaleDateString(undefined, { month: "short" });
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, { month: "short" });
  }

  if (text.length <= 4) return text;
  return text.slice(0, 3);
}

function parsePeakDateValue(dateStr) {
  if (!dateStr) return null;

  const text = String(dateStr).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const match = text.match(/^(\d{1,2})\.(\d{1,2})\./);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const parsed = new Date(new Date().getFullYear(), month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function WebplayerMonthComparisonCard({ compare, t }) {
  if (!compare) return null;

  const groups = [
    {
      key: "peak",
      label: t("webplayer.peak", "Peak"),
      cur: compare.currentPeak,
      prev: compare.previousPeak,
    },
    {
      key: "avg",
      label: t("webplayer.avgPeak", "Avg Peak"),
      cur: compare.currentAvg,
      prev: compare.previousAvg,
    },
    {
      key: "days",
      label: t("webplayer.daysCaptured", "Days Captured"),
      cur: compare.currentDays,
      prev: compare.previousDays,
    },
  ];

  const overallPct = compare.percent;
  const overallDir =
    overallPct == null
      ? "flat"
      : overallPct > 0
        ? "up"
        : overallPct < 0
          ? "down"
          : "flat";

  const W = 360;
  const H = 200;
  const PAD = { top: 20, right: 24, bottom: 30, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const renderGroups = groups.map((g) => ({
    ...g,
    max: Math.max(g.cur, g.prev, 1),
  }));
  const groupGap = innerW / renderGroups.length;
  const barW = Math.min(28, groupGap * 0.32);

  return (
    <div className="bg-theme-card border border-theme rounded-xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-theme-primary/15">
            <Calendar className="w-5 h-5 text-theme-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-theme-text">
              {t("webplayer.monthComparison", "Month Comparison")}
            </h3>
            <p className="text-xs text-theme-text-muted mt-0.5">
              {compare.currentLabel} <span className="opacity-60">vs</span>{" "}
              {compare.previousLabel}
            </p>
          </div>
        </div>
        {overallPct != null && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md ${
              overallDir === "up"
                ? "bg-green-500/15 text-green-400"
                : overallDir === "down"
                  ? "bg-rose-500/15 text-rose-400"
                  : "bg-theme-hover text-theme-text-muted"
            }`}
          >
            {overallDir === "up" ? (
              <ArrowUp size={12} />
            ) : overallDir === "down" ? (
              <ArrowDown size={12} />
            ) : (
              <Minus size={12} />
            )}
            {overallPct > 0 ? "+" : ""}
            {overallPct.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="px-3 sm:px-5 py-6 sm:py-8">
        <div className="w-full max-w-md mx-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="overflow-visible w-full block"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="wpCmpCurGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="wpCmpPrevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.45" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
              const y = PAD.top + innerH - r * innerH;
              return (
                <line
                  key={i}
                  x1={PAD.left}
                  y1={y}
                  x2={PAD.left + innerW}
                  y2={y}
                  stroke="currentColor"
                  className="text-theme-text-muted"
                  strokeOpacity={0.1}
                  strokeDasharray="3 5"
                />
              );
            })}

            {renderGroups.map((g, i) => {
              const cx = PAD.left + i * groupGap + groupGap / 2;
              const curH = (g.cur / g.max) * innerH;
              const prevH = (g.prev / g.max) * innerH;
              const curX = cx - barW - 3;
              const prevX = cx + 3;
              const curY = PAD.top + innerH - curH;
              const prevY = PAD.top + innerH - prevH;
              return (
                <g key={g.key}>
                  <rect
                    x={prevX}
                    y={prevY}
                    width={barW}
                    height={Math.max(prevH, 1)}
                    rx={3}
                    fill="url(#wpCmpPrevGrad)"
                  />
                  <text
                    x={prevX + barW / 2}
                    y={prevY - 4}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    className="fill-violet-300"
                  >
                    {g.prev}
                  </text>

                  <rect
                    x={curX}
                    y={curY}
                    width={barW}
                    height={Math.max(curH, 1)}
                    rx={3}
                    fill="url(#wpCmpCurGrad)"
                  />
                  <text
                    x={curX + barW / 2}
                    y={curY - 4}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    className="fill-cyan-300"
                  >
                    {g.cur}
                  </text>

                  <text
                    x={cx}
                    y={PAD.top + innerH + 16}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={600}
                    className="fill-theme-text-muted"
                  >
                    {g.label}
                  </text>
                </g>
              );
            })}

            <line
              x1={PAD.left}
              y1={PAD.top + innerH}
              x2={PAD.left + innerW}
              y2={PAD.top + innerH}
              stroke="currentColor"
              className="text-theme-text-muted"
              strokeOpacity={0.25}
            />
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-t border-theme bg-theme-hover/10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-cyan-400 to-cyan-600" />
          <span className="text-xs text-theme-text-muted">
            {compare.currentLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-violet-400 to-violet-600" />
          <span className="text-xs text-theme-text-muted">
            {compare.previousLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function WebplayerMonthlyTrendCard({ monthlyTrend, t }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!Array.isArray(monthlyTrend) || monthlyTrend.length === 0) return null;

  const maxPeak = Math.max(...monthlyTrend.map((m) => m.value), 1);
  const minPeak = Math.min(...monthlyTrend.map((m) => m.value));

  const W = 360;
  const H = 200;
  const PAD = { top: 20, right: 24, bottom: 30, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / monthlyTrend.length;
  const barW = Math.min(slot * 0.65, 22);

  const yTicks = [];
  const tickStep = Math.max(1, Math.ceil(maxPeak / 4));
  for (let v = 0; v <= maxPeak + tickStep; v += tickStep) yTicks.push(v);
  const yMax = yTicks[yTicks.length - 1];

  return (
    <div className="bg-theme-card border border-theme rounded-xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-theme-primary/15">
            <BarChart3 className="w-5 h-5 text-theme-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-theme-text">
                {t("webplayer.monthlyPeakTrend", "Monthly Peak Trend")}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
                <Calendar size={10} className="text-cyan-400" />
                <span className="text-[10px] font-semibold text-cyan-400 tracking-wide">
                  {t("webplayer.last12Months", "LAST 12 MONTHS")}
                </span>
              </span>
            </div>
            <p className="text-xs text-theme-text-muted mt-0.5">
              {t("webplayer.peakPerMonth", "Peak concurrent per month")}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-5 py-6 sm:py-8">
        <div className="w-full max-w-md mx-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="overflow-visible w-full block"
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="wpMtBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="wpMtBarBest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="wpMtBarWorst" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => {
              const y = PAD.top + innerH - (tick / yMax) * innerH;
              return (
                <g key={`y-${tick}`}>
                  <line
                    x1={PAD.left}
                    y1={y}
                    x2={PAD.left + innerW}
                    y2={y}
                    stroke="currentColor"
                    className="text-theme-text-muted"
                    strokeOpacity={0.1}
                    strokeDasharray="3 5"
                  />
                  <text
                    x={PAD.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={9}
                    className="fill-theme-text-muted"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {monthlyTrend.map((m, i) => {
              const ratio = m.value / yMax;
              const h = ratio * innerH;
              const x = PAD.left + i * slot + (slot - barW) / 2;
              const y = PAD.top + innerH - h;
              const isBest = m.value === maxPeak && maxPeak > 0;
              const isWorst =
                m.value === minPeak &&
                minPeak !== maxPeak &&
                monthlyTrend.length > 1;
              const isHover = hoverIdx === i;
              const fill = isBest
                ? "url(#wpMtBarBest)"
                : isWorst
                  ? "url(#wpMtBarWorst)"
                  : "url(#wpMtBarGrad)";

              return (
                <g
                  key={`${m.label}-${i}`}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  className="cursor-pointer"
                >
                  {isHover && (
                    <rect
                      x={PAD.left + i * slot}
                      y={PAD.top}
                      width={slot}
                      height={innerH}
                      className="fill-theme-text-muted"
                      opacity={0.05}
                    />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, 1)}
                    rx={3}
                    fill={fill}
                    style={{ transition: "all 0.2s" }}
                  />

                  {!isHover && (
                    <g>
                      <rect
                        x={x + barW / 2 - 18}
                        y={y - 24}
                        width={36}
                        height={18}
                        rx={9}
                        className={
                          isBest
                            ? "fill-amber-500/20 stroke-amber-400/60"
                            : isWorst
                              ? "fill-rose-500/20 stroke-rose-400/60"
                              : "fill-cyan-500/15 stroke-cyan-400/50"
                        }
                        strokeWidth="1"
                      />
                      <text
                        x={x + barW / 2}
                        y={y - 11}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight="700"
                        className={
                          isBest
                            ? "fill-amber-300"
                            : isWorst
                              ? "fill-rose-300"
                              : "fill-cyan-300"
                        }
                      >
                        {m.value}
                      </text>
                    </g>
                  )}

                  {isBest && !isHover && (
                    <text
                      x={x + barW / 2}
                      y={y - 30}
                      textAnchor="middle"
                      fontSize={14}
                    >
                      {"\uD83D\uDC51"}
                    </text>
                  )}

                  {isWorst && !isHover && (
                    <text
                      x={x + barW / 2}
                      y={y - 28}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#fb7185"
                    >
                      {"\u25BD"}
                    </text>
                  )}

                  {isHover && (
                    <g pointerEvents="none">
                      <rect
                        x={Math.max(4, Math.min(x + barW / 2 - 60, W - 124))}
                        y={Math.max(4, y - 50)}
                        width={120}
                        height={42}
                        rx={6}
                        className="fill-theme-card stroke-theme-text-muted/30"
                        strokeWidth={1}
                        style={{
                          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                        }}
                      />
                      <text
                        x={Math.max(64, Math.min(x + barW / 2, W - 64))}
                        y={Math.max(20, y - 34)}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        className="fill-theme-text"
                      >
                        {m.fullLabel || m.label}
                      </text>
                      <text
                        x={Math.max(64, Math.min(x + barW / 2, W - 64))}
                        y={Math.max(34, y - 20)}
                        textAnchor="middle"
                        fontSize={9}
                        className="fill-theme-text-muted"
                      >
                        {t("webplayer.peakValue", "Peak {{value}}", {
                          value: m.value,
                        })}
                      </text>
                    </g>
                  )}

                  <text
                    x={x + barW / 2}
                    y={PAD.top + innerH + 14}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={isHover ? 700 : 500}
                    className="fill-theme-text-muted"
                    opacity={isHover ? 1 : 0.85}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}

            <line
              x1={PAD.left}
              y1={PAD.top + innerH}
              x2={PAD.left + innerW}
              y2={PAD.top + innerH}
              stroke="currentColor"
              className="text-theme-text-muted"
              strokeOpacity={0.25}
            />
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-5 sm:px-8 py-4 border-t border-theme bg-theme-hover/10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-cyan-400 to-cyan-600" />
          <span className="text-xs text-theme-text-muted">
            {t("webplayer.legendMonthly", "Monthly")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-amber-400 to-amber-600" />
          <span className="text-xs text-theme-text-muted">
            {t("webplayer.bestMonth", "Best")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-rose-400 to-rose-600" />
          <span className="text-xs text-theme-text-muted">
            {t("webplayer.worstMonth", "Worst")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Webplayer() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [hoveredPeakBar, setHoveredPeakBar] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const monthRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthRef.current && !monthRef.current.contains(e.target)) {
        setShowMonthMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: status } = useQuery({
    queryKey: ["webplayer-status"],
    queryFn: () => api.get("/webplayer/status").catch(() => null),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: stats } = useQuery({
    queryKey: ["webplayer-stats"],
    queryFn: () => api.get("/webplayer/stats").catch(() => null),
    refetchInterval: 15000,
    staleTime: 8000,
    enabled: !!status && status.not_configured !== true,
  });

  const { data: liveMetrics } = useQuery({
    queryKey: ["webplayer-live-metrics"],
    queryFn: () => api.get("/webplayer/live-metrics").catch(() => null),
    refetchInterval: 5000,
    staleTime: 2000,
    enabled: !!status && status.not_configured !== true,
  });

  const { data: peakStats } = useQuery({
    queryKey: ["webplayer-peak-stats"],
    queryFn: () =>
      api.get("/webplayer/peak-stats").catch(() => ({
        max_peak: 0,
        avg_peak: 0,
        total_events: 0,
        daily: [],
      })),
    refetchInterval: 30000,
    staleTime: 10000,
    enabled: !!status && status.not_configured !== true,
  });

  const pickMetric = (paths) => {
    const value = pickNumber(stats, paths, Number.NaN);
    return Number.isFinite(value) ? value : null;
  };

  const cards = useMemo(() => {
    const usersTotal = toNumber(stats?.users?.total, 0);
    const enabledSources = toNumber(stats?.sources?.enabled, 0);
    const sessionsRunning = toNumber(stats?.transcode?.sessionsRunning, 0);
    const contentTotal = toNumber(stats?.content?.total, 0);
    const streamsPeak = pickMetric([
      "transcode.streamsPeak",
      "transcode.sessionsPeak",
      "transcode.peakSessions",
      "transcode.maxSessions",
      "transcode.maxConcurrentSessions",
    ]);
    const totalStreams = pickMetric([
      "transcode.totalSessions",
      "transcode.sessionsTotal",
      "transcode.streamsTotal",
    ]);

    const effectiveStreamsPeak =
      streamsPeak == null ? sessionsRunning || null : streamsPeak;
    const effectiveTotalStreams =
      totalStreams == null ? sessionsRunning || null : totalStreams;
    const peakCardValue =
      Number(peakStats?.max_peak) > 0
        ? Number(peakStats.max_peak)
        : effectiveStreamsPeak;
    const totalStreamsCardValue =
      Number(peakStats?.total_events) > 0
        ? Number(peakStats.total_events)
        : effectiveTotalStreams;

    const cpuPct = toNumber(liveMetrics?.server?.cpu?.usagePct, 0);
    const ramPct = toNumber(liveMetrics?.server?.memory?.utilizationPct, 0);
    const netMbps = toNumber(liveMetrics?.server?.network?.totalRateMbps, 0);
    const uptime = formatUptime(liveMetrics?.server?.uptimeSec);

    return [
      {
        label: t("webplayer.uptime", "Uptime"),
        value: uptime,
        icon: Tv2,
        color: "theme-primary",
      },
      {
        label: t("webplayer.cpu", "CPU"),
        value: `${Math.round(cpuPct)}%`,
        icon: Gauge,
        color: "orange-500",
      },
      {
        label: t("webplayer.ram", "RAM"),
        value: `${Math.round(ramPct)}%`,
        icon: Activity,
        color: "blue-500",
      },
      {
        label: t("webplayer.traffic", "Traffic"),
        value: `${netMbps.toFixed(1)} Mbps`,
        icon: Wifi,
        color: "green-500",
      },
      {
        label: t("webplayer.sourcesEnabled", "Enabled Sources"),
        value: enabledSources,
        icon: Server,
        color: "cyan-400",
      },
      {
        label: t("webplayer.contentTotal", "Content Total"),
        value: contentTotal,
        icon: HardDrive,
        color: "purple-400",
      },
      {
        label: t("webplayer.users", "Users"),
        value: usersTotal,
        icon: Users,
        color: "emerald-500",
      },
      {
        label: t("webplayer.sessions", "Running Sessions"),
        value: sessionsRunning,
        icon: PlayCircle,
        color: "amber-500",
      },
      {
        label: t("webplayer.streamsPeak", "Streams Peak"),
        value: peakCardValue ?? "-",
        icon: Flame,
        color: "red-500",
      },
      {
        label: t("webplayer.totalStreams", "Total Streams"),
        value: totalStreamsCardValue ?? "-",
        icon: PlayCircle,
        color: "cyan-400",
      },
    ];
  }, [stats, liveMetrics, peakStats, t]);

  const peakSeries = useMemo(() => {
    if (!Array.isArray(peakStats?.daily)) return [];
    return peakStats.daily
      .map((row, idx) => {
        const rawLabel = String(row?.label ?? idx + 1);
        const rawDate = String(row?.date ?? row?.timestamp ?? rawLabel);
        const dayType = getDayOfWeek(rawDate);
        return {
          index: idx,
          label: formatPeakLabel(row?.label ?? idx + 1),
          fullLabel: rawDate,
          date: rawDate,
          value: toNumber(row?.value, 0),
          dayType,
        };
      })
      .sort(
        (a, b) =>
          (parsePeakDateValue(a.date || a.fullLabel || a.label) ?? 0) -
          (parsePeakDateValue(b.date || b.fullLabel || b.label) ?? 0),
      )
      .slice(-90);
  }, [peakStats]);

  const monthlyTrend = useMemo(() => {
    const labels = stats?.charts?.playbackTelemetryMonthly?.labels;
    const values = stats?.charts?.playbackTelemetryMonthly?.values;
    if (!Array.isArray(labels) || !Array.isArray(values)) return [];
    return labels.map((label, index) => ({
      label: formatMonthShortLabel(label),
      fullLabel: String(label),
      value: toNumber(values[index], 0),
    }));
  }, [stats]);

  const monthlyTrendSeries = useMemo(() => {
    const nonZero = monthlyTrend.filter((item) => item.value > 0);
    return nonZero.length > 0 ? nonZero : monthlyTrend;
  }, [monthlyTrend]);

  const monthCompare = useMemo(() => {
    if (!monthlyTrendSeries.length) {
      return {
        current: { label: "--", value: 0 },
        previous: { label: "--", value: 0 },
      };
    }

    const current = monthlyTrendSeries[monthlyTrendSeries.length - 1];
    const previous =
      monthlyTrendSeries.length > 1
        ? monthlyTrendSeries[monthlyTrendSeries.length - 2]
        : { label: "--", value: 0 };

    return { current, previous };
  }, [monthlyTrendSeries]);

  const days = TIME_RANGES.find((r) => r.key === timeRange)?.days ?? 30;

  const displayedPeaks = useMemo(() => {
    let source = Array.isArray(peakSeries) ? peakSeries : [];

    if (selectedMonth !== "all") {
      const monthToken = selectedMonth.split("-")[1];
      source = source.filter((item) =>
        String(item.date || item.fullLabel || item.label || "").includes(
          `-${monthToken}-`,
        ),
      );
    }

    if (timeRange !== "all" && days > 0) {
      source = source.slice(-days);
    }

    return source;
  }, [days, peakSeries, selectedMonth, timeRange]);

  const monthCompareCards = useMemo(() => {
    const currentPeak = toNumber(peakStats?.max_peak, 0);
    const previousPeak = toNumber(monthCompare.previous?.value, 0);
    const currentAvg = Number(toNumber(peakStats?.avg_peak, 0).toFixed(1));
    const previousAvg = toNumber(monthCompare.previous?.value, 0);
    const currentDays = displayedPeaks.length;
    const previousDays = 0;
    const percent =
      previousPeak > 0
        ? ((currentPeak - previousPeak) / previousPeak) * 100
        : currentPeak > 0
          ? 100
          : 0;

    return {
      currentLabel: monthCompare.current?.label || "--",
      previousLabel: monthCompare.previous?.label || "--",
      currentPeak,
      previousPeak,
      currentAvg,
      previousAvg,
      currentDays,
      previousDays,
      percent,
    };
  }, [displayedPeaks.length, monthCompare, peakStats]);

  const monthOptions = useMemo(() => {
    const unique = new Set(
      peakSeries
        .map((item) => {
          const label = String(item.label || "");
          const parts = label.split(".");
          if (parts.length < 2) return "";
          return `2026-${parts[1].padStart(2, "0")}`;
        })
        .filter(Boolean),
    );

    return Array.from(unique)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((ym) => {
        const [year, month] = ym.split("-");
        const date = new Date(Number(year), Number(month) - 1, 1);
        return {
          value: ym,
          label: date.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          }),
        };
      });
  }, [peakSeries]);

  useEffect(() => {
    if (monthOptions.length === 0) return;
    const hasSelected = monthOptions.some((opt) => opt.value === selectedMonth);
    if (!hasSelected) setSelectedMonth("all");
  }, [monthOptions, selectedMonth]);

  useEffect(() => {
    if (selectedMonth !== "all" && timeRange !== "all") {
      setTimeRange("all");
    }
  }, [selectedMonth, timeRange]);

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === "all") {
      return t("vodStreams.history.monthAll", "All Months");
    }
    return (
      monthOptions.find((opt) => opt.value === selectedMonth)?.label ||
      t("vodStreams.history.monthAll", "All Months")
    );
  }, [monthOptions, selectedMonth, t]);

  const peakChartModel = useMemo(() => {
    if (!Array.isArray(displayedPeaks) || displayedPeaks.length === 0) {
      return null;
    }

    const peaks = displayedPeaks.map((d) => toNumber(d.value, 0));
    const maxPeak = Math.max(...peaks, 1);
    const minPeakVal = Math.min(...peaks);
    const peakIdx = displayedPeaks.findIndex(
      (d) => toNumber(d.value, 0) === maxPeak,
    );
    const minIdx = displayedPeaks.findIndex(
      (d) => toNumber(d.value, 0) === minPeakVal,
    );

    // Enrich displayed peaks (dayType already added in peakSeries)
    const enrichedPeaks = displayedPeaks.map((item) => ({
      ...item,
    }));

    const chartHeight = 460;
    const chartPadding = { top: 80, right: 16, bottom: 60, left: 48 };
    const slotWidth =
      displayedPeaks.length <= 10
        ? 130
        : displayedPeaks.length <= 20
          ? 90
          : displayedPeaks.length <= 35
            ? 64
            : 48;

    const innerWidth =
      displayedPeaks.length * slotWidth -
      chartPadding.left -
      chartPadding.right;
    const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    const barGap = innerWidth / displayedPeaks.length;
    const barWidth = Math.min(Math.max(barGap * 0.55, 28), 140);
    const svgWidth = innerWidth + chartPadding.left + chartPadding.right;

    const yTicks = [];
    const tickStep = Math.max(1, Math.ceil(maxPeak / 6));
    for (let i = 0; i <= maxPeak + tickStep; i += tickStep) yTicks.push(i);
    const yMax = yTicks[yTicks.length - 1];

    const trendPoints = displayedPeaks.map((item, i) => {
      const value = Math.max(0, Math.min(yMax, toNumber(item.value, 0)));
      const cx = chartPadding.left + i * barGap + barGap / 2;
      const cy = chartPadding.top + innerHeight - (value / yMax) * innerHeight;
      return { x: cx, y: cy };
    });

    const buildCurvedPath = (points) => {
      if (points.length < 2) return "";
      if (points.length === 2) {
        return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
      }

      const tension = 1.0;
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = i === 0 ? points[i] : points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i + 2 < points.length ? points[i + 2] : p2;

        const cp1x = p1.x + ((p2.x - p0.x) * tension) / 6;
        const cp1y = p1.y + ((p2.y - p0.y) * tension) / 6;
        const cp2x = p2.x - ((p3.x - p1.x) * tension) / 6;
        const cp2y = p2.y - ((p3.y - p1.y) * tension) / 6;

        path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
      }
      return path;
    };

    return {
      maxPeak,
      minPeakVal,
      peakIdx,
      minIdx,
      chartHeight,
      chartPadding,
      innerWidth,
      innerHeight,
      barGap,
      barWidth,
      svgWidth,
      yTicks,
      yMax,
      trendPoints,
      trendPath: buildCurvedPath(trendPoints),
      enrichedPeaks,
    };
  }, [displayedPeaks]);

  const notConfigured = status?.not_configured === true;
  const unreachable = status && !status.connected && !notConfigured;

  const refreshAll = async () => {
    if (manualRefreshing) return;
    setManualRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["webplayer-status"] }),
        queryClient.invalidateQueries({ queryKey: ["webplayer-stats"] }),
        queryClient.invalidateQueries({
          queryKey: ["webplayer-live-metrics"],
        }),
        queryClient.invalidateQueries({ queryKey: ["webplayer-peak-stats"] }),
      ]);
      toast.success(
        t("webplayer.refreshSuccess", "Webplayer data refreshed successfully"),
      );
    } catch {
      toast.error(
        t("webplayer.refreshError", "Failed to refresh Webplayer data"),
      );
    } finally {
      setManualRefreshing(false);
    }
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Not Configured Banner */}
      {notConfigured && (
        <Link
          to="/settings?tab=webplayer"
          className="block p-4 rounded-xl border shadow-lg bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg backdrop-blur-sm bg-yellow-500/10">
              <WifiOff className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-yellow-400">
                {t(
                  "webplayer.notConfiguredShort",
                  "Webplayer is not configured",
                )}
              </p>
            </div>
          </div>
        </Link>
      )}

      <PageHeader
        icon={Tv2}
        title={t("nav.webplayer", "Webplayer")}
        actions={
          <button
            type="button"
            onClick={refreshAll}
            disabled={manualRefreshing}
            className="inline-flex items-center justify-center gap-2 bg-theme-card border border-theme rounded-lg px-4 py-2.5 text-sm font-semibold text-theme-text hover:text-white hover:border-theme-primary hover:bg-theme active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-4 h-4 text-theme-primary transition-transform duration-500 ${manualRefreshing ? "animate-spin" : ""}`}
            />
            {manualRefreshing
              ? t("common.refreshing", "Refreshing...")
              : t("common.refresh", "Refresh")}
          </button>
        }
      />

      {notConfigured && (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <WifiOff className="w-16 h-16 mx-auto text-theme-text-muted mb-4" />
          <h3 className="text-base font-semibold text-theme-text mb-2">
            {t("webplayer.notConfiguredTitle", "Webplayer Not Configured")}
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            {t(
              "webplayer.notConfigured",
              "Configure your Webplayer URL and admin credentials in settings to show dashboard stats.",
            )}
          </p>
        </div>
      )}

      {!notConfigured && unreachable && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {t("webplayer.unreachable", "Webplayer unreachable")}:{" "}
          {status?.error || t("common.unknownError", "Unbekannter Fehler")}
        </div>
      )}

      {!notConfigured && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {cards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                icon={card.icon}
                color={card.color}
              />
            ))}
          </div>

          {peakChartModel ? (
            <>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="inline-flex items-center bg-theme-card border border-theme rounded-xl p-1 gap-0.5">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range.key}
                        onClick={() => {
                          setTimeRange(range.key);
                          setSelectedMonth("all");
                        }}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                          timeRange === range.key
                            ? "bg-theme-primary text-black shadow-md shadow-theme-primary/25"
                            : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/60"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative" ref={monthRef}>
                    <button
                      onClick={() => setShowMonthMenu((prev) => !prev)}
                      className={`h-9 px-3 rounded-lg border text-xs sm:text-sm transition-all shadow-sm min-w-[140px] flex items-center justify-between gap-2 ${
                        showMonthMenu
                          ? "bg-theme-primary/15 border-theme-primary/40 text-theme-primary"
                          : "bg-theme-card border-theme text-theme-text-muted hover:text-theme-text hover:border-theme-primary/50"
                      }`}
                    >
                      <span className="truncate">{selectedMonthLabel}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${showMonthMenu ? "rotate-180" : ""}`}
                      />
                    </button>

                    {showMonthMenu && (
                      <div className="absolute left-0 top-full mt-1.5 min-w-full bg-theme-card border border-theme rounded-lg shadow-xl z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            setSelectedMonth("all");
                            setShowMonthMenu(false);
                          }}
                          className={`flex items-center w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors ${
                            selectedMonth === "all"
                              ? "bg-theme-primary/20 text-theme-primary"
                              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover"
                          }`}
                        >
                          {t("vodStreams.history.monthAll", "All Months")}
                        </button>
                        <div className="border-t border-theme" />
                        {monthOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setSelectedMonth(opt.value);
                              setShowMonthMenu(false);
                            }}
                            className={`flex items-center w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors ${
                              selectedMonth === opt.value
                                ? "bg-theme-primary/20 text-theme-primary"
                                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-theme-card border border-theme rounded-xl shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 sm:px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-theme-primary/15">
                      <Activity className="w-5 h-5 text-theme-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-semibold text-theme-text">
                          {t(
                            "webplayer.dailyPeakConcurrentStreams",
                            "Daily Peak Concurrent Streams",
                          )}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
                          <Calendar size={10} className="text-cyan-400" />
                          <span className="text-[10px] font-semibold text-cyan-400 tracking-wide">
                            {t("webplayer.webplayerBadge", "WEBPLAYER")}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="px-3 sm:px-5 py-6 sm:py-8 overflow-x-auto">
                    <svg
                      width={peakChartModel.svgWidth}
                      height={peakChartModel.chartHeight}
                    >
                      <defs>
                        <linearGradient
                          id="webplayerBarGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#06b6d4"
                            stopOpacity="0.9"
                          />
                          <stop
                            offset="100%"
                            stopColor="#0891b2"
                            stopOpacity="0.5"
                          />
                        </linearGradient>
                        <linearGradient
                          id="webplayerBarGradientHover"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#22d3ee"
                            stopOpacity="1"
                          />
                          <stop
                            offset="100%"
                            stopColor="#06b6d4"
                            stopOpacity="0.8"
                          />
                        </linearGradient>
                        <linearGradient
                          id="webplayerBarGradientPeak"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#fbbf24"
                            stopOpacity="1"
                          />
                          <stop
                            offset="100%"
                            stopColor="#ca8a04"
                            stopOpacity="0.6"
                          />
                        </linearGradient>
                        <linearGradient
                          id="webplayerBarGradientMin"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#fb7185"
                            stopOpacity="0.9"
                          />
                          <stop
                            offset="100%"
                            stopColor="#e11d48"
                            stopOpacity="0.5"
                          />
                        </linearGradient>
                        <linearGradient
                          id="webplayerBarGradientWeekend"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#4ade80"
                            stopOpacity="0.9"
                          />
                          <stop
                            offset="100%"
                            stopColor="#16a34a"
                            stopOpacity="0.5"
                          />
                        </linearGradient>
                        <filter id="webplayerTrendGlow">
                          <feGaussianBlur
                            stdDeviation="1.5"
                            result="coloredBlur"
                          />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      {peakChartModel.yTicks.map((tick) => {
                        const y =
                          peakChartModel.chartPadding.top +
                          peakChartModel.innerHeight -
                          (tick / peakChartModel.yMax) *
                            peakChartModel.innerHeight;
                        return (
                          <g key={`wpy-${tick}`}>
                            <line
                              x1={peakChartModel.chartPadding.left}
                              y1={y}
                              x2={
                                peakChartModel.chartPadding.left +
                                peakChartModel.innerWidth
                              }
                              y2={y}
                              stroke="currentColor"
                              className="text-theme-text-muted"
                              strokeOpacity={0.1}
                              strokeDasharray="3 6"
                            />
                            <text
                              x={peakChartModel.chartPadding.left - 10}
                              y={y + 4}
                              textAnchor="end"
                              className="text-theme-text-muted"
                              fill="currentColor"
                              fontSize={11}
                              fontWeight="500"
                            >
                              {tick}
                            </text>
                          </g>
                        );
                      })}

                      {peakChartModel.enrichedPeaks.map((item, i) => {
                        const peak = toNumber(item.value, 0);
                        const barHeight =
                          (peak / peakChartModel.yMax) *
                          peakChartModel.innerHeight;
                        const x =
                          peakChartModel.chartPadding.left +
                          i * peakChartModel.barGap +
                          (peakChartModel.barGap - peakChartModel.barWidth) / 2;
                        const y =
                          peakChartModel.chartPadding.top +
                          peakChartModel.innerHeight -
                          barHeight;
                        const isHovered = hoveredPeakBar === i;
                        const isPeakDay = i === peakChartModel.peakIdx;
                        const isMinDay =
                          i === peakChartModel.minIdx &&
                          displayedPeaks.length > 2;
                        const dayType = item.dayType || "default";
                        const isWeekend = dayType === "weekend";

                        let fill = isWeekend
                          ? "url(#webplayerBarGradientWeekend)"
                          : "url(#webplayerBarGradient)";
                        if (isMinDay) fill = "url(#webplayerBarGradientMin)";
                        if (isPeakDay) fill = "url(#webplayerBarGradientPeak)";
                        if (isHovered && !isPeakDay && !isMinDay)
                          fill = "url(#webplayerBarGradientHover)";
                        const tw = 170;
                        const th = 50;
                        const tx = Math.max(
                          4,
                          Math.min(
                            x + peakChartModel.barWidth / 2 - tw / 2,
                            peakChartModel.svgWidth - tw - 4,
                          ),
                        );
                        let ty = y - th - 12;
                        if (ty < 4) ty = y + Math.max(barHeight, 2) + 10;

                        return (
                          <g
                            key={`${item.label}-${i}`}
                            onMouseEnter={() => setHoveredPeakBar(i)}
                            onMouseLeave={() => setHoveredPeakBar(null)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={x}
                              y={y}
                              width={peakChartModel.barWidth}
                              height={Math.max(barHeight, 2)}
                              rx={3}
                              fill={fill}
                              style={{ transition: "all 0.2s ease" }}
                            />

                            {isHovered && (
                              <rect
                                x={
                                  peakChartModel.chartPadding.left +
                                  i * peakChartModel.barGap
                                }
                                y={peakChartModel.chartPadding.top}
                                width={peakChartModel.barGap}
                                height={peakChartModel.innerHeight}
                                fill="currentColor"
                                className="text-theme-text-muted"
                                opacity={0.04}
                                rx={4}
                              />
                            )}

                            {!isHovered && (
                              <g>
                                <rect
                                  x={x + peakChartModel.barWidth / 2 - 18}
                                  y={y - 24}
                                  width={36}
                                  height={18}
                                  rx={9}
                                  fill={
                                    isPeakDay
                                      ? "rgba(251, 191, 36, 0.2)"
                                      : isMinDay
                                        ? "rgba(251, 113, 133, 0.2)"
                                        : isWeekend
                                          ? "rgba(74, 222, 128, 0.15)"
                                          : "rgba(6, 182, 212, 0.15)"
                                  }
                                  stroke={
                                    isPeakDay
                                      ? "rgba(251, 191, 36, 0.6)"
                                      : isMinDay
                                        ? "rgba(251, 113, 133, 0.6)"
                                        : isWeekend
                                          ? "rgba(74, 222, 128, 0.5)"
                                          : "rgba(6, 182, 212, 0.5)"
                                  }
                                  strokeWidth="1"
                                />
                                <text
                                  x={x + peakChartModel.barWidth / 2}
                                  y={y - 11}
                                  textAnchor="middle"
                                  fontSize={11}
                                  fontWeight="700"
                                  fill={
                                    isPeakDay
                                      ? "#fcd34d"
                                      : isMinDay
                                        ? "#fca5a5"
                                        : isWeekend
                                          ? "#86efac"
                                          : "#22d3ee"
                                  }
                                >
                                  {peak}
                                </text>
                              </g>
                            )}

                            {isPeakDay && !isHovered && (
                              <text
                                x={x + peakChartModel.barWidth / 2}
                                y={y - 30}
                                textAnchor="middle"
                                fontSize={14}
                              >
                                {"\uD83D\uDC51"}
                              </text>
                            )}

                            {isMinDay && !isHovered && (
                              <text
                                x={x + peakChartModel.barWidth / 2}
                                y={y - 28}
                                textAnchor="middle"
                                fontSize={10}
                                fill="#fb7185"
                              >
                                {"\u25BD"}
                              </text>
                            )}

                            {isHovered && (
                              <g>
                                <rect
                                  x={tx}
                                  y={ty}
                                  width={tw}
                                  height={th}
                                  rx={10}
                                  className="fill-theme-card stroke-theme-text-muted/20"
                                  strokeWidth="1"
                                  style={{
                                    filter:
                                      "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
                                  }}
                                />
                                {ty < y && (
                                  <polygon
                                    points={`${x + peakChartModel.barWidth / 2 - 5},${ty + th} ${x + peakChartModel.barWidth / 2 + 5},${ty + th} ${x + peakChartModel.barWidth / 2},${ty + th + 6}`}
                                    className="fill-theme-card"
                                  />
                                )}
                                <text
                                  x={tx + tw / 2}
                                  y={ty + 18}
                                  textAnchor="middle"
                                  className="fill-theme-text-muted"
                                  fill="currentColor"
                                  fontSize={11}
                                  fontWeight="500"
                                >
                                  {item.fullLabel || item.label}
                                </text>
                                <text
                                  x={tx + tw / 2}
                                  y={ty + 38}
                                  textAnchor="middle"
                                  className="fill-theme-text"
                                  fill="currentColor"
                                  fontSize={15}
                                  fontWeight="bold"
                                >
                                  {peak} streams
                                </text>
                              </g>
                            )}

                            <text
                              x={x + peakChartModel.barWidth / 2}
                              y={
                                peakChartModel.chartPadding.top +
                                peakChartModel.innerHeight +
                                20
                              }
                              textAnchor="end"
                              className="text-theme-text-muted"
                              fill="currentColor"
                              fontSize={10}
                              opacity={isHovered ? 1 : 0.7}
                              transform={`rotate(-45, ${x + peakChartModel.barWidth / 2}, ${peakChartModel.chartPadding.top + peakChartModel.innerHeight + 20})`}
                            >
                              {item.label}
                            </text>
                          </g>
                        );
                      })}

                      {peakChartModel.trendPoints.length > 1 && (
                        <path
                          d={peakChartModel.trendPath}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2"
                          strokeOpacity="0.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="4 4"
                          filter="url(#webplayerTrendGlow)"
                          style={{ pointerEvents: "none" }}
                        />
                      )}

                      <line
                        x1={peakChartModel.chartPadding.left}
                        y1={
                          peakChartModel.chartPadding.top +
                          peakChartModel.innerHeight
                        }
                        x2={
                          peakChartModel.chartPadding.left +
                          peakChartModel.innerWidth
                        }
                        y2={
                          peakChartModel.chartPadding.top +
                          peakChartModel.innerHeight
                        }
                        stroke="currentColor"
                        className="text-theme-text-muted"
                        strokeOpacity={0.2}
                      />
                      <line
                        x1={peakChartModel.chartPadding.left}
                        y1={peakChartModel.chartPadding.top}
                        x2={peakChartModel.chartPadding.left}
                        y2={
                          peakChartModel.chartPadding.top +
                          peakChartModel.innerHeight
                        }
                        stroke="currentColor"
                        className="text-theme-text-muted"
                        strokeOpacity={0.2}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-theme-text-muted bg-theme-hover border border-theme rounded-lg p-3">
              {peakStats?.error
                ? `${t("webplayer.noPeakData", "No peak data available")} (${peakStats.error})`
                : t("webplayer.noPeakData", "No peak data available")}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <WebplayerMonthComparisonCard compare={monthCompareCards} t={t} />
            <WebplayerMonthlyTrendCard
              monthlyTrend={monthlyTrendSeries}
              t={t}
            />
          </div>
        </>
      )}
    </div>
  );
}
