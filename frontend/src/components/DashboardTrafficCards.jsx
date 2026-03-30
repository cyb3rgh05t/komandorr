import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUp,
  ArrowDown,
  Activity,
  RefreshCw,
  Server,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Cpu,
  MemoryStick,
} from "lucide-react";

const CircularProgress = ({
  percentage,
  color,
  size = 120,
  label,
  strokeWidth: sw,
  children,
}) => {
  const strokeWidth = sw || (size > 100 ? 8 : 5);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const isSmall = size <= 80;

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
        {children ? (
          children
        ) : (
          <>
            {label && (
              <span
                className={`font-medium text-theme-text-muted ${isSmall ? "text-[9px]" : "text-xs"} uppercase tracking-wider`}
              >
                {label}
              </span>
            )}
            <div
              className={`font-bold text-theme-text ${isSmall ? "text-lg" : "text-4xl"}`}
            >
              {percentage}%
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const DashboardTrafficCards = ({ trafficData, onRefresh, refreshing }) => {
  const { t } = useTranslation();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(6);

  // Calculate how many cards can fit based on screen width
  useState(() => {
    const calculateCardsPerPage = () => {
      const width = window.innerWidth;
      if (width < 640) return 1;
      if (width < 768) return 2;
      if (width < 1024) return 3;
      if (width < 1280) return 4;
      if (width < 1536) return 5;
      return 6;
    };

    setCardsPerPage(calculateCardsPerPage());

    const handleResize = () => {
      setCardsPerPage(calculateCardsPerPage());
      // Reset carousel index if it's out of bounds
      setCarouselIndex(0);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (
    !trafficData ||
    !trafficData.services ||
    trafficData.services.length === 0
  ) {
    return (
      <div className="w-full bg-theme-card border border-theme rounded-xl p-6 shadow-lg">
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
        <div className="bg-theme-card border border-theme rounded-xl p-12 text-center shadow-lg">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity size={40} className="" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-theme-text mb-3">
              {t("traffic.emptyState.title", "No Traffic Agents Connected")}
            </h3>
            <p className="text-theme-text-muted mb-6 max-w-md mx-auto">
              {t(
                "traffic.emptyState.description",
                "Install the Traffic Agent on your servers to monitor real-time bandwidth usage, upload/download speeds, and network statistics.",
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="https://github.com/cyb3rgh05t/komandorr/blob/main/traffic/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              <Activity size={16} />
              {t("traffic.emptyState.setupGuide", "Setup Traffic Agent")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Filter services with active traffic
  const activeServices = trafficData.services.filter(
    (service) =>
      service.traffic_history &&
      service.traffic_history.length > 0 &&
      (service.bandwidth_up > 0 || service.bandwidth_down > 0),
  );

  // Calculate totals
  const totalUpload = activeServices.reduce(
    (sum, s) => sum + (s.bandwidth_up || 0),
    0,
  );
  const totalDownload = activeServices.reduce(
    (sum, s) => sum + (s.bandwidth_down || 0),
    0,
  );
  const totalBandwidth = totalUpload + totalDownload;

  // Get max bandwidth from service configuration or fallback to relative calculation
  // If all services have max_bandwidth set, use that. Otherwise fall back to relative.
  const servicesWithMaxBandwidth = activeServices.filter(
    (s) => s.max_bandwidth,
  );
  const useAbsolutePercentage = servicesWithMaxBandwidth.length > 0;

  // For fallback: Find max bandwidth for relative percentage calculation
  const maxBandwidth = Math.max(
    ...activeServices.map(
      (s) => (s.bandwidth_up || 0) + (s.bandwidth_down || 0),
    ),
    1,
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

  // Get services sorted alphabetically by name
  const allServices = [...activeServices].sort((a, b) => {
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const itemsPerPage = cardsPerPage;
  const hasMoreCards = allServices.length > itemsPerPage;
  const maxIndex = Math.ceil(allServices.length / itemsPerPage) - 1;

  // Get current visible services based on carousel index
  const startIdx = carouselIndex * itemsPerPage;
  const topServices = allServices.slice(startIdx, startIdx + itemsPerPage);

  const handlePrevious = () => {
    setCarouselIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  };

  const handleNext = () => {
    setCarouselIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  return topServices.length > 0 ? (
    <div className="w-full bg-theme-card border border-theme rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-theme-primary" />
          <span className="text-sm font-semibold text-theme-text">
            {t("dashboard.trafficChart") || "Traffic Overview"}
          </span>
          <span className="text-xs text-theme-text-muted">
            ({allServices.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasMoreCards && (
            <span className="text-[10px] text-theme-text-muted">
              {carouselIndex + 1}/{maxIndex + 1}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-1.5 bg-theme-hover hover:bg-theme-primary/20 border border-theme hover:border-theme-primary/50 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md group"
              title={t("traffic.refreshData")}
            >
              <RefreshCw
                size={14}
                className={`text-theme-primary transition-transform duration-300 ${
                  refreshing ? "animate-spin" : "group-hover:rotate-180"
                }`}
              />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {/* Left Chevron */}
        {hasMoreCards && (
          <button
            onClick={handlePrevious}
            className="p-1.5 sm:p-2 bg-theme-hover hover:bg-theme-primary/20 border border-theme hover:border-theme-primary/50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
            title={t("common.previous") || "Previous"}
          >
            <ChevronLeft size={18} className="text-theme-primary" />
          </button>
        )}

        {/* Cards Container */}
        <div className="flex justify-center gap-4 sm:gap-8 lg:gap-14 flex-1 overflow-hidden">
          {topServices.map((service, index) => {
            const serviceBandwidth =
              (service.bandwidth_up || 0) + (service.bandwidth_down || 0);

            // Calculate percentage based on configured max_bandwidth or relative to highest
            let percentage;
            const maxBandwidthValue =
              service.traffic?.max_bandwidth || service.max_bandwidth;

            if (maxBandwidthValue && maxBandwidthValue > 0) {
              // Absolute percentage based on configured maximum
              percentage = Math.round(
                (serviceBandwidth / maxBandwidthValue) * 100,
              );
            } else {
              // Relative percentage (fallback)
              percentage = Math.round((serviceBandwidth / maxBandwidth) * 100);
            }

            // Cap at 100% for display
            percentage = Math.min(percentage, 100);

            const colorScheme = colors[index % colors.length];

            const cpuPercent = Math.min(
              Math.round(
                service.traffic?.cpu_percent ?? service.cpu_percent ?? 0,
              ),
              100,
            );
            const memPercent = Math.min(
              Math.round(
                service.traffic?.memory_percent ?? service.memory_percent ?? 0,
              ),
              100,
            );

            return (
              <div
                key={service.id || index}
                className="relative group transition-all duration-300"
              >
                {/* Circles row: CPU - Traffic - RAM */}
                <div className="flex items-center justify-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                  {/* CPU Circle (left) */}
                  <div className="flex-shrink-0 self-end mb-2">
                    <CircularProgress
                      percentage={cpuPercent}
                      color="#f59e0b"
                      size={60}
                      label="CPU"
                    />
                  </div>

                  {/* Main Traffic Circle (center) */}
                  <CircularProgress
                    percentage={percentage}
                    color={colorScheme.primary}
                    size={140}
                  >
                    <span className="text-[9px] sm:text-[10px] font-medium text-theme-text-muted uppercase tracking-wider">
                      Traffic
                    </span>
                    <div className="text-2xl sm:text-3xl font-bold text-theme-text">
                      {percentage}%
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                      <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
                      <span className="font-mono font-semibold text-[10px] sm:text-[11px] text-blue-400">
                        {formatBandwidth(service.bandwidth_up || 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400" />
                      <span className="font-mono font-semibold text-[10px] sm:text-[11px] text-green-400">
                        {formatBandwidth(service.bandwidth_down || 0)}
                      </span>
                    </div>
                  </CircularProgress>

                  {/* RAM Circle (right) */}
                  <div className="flex-shrink-0 self-end mb-2">
                    <CircularProgress
                      percentage={memPercent}
                      color="#06b6d4"
                      size={60}
                      label="RAM"
                    />
                  </div>
                </div>

                {/* Service Name */}
                <div className="text-center mb-1">
                  <div className="text-sm sm:text-base font-semibold text-theme-text truncate group-hover:text-theme-primary transition-colors max-w-[180px] mx-auto">
                    {service.name}
                  </div>
                </div>

                {/* Total Traffic */}
                <div className="flex items-center justify-center gap-1">
                  <Activity className="w-3 h-3 text-purple-400" />
                  <span className="font-mono font-semibold text-xs sm:text-sm text-purple-400">
                    {formatBandwidth(serviceBandwidth)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Chevron */}
        {hasMoreCards && (
          <button
            onClick={handleNext}
            className="p-1.5 sm:p-2 bg-theme-hover hover:bg-theme-primary/20 border border-theme hover:border-theme-primary/50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
            title={t("common.next") || "Next"}
          >
            <ChevronRight size={18} className="text-theme-primary" />
          </button>
        )}
      </div>
    </div>
  ) : null;
};

export default DashboardTrafficCards;
