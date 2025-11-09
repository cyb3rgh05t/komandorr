import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";

// Define distinct colors for different services
const SERVICE_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f97316", // orange
  "#6366f1", // indigo
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
      <div className="bg-theme-card border border-theme rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-theme-text flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-theme-primary" />
            {t("dashboard.trafficChart") || "Traffic Overview"}
          </h2>
        </div>
        <div className="h-48 flex items-center justify-center text-theme-text-muted">
          {t("traffic.noData") || "No traffic data available"}
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
      <div className="bg-theme-card border border-theme rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-theme-text flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-theme-primary" />
            {t("dashboard.trafficChart") || "Traffic Overview"}
          </h2>
        </div>
        <div className="h-48 flex items-center justify-center text-theme-text-muted">
          {t("traffic.noActiveTraffic") || "No active traffic"}
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
    const color = SERVICE_COLORS[serviceIndex % SERVICE_COLORS.length];

    return {
      path: linePath,
      color,
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
    <div className="bg-theme-card border border-theme rounded-lg p-6 shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-theme-primary/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-theme-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-theme-text">
              {t("dashboard.trafficChart") || "Traffic Overview"}
            </h2>
            <p className="text-xs text-theme-text-muted">
              {activeServices.length} active{" "}
              {activeServices.length === 1 ? "service" : "services"}
            </p>
          </div>
        </div>

        {/* Toggle between Upload/Download & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-theme-hover border border-theme rounded-lg p-0.5">
            <button
              onClick={() => setChartType("download")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                chartType === "download"
                  ? "bg-green-500/20 text-green-400 shadow-sm"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <ArrowDown size={14} />
              Download
            </button>
            <button
              onClick={() => setChartType("upload")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                chartType === "upload"
                  ? "bg-blue-500/20 text-blue-400 shadow-sm"
                  : "text-theme-text-muted hover:text-theme-text"
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
              className="p-2 bg-theme-hover hover:bg-theme-primary/10 border border-theme hover:border-theme-primary/50 rounded-lg transition-all disabled:opacity-50"
              title="Refresh traffic data"
            >
              <RefreshCw
                size={16}
                className={`text-theme-primary ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Total Bandwidth Display */}
      <div className="mb-4 p-3 bg-theme-hover/50 border border-theme rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-theme-text-muted uppercase tracking-wide">
            Total {chartType === "upload" ? "Upload" : "Download"}
          </span>
          <span
            className={`text-xl font-bold ${
              chartType === "upload" ? "text-blue-400" : "text-green-400"
            }`}
          >
            {formatBandwidth(totalBandwidth)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-56 bg-[#0a0e1a] rounded-lg border border-gray-800/50 overflow-hidden mb-4 group">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-3 px-1.5 text-[10px] text-gray-500 font-mono pointer-events-none z-10">
          <span>{formatBandwidth(max)}</span>
          <span>{formatBandwidth(max * 0.75)}</span>
          <span>{formatBandwidth(max * 0.5)}</span>
          <span>{formatBandwidth(max * 0.25)}</span>
          <span>0</span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full pl-12"
          preserveAspectRatio="none"
        >
          {/* Grid lines - very subtle */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="0.5"
            />
          ))}

          {/* Service lines */}
          {servicePaths.map((service, index) => (
            <g key={index}>
              {/* Gradient definition - much more subtle */}
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
                    style={{ stopColor: service.color, stopOpacity: 0.12 }}
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: service.color, stopOpacity: 0 }}
                  />
                </linearGradient>
              </defs>

              {/* Area fill - subtle gradient */}
              <path
                d={`${service.path} L ${width},${height} L 0,${height} Z`}
                fill={`url(#gradient-${chartType}-${index})`}
              />

              {/* Line - customizable thickness */}
              <path
                d={service.path}
                fill="none"
                stroke={service.color}
                strokeWidth={lineThickness}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.75"
                style={{
                  filter: `drop-shadow(0 0 ${
                    lineThickness * 2
                  }px rgba(0,0,0,0.1))`,
                }}
              />
            </g>
          ))}
        </svg>

        {/* Hover overlay for last value indicator */}
        <div className="absolute top-2 right-2 bg-gray-900/90 border border-gray-700/50 rounded-md px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <div className="text-[10px] text-gray-400">Last 60 points</div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-theme-text-muted uppercase tracking-wide">
          Active Services
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {servicePaths.map((service, index) => (
            <div
              key={index}
              className="flex items-center gap-2.5 px-3 py-2 bg-theme-hover/50 hover:bg-theme-hover border border-theme hover:border-theme-primary/30 rounded-lg transition-all group"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform"
                style={{ backgroundColor: service.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-theme-text truncate font-medium mb-0.5">
                  {service.serviceName}
                </div>
                <div
                  className="text-xs font-mono font-semibold"
                  style={{ color: service.color }}
                >
                  {formatBandwidth(service.currentValue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardTrafficChart;
