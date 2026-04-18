import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../context/ToastContext";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Activity,
  RefreshCw,
} from "lucide-react";
import { api } from "@/services/api";
import { getPlexStats } from "@/services/plexService";

const DailyPeakChart = ({
  data,
  isLoading,
  onRefresh,
  isRefreshing,
  allTimePeak,
}) => {
  const { t } = useTranslation();
  const [hoveredBar, setHoveredBar] = useState(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
        <div className="bg-theme-card border border-theme rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-theme-hover rounded w-1/4" />
              <div className="h-4 bg-theme-hover rounded w-1/6" />
            </div>
            <div className="h-72 bg-theme-hover rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-theme-card border border-theme rounded-lg p-12 text-center">
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

  const maxPeak = Math.max(...data.map((d) => d.peak), 1);
  const chartHeight = 320;
  const chartPadding = { top: 24, right: 24, bottom: 56, left: 48 };
  const innerWidth =
    Math.max(data.length * 44, 600) - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const barWidth = Math.min(
    Math.max((innerWidth / data.length) * 0.65, 14),
    38,
  );
  const barGap = innerWidth / data.length;

  const yTicks = [];
  const tickStep = Math.max(1, Math.ceil(maxPeak / 5));
  for (let i = 0; i <= maxPeak + tickStep; i += tickStep) {
    yTicks.push(i);
  }
  const yMax = yTicks[yTicks.length - 1];

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const overallPeak = allTimePeak ?? Math.max(...data.map((d) => d.peak));
  const avgPeak =
    data.length > 0
      ? (data.reduce((sum, d) => sum + d.peak, 0) / data.length).toFixed(1)
      : 0;

  // Find highest peak day index for accent coloring
  const peakDayIndex = data.findIndex((d) => d.peak === overallPeak);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4 hover:shadow-md transition-all hover:border-theme-primary hover:bg-theme-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-theme-primary" />
                {t("vodStreams.history.highestPeak", "Highest Peak")}
              </p>
              <p className="text-2xl font-bold text-theme-primary mt-1">
                {overallPeak}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-theme-primary" />
          </div>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4 hover:shadow-md transition-all hover:border-cyan-500/50 hover:bg-cyan-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <BarChart3 className="w-3 h-3 text-cyan-500" />
                {t("vodStreams.history.avgPeak", "Avg Peak")}
              </p>
              <p className="text-2xl font-bold text-cyan-500 mt-1">{avgPeak}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-cyan-500" />
          </div>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4 hover:shadow-md transition-all hover:border-green-500/50 hover:bg-green-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-green-500" />
                {t("vodStreams.history.daysTracked", "Days Tracked")}
              </p>
              <p className="text-2xl font-bold text-green-500 mt-1">
                {data.length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Chart Card */}
      <div className="bg-theme-card border border-theme rounded-lg shadow-sm overflow-hidden">
        {/* Chart Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-theme">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-theme-primary/15">
              <Activity className="w-4 h-4 text-theme-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-text">
                {t(
                  "vodStreams.history.chartTitle",
                  "Daily Peak Concurrent Streams",
                )}
              </h3>
              <p className="text-xs text-theme-text-muted mt-0.5">
                {t("vodStreams.history.chartSubtitle", "Last 30 days")}
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-hover/50 hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-xs font-medium text-theme-text-muted hover:text-theme-text transition-all disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={`text-theme-primary ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("common.refresh", "Refresh")}
          </button>
        </div>

        {/* Chart Body */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <svg
            width={innerWidth + chartPadding.left + chartPadding.right}
            height={chartHeight}
            className="min-w-full"
          >
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
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.6" />
              </linearGradient>
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
            {data.map((item, i) => {
              const barHeight = (item.peak / yMax) * innerHeight;
              const x =
                chartPadding.left + i * barGap + (barGap - barWidth) / 2;
              const y = chartPadding.top + innerHeight - barHeight;
              const isHovered = hoveredBar === i;
              const isPeakDay = i === peakDayIndex;

              let fill = "url(#barGradient)";
              if (isHovered) fill = "url(#barGradientHover)";
              if (isPeakDay) fill = "url(#barGradientPeak)";

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
                    rx={4}
                    fill={fill}
                    style={{
                      transition: "all 0.2s ease",
                    }}
                  />
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <g>
                      <rect
                        x={x + barWidth / 2 - 22}
                        y={y - 30}
                        width={44}
                        height={22}
                        rx={6}
                        className="fill-theme-card"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeOpacity={0.2}
                        style={{
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                        }}
                      />
                      <text
                        x={x + barWidth / 2}
                        y={y - 15}
                        textAnchor="middle"
                        className="text-theme-text"
                        fill="currentColor"
                        fontSize={12}
                        fontWeight="bold"
                      >
                        {item.peak}
                      </text>
                    </g>
                  )}
                  {/* Peak day crown indicator */}
                  {isPeakDay && !isHovered && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize={14}
                    >
                      👑
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
                    {formatDate(item.date)}
                  </text>
                </g>
              );
            })}

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

        {/* Chart Footer Legend */}
        <div className="flex items-center justify-center gap-6 px-4 sm:px-6 py-3 border-t border-theme bg-theme-hover/20">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-cyan-500" />
            <span className="text-xs text-theme-text-muted">
              {t("vodStreams.history.legendDaily", "Daily Peak")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-xs text-theme-text-muted">
              {t("vodStreams.history.legendHighest", "Highest Peak")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function VODStreamsHistory() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dailyPeaks, isLoading: peaksLoading } = useQuery({
    queryKey: ["plex-daily-peaks"],
    queryFn: () => api.get("/plex/stats/daily-peaks?days=30"),
    staleTime: 60000,
    refetchInterval: 60000,
  });

  const { data: plexStats } = useQuery({
    queryKey: ["plex-stats"],
    queryFn: () => getPlexStats(),
    staleTime: 60000,
    refetchInterval: 60000,
  });

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["plex-daily-peaks"] }),
        queryClient.refetchQueries({ queryKey: ["plex-stats"] }),
      ]);
      toast.success(t("common.refreshed", "Refreshed successfully"));
    } catch (error) {
      toast.error(t("common.refreshError", "Failed to refresh data"));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, t]);

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <DailyPeakChart
        data={dailyPeaks}
        isLoading={peaksLoading}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        allTimePeak={plexStats?.peak_concurrent}
      />
    </div>
  );
}
