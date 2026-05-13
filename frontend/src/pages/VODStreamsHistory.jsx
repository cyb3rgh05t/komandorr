import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../context/ToastContext";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  Zap,
  ChevronDown,
} from "lucide-react";
import { api } from "@/services/api";
import { getPlexStats } from "@/services/plexService";

// --- Time Range Options ---
const TIME_RANGES = [
  { key: "7d", label: "7 Days", days: 7 },
  { key: "14d", label: "14 Days", days: 14 },
  { key: "30d", label: "30 Days", days: 30 },
  { key: "90d", label: "90 Days", days: 90 },
  { key: "all", label: "All Time", days: 0 },
];

// --- Helpers ---
function formatDate(dateStr, short = false) {
  const d = new Date(dateStr + "T00:00:00");
  return short
    ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
}

function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

function exportData(data, format) {
  if (!data || data.length === 0) return;

  let content, type, ext;
  if (format === "csv") {
    const header = "Date,Peak Concurrent,Day Type\n";
    const rows = data
      .map((d) => `${d.date},${d.peak},${getDayOfWeek(d.date)}`)
      .join("\n");
    content = header + rows;
    type = "text/csv";
    ext = "csv";
  } else {
    content = JSON.stringify(data, null, 2);
    type = "application/json";
    ext = "json";
  }

  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vod-peaks-${new Date().toISOString().split("T")[0]}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Stats Cards ---
function StatsCards({ data, allTimePeak, t }) {
  if (!data || data.length === 0) return null;

  const peaks = data.map((d) => d.peak);
  const maxPeak = Math.max(...peaks);
  const minPeak = Math.min(...peaks);
  const avgPeak = (peaks.reduce((a, b) => a + b, 0) / peaks.length).toFixed(1);

  const weekdays = data.filter((d) => getDayOfWeek(d.date) === "weekday");
  const weekends = data.filter((d) => getDayOfWeek(d.date) === "weekend");
  const avgWeekday =
    weekdays.length > 0
      ? (weekdays.reduce((s, d) => s + d.peak, 0) / weekdays.length).toFixed(1)
      : "\u2014";
  const avgWeekend =
    weekends.length > 0
      ? (weekends.reduce((s, d) => s + d.peak, 0) / weekends.length).toFixed(1)
      : "\u2014";

  // Trend: compare last 7 days avg vs previous 7 days
  let trendPercent = null;
  let trendDir = "flat";
  if (data.length >= 7) {
    const recent = data.slice(-7);
    const prev = data.slice(-14, -7);
    if (prev.length > 0) {
      const recentAvg = recent.reduce((s, d) => s + d.peak, 0) / recent.length;
      const prevAvg = prev.reduce((s, d) => s + d.peak, 0) / prev.length;
      if (prevAvg > 0) {
        trendPercent = (((recentAvg - prevAvg) / prevAvg) * 100).toFixed(1);
        trendDir =
          recentAvg > prevAvg ? "up" : recentAvg < prevAvg ? "down" : "flat";
      }
    }
  }

  const cards = [
    {
      label: t("vodStreams.history.highestPeak", "All-Time Peak"),
      value: allTimePeak ?? maxPeak,
      icon: TrendingUp,
      color: "text-theme-primary",
      borderColor: "hover:border-theme-primary",
      bgColor: "hover:bg-theme-primary/10",
      showTrend: true,
    },
    {
      label: t("vodStreams.history.avgPeak", "Avg Peak"),
      value: avgPeak,
      icon: BarChart3,
      color: "text-cyan-500",
      borderColor: "hover:border-cyan-500/50",
      bgColor: "hover:bg-cyan-500/10",
    },
    {
      label: t("vodStreams.history.minPeak", "Min Peak"),
      value: minPeak,
      icon: TrendingDown,
      color: "text-rose-400",
      borderColor: "hover:border-rose-400/50",
      bgColor: "hover:bg-rose-400/10",
    },
    {
      label: t("vodStreams.history.weekdayAvg", "Weekday Avg"),
      value: avgWeekday,
      icon: Clock,
      color: "text-blue-400",
      borderColor: "hover:border-blue-400/50",
      bgColor: "hover:bg-blue-400/10",
    },
    {
      label: t("vodStreams.history.weekendAvg", "Weekend Avg"),
      value: avgWeekend,
      icon: Zap,
      color: "text-green-400",
      borderColor: "hover:border-green-400/50",
      bgColor: "hover:bg-green-400/10",
    },
    {
      label: t("vodStreams.history.daysTracked", "Days Tracked"),
      value: data.length,
      icon: Calendar,
      color: "text-green-500",
      borderColor: "hover:border-green-500/50",
      bgColor: "hover:bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-theme-card border border-theme rounded-lg p-4 hover:shadow-md transition-all ${card.borderColor} ${card.bgColor}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <card.icon className={`w-3 h-3 ${card.color}`} />
                <span className="truncate">{card.label}</span>
              </p>
              <p className={`text-2xl font-bold ${card.color} truncate`}>
                {card.value}
              </p>
            </div>
            <card.icon className={`w-8 h-8 ${card.color} shrink-0`} />
          </div>
          {card.showTrend && trendPercent !== null && (
            <div className="mt-1.5 flex items-center gap-1">
              {trendDir === "up" ? (
                <ArrowUp size={12} className="text-green-400" />
              ) : trendDir === "down" ? (
                <ArrowDown size={12} className="text-red-400" />
              ) : (
                <Minus size={12} className="text-theme-text-muted" />
              )}
              <span
                className={`text-[10px] font-medium ${
                  trendDir === "up"
                    ? "text-green-400"
                    : trendDir === "down"
                      ? "text-red-400"
                      : "text-theme-text-muted"
                }`}
              >
                {trendPercent > 0 ? "+" : ""}
                {trendPercent}% vs prev 7d
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Chart Component ---
function getMonthBadge(data) {
  if (!data || data.length === 0) return null;
  const lastDate = new Date(data[data.length - 1].date + "T00:00:00");
  return lastDate
    .toLocaleDateString(undefined, { month: "long" })
    .toUpperCase();
}

// --- Month Comparison Card (current vs previous calendar month, grouped bars) ---
function MonthComparisonCard({ data, t }) {
  const stats = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const sorted = [...data].sort((a, b) => (a.date < b.date ? -1 : 1));
    const lastDate = new Date(sorted[sorted.length - 1].date + "T00:00:00");
    const curYM = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(lastDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const cur = sorted.filter((d) => (d.date || "").startsWith(curYM));
    const prev = sorted.filter((d) => (d.date || "").startsWith(prevYM));
    const summarize = (items) => {
      if (items.length === 0) return { max: 0, avg: 0, days: 0 };
      const peaks = items.map((i) => i.peak);
      return {
        max: Math.max(...peaks),
        avg: peaks.reduce((a, b) => a + b, 0) / peaks.length,
        days: items.length,
      };
    };
    return {
      curLabel: lastDate.toLocaleDateString(undefined, { month: "short" }),
      prevLabel: prevDate.toLocaleDateString(undefined, { month: "short" }),
      curFull: lastDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
      prevFull: prevDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
      cur: summarize(cur),
      prev: summarize(prev),
      hasCur: cur.length > 0,
      hasPrev: prev.length > 0,
    };
  }, [data]);

  if (!stats || !stats.hasCur) return null;

  const groups = [
    {
      key: "peak",
      label: t("vodStreams.history.peak", "Peak"),
      cur: stats.cur.max,
      prev: stats.prev.max,
    },
    {
      key: "avg",
      label: t("vodStreams.history.avgPeak", "Avg Peak"),
      cur: Number(stats.cur.avg.toFixed(1)),
      prev: Number(stats.prev.avg.toFixed(1)),
    },
    {
      key: "days",
      label: t("vodStreams.history.daysTracked", "Days"),
      cur: stats.cur.days,
      prev: stats.prev.days,
    },
  ];

  const overallPct =
    stats.prev.max > 0
      ? ((stats.cur.max - stats.prev.max) / stats.prev.max) * 100
      : null;
  const overallDir =
    overallPct == null
      ? "flat"
      : overallPct > 0
        ? "up"
        : overallPct < 0
          ? "down"
          : "flat";

  // Chart geometry — narrow viewBox so bars stay compact; SVG is centered in card
  const W = 360;
  const H = 200;
  const PAD = { top: 20, right: 24, bottom: 30, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Per-group, normalize to that group's own max (since scales differ)
  const renderGroups = groups.map((g) => {
    const max = Math.max(g.cur, g.prev, 1);
    return { ...g, max };
  });

  const groupGap = innerW / renderGroups.length;
  const barW = Math.min(28, groupGap * 0.32);

  return (
    <div className="bg-theme-card border border-theme rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-theme">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-theme-primary/15">
            <Calendar className="w-5 h-5 text-theme-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-theme-text">
              {t("vodStreams.history.monthCompare", "Month Comparison")}
            </h3>
            <p className="text-xs text-theme-text-muted mt-0.5">
              {stats.curFull} <span className="opacity-60">vs</span>{" "}
              {stats.prevFull}
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

      {/* Body */}
      <div className="px-3 sm:px-5 py-6 sm:py-8">
        <div className="w-full max-w-md mx-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="overflow-visible w-full block"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="cmpCurGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="cmpPrevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.45" />
              </linearGradient>
            </defs>

            {/* horizontal grid lines (4) */}
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
                  {/* Previous month bar */}
                  <rect
                    x={prevX}
                    y={prevY}
                    width={barW}
                    height={Math.max(prevH, 1)}
                    rx={3}
                    fill="url(#cmpPrevGrad)"
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
                  {/* Current month bar */}
                  <rect
                    x={curX}
                    y={curY}
                    width={barW}
                    height={Math.max(curH, 1)}
                    rx={3}
                    fill="url(#cmpCurGrad)"
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
                  {/* group label */}
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

            {/* x-axis line */}
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

      {/* Footer Legend */}
      <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-t border-theme bg-theme-hover/10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-cyan-400 to-cyan-600" />
          <span className="text-xs text-theme-text-muted">
            {stats.curLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-violet-400 to-violet-600" />
          <span className="text-xs text-theme-text-muted">
            {stats.prevLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Monthly Trend Card (last 12 months SVG bar chart) ---
function MonthlyTrendCard({ data, t }) {
  const months = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const map = new Map();
    data.forEach((item) => {
      const ym = (item?.date || "").slice(0, 7);
      if (ym.length !== 7) return;
      const cur = map.get(ym) || { peak: 0, sum: 0, count: 0 };
      cur.peak = Math.max(cur.peak, item.peak || 0);
      cur.sum += item.peak || 0;
      cur.count += 1;
      map.set(ym, cur);
    });
    const sorted = Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-12);
    return sorted.map(([ym, v]) => {
      const [year, month] = ym.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return {
        ym,
        label: date.toLocaleDateString(undefined, { month: "short" }),
        fullLabel: date.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        peak: v.peak,
        avg: v.count > 0 ? v.sum / v.count : 0,
        days: v.count,
      };
    });
  }, [data]);

  const [hoverIdx, setHoverIdx] = useState(null);

  if (months.length === 0) return null;

  const maxPeak = Math.max(...months.map((m) => m.peak), 1);
  const minPeak = Math.min(...months.map((m) => m.peak));

  // Chart geometry — narrow viewBox so bars stay compact; SVG is centered in card
  const W = 360;
  const H = 200;
  const PAD = { top: 20, right: 12, bottom: 30, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / months.length;
  const barW = Math.min(slot * 0.65, 22);

  // y ticks (4)
  const yTicks = [];
  const tickStep = Math.max(1, Math.ceil(maxPeak / 4));
  for (let v = 0; v <= maxPeak + tickStep; v += tickStep) yTicks.push(v);
  const yMax = yTicks[yTicks.length - 1];

  return (
    <div className="bg-theme-card border border-theme rounded-xl shadow-lg overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-theme">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-theme-primary/15">
            <BarChart3 className="w-5 h-5 text-theme-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-theme-text">
                {t("vodStreams.history.monthlyTrend", "Monthly Peak Trend")}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
                <Calendar size={10} className="text-cyan-400" />
                <span className="text-[10px] font-semibold text-cyan-400 tracking-wide">
                  {t("vodStreams.history.last12Months", "LAST 12 MONTHS")}
                </span>
              </span>
            </div>
            <p className="text-xs text-theme-text-muted mt-0.5">
              {t(
                "vodStreams.history.peakPerMonth",
                "Peak concurrent per month",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-3 sm:px-5 py-6 sm:py-8">
        <div className="w-full max-w-md mx-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="overflow-visible w-full block"
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="mtBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="mtBarBest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="mtBarWorst" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* y-axis grid + labels */}
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

            {/* Bars */}
            {months.map((m, i) => {
              const ratio = m.peak / yMax;
              const h = ratio * innerH;
              const x = PAD.left + i * slot + (slot - barW) / 2;
              const y = PAD.top + innerH - h;
              const isBest = m.peak === maxPeak && maxPeak > 0;
              const isWorst =
                m.peak === minPeak && minPeak !== maxPeak && months.length > 1;
              const fill = isBest
                ? "url(#mtBarBest)"
                : isWorst
                  ? "url(#mtBarWorst)"
                  : "url(#mtBarGrad)";
              const isHover = hoverIdx === i;
              return (
                <g
                  key={m.ym}
                  onMouseEnter={() => setHoverIdx(i)}
                  className="cursor-pointer"
                >
                  {/* hover column */}
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
                  {/* peak value above bar */}
                  <text
                    x={x + barW / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    className={
                      isBest
                        ? "fill-amber-300"
                        : isWorst
                          ? "fill-rose-300"
                          : "fill-cyan-300"
                    }
                  >
                    {m.peak}
                  </text>
                  {/* tooltip */}
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
                        {m.fullLabel}
                      </text>
                      <text
                        x={Math.max(64, Math.min(x + barW / 2, W - 64))}
                        y={Math.max(34, y - 20)}
                        textAnchor="middle"
                        fontSize={9}
                        className="fill-theme-text-muted"
                      >
                        Peak {m.peak} · Avg {m.avg.toFixed(1)} · {m.days}d
                      </text>
                    </g>
                  )}
                  {/* x-axis label */}
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

            {/* x-axis line */}
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

      {/* Card Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 sm:px-8 py-4 border-t border-theme bg-theme-hover/10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-cyan-400 to-cyan-600" />
          <span className="text-xs text-theme-text-muted">
            {t("vodStreams.history.legendNormal", "Monthly")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-amber-400 to-amber-600" />
          <span className="text-xs text-theme-text-muted">
            {t("vodStreams.history.bestMonth", "Best")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-rose-400 to-rose-600" />
          <span className="text-xs text-theme-text-muted">
            {t("vodStreams.history.worstMonth", "Worst")}
          </span>
        </div>
      </div>
    </div>
  );
}

function PeakChart({ data, allTimePeak, showTrendLine, t }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-16 text-center">
        <div className="max-w-sm mx-auto space-y-5">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-theme-primary/20 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-theme-primary/30 to-theme-primary/10 flex items-center justify-center border border-theme-primary/20">
              <BarChart3 size={36} className="text-theme-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-theme-text">
              {t("vodStreams.history.noData", "No History Data")}
            </h3>
            <p className="text-sm text-theme-text-muted leading-relaxed">
              {t(
                "vodStreams.history.noDataDesc",
                "Peak data will appear once streams are detected.",
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Enrich data with diffs
  const enriched = data.map((item, i) => {
    const prev = i > 0 ? data[i - 1].peak : null;
    const diff = prev !== null ? item.peak - prev : null;
    const diffPercent =
      prev !== null && prev > 0
        ? (((item.peak - prev) / prev) * 100).toFixed(1)
        : null;
    return { ...item, diff, diffPercent, dayType: getDayOfWeek(item.date) };
  });

  const peaks = enriched.map((d) => d.peak);
  const maxPeak = Math.max(...peaks, 1);
  const minPeakVal = Math.min(...peaks);
  const peakDayIndex = enriched.findIndex((d) => d.peak === maxPeak);
  const minDayIndex = enriched.findIndex((d) => d.peak === minPeakVal);

  // Chart dimensions - taller chart, larger bars with more spacing
  const chartHeight = 480;
  const chartPadding = { top: 85, right: 16, bottom: 60, left: 48 };
  // Per-day slot width adapts to count so sparse months still fill the chart
  const slotWidth =
    enriched.length <= 2
      ? 360
      : enriched.length <= 5
        ? 220
        : enriched.length <= 10
          ? 130
          : enriched.length <= 20
            ? 90
            : enriched.length <= 35
              ? 64
              : enriched.length <= 60
                ? 48
                : 36;
  const innerWidth =
    enriched.length * slotWidth - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const barGap = innerWidth / enriched.length;
  const barWidth = Math.min(Math.max(barGap * 0.55, 28), 140);
  const svgWidth = innerWidth + chartPadding.left + chartPadding.right;

  // Y-axis ticks
  const yTicks = [];
  const tickStep = Math.max(1, Math.ceil(maxPeak / 6));
  for (let i = 0; i <= maxPeak + tickStep; i += tickStep) yTicks.push(i);
  const yMax = yTicks[yTicks.length - 1];

  // Trend line points from actual daily values
  const trendPoints = [];
  if (showTrendLine && enriched.length >= 2) {
    for (let i = 0; i < enriched.length; i++) {
      const value = Math.max(0, Math.min(yMax, enriched[i].peak));
      const cx = chartPadding.left + i * barGap + barGap / 2;
      const cy = chartPadding.top + innerHeight - (value / yMax) * innerHeight;
      trendPoints.push({ x: cx, y: cy });
    }
  }

  // Build a smooth spline path (Catmull-Rom to cubic Bézier)
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

  return (
    <div className="bg-theme-card border border-theme rounded-xl shadow-lg overflow-hidden">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-theme">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-theme-primary/15">
            <Activity className="w-5 h-5 text-theme-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-theme-text">
                {t(
                  "vodStreams.history.chartTitle",
                  "Daily Peak Concurrent Streams",
                )}
              </h3>
              {getMonthBadge(data) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
                  <Calendar size={10} className="text-cyan-400" />
                  <span className="text-[10px] font-semibold text-cyan-400 tracking-wide">
                    {getMonthBadge(data)}
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-theme-text-muted mt-0.5">
              {enriched.length > 0
                ? `${formatDate(enriched[0].date)} \u2014 ${formatDate(enriched[enriched.length - 1].date)}`
                : t("vodStreams.history.chartSubtitle", "Last 30 days")}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Body */}
      <div className="relative">
        <div className="px-3 sm:px-5 py-6 sm:py-8 overflow-x-auto">
          <svg width={svgWidth} height={chartHeight}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="barGradientPeak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="barGradientMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient
                id="barGradientWeekend"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0.5" />
              </linearGradient>
              <filter id="trendGlow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Y-axis grid lines */}
            {yTicks.map((tick) => {
              const y =
                chartPadding.top + innerHeight - (tick / yMax) * innerHeight;
              return (
                <g key={`y-${tick}`}>
                  <line
                    x1={chartPadding.left}
                    y1={y}
                    x2={chartPadding.left + innerWidth}
                    y2={y}
                    stroke="currentColor"
                    className="text-theme-text-muted"
                    strokeOpacity={0.1}
                    strokeDasharray="3 6"
                  />
                  <text
                    x={chartPadding.left - 10}
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

            {/* Bars */}
            {enriched.map((item, i) => {
              const barHeight = (item.peak / yMax) * innerHeight;
              const x =
                chartPadding.left + i * barGap + (barGap - barWidth) / 2;
              const y = chartPadding.top + innerHeight - barHeight;
              const isHovered = hoveredBar === i;
              const isPeakDay = i === peakDayIndex;
              const isMinDay = i === minDayIndex && enriched.length > 2;
              const isWeekend = item.dayType === "weekend";

              let fill = isWeekend
                ? "url(#barGradientWeekend)"
                : "url(#barGradient)";
              if (isMinDay) fill = "url(#barGradientMin)";
              if (isPeakDay) fill = "url(#barGradientPeak)";
              if (isHovered && !isPeakDay && !isMinDay)
                fill = "url(#barGradientHover)";

              // Tooltip positioning - smart clamp so it never gets cut off
              const tw = 170;
              const th = item.diff !== null ? 72 : 50;
              const tx = Math.max(
                4,
                Math.min(x + barWidth / 2 - tw / 2, svgWidth - tw - 4),
              );
              let ty = y - th - 12;
              if (ty < 4) ty = y + Math.max(barHeight, 2) + 10;

              return (
                <g
                  key={item.date}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                  className="cursor-pointer"
                >
                  {/* Hover highlight column */}
                  {isHovered && (
                    <rect
                      x={chartPadding.left + i * barGap}
                      y={chartPadding.top}
                      width={barGap}
                      height={innerHeight}
                      fill="currentColor"
                      className="text-theme-text-muted"
                      opacity={0.04}
                      rx={4}
                    />
                  )}
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 2)}
                    rx={3}
                    fill={fill}
                    style={{ transition: "all 0.2s ease" }}
                  />
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <g>
                      {/* Tooltip background */}
                      <rect
                        x={tx}
                        y={ty}
                        width={tw}
                        height={th}
                        rx={10}
                        className="fill-theme-card stroke-theme-text-muted/20"
                        strokeWidth="1"
                        style={{
                          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
                        }}
                      />
                      {/* Arrow pointer */}
                      {ty < y && (
                        <polygon
                          points={`${x + barWidth / 2 - 5},${ty + th} ${x + barWidth / 2 + 5},${ty + th} ${x + barWidth / 2},${ty + th + 6}`}
                          className="fill-theme-card"
                        />
                      )}
                      {/* Date */}
                      <text
                        x={tx + tw / 2}
                        y={ty + 18}
                        textAnchor="middle"
                        className="fill-theme-text-muted"
                        fill="currentColor"
                        fontSize={11}
                        fontWeight="500"
                      >
                        {formatDate(item.date)}
                      </text>
                      {/* Peak value */}
                      <text
                        x={tx + tw / 2}
                        y={ty + 38}
                        textAnchor="middle"
                        className="fill-theme-text"
                        fill="currentColor"
                        fontSize={15}
                        fontWeight="bold"
                      >
                        {item.peak} streams
                      </text>
                      {/* Diff from previous day */}
                      {item.diff !== null && (
                        <text
                          x={tx + tw / 2}
                          y={ty + 58}
                          textAnchor="middle"
                          fill={
                            item.diff > 0
                              ? "#4ade80"
                              : item.diff < 0
                                ? "#f87171"
                                : "currentColor"
                          }
                          className={
                            item.diff === 0
                              ? "fill-theme-text-muted"
                              : undefined
                          }
                          fontSize={11}
                          fontWeight="600"
                        >
                          {item.diff > 0
                            ? "\u25B2"
                            : item.diff < 0
                              ? "\u25BC"
                              : "\u2014"}{" "}
                          {item.diff > 0 ? "+" : ""}
                          {item.diff} ({item.diffPercent > 0 ? "+" : ""}
                          {item.diffPercent}%)
                        </text>
                      )}
                    </g>
                  )}
                  {/* Stream count badge above bar */}
                  {!isHovered && (
                    <g>
                      <rect
                        x={x + barWidth / 2 - 18}
                        y={y - 24}
                        width={36}
                        height={18}
                        rx={9}
                        className={
                          isPeakDay
                            ? "fill-amber-500/20 stroke-amber-400/60"
                            : isMinDay
                              ? "fill-rose-500/20 stroke-rose-400/60"
                              : isWeekend
                                ? "fill-emerald-500/15 stroke-emerald-400/50"
                                : "fill-cyan-500/15 stroke-cyan-400/50"
                        }
                        strokeWidth="1"
                      />
                      <text
                        x={x + barWidth / 2}
                        y={y - 11}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight="700"
                        className={
                          isPeakDay
                            ? "fill-amber-300"
                            : isMinDay
                              ? "fill-rose-300"
                              : isWeekend
                                ? "fill-emerald-300"
                                : "fill-cyan-300"
                        }
                      >
                        {item.peak}
                      </text>
                    </g>
                  )}
                  {/* Peak day crown */}
                  {isPeakDay && !isHovered && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 30}
                      textAnchor="middle"
                      fontSize={14}
                    >
                      {"\uD83D\uDC51"}
                    </text>
                  )}
                  {/* Min day marker */}
                  {isMinDay && !isHovered && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 28}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#fb7185"
                    >
                      {"\u25BD"}
                    </text>
                  )}
                  {/* X-axis label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartPadding.top + innerHeight + 20}
                    textAnchor="end"
                    className="text-theme-text-muted"
                    fill="currentColor"
                    fontSize={10}
                    fontWeight={isHovered ? "600" : "400"}
                    opacity={isHovered ? 1 : 0.7}
                    transform={`rotate(-45, ${x + barWidth / 2}, ${chartPadding.top + innerHeight + 20})`}
                  >
                    {formatDate(item.date, true)}
                  </text>
                </g>
              );
            })}

            {/* Trend Line */}
            {trendPoints.length > 1 && (
              <path
                d={buildCurvedPath(trendPoints)}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeOpacity="0.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 4"
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* X-axis line */}
            <line
              x1={chartPadding.left}
              y1={chartPadding.top + innerHeight}
              x2={chartPadding.left + innerWidth}
              y2={chartPadding.top + innerHeight}
              stroke="currentColor"
              className="text-theme-text-muted"
              strokeOpacity={0.2}
            />
            {/* Y-axis line */}
            <line
              x1={chartPadding.left}
              y1={chartPadding.top}
              x2={chartPadding.left}
              y2={chartPadding.top + innerHeight}
              stroke="currentColor"
              className="text-theme-text-muted"
              strokeOpacity={0.2}
            />
          </svg>
        </div>

        {/* Sticky Y-axis overlay (stays fixed when bars scroll) */}
        <div
          className="absolute top-0 left-0 h-full pointer-events-none bg-theme-card py-6 sm:py-8"
          style={{ width: `calc(${chartPadding.left}px + 0.75rem)` }}
        >
          <svg
            width={chartPadding.left + 12}
            height={chartHeight}
            className="block"
          >
            {yTicks.map((tick) => {
              const y =
                chartPadding.top + innerHeight - (tick / yMax) * innerHeight;
              return (
                <text
                  key={`yfix-${tick}`}
                  x={chartPadding.left + 2}
                  y={y + 4}
                  textAnchor="end"
                  className="text-theme-text-muted"
                  fill="currentColor"
                  fontSize={11}
                  fontWeight="500"
                >
                  {tick}
                </text>
              );
            })}
            <line
              x1={chartPadding.left}
              y1={chartPadding.top}
              x2={chartPadding.left}
              y2={chartPadding.top + innerHeight}
              stroke="currentColor"
              className="text-theme-text-muted"
              strokeOpacity={0.4}
            />
          </svg>
        </div>
      </div>

      {/* Chart Footer Legend */}
      <div className="relative px-5 sm:px-8 py-4 border-t border-theme bg-theme-hover/10 min-h-[48px]">
        {/* Peak items pinned to the left edge */}
        <div className="absolute left-5 sm:left-8 top-1/2 -translate-y-1/2 flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-theme-primary" />
            <span className="text-xs text-theme-text-muted">
              {t("vodStreams.history.legendHighest", "Highest Peak")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-rose-400" />
            <span className="text-xs text-theme-text-muted">
              {t("vodStreams.history.legendLowest", "Lowest Peak")}
            </span>
          </div>
        </div>

        {/* Day-type items always centered */}
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-cyan-500" />
            <span className="text-xs text-theme-text-muted">
              {t("vodStreams.history.legendWeekday", "Weekday")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-green-400" />
            <span className="text-xs text-theme-text-muted">
              {t("vodStreams.history.legendWeekend", "Weekend")}
            </span>
          </div>
          {showTrendLine && (
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 border-t-2 border-dashed border-white/60" />
              <span className="text-xs text-theme-text-muted">
                {t("vodStreams.history.legendTrend", "Trend")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Loading Skeleton ---
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-theme-card border border-theme rounded-lg p-4"
          >
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-theme-hover rounded w-2/3" />
              <div className="h-6 bg-theme-hover rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-theme-card border border-theme rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-theme-hover rounded w-1/4" />
            <div className="h-4 bg-theme-hover rounded w-1/6" />
          </div>
          <div className="h-96 bg-theme-hover rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function VODStreamsHistory() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const exportRef = useRef(null);
  const monthRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
      if (monthRef.current && !monthRef.current.contains(e.target)) {
        setShowMonthMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const days = TIME_RANGES.find((r) => r.key === timeRange)?.days ?? 30;

  const {
    data: dailyPeaks,
    isLoading: peaksLoading,
    isFetching: peaksFetching,
    dataUpdatedAt: peaksUpdatedAt,
  } = useQuery({
    queryKey: ["plex-daily-peaks", days],
    queryFn: () => api.get(`/plex/stats/daily-peaks?days=${days}`),
    staleTime: 10000,
    refetchInterval: 15000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const { data: allDailyPeaks } = useQuery({
    queryKey: ["plex-daily-peaks", 0],
    queryFn: () => api.get("/plex/stats/daily-peaks?days=0"),
    staleTime: 60000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const { data: plexStats, isFetching: statsFetching } = useQuery({
    queryKey: ["plex-stats"],
    queryFn: () => getPlexStats(),
    staleTime: 10000,
    refetchInterval: 15000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const isFetching = peaksFetching || statsFetching;

  const lastUpdated = useMemo(() => {
    if (!peaksUpdatedAt) return null;
    return new Date(peaksUpdatedAt).toLocaleTimeString();
  }, [peaksUpdatedAt]);

  const monthOptions = useMemo(() => {
    const source = Array.isArray(allDailyPeaks) ? allDailyPeaks : [];
    const unique = new Set(
      source
        .map((item) => (item?.date || "").slice(0, 7))
        .filter((value) => value.length === 7),
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
  }, [allDailyPeaks]);

  const displayedPeaks = useMemo(() => {
    const rangePeaks = Array.isArray(dailyPeaks) ? dailyPeaks : [];
    if (selectedMonth === "all") {
      return rangePeaks;
    }

    const source = Array.isArray(allDailyPeaks) ? allDailyPeaks : [];
    return source.filter((item) =>
      (item?.date || "").startsWith(selectedMonth),
    );
  }, [dailyPeaks, allDailyPeaks, selectedMonth]);

  useEffect(() => {
    if (monthOptions.length === 0) return;

    const hasSelected = monthOptions.some((opt) => opt.value === selectedMonth);
    if (!hasSelected) {
      setSelectedMonth("all");
    }
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

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["plex-daily-peaks", days] }),
        queryClient.refetchQueries({ queryKey: ["plex-daily-peaks", 0] }),
        queryClient.refetchQueries({ queryKey: ["plex-stats"] }),
      ]);
      toast.success(t("common.refreshed", "Refreshed successfully"));
    } catch (error) {
      toast.error(t("common.refreshError", "Failed to refresh data"));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, t, days]);

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* Right: Trend + Export + Timestamp + Refresh */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Trend Line Toggle */}
          <button
            onClick={() => setShowTrendLine(!showTrendLine)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border rounded-lg text-xs sm:text-sm font-medium transition-all ${
              showTrendLine
                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
                : "bg-theme-card border-theme text-theme-text-muted hover:text-theme-text hover:bg-theme-hover"
            }`}
            title={t("vodStreams.history.toggleTrend", "Toggle trend line")}
          >
            <TrendingUp size={14} />
            <span className="hidden sm:inline">Trend</span>
          </button>

          {/* Export */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                showExportMenu
                  ? "bg-theme-primary/15 border-theme-primary/30 text-theme-primary"
                  : "bg-theme-card border-theme text-theme-text-muted hover:text-theme-text hover:bg-theme-hover"
              }`}
              title={t("vodStreams.history.export", "Export data")}
            >
              <Download
                size={14}
                className={`text-theme-primary
              }`}
              />
              <span className="hidden sm:inline">Export</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 bg-theme-card border border-theme rounded-lg shadow-xl z-50 min-w-[100px] overflow-hidden">
                <button
                  onClick={() => {
                    exportData(displayedPeaks, "csv");
                    setShowExportMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-xs text-left text-theme-text-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-colors"
                >
                  CSV
                </button>
                <div className="border-t border-theme" />
                <button
                  onClick={() => {
                    exportData(displayedPeaks, "json");
                    setShowExportMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-xs text-left text-theme-text-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-colors"
                >
                  JSON
                </button>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-theme-text-muted/20 hidden sm:block" />

          {/* Timestamp */}
          {lastUpdated && (
            <span className="text-xs text-theme-text-muted/60 tabular-nums hidden sm:inline">
              {lastUpdated}
            </span>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={15}
              className={`text-theme-primary transition-transform duration-500 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span className="text-xs sm:text-sm">
              {isRefreshing
                ? t("common.refreshing", "Refreshing")
                : t("common.refresh", "Refresh")}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      {peaksLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <StatsCards
            data={displayedPeaks}
            allTimePeak={plexStats?.peak_concurrent}
            t={t}
          />
          {/* Time Range Filter */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
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
          <PeakChart
            data={displayedPeaks}
            allTimePeak={plexStats?.peak_concurrent}
            showTrendLine={showTrendLine}
            t={t}
          />
          {/* Monthly insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <MonthComparisonCard data={allDailyPeaks} t={t} />
            <MonthlyTrendCard data={allDailyPeaks} t={t} />
          </div>
        </>
      )}
    </div>
  );
}
