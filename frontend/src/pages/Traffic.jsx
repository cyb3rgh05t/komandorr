import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Activity, ArrowUp, ArrowDown, Server, RefreshCw } from "lucide-react";
import { api } from "../services/api";

export default function Traffic() {
  const { t } = useTranslation();
  const [trafficSummary, setTrafficSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchTrafficData = async () => {
    try {
      const data = await api.getTrafficSummary();
      setTrafficSummary(data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error("Error fetching traffic data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTrafficData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBandwidth = (mbps) => {
    if (mbps < 1) {
      return `${(mbps * 1024).toFixed(2)} KB/s`;
    }
    return `${mbps.toFixed(2)} MB/s`;
  };

  const formatTraffic = (gb) => {
    if (gb < 1) {
      return `${(gb * 1024).toFixed(2)} MB`;
    }
    if (gb > 1024) {
      return `${(gb / 1024).toFixed(2)} TB`;
    }
    return `${gb.toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-theme-primary animate-spin mx-auto mb-2" />
          <p className="text-theme-text-muted">{t("traffic.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-text flex items-center gap-2">
            <Activity className="w-8 h-8 text-theme-primary" />
            {t("traffic.title")}
          </h1>
          <p className="text-theme-text-muted mt-1">{t("traffic.subtitle")}</p>
        </div>
        <button
          onClick={fetchTrafficData}
          className="flex items-center gap-2 px-4 py-2 bg-theme-bg-card hover:bg-theme-bg-hover border border-theme-border rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t("common.refresh")}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Services */}
        <div className="bg-theme-bg-card border border-theme-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-text-muted text-sm">
                {t("traffic.total_services")}
              </p>
              <p className="text-3xl font-bold text-theme-text mt-1">
                {trafficSummary?.total_services || 0}
              </p>
            </div>
            <Server className="w-8 h-8 text-theme-primary opacity-50" />
          </div>
        </div>

        {/* Active Monitoring */}
        <div className="bg-theme-bg-card border border-theme-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-text-muted text-sm">
                {t("traffic.active_monitoring")}
              </p>
              <p className="text-3xl font-bold text-theme-text mt-1">
                {trafficSummary?.services_with_traffic || 0}
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        {/* Total Bandwidth Up */}
        <div className="bg-theme-bg-card border border-theme-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-text-muted text-sm flex items-center gap-1">
                <ArrowUp className="w-4 h-4" />
                {t("traffic.current_upload")}
              </p>
              <p className="text-3xl font-bold text-theme-text mt-1">
                {formatBandwidth(trafficSummary?.total_bandwidth_up || 0)}
              </p>
            </div>
            <ArrowUp className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        {/* Total Bandwidth Down */}
        <div className="bg-theme-bg-card border border-theme-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-text-muted text-sm flex items-center gap-1">
                <ArrowDown className="w-4 h-4" />
                {t("traffic.current_download")}
              </p>
              <p className="text-3xl font-bold text-theme-text mt-1">
                {formatBandwidth(trafficSummary?.total_bandwidth_down || 0)}
              </p>
            </div>
            <ArrowDown className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Total Traffic Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-theme-bg-card border border-theme-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-theme-text mb-4 flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-blue-500" />
            {t("traffic.total_uploaded")}
          </h3>
          <p className="text-4xl font-bold text-blue-500">
            {formatTraffic(trafficSummary?.total_traffic_up || 0)}
          </p>
        </div>

        <div className="bg-theme-bg-card border border-theme-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-theme-text mb-4 flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-green-500" />
            {t("traffic.total_downloaded")}
          </h3>
          <p className="text-4xl font-bold text-green-500">
            {formatTraffic(trafficSummary?.total_traffic_down || 0)}
          </p>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-theme-bg-card border border-theme-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-theme-border">
          <h2 className="text-xl font-semibold text-theme-text">
            {t("traffic.services_list")}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-bg-hover">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  {t("traffic.service_name")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    {t("traffic.upload_speed")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <ArrowDown className="w-3 h-3" />
                    {t("traffic.download_speed")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  {t("traffic.total_up")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  {t("traffic.total_down")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  {t("traffic.last_update")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {trafficSummary?.services &&
              trafficSummary.services.length > 0 ? (
                trafficSummary.services.map((service) => (
                  <tr
                    key={service.id}
                    className="hover:bg-theme-bg-hover transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-theme-text">
                        {service.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-500 font-mono">
                        {formatBandwidth(service.bandwidth_up)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-green-500 font-mono">
                        {formatBandwidth(service.bandwidth_down)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-theme-text font-mono">
                        {formatTraffic(service.total_up)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-theme-text font-mono">
                        {formatTraffic(service.total_down)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-theme-text-muted">
                        {service.last_updated
                          ? new Date(service.last_updated).toLocaleTimeString()
                          : "N/A"}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-theme-text-muted"
                  >
                    {t("traffic.no_data")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last Update Info */}
      {lastUpdate && (
        <div className="text-center text-sm text-theme-text-muted">
          {t("traffic.last_refresh")}: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
