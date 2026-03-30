import { useState, useMemo, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import {
  Globe,
  MapPin,
  Shield,
  Wifi,
  Server,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

const COUNTRY_COORDS = {
  Germany: [51.1657, 10.4515],
  Deutschland: [51.1657, 10.4515],
  France: [46.6034, 1.8883],
  "United Kingdom": [55.3781, -3.436],
  UK: [55.3781, -3.436],
  Netherlands: [52.1326, 5.2913],
  Belgium: [50.8503, 4.3517],
  Switzerland: [46.8182, 8.2275],
  Austria: [47.5162, 14.5501],
  Spain: [40.4637, -3.7492],
  Portugal: [39.3999, -8.2245],
  Italy: [41.8719, 12.5674],
  Sweden: [60.1282, 18.6435],
  Norway: [60.472, 8.4689],
  Denmark: [56.2639, 9.5018],
  Finland: [61.9241, 25.7482],
  Poland: [51.9194, 19.1451],
  "Czech Republic": [49.8175, 15.473],
  Czechia: [49.8175, 15.473],
  Hungary: [47.1625, 19.5033],
  Romania: [45.9432, 24.9668],
  Bulgaria: [42.7339, 25.4858],
  Greece: [39.0742, 21.8243],
  Ireland: [53.1424, -7.6921],
  Iceland: [64.9631, -19.0208],
  Luxembourg: [49.8153, 6.1296],
  Croatia: [45.1, 15.2],
  Serbia: [44.0165, 21.0059],
  Slovakia: [48.669, 19.699],
  Slovenia: [46.1512, 14.9955],
  Estonia: [58.5953, 25.0136],
  Latvia: [56.8796, 24.6032],
  Lithuania: [55.1694, 23.8813],
  Ukraine: [48.3794, 31.1656],
  Moldova: [47.4116, 28.3699],
  Albania: [41.1533, 20.1683],
  "North Macedonia": [41.5122, 21.7453],
  "Bosnia and Herzegovina": [43.9159, 17.6791],
  Montenegro: [42.7087, 19.3744],
  Malta: [35.9375, 14.3754],
  Cyprus: [35.1264, 33.4299],
  Belarus: [53.7098, 27.9534],
  "United States": [37.0902, -95.7129],
  US: [37.0902, -95.7129],
  USA: [37.0902, -95.7129],
  Canada: [56.1304, -106.3468],
  Mexico: [23.6345, -102.5528],
  "Costa Rica": [9.7489, -83.7534],
  Panama: [8.538, -80.7821],
  Brazil: [-14.235, -51.9253],
  Argentina: [-38.4161, -63.6167],
  Chile: [-35.6751, -71.543],
  Colombia: [4.5709, -74.2973],
  Peru: [-9.19, -75.0152],
  Venezuela: [6.4238, -66.5897],
  Ecuador: [-1.8312, -78.1834],
  Uruguay: [-32.5228, -55.7658],
  Japan: [36.2048, 138.2529],
  "South Korea": [35.9078, 127.7669],
  China: [35.8617, 104.1954],
  "Hong Kong": [22.3193, 114.1694],
  Taiwan: [23.6978, 120.9605],
  Singapore: [1.3521, 103.8198],
  India: [20.5937, 78.9629],
  Thailand: [15.87, 100.9925],
  Vietnam: [14.0583, 108.2772],
  Malaysia: [4.2105, 101.9758],
  Indonesia: [-0.7893, 113.9213],
  Philippines: [12.8797, 121.774],
  Pakistan: [30.3753, 69.3451],
  Bangladesh: [23.685, 90.3563],
  "Sri Lanka": [7.8731, 80.7718],
  Cambodia: [12.5657, 104.991],
  Myanmar: [21.9162, 95.956],
  Nepal: [28.3949, 84.124],
  Kazakhstan: [48.0196, 66.9237],
  Uzbekistan: [41.3775, 64.5853],
  Georgia: [42.3154, 43.3569],
  Armenia: [40.0691, 45.0382],
  Azerbaijan: [40.1431, 47.5769],
  Mongolia: [46.8625, 103.8467],
  Israel: [31.0461, 34.8516],
  Turkey: [38.9637, 35.2433],
  Türkiye: [38.9637, 35.2433],
  "United Arab Emirates": [23.4241, 53.8478],
  UAE: [23.4241, 53.8478],
  "Saudi Arabia": [23.8859, 45.0792],
  Qatar: [25.3548, 51.1839],
  Bahrain: [26.0667, 50.5577],
  Kuwait: [29.3117, 47.4818],
  Oman: [21.4735, 55.9754],
  Jordan: [30.5852, 36.2384],
  Lebanon: [33.8547, 35.8623],
  Iraq: [33.2232, 43.6793],
  Iran: [32.4279, 53.688],
  "South Africa": [-30.5595, 22.9375],
  Egypt: [26.8206, 30.8025],
  Nigeria: [9.082, 8.6753],
  Kenya: [-0.0236, 37.9062],
  Morocco: [31.7917, -7.0926],
  Tunisia: [33.8869, 9.5375],
  Algeria: [28.0339, 1.6596],
  Ghana: [7.9465, -1.0232],
  Ethiopia: [9.145, 40.4897],
  Tanzania: [-6.369, 34.8888],
  Australia: [-25.2744, 133.7751],
  "New Zealand": [-40.9006, 174.886],
  Russia: [61.524, 105.3188],
  "Russian Federation": [61.524, 105.3188],
};

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function DashboardVpnMap({ containers = [], vpnInfoMap = {} }) {
  const [activeMarker, setActiveMarker] = useState(null);
  const [position, setPosition] = useState({ coordinates: [10, 20], zoom: 1 });

  const handleZoomIn = useCallback(() => {
    setPosition((pos) => ({ ...pos, zoom: Math.min(pos.zoom * 1.5, 8) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPosition((pos) => ({ ...pos, zoom: Math.max(pos.zoom / 1.5, 1) }));
  }, []);

  const handleReset = useCallback(() => {
    setPosition({ coordinates: [10, 20], zoom: 1 });
  }, []);

  // Build vpnConnections from containers + vpnInfoMap
  const vpnConnections = useMemo(() => {
    return containers
      .map((c) => {
        const info = vpnInfoMap[c.id] || {};
        const status = (c.docker_status || c.status || "").toLowerCase();
        const isRunning =
          status === "running" || status === "healthy" || status === "starting";
        if (!isRunning) return null;
        return {
          id: c.id,
          name: c.name,
          provider: c.vpn_provider,
          vpnType: c.vpn_type,
          vpnStatus: info.vpn_status,
          publicIp: info.public_ip,
          country: info.country,
          region: info.region,
        };
      })
      .filter(Boolean);
  }, [containers, vpnInfoMap]);

  // Group connections by country
  const markers = useMemo(() => {
    const byCountry = {};
    for (const conn of vpnConnections) {
      const country = conn.country;
      if (!country) continue;
      const coords = COUNTRY_COORDS[country];
      if (!coords) continue;
      if (!byCountry[country]) {
        byCountry[country] = {
          country,
          coords: [coords[1], coords[0]],
          connections: [],
        };
      }
      byCountry[country].connections.push(conn);
    }
    return Object.values(byCountry);
  }, [vpnConnections]);

  const activeCountries = useMemo(() => {
    const set = new Set();
    markers.forEach((m) => {
      set.add(m.country);
      if (m.country === "United States") set.add("United States of America");
      if (m.country === "US" || m.country === "USA")
        set.add("United States of America");
      if (m.country === "UK" || m.country === "United Kingdom")
        set.add("United Kingdom");
      if (m.country === "Czech Republic") set.add("Czechia");
      if (m.country === "Czechia") set.add("Czech Republic");
      if (m.country === "Russia") set.add("Russian Federation");
      if (m.country === "Türkiye") set.add("Turkey");
    });
    return set;
  }, [markers]);

  const isCountryActive = useCallback(
    (geo) => {
      const name = geo.properties?.name || geo.properties?.NAME || "";
      return activeCountries.has(name);
    },
    [activeCountries],
  );

  const uniqueIps = useMemo(() => {
    const ips = new Set();
    vpnConnections.forEach((c) => c.publicIp && ips.add(c.publicIp));
    return ips.size;
  }, [vpnConnections]);

  if (markers.length === 0) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-6 text-center">
        <Globe className="w-8 h-8 text-theme-text-muted mx-auto mb-2 opacity-30" />
        <p className="text-sm text-theme-text-muted">
          No active VPN connections to display
        </p>
      </div>
    );
  }

  return (
    <div className="bg-theme-card border border-theme rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-theme-primary" />
          <span className="text-sm font-semibold text-theme-text">
            VPN Connection Map
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-theme-hover rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-theme-text-muted font-medium">
              {markers.length} {markers.length === 1 ? "location" : "locations"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-theme-hover rounded-full">
            <Shield className="w-2.5 h-2.5 text-theme-primary" />
            <span className="text-[10px] text-theme-text-muted font-medium">
              {uniqueIps} {uniqueIps === 1 ? "IP" : "IPs"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-theme-hover rounded-full">
            <Server className="w-2.5 h-2.5 text-theme-text-muted" />
            <span className="text-[10px] text-theme-text-muted font-medium">
              {vpnConnections.length}{" "}
              {vpnConnections.length === 1 ? "tunnel" : "tunnels"}
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-theme-card/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-theme-card/80 to-transparent" />
          <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-theme-card/60 to-transparent" />
          <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-theme-card/60 to-transparent" />
        </div>

        <div
          className="bg-[#050505]"
          style={{ height: "350px", overflow: "hidden" }}
        >
          <ComposableMap
            projection="geoNaturalEarth1"
            projectionConfig={{ scale: 140, center: [0, 0] }}
            width={900}
            height={360}
            style={{ width: "100%", height: "100%" }}
          >
            <defs>
              <radialGradient id="vpnMarkerGlow" cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary, #d8ed18)"
                  stopOpacity="0.6"
                />
                <stop
                  offset="50%"
                  stopColor="var(--color-primary, #d8ed18)"
                  stopOpacity="0.15"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary, #d8ed18)"
                  stopOpacity="0"
                />
              </radialGradient>
              <radialGradient id="vpnMarkerGlowHover" cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary, #d8ed18)"
                  stopOpacity="0.8"
                />
                <stop
                  offset="50%"
                  stopColor="var(--color-primary, #d8ed18)"
                  stopOpacity="0.25"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary, #d8ed18)"
                  stopOpacity="0"
                />
              </radialGradient>
              <filter id="vpnGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <pattern
                id="vpnGridPattern"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="rgba(255,255,255,0.015)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>

            <rect width="900" height="360" fill="url(#vpnGridPattern)" />

            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={setPosition}
              minZoom={1}
              maxZoom={8}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const active = isCountryActive(geo);
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={
                          active
                            ? "rgba(var(--color-primary-rgb, 216, 237, 24), 0.15)"
                            : "#1a1a1a"
                        }
                        stroke={
                          active
                            ? "rgba(var(--color-primary-rgb, 216, 237, 24), 0.35)"
                            : "#2a2a2a"
                        }
                        strokeWidth={active ? 0.6 : 0.3}
                        style={{
                          default: { outline: "none" },
                          hover: {
                            fill: active
                              ? "rgba(var(--color-primary-rgb, 216, 237, 24), 0.2)"
                              : "#222222",
                            stroke: active
                              ? "rgba(var(--color-primary-rgb, 216, 237, 24), 0.5)"
                              : "#333333",
                            strokeWidth: active ? 0.8 : 0.4,
                            outline: "none",
                          },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {markers.map((m) => {
                const isActive = activeMarker === m.country;
                const connCount = m.connections.length;
                return (
                  <Marker
                    key={m.country}
                    coordinates={m.coords}
                    onMouseEnter={() => setActiveMarker(m.country)}
                    onMouseLeave={() => setActiveMarker(null)}
                  >
                    <circle
                      r={isActive ? 22 : 16}
                      fill={
                        isActive
                          ? "url(#vpnMarkerGlowHover)"
                          : "url(#vpnMarkerGlow)"
                      }
                      style={{ transition: "r 0.3s ease" }}
                    />
                    <circle
                      r={12}
                      fill="none"
                      stroke="rgba(var(--color-primary-rgb, 216, 237, 24), 0.2)"
                      strokeWidth={0.5}
                      className="animate-ping"
                      style={{
                        animationDuration: "3s",
                        transformOrigin: "center",
                      }}
                    />
                    <circle
                      r={isActive ? 7 : 5.5}
                      fill="rgba(var(--color-primary-rgb, 216, 237, 24), 0.08)"
                      stroke="rgba(var(--color-primary-rgb, 216, 237, 24), 0.3)"
                      strokeWidth={0.5}
                      style={{ transition: "r 0.2s ease" }}
                    />
                    <circle
                      r={isActive ? 4 : 3}
                      fill="var(--color-primary, #d8ed18)"
                      filter="url(#vpnGlow)"
                      className="cursor-pointer"
                      style={{ transition: "r 0.2s ease" }}
                    />
                    <circle
                      r={1.2}
                      fill="#fff"
                      opacity={isActive ? 0.9 : 0.6}
                      style={{ transition: "opacity 0.2s ease" }}
                    />
                    {connCount > 1 && (
                      <g transform="translate(14, -16)">
                        <rect
                          x={-12}
                          y={-11}
                          width={24}
                          height={22}
                          rx={6}
                          fill="#0a0a0a"
                          stroke="var(--color-primary, #d8ed18)"
                          strokeWidth={1.2}
                        />
                        <text
                          textAnchor="middle"
                          y={4}
                          style={{
                            fontSize: "14px",
                            fill: "var(--color-primary, #d8ed18)",
                            fontWeight: 700,
                            fontFamily: "monospace",
                          }}
                        >
                          {connCount}
                        </text>
                      </g>
                    )}
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 flex items-center justify-center bg-theme-card/90 border border-theme rounded-md text-theme-text-muted hover:text-theme-primary hover:border-theme-primary transition-all"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 flex items-center justify-center bg-theme-card/90 border border-theme rounded-md text-theme-text-muted hover:text-theme-primary hover:border-theme-primary transition-all"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="w-7 h-7 flex items-center justify-center bg-theme-card/90 border border-theme rounded-md text-theme-text-muted hover:text-theme-primary hover:border-theme-primary transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tooltip */}
        {activeMarker && (
          <div className="absolute top-4 right-4 z-20">
            {markers
              .filter((m) => m.country === activeMarker)
              .map((m) => (
                <div
                  key={m.country}
                  className="bg-theme-card/95 backdrop-blur-md border border-theme rounded-xl shadow-2xl shadow-black/40 overflow-hidden min-w-[220px]"
                >
                  <div className="px-3.5 py-2.5 border-b border-theme">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-theme-primary" />
                      <span className="text-sm font-semibold text-theme-text">
                        {m.country}
                      </span>
                    </div>
                    <p className="text-[10px] text-theme-text-muted mt-0.5 ml-5">
                      {m.connections.length}{" "}
                      {m.connections.length === 1
                        ? "connection"
                        : "connections"}
                    </p>
                  </div>
                  <div className="p-2.5 space-y-1.5 max-h-[200px] overflow-y-auto">
                    {m.connections.map((conn) => (
                      <div
                        key={conn.id}
                        className="flex items-center gap-2.5 px-2.5 py-2 bg-theme-hover/50 rounded-lg"
                      >
                        <div className="relative flex-shrink-0">
                          <span
                            className={`block w-2 h-2 rounded-full ${
                              conn.vpnStatus === "running"
                                ? "bg-green-400"
                                : "bg-red-400"
                            }`}
                          />
                          {conn.vpnStatus === "running" && (
                            <span className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-40" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-theme-text truncate leading-none">
                            {conn.name}
                          </p>
                          <p className="text-[10px] text-theme-text-muted mt-0.5 capitalize">
                            {conn.provider} · {conn.vpnType || "—"}
                          </p>
                        </div>
                        <span className="text-[11px] text-theme-primary font-mono flex-shrink-0">
                          {conn.publicIp || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Bottom stats */}
      <div className="px-4 py-2 border-t border-theme">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {markers.slice(0, 6).map((m) => (
              <button
                key={m.country}
                onMouseEnter={() => setActiveMarker(m.country)}
                onMouseLeave={() => setActiveMarker(null)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all ${
                  activeMarker === m.country
                    ? "bg-theme-primary/10 text-theme-primary"
                    : "text-theme-text-muted hover:text-theme-text hover:bg-theme-hover"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeMarker === m.country
                      ? "bg-theme-primary"
                      : "bg-theme-text-muted"
                  }`}
                />
                <span className="font-medium">{m.country}</span>
                {m.connections.length > 1 && (
                  <span className="text-[9px] opacity-60">
                    ×{m.connections.length}
                  </span>
                )}
              </button>
            ))}
            {markers.length > 6 && (
              <span className="text-[10px] text-theme-text-muted">
                +{markers.length - 6} more
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-theme-text-muted">
            <Wifi className="w-3 h-3 text-green-400" />
            <span>All tunnels secured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
