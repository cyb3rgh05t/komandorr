# Copilot Instructions — komandorr

> **The authoritative agent guide is [`AGENTS.md`](../AGENTS.md).** Read it
> first. This file is a short pointer for GitHub Copilot Chat that
> consolidates the must-know rules; AGENTS.md has the full conventions,
> session history, and known pitfalls.

## Project at a glance

- **Frontend**: React 18 + Vite 5 + TailwindCSS 3, i18next, react-router 6,
  @tanstack/react-query, lucide-react. In [`frontend/`](../frontend/).
- **Backend**: FastAPI-style Python modules in
  [`backend/app/`](../backend/app/). Entry: [`backend/run.py`](../backend/run.py).
- **Sidecar agents**: [`traffic/traffic_agent.py`](../traffic/traffic_agent.py),
  [`storage/storage_agent.py`](../storage/storage_agent.py).
- **Docker**: [`Dockerfile`](../Dockerfile),
  [`docker-compose.yml`](../docker-compose.yml).

## Hard rules

1. **Every page starts with `<PageHeader icon={...} title={...} actions={...} />`** —
   see [`frontend/src/components/PageHeader.jsx`](../frontend/src/components/PageHeader.jsx).
2. **Status/summary tiles use `<StatCard />`** from
   [`frontend/src/components/StatCard.jsx`](../frontend/src/components/StatCard.jsx).
   Never re-inline the markup, never fork per page. Pass `to`/`onClick` for
   clickable variants, `active` for current-view highlight. Allowed colors
   live in the `STAT_COLORS` map — extend there if needed.
3. **Tailwind theme tokens only** — `bg-theme-card`, `text-theme-text`,
   `border-theme-primary`, etc. Never raw colors.
4. **i18n**: all user-visible strings via `t("ns.key", "Fallback English")`.
5. **Icons**: `lucide-react` only.
6. **Charts**: hand-rolled SVG (no chart library). Reference: `PeakChart` in
   [`frontend/src/pages/VODStreamsHistory.jsx`](../frontend/src/pages/VODStreamsHistory.jsx).
7. **React Query**: when a service function takes positional args, **always
   wrap in arrow**: `queryFn: () => fetchPlexActivities()`. Never
   `queryFn: fetchPlexActivities` — React Query passes its context object
   as the first arg, which propagates into `?instance_id=[object Object]`
   and breaks multi-instance resolution.
8. **Polling**: `refetchIntervalInBackground: false` is the global default
   in [`App.jsx`](../frontend/src/App.jsx). Don't override it. Use sensible
   intervals (≥ 10 s for fast data, ≥ 30 s for slow data, ≥ 60 s for NFS
   dashboards). See §8.1 of AGENTS.md.
9. **Multi-instance configs** (Plex / Posterizarr / Autoscan / \*arr / VPN
   Proxy / NFS): `*_INSTANCES` lists in
   [`backend/app/config.py`](../backend/app/config.py). Resolution order
   when caller omits the id: `plex_sync.instance_id` → first instance.
   Explicit unknown id → `None` + warning.
10. **Stuck-download detection** must combine `trackedDownloadStatus` +
    `trackedDownloadState` — see §8.3 of AGENTS.md. Kept in sync across
    Sidebar, DashboardPageCharts, and ArrActivity.
11. **Notification flap protection**: `FAILURE_THRESHOLD = 2` consecutive
    failures before a PROBLEM alert; recovery is immediate. See §8.2.
12. **Dashboard card visibility**: instance-driven cards must return `null`
   when no instance is configured. Do not render placeholder tiles for
   unconfigured modules.
13. **Dashboard card footers**: include instance context as
   `N instances • X online • Y offline` (when known). Keep existing
   card-specific counters after this.
14. **Sidebar badge propagation**: if a tabbed module has an error/warning
   badge on a subtab, mirror it on the parent tab as well (Posterizarr /
   Uploader).
15. **Uploads Last Upload mini-card** must use the same compact card language
   as Downloads/Autoscan recent entries (`bg-theme-hover`, `border-theme`,
   `rounded-lg`, compact two-row list layout).

## Things to avoid

- Adding storage tiles to the Storage page — they live on the **Dashboard**
  (see [`DashboardPageCharts.jsx`](../frontend/src/components/DashboardPageCharts.jsx)
  `StorageCard`).
- Hard-coding 5-second polling. Use the defaults in §4.4 of nfs-mount's
  AGENTS.md as guidance (this repo follows the same pattern).
- Leaving empty dashboard card placeholders for unconfigured modules. The slot
   must collapse when the card returns `null`.
- Creating new Markdown docs without being asked. Update AGENTS.md instead.

## Commands

```pwsh
# Frontend dev
cd frontend ; npm install ; npm run dev

# Backend dev (venv at backend/venv)
cd backend ; python run.py

# Docker
docker compose -f docker-compose.dev.yml up
docker compose up -d
```

## Communication

User writes in **German**, often very brief, lowercase. Reply in German,
concise, no emojis unless asked. Default to **implementing** changes
rather than describing them.

When conventions change, **update [`AGENTS.md`](../AGENTS.md) in the same
PR**.
