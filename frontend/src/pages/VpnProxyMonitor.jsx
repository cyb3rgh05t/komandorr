import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { api } from "../services/api";

const AUTO_REFRESH_INTERVAL = 5000;
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
        return (
          <div
            key={key}
            className="bg-theme-card border border-theme rounded-xl p-4 hover:border-theme-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${catColors[row.category]}`}
              >
                {row.category}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-bold ${row.mbps > 0 ? "text-green-400" : "text-red-400"}`}
              >
                <Gauge className="w-3.5 h-3.5" />
                {row.mbpsFormatted || "—"}
              </span>
            </div>

            <button
              onClick={() => copyUrl(row.url)}
              className="group flex items-center gap-2 w-full bg-theme-bg-dark border border-theme rounded-lg px-3 py-2 mb-3 hover:border-theme-primary/50 transition-colors"
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

            <div className="flex items-center gap-4 mb-3">
              <div>
                <p className="text-[10px] text-theme-text-muted uppercase tracking-wider">
                  Streams
                </p>
                <p className="text-sm font-bold text-white">{streamCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-theme-text-muted uppercase tracking-wider">
                  Max
                </p>
                <p className="text-sm font-bold text-white">{row.maxStreams}</p>
              </div>
            </div>

            {streamCount > 0 && (
              <div className="pt-3 border-t border-theme/50">
                <div className="flex flex-wrap gap-1.5">
                  {row.streams.map((s, i) => (
                    <span
                      key={i}
                      className="text-xs text-theme-text bg-theme-bg-dark px-2 py-1 rounded border border-theme/50"
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
  const [monitorData, setMonitorData] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerId, setProviderId] = useState("demagentatv");
  const [tab, setTab] = useState("network");
  const [networkTab, setNetworkTab] = useState("all");
  const intervalRef = useRef(null);

  const fetchData = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setRefreshing(true);
        const [monRes, netRes] = await Promise.all([
          api.get("/vpn-proxy/monitoring"),
          api.get(`/vpn-proxy/monitoring/network-usage?provider=${providerId}`),
        ]);
        setMonitorData(monRes);
        setNetworkData(netRes);
      } catch {
        // silent
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [providerId],
  );

  const checkStatus = useCallback(async () => {
    try {
      const res = await api.get("/vpn-proxy/monitoring/status");
      setConfigured(res.configured);
      if (res.configured) fetchData();
      else setLoading(false);
    } catch {
      setConfigured(false);
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (!autoRefresh || !configured) return;
    intervalRef.current = setInterval(
      () => fetchData(true),
      AUTO_REFRESH_INTERVAL,
    );
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, configured, fetchData]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary" />
      </div>
    );
  }

  if (!configured) {
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
          onClick={() => fetchData()}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-theme-text-muted text-sm mb-1">
            <ArrowDownToLine className="w-4 h-4" />
            Bandwidth In
          </div>
          <p className="text-2xl font-bold text-green-400">
            {monitorData?.TotalBwIn || "—"}
          </p>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-theme-text-muted text-sm mb-1">
            <ArrowUpFromLine className="w-4 h-4" />
            Bandwidth Out
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {monitorData?.TotalBwOut || "—"}
          </p>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-theme-text-muted text-sm mb-1">
            <Cpu className="w-4 h-4" />
            CPU Load
          </div>
          <p
            className={`text-2xl font-bold ${bwColorClass(monitorData?.CpuLoadColor)}`}
          >
            {monitorData?.CpuLoad || "—"}
          </p>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-theme-text-muted text-sm mb-1">
            <HardDrive className="w-4 h-4" />
            Memory
          </div>
          <p className="text-2xl font-bold text-purple-400">
            {monitorData?.Memory || "—"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-1 border-b border-theme">
          <button
            onClick={() => setTab("network")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "network"
                ? "border-theme-primary text-theme-primary"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <Wifi className="w-4 h-4" />
            Network Usage
          </button>
          <button
            onClick={() => setTab("streams")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "streams"
                ? "border-theme-primary text-theme-primary"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <MonitorPlay className="w-4 h-4" />
            Active Streams
            <span className="px-1.5 py-0.5 bg-theme-primary/10 text-theme-primary text-xs font-bold rounded-full">
              {readers.length}
            </span>
          </button>
        </div>

        {/* Network Usage Tab */}
        {tab === "network" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex gap-1 bg-theme-card border border-theme rounded-lg p-1">
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
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        networkTab === cat
                          ? "bg-theme-primary text-black"
                          : "text-theme-text-muted hover:text-theme-text"
                      }`}
                    >
                      {cat === "all" ? "All" : cat}
                      <span
                        className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          networkTab === cat
                            ? "bg-black/20 text-black"
                            : "bg-theme-bg-dark text-theme-text-muted"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                <input
                  type="text"
                  placeholder="Provider ID..."
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  onBlur={() => fetchData()}
                  onKeyDown={(e) => e.key === "Enter" && fetchData()}
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
                      <tr className="border-b border-theme text-theme-text-muted text-left">
                        <th className="px-4 py-3 font-medium">Stream</th>
                        <th className="px-4 py-3 font-medium">Provider</th>
                        <th className="px-4 py-3 font-medium">Quality</th>
                        <th className="px-4 py-3 font-medium">↓ Down</th>
                        <th className="px-4 py-3 font-medium">↑ Up</th>
                        <th className="px-4 py-3 font-medium">Uptime</th>
                        <th className="px-4 py-3 font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReaders.map((r, i) => (
                        <tr
                          key={`${r.StreamName}-${r.User}-${i}`}
                          className="border-b border-theme/50 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-4 py-3 text-white font-medium">
                            {r.StreamName}
                          </td>
                          <td className="px-4 py-3 text-theme-text-muted">
                            {r.ProviderName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-theme-primary/10 text-theme-primary text-xs font-medium rounded">
                              {r.Quality}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const parts = (r.Bw || "").split("/");
                              return (
                                <span className="font-medium text-green-400">
                                  {parts[0] || "—"}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const parts = (r.Bw || "").split("/");
                              return (
                                <span className="font-medium text-blue-400">
                                  {parts[1] || "—"}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-theme-text">
                            {r.Uptime}
                          </td>
                          <td className="px-4 py-3">
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
