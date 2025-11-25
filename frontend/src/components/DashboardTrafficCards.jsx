import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUp,
  ArrowDown,
  Activity,
  RefreshCw,
  Server,
  TrendingUp,
} from "lucide-react";

const CircularProgress = ({ percentage, color, size = 120 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-theme-text">{percentage}%</div>
      </div>
    </div>
  );
};

const DashboardTrafficCards = ({ trafficData, onRefresh, refreshing }) => {
  const { t } = useTranslation();

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
                {t("traffic.realtimeMonitoring")}
              </p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-2 bg-theme-hover hover:bg-theme-primary/20 border border-theme hover:border-theme-primary/50 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md group"
              title={t("traffic.refreshData")}
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

  // Calculate totals
  const totalUpload = activeServices.reduce(
    (sum, s) => sum + (s.bandwidth_up || 0),
    0
  );
  const totalDownload = activeServices.reduce(
    (sum, s) => sum + (s.bandwidth_down || 0),
    0
  );
  const totalBandwidth = totalUpload + totalDownload;

  // Get max bandwidth from service configuration or fallback to relative calculation
  // If all services have max_bandwidth set, use that. Otherwise fall back to relative.
  const servicesWithMaxBandwidth = activeServices.filter(
    (s) => s.max_bandwidth
  );
  const useAbsolutePercentage = servicesWithMaxBandwidth.length > 0;

  // For fallback: Find max bandwidth for relative percentage calculation
  const maxBandwidth = Math.max(
    ...activeServices.map(
      (s) => (s.bandwidth_up || 0) + (s.bandwidth_down || 0)
    ),
    1
  );

  const formatBandwidth = (mbps) => {
    if (!mbps || mbps === 0) return "0 KB/s";
    if (mbps < 1) {
      return `${(mbps * 1024).toFixed(1)} KB/s`;
    }
    return `${mbps.toFixed(1)} MB/s`;
  };

  const formatData = (gb) => {
    if (!gb || gb === 0) return "0 GB";
    if (gb >= 1000) {
      return `${(gb / 1024).toFixed(2)} TB`;
    }
    if (gb < 1) {
      return `${(gb * 1024).toFixed(1)} MB`;
    }
    return `${gb.toFixed(2)} GB`;
  };

  // Color schemes for each service
  const colors = [
    { primary: "#ec4899", shadow: "rgba(236, 72, 153, 0.4)" }, // pink
    { primary: "#8b5cf6", shadow: "rgba(139, 92, 246, 0.4)" }, // violet
    { primary: "#06b6d4", shadow: "rgba(6, 182, 212, 0.4)" }, // cyan
    { primary: "#10b981", shadow: "rgba(16, 185, 129, 0.4)" }, // emerald
    { primary: "#f59e0b", shadow: "rgba(245, 158, 11, 0.4)" }, // amber
  ];

  // Get top 5 services by bandwidth
  const topServices = [...activeServices]
    .sort((a, b) => {
      const aTotal = (a.bandwidth_up || 0) + (a.bandwidth_down || 0);
      const bTotal = (b.bandwidth_up || 0) + (b.bandwidth_down || 0);
      return bTotal - aTotal;
    })
    .slice(0, 5);

  return topServices.length > 0 ? (
    <div className="flex flex-wrap justify-center gap-8">
      {topServices.map((service, index) => {
        const serviceBandwidth =
          (service.bandwidth_up || 0) + (service.bandwidth_down || 0);

        // Calculate percentage based on configured max_bandwidth or relative to highest
        let percentage;
        const maxBandwidthValue =
          service.traffic?.max_bandwidth || service.max_bandwidth;

        if (maxBandwidthValue && maxBandwidthValue > 0) {
          // Absolute percentage based on configured maximum
          percentage = Math.round((serviceBandwidth / maxBandwidthValue) * 100);
        } else {
          // Relative percentage (fallback)
          percentage = Math.round((serviceBandwidth / maxBandwidth) * 100);
        }

        // Cap at 100% for display
        percentage = Math.min(percentage, 100);

        const colorScheme = colors[index % colors.length];

        return (
          <div
            key={service.id || index}
            className="relative group transition-all duration-300"
          >
            {/* Circular Progress */}
            <div className="flex justify-center mb-4">
              <CircularProgress
                percentage={percentage}
                color={colorScheme.primary}
                size={200}
              />
            </div>

            {/* Service Name */}
            <div className="text-center mb-3">
              <div className="text-xl font-semibold text-theme-text truncate group-hover:text-theme-primary transition-colors">
                {service.name}
              </div>
            </div>

            {/* Bandwidth Details */}
            <div className="bg-theme-card border border-theme rounded-lg p-3">
              {/* Row 1: Current Speeds */}
              <div className="grid grid-cols-3 gap-3 text-center pb-3 border-b border-theme-primary/20">
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowUp className="w-3 h-3 text-blue-400" />
                    <span className="text-xs font-medium text-blue-400">
                      {t("traffic.up")}
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-sm text-blue-400">
                    {formatBandwidth(service.bandwidth_up || 0)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowDown className="w-3 h-3 text-green-400" />
                    <span className="text-xs font-medium text-green-400">
                      {t("traffic.down")}
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-sm text-green-400">
                    {formatBandwidth(service.bandwidth_down || 0)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Activity className="w-3 h-3 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400">
                      {t("traffic.total")}
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-sm text-purple-400">
                    {formatBandwidth(serviceBandwidth)}
                  </div>
                </div>
              </div>

              {/* Row 2: Total Data Transferred */}
              <div className="grid grid-cols-3 gap-3 text-center pt-3">
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowUp className="w-3 h-3 text-orange-400" />
                    <span className="text-xs font-medium text-orange-400">
                      Uploaded
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-sm text-orange-400">
                    {formatData(service.total_up || 0)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowDown className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs font-medium text-cyan-400">
                      Downloaded
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-sm text-cyan-400">
                    {formatData(service.total_down || 0)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Activity className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">
                      Combined
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-sm text-amber-400">
                    {formatData(
                      (service.total_up || 0) + (service.total_down || 0)
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity indicator */}
            {serviceBandwidth > 0 && (
              <div className="absolute -top-1 -right-1">
                <div className="relative w-3 h-3">
                  <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  ) : null;
};

export default DashboardTrafficCards;
