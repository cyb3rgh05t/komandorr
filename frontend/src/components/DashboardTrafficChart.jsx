import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
} from "lucide-react";

// Define distinct colors with better visibility
const SERVICE_COLORS = [
  { primary: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)" }, // blue
  { primary: "#22c55e", glow: "rgba(34, 197, 94, 0.4)" }, // green
  { primary: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" }, // amber
  { primary: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" }, // red
  { primary: "#8b5cf6", glow: "rgba(139, 92, 246, 0.4)" }, // violet
  { primary: "#ec4899", glow: "rgba(236, 72, 153, 0.4)" }, // pink
  { primary: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)" }, // cyan
  { primary: "#10b981", glow: "rgba(16, 185, 129, 0.4)" }, // emerald
  { primary: "#f97316", glow: "rgba(249, 115, 22, 0.4)" }, // orange
  { primary: "#6366f1", glow: "rgba(99, 102, 241, 0.4)" }, // indigo
];

const DashboardTrafficChart = ({
  trafficData,
  onRefresh,
  refreshing,
  lineThickness = 0.15,
}) => {
  const { t } = useTranslation();
  const [chartType, setChartType] = useState("download"); // 'download' or 'upload'

  if (
    !trafficData ||
    !trafficData.services ||
    trafficData.services.length === 0
  ) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-theme-primary/20 to-theme-primary/10 rounded-xl shadow-inner">
              <TrendingUp className="w-6 h-6 text-theme-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-theme-text">
                {t("dashboard.trafficChart") || "Traffic Overview"}
              </h2>
              <p className="text-xs text-theme-text-muted">
                Real-time bandwidth monitoring
              </p>
            </div>
          </div>
        </div>
        <div className="h-48 flex flex-col items-center justify-center text-theme-text-muted space-y-2">
          <Activity className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">
            {t("traffic.noData") || "No traffic data available"}
          </p>
        </div>
      </div>
    );
  }

  // Filter services with active traffic
  const activeServices = trafficData.services.filter(
    (service) =>
      service.traffic_history &&
      service.traffic_history.length > 0 &&
      (service.bandwidth_up > 0 || service.bandwidth_down > 0)
  );

  if (activeServices.length === 0) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-theme-primary/20 to-theme-primary/10 rounded-xl shadow-inner">
              <TrendingUp className="w-6 h-6 text-theme-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-theme-text">
                {t("dashboard.trafficChart") || "Traffic Overview"}
              </h2>
              <p className="text-xs text-theme-text-muted">
                Real-time bandwidth monitoring
              </p>
            </div>
          </div>
        </div>
        <div className="h-48 flex flex-col items-center justify-center text-theme-text-muted space-y-2">
          <Zap className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">
            {t("traffic.noActiveTraffic") || "No active traffic"}
          </p>
        </div>
      </div>
    );
  }

  // Chart dimensions
  const width = 100;
  const height = 100;
  const maxDataPoints = 60; // Show last 60 data points

  // Get all bandwidth values to determine scale
  const allValues = [];
  activeServices.forEach((service) => {
    const history = service.traffic_history.slice(-maxDataPoints);
    history.forEach((point) => {
      const value =
        chartType === "upload" ? point.bandwidth_up : point.bandwidth_down;
      allValues.push(value);
    });
  });

  const max = Math.max(...allValues, 1);
  const min = 0; // Start from 0 for bandwidth

  // Create paths for each service
  const servicePaths = activeServices.map((service, serviceIndex) => {
    const history = service.traffic_history.slice(-maxDataPoints);
    const values = history.map((point) =>
      chartType === "upload" ? point.bandwidth_up : point.bandwidth_down
    );

    const points = values.map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = (1 - (value - min) / (max - min || 1)) * height;
      return `${x},${y}`;
    });

    const linePath = `M ${points.join(" L ")}`;
    const colorScheme = SERVICE_COLORS[serviceIndex % SERVICE_COLORS.length];

    return {
      path: linePath,
      color: colorScheme.primary,
      glow: colorScheme.glow,
      serviceName: service.name,
      currentValue: values[values.length - 1] || 0,
    };
  });

  const formatBandwidth = (mbps) => {
    if (!mbps || mbps === 0) return "0 KB/s";
    if (mbps < 1) {
      return `${(mbps * 1024).toFixed(1)} KB/s`;
    }
    return `${mbps.toFixed(1)} MB/s`;
  };

  // Calculate totals for current bandwidth
  const totalBandwidth = activeServices.reduce(
    (sum, s) =>
      sum +
      (chartType === "upload" ? s.bandwidth_up || 0 : s.bandwidth_down || 0),
    0
  );

  return (
    <div className="bg-theme-card border border-theme rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 bg-gradient-to-br from-theme-primary/20 to-theme-primary/10 rounded-xl shadow-inner">
            <TrendingUp className="w-6 h-6 text-theme-primary relative z-10" />
            <div className="absolute inset-0 bg-theme-primary/20 rounded-xl blur-md"></div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
              {t("dashboard.trafficChart") || "Traffic Overview"}
            </h2>
            <p className="text-xs text-theme-text-muted flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              {activeServices.length} active{" "}
              {activeServices.length === 1 ? "service" : "services"}
            </p>
          </div>
        </div>

        {/* Toggle between Upload/Download & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-theme-hover border border-theme rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setChartType("download")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                chartType === "download"
                  ? "bg-gradient-to-br from-green-500/30 to-green-500/20 text-green-400 shadow-md border border-green-500/30"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-card/50"
              }`}
            >
              <ArrowDown size={14} />
              Download
            </button>
            <button
              onClick={() => setChartType("upload")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                chartType === "upload"
                  ? "bg-gradient-to-br from-blue-500/30 to-blue-500/20 text-blue-400 shadow-md border border-blue-500/30"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-card/50"
              }`}
            >
              <ArrowUp size={14} />
              Upload
            </button>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-2 bg-theme-hover hover:bg-theme-primary/20 border border-theme hover:border-theme-primary/50 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md group"
              title="Refresh traffic data"
            >
              <RefreshCw
                size={16}
                className={`text-theme-primary transition-transform duration-300 ${
                  refreshing ? "animate-spin" : "group-hover:rotate-180"
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Total Bandwidth Display */}
      <div className="mb-4 p-3 bg-theme-hover border border-theme rounded-xl shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {chartType === "upload" ? (
              <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <ArrowUp className="w-4 h-4 text-blue-400" />
              </div>
            ) : (
              <div className="p-1.5 bg-green-500/20 rounded-lg">
                <ArrowDown className="w-4 h-4 text-green-400" />
              </div>
            )}
            <span className="text-xs font-semibold text-theme-text-muted uppercase tracking-wide">
              Total {chartType === "upload" ? "Upload" : "Download"}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-2xl font-bold ${
                chartType === "upload" ? "text-blue-400" : "text-green-400"
              }`}
            >
              {formatBandwidth(totalBandwidth)}
            </span>
            <Activity
              className={`w-4 h-4 ${
                chartType === "upload" ? "text-blue-400" : "text-green-400"
              } animate-pulse`}
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48 bg-gradient-to-b from-[#0a0e1a] via-[#0d1117] to-[#0a0e1a] rounded-xl border border-gray-800/50 overflow-hidden mb-4 shadow-inner">
        {/* Decorative grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        ></div>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col justify-between py-4 px-2 text-[10px] text-gray-400 font-mono pointer-events-none z-10 bg-gradient-to-r from-[#0a0e1a]/90 to-transparent">
          <span className="bg-[#0a0e1a]/50 px-1 rounded">
            {formatBandwidth(max)}
          </span>
          <span className="bg-[#0a0e1a]/50 px-1 rounded">
            {formatBandwidth(max * 0.75)}
          </span>
          <span className="bg-[#0a0e1a]/50 px-1 rounded">
            {formatBandwidth(max * 0.5)}
          </span>
          <span className="bg-[#0a0e1a]/50 px-1 rounded">
            {formatBandwidth(max * 0.25)}
          </span>
          <span className="bg-[#0a0e1a]/50 px-1 rounded">0</span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full pl-14"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.3"
              strokeDasharray="2,3"
            />
          ))}

          {/* Service lines */}
          {servicePaths.map((service, index) => (
            <g key={index}>
              {/* Gradient definition */}
              <defs>
                <linearGradient
                  id={`gradient-${chartType}-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    style={{ stopColor: service.color, stopOpacity: 0.25 }}
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: service.color, stopOpacity: 0.02 }}
                  />
                </linearGradient>

                {/* Glow filter */}
                <filter id={`glow-${chartType}-${index}`}>
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Area fill */}
              <path
                d={`${service.path} L ${width},${height} L 0,${height} Z`}
                fill={`url(#gradient-${chartType}-${index})`}
                className="transition-all duration-300"
              />

              {/* Line with glow */}
              <path
                d={service.path}
                fill="none"
                stroke={service.color}
                strokeWidth={lineThickness}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
                filter={`url(#glow-${chartType}-${index})`}
                className="transition-all duration-300"
              />
            </g>
          ))}
        </svg>

        {/* Info overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-lg px-3 py-1.5 shadow-lg">
          <Activity className="w-3 h-3 text-theme-primary animate-pulse" />
          <div className="text-[10px] text-gray-300 font-medium">
            Last 60 data points
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-theme-text uppercase tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4 text-theme-primary" />
            Active Services
          </h3>
          <span className="text-xs text-theme-text-muted font-medium">
            {servicePaths.length}{" "}
            {servicePaths.length === 1 ? "service" : "services"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {servicePaths.map((service, index) => (
            <div
              key={index}
              className="group relative flex items-center gap-2.5 px-3 py-2.5 bg-theme-hover hover:from-theme-card hover:to-theme-hover border border-theme hover:border-theme-primary/40 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              {/* Color indicator with glow effect */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-3 h-3 rounded-full shadow-lg transition-all duration-200 group-hover:scale-125"
                  style={{
                    backgroundColor: service.color,
                    boxShadow: `0 0 12px ${service.glow}`,
                  }}
                />
                <div
                  className="absolute inset-0 w-3 h-3 rounded-full blur-sm opacity-50 group-hover:opacity-75 transition-opacity"
                  style={{ backgroundColor: service.color }}
                />
              </div>

              {/* Service info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-theme-text font-medium truncate mb-0.5 group-hover:text-theme-primary transition-colors">
                  {service.serviceName}
                </div>
                <div
                  className="text-xs font-mono font-bold transition-all duration-200"
                  style={{ color: service.color }}
                >
                  {formatBandwidth(service.currentValue)}
                </div>
              </div>

              {/* Activity pulse indicator */}
              {service.currentValue > 0 && (
                <div className="absolute -top-1 -right-1">
                  <div className="relative w-2 h-2">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                    <div className="relative w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardTrafficChart;
