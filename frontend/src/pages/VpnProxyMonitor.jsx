import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  RefreshCw,
  Cpu,
  HardDrive,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  Wifi,
  AlertTriangle,
  Tv,
  MonitorPlay,
  Gauge,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { api } from "../services/api";

const CATEGORIES = ["Script", "Manifest", "Media"];

function bwColorClass(color) {
  switch (color) {
    case "green":
      return "text-green-400";
    case "yellow":
      return "text-yellow-400";
    case "orange":
      return "text-orange-400";
    case "red":
      return "text-red-400";
    default:
      return "text-theme-text";
  }
}

function NetworkUsageGrid({ usage, category }) {
  const [copiedUrl, setCopiedUrl] = useState(null);

  const categories = category === "all" ? CATEGORIES : [category];
  const rows = [];
  for (const cat of categories) {
    const proxy = usage[cat]?.Proxy || {};
    for (const [url, info] of Object.entries(proxy)) {
      rows.push({
        category: cat,
        url,
        streams: info?.Streams || [],
        maxStreams: info?.MaxStreams || 0,
        mbps: info?.Mbps || 0,
        mbpsFormatted: info?.MbpsFormatted || "",
      });
    }
  }

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const catColors = {
    Script: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    Manifest: "text-purple-400 bg-purple-400/10 border-purple-400/30",
    Media: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  };

  const catDotColors = {
    Script: "bg-blue-400",
    Manifest: "bg-purple-400",
    Media: "bg-amber-400",
  };

  if (rows.length === 0) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-8 text-center">
        <Wifi className="w-10 h-10 text-theme-text-muted mx-auto mb-3" />
        <p className="text-theme-text-muted">No proxy data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {rows.map((row) => {
        const key = `${row.category}-${row.url}`;
        const streamCount = row.streams.length;
        const isActive = row.mbps > 0;
        return (
          <div
            key={key}
            className="bg-theme-card border border-theme rounded-xl overflow-hidden transition-all hover:border-theme-primary/30"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${catDotColors[row.category]}`}
                />
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${catColors[row.category]}`}
                >
                  {row.category}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-bold ${isActive ? "text-green-400" : "text-theme-text-muted"}`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  {row.mbpsFormatted
                    ? row.mbpsFormatted.replace("Mbps", " Mbps")
                    : "0.0 Mbps"}
                </span>
              </div>
            </div>

            {/* Proxy URL */}
            <div className="px-4 pb-3">
              <button
                onClick={() => copyUrl(row.url)}
                className="group flex items-center gap-2 w-full bg-theme-bg-dark border border-theme rounded-lg px-3 py-2 hover:border-theme-primary/50 transition-colors"
                title="Click to copy"
              >
                <span className="text-theme-primary font-mono text-xs truncate flex-1 text-left">
                  {row.url}
                </span>
                {copiedUrl === row.url ? (
                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-primary shrink-0 transition-colors" />
                )}
              </button>
            </div>

            {/* Stats Row */}
            <div className="px-4 pb-3 flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-bg-dark rounded-lg border border-theme">
                <MonitorPlay className="w-3.5 h-3.5 text-theme-text-muted" />
                <span className="text-xs text-theme-text-muted">Streams</span>
                <span
                  className={`text-sm font-bold ${streamCount > 0 ? "text-theme-primary" : "text-white"}`}
                >
                  {streamCount}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-bg-dark rounded-lg border border-theme">
                <Zap className="w-3.5 h-3.5 text-theme-text-muted" />
                <span className="text-xs text-theme-text-muted">Max</span>
                <span className="text-sm font-bold text-white">
                  {row.maxStreams}
                </span>
              </div>
              {streamCount > 0 && row.maxStreams > 0 && (
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-theme-bg-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        streamCount / row.maxStreams > 0.8
                          ? "bg-red-500"
                          : streamCount / row.maxStreams > 0.5
                            ? "bg-yellow-500"
                            : "bg-theme-primary"
                      }`}
                      style={{
                        width: `${Math.min(100, (streamCount / row.maxStreams) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-theme-text-muted">
                    {Math.round((streamCount / row.maxStreams) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Streams List */}
            {streamCount > 0 && (
              <div className="px-4 pb-4 pt-2 border-t border-theme">
                <div className="flex flex-wrap gap-1.5">
                  {row.streams.map((s, i) => (
                    <span
                      key={i}
                      className="text-xs text-theme-text-muted bg-theme-bg-dark px-2 py-1 rounded border border-theme"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VpnProxyMonitor() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [providerId, setProviderId] = useState("demagentatv");
  const [tab, setTab] = useState("network");
  const [networkTab, setNetworkTab] = useState("all");

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["vpn-monitor-status"],
    queryFn: () => api.get("/vpn-proxy/monitoring/status"),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const configured = statusData?.configured ?? null;

  const { data: monitorData, isFetching: monitorFetching } = useQuery({
    queryKey: ["vpn-monitor-data"],
    queryFn: () => api.get("/vpn-proxy/monitoring"),
    enabled: configured === true,
    staleTime: 3000,
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });

  const { data: networkData, isFetching: networkFetching } = useQuery({
    queryKey: ["vpn-monitor-network", providerId],
    queryFn: () =>
      api.get(`/vpn-proxy/monitoring/network-usage?provider=${providerId}`),
    enabled: configured === true && providerId.length > 0,
    staleTime: 3000,
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });

  const refreshing = monitorFetching || networkFetching;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["vpn-monitor-data"] });
    queryClient.invalidateQueries({ queryKey: ["vpn-monitor-network"] });
  };

  const readers = monitorData?.Readers || [];
  const filteredReaders = readers.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.StreamName?.toLowerCase().includes(q) ||
      r.ProviderName?.toLowerCase().includes(q) ||
      r.User?.toLowerCase().includes(q) ||
      r.Ip?.toLowerCase().includes(q)
    );
  });

  const usage = networkData?.Usage || {};

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary" />
      </div>
    );
  }

  if (configured === false) {
    return (
      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-6">
        <div className="bg-theme-card border border-theme rounded-xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Monitoring Not Configured
          </h2>
          <p className="text-theme-text-muted max-w-md mx-auto">
            Configure O11 monitoring in the VPN-Proxy Manager Settings → System
            tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-4 h-4 text-theme-primary ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-theme-card border border-theme rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowDownToLine className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Bandwidth In
                </span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {monitorData?.TotalBwIn
                  ? monitorData.TotalBwIn.replace("Mbps", " Mbps")
                  : "—"}
              </p>
            </div>
            <ArrowDownToLine className="w-6 h-6 text-green-400" />
          </div>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpFromLine className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Bandwidth Out
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {monitorData?.TotalBwOut
                  ? monitorData.TotalBwOut.replace("Mbps", " Mbps")
                  : "—"}
              </p>
            </div>
            <ArrowUpFromLine className="w-6 h-6 text-blue-400" />
          </div>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Cpu className={`w-3.5 h-3.5 ${bwColorClass(monitorData?.CpuLoadColor)}`} />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  CPU Load
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${bwColorClass(monitorData?.CpuLoadColor)}`}
              >
                {monitorData?.CpuLoad || "—"}
              </p>
            </div>
            <Cpu className={`w-6 h-6 ${bwColorClass(monitorData?.CpuLoadColor)}`} />
          </div>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] text-theme-text-muted uppercase tracking-wider font-medium">
                  Memory
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-400">
                {monitorData?.Memory || "—"}
              </p>
            </div>
            <HardDrive className="w-6 h-6 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setTab("network")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                tab === "network"
                  ? "bg-theme-primary text-black shadow-md"
                  : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
              }`}
            >
              <Wifi className="w-4 h-4" />
              Network Usage
            </button>
            <button
              onClick={() => setTab("streams")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                tab === "streams"
                  ? "bg-theme-primary text-black shadow-md"
                  : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
              }`}
            >
              <MonitorPlay className="w-4 h-4" />
              Active Streams
              <span
                className={`ml-2 text-xs ${
                  tab === "streams" ? "text-black/70" : "text-theme-text-muted"
                }`}
              >
                ({readers.length})
              </span>
            </button>
          </div>
        </div>

        {/* Network Usage Tab */}
        {tab === "network" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {["all", ...CATEGORIES].map((cat) => {
                    const count =
                      cat === "all"
                        ? CATEGORIES.reduce(
                            (sum, c) =>
                              sum + Object.keys(usage[c]?.Proxy || {}).length,
                            0,
                          )
                        : Object.keys(usage[cat]?.Proxy || {}).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setNetworkTab(cat)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                          networkTab === cat
                            ? "bg-theme-primary text-black shadow-md"
                            : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
                        }`}
                      >
                        {cat === "all" ? "All" : cat}
                        <span
                          className={`ml-2 text-xs ${
                            networkTab === cat
                              ? "text-black/70"
                              : "text-theme-text-muted"
                          }`}
                        >
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                <input
                  type="text"
                  placeholder="Provider ID..."
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-48 pl-9 pr-4 py-2 bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted text-sm focus:outline-none focus:border-theme-primary"
                />
              </div>
            </div>
            <NetworkUsageGrid usage={usage} category={networkTab} />
          </div>
        )}

        {/* Active Streams Tab */}
        {tab === "streams" && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                <input
                  type="text"
                  placeholder="Search streams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-9 pr-4 py-2 bg-theme-card border-2 border-theme rounded-lg text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-primary"
                />
              </div>
            </div>

            {filteredReaders.length === 0 ? (
              <div className="bg-theme-card border border-theme rounded-xl p-8 text-center">
                <Tv className="w-10 h-10 text-theme-text-muted mx-auto mb-3" />
                <p className="text-theme-text-muted">
                  {readers.length === 0
                    ? "No active streams"
                    : "No streams match your search"}
                </p>
              </div>
            ) : (
              <div className="bg-theme-card border border-theme rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-theme-primary-80 border-b border-theme-primary">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                          Stream
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                          Provider
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                          Quality
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                          ↓ Down
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                          ↑ Up
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                          Uptime
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                          Errors
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReaders.map((r, i) => (
                        <tr
                          key={`${r.StreamName}-${r.User}-${i}`}
                          className="group border-b border-theme last:border-b-0 hover:bg-theme-primary-10 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-medium text-theme-text group-hover:text-theme-primary transition-colors">
                              {r.StreamName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-theme-text-muted">
                            {r.ProviderName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-theme-primary/10 text-theme-primary text-xs font-medium rounded">
                              {r.Quality}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {(() => {
                              const parts = (r.Bw || "").split("/");
                              return (
                                <span className="font-medium text-green-400">
                                  {parts[0] ? `${parts[0]} Mbps` : "—"}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            {(() => {
                              const parts = (r.Bw || "").split("/");
                              return (
                                <span className="font-medium text-blue-400">
                                  {parts[1]
                                    ? parts[1].replace("Mbps", " Mbps")
                                    : "—"}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-theme-text">
                            {r.Uptime}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-medium ${bwColorClass(r.ErrorsColor)}`}
                            >
                              {r.Errors}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
