import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ExternalLink,
  RefreshCw,
  AppWindow,
  Globe,
  Server,
  Shield,
  Database,
  Monitor,
  Cloud,
  Tv,
  Film,
  Music,
  Download,
  Upload,
  HardDrive,
  Wifi,
  Radio,
  Cog,
  Terminal,
  FileText,
  BarChart3,
  Image,
  Mail,
  MessageSquare,
  GitBranch,
  Box,
  Layers,
  Zap,
  BookOpen,
  Search,
  Plus,
  FolderOpen,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// Map icon names to lucide components
const iconMap = {
  globe: Globe,
  server: Server,
  shield: Shield,
  database: Database,
  monitor: Monitor,
  cloud: Cloud,
  tv: Tv,
  film: Film,
  music: Music,
  download: Download,
  upload: Upload,
  harddrive: HardDrive,
  wifi: Wifi,
  radio: Radio,
  cog: Cog,
  terminal: Terminal,
  filetext: FileText,
  barchart: BarChart3,
  image: Image,
  mail: Mail,
  message: MessageSquare,
  git: GitBranch,
  box: Box,
  layers: Layers,
  zap: Zap,
  book: BookOpen,
  app: AppWindow,
  external: ExternalLink,
};

function SortableAppCard({ app, getIcon, t }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
    touchAction: "none",
  };

  const IconComponent = getIcon(app.icon);
  const isImageUrl =
    app.icon &&
    (app.icon.startsWith("http://") ||
      app.icon.startsWith("https://") ||
      app.icon.startsWith("/"));

  let displayUrl = "";
  try {
    const url = new URL(app.url);
    displayUrl = url.hostname + (url.port ? `:${url.port}` : "");
  } catch {
    displayUrl = app.url;
  }

  const handleClick = (e) => {
    // Don't navigate if we just finished dragging
    if (isDragging) {
      e.preventDefault();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group bg-theme-card border border-theme rounded-xl p-4 flex flex-col items-center gap-3 hover:border-theme-primary/50 hover:shadow-xl hover:shadow-theme-primary/5 relative overflow-hidden cursor-grab active:cursor-grabbing ${isDragging ? "shadow-2xl ring-2 ring-theme-primary/50" : ""}`}
    >
      {/* Drag indicator */}
      <div className="absolute top-1.5 right-1.5 p-1 rounded text-theme-text-muted/40 group-hover:text-theme-primary/70 transition-colors pointer-events-none">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-theme-primary/0 via-transparent to-theme-primary/0 group-hover:from-theme-primary/5 group-hover:to-theme-primary/3 transition-all duration-500 pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-theme-primary/0 group-hover:bg-theme-primary/5 rounded-full blur-2xl transition-all duration-500 pointer-events-none" />

      {/* Icon */}
      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        onClick={handleClick}
        className="contents"
      >
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-theme-hover to-theme-card border border-theme group-hover:border-theme-primary/40 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-theme-primary/10">
          {isImageUrl ? (
            <img
              src={app.icon}
              alt={app.name}
              className="w-8 h-8 object-contain rounded-lg"
              draggable={false}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : (
            <IconComponent
              size={26}
              className="text-theme-primary transition-colors"
            />
          )}
          {isImageUrl && (
            <div
              className="hidden items-center justify-center w-full h-full"
              style={{ display: "none" }}
            >
              <AppWindow
                size={26}
                className="text-theme-primary transition-colors"
              />
            </div>
          )}
        </div>

        {/* Name & URL */}
        <div className="relative text-center space-y-0.5 w-full">
          <h3 className="text-xs font-bold text-theme-text group-hover:text-theme-primary transition-colors line-clamp-1">
            {app.name}
          </h3>
          <p className="text-[10px] text-theme-text-muted truncate px-1">
            {displayUrl}
          </p>
        </div>

        {/* Open link badge */}
        <div className="relative flex items-center gap-1 px-2.5 py-1 rounded-lg bg-theme-hover/50 border border-theme group-hover:border-theme-primary/30 group-hover:bg-theme-primary/10 transition-all duration-300">
          <ExternalLink
            size={10}
            className="text-theme-text-muted group-hover:text-theme-primary transition-colors"
          />
          <span className="text-[9px] font-medium text-theme-text-muted group-hover:text-theme-primary transition-colors uppercase tracking-wider">
            {t("externalApps.open", "Open")}
          </span>
        </div>
      </a>
    </div>
  );
}

export default function ExternalApps() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: settingsData,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["settings-external-apps"],
    queryFn: () => api.get("/settings"),
    staleTime: 60000,
  });

  const [localApps, setLocalApps] = useState([]);
  const [groupOrder, setGroupOrder] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");

  // Sync localApps and groupOrder from server data
  useEffect(() => {
    const serverApps = settingsData?.external_apps?.apps || [];
    const serverGroupOrder = settingsData?.external_apps?.group_order || [];
    setLocalApps(serverApps);
    setGroupOrder(serverGroupOrder);
  }, [settingsData]);

  const apps = localApps;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = localApps.findIndex((a) => a.id === active.id);
      const newIndex = localApps.findIndex((a) => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(localApps, oldIndex, newIndex);
      setLocalApps(reordered);

      // Persist to backend
      try {
        await api.post("/settings", {
          external_apps: { apps: reordered, group_order: groupOrder },
        });
        queryClient.invalidateQueries({ queryKey: ["settings-external-apps"] });
      } catch (e) {
        console.error("Failed to save reorder:", e);
        setLocalApps(localApps);
      }
    },
    [localApps, groupOrder, queryClient],
  );

  const handleGroupMove = useCallback(
    async (groupName, direction) => {
      const currentGroups = [...groupOrder];
      // Ensure all existing groups are in the order array
      const allGroups = [
        ...new Set(localApps.map((a) => a.group).filter(Boolean)),
      ];
      allGroups.forEach((g) => {
        if (!currentGroups.includes(g)) currentGroups.push(g);
      });

      const idx = currentGroups.indexOf(groupName);
      if (idx === -1) return;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= currentGroups.length) return;

      const reordered = arrayMove(currentGroups, idx, newIdx);
      setGroupOrder(reordered);

      try {
        await api.post("/settings", {
          external_apps: { apps: localApps, group_order: reordered },
        });
        queryClient.invalidateQueries({ queryKey: ["settings-external-apps"] });
      } catch (e) {
        console.error("Failed to save group order:", e);
        setGroupOrder(currentGroups);
      }
    },
    [localApps, groupOrder, queryClient],
  );

  const filteredApps = apps.filter(
    (app) =>
      !searchQuery ||
      app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.url?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Get unique groups (ordered by groupOrder, then alphabetical for new ones)
  const groups = useMemo(() => {
    const set = new Set();
    apps.forEach((app) => {
      if (app.group) set.add(app.group);
    });
    const allGroups = Array.from(set);
    // Sort: groups in groupOrder first (by their order), then remaining alphabetically
    return allGroups.sort((a, b) => {
      const idxA = groupOrder.indexOf(a);
      const idxB = groupOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }, [apps, groupOrder]);

  // Group filtered apps
  const groupedApps = useMemo(() => {
    let appsToGroup = filteredApps;
    if (activeGroup !== "all") {
      appsToGroup = filteredApps.filter(
        (app) =>
          (app.group || "") ===
          (activeGroup === "ungrouped" ? "" : activeGroup),
      );
    }

    if (groups.length === 0) {
      return [{ name: null, apps: appsToGroup }];
    }

    const grouped = {};
    const ungrouped = [];

    appsToGroup.forEach((app) => {
      if (app.group) {
        if (!grouped[app.group]) grouped[app.group] = [];
        grouped[app.group].push(app);
      } else {
        ungrouped.push(app);
      }
    });

    const result = [];
    groups.forEach((group) => {
      if (grouped[group]) {
        result.push({ name: group, apps: grouped[group] });
      }
    });

    if (ungrouped.length > 0) {
      result.push({ name: null, apps: ungrouped });
    }

    return result;
  }, [filteredApps, groups, activeGroup]);

  const getIcon = (iconName) => {
    if (!iconName) return AppWindow;
    return iconMap[iconName.toLowerCase()] || AppWindow;
  };

  const totalFiltered = groupedApps.reduce((sum, g) => sum + g.apps.length, 0);

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Not Configured Banner */}
      {apps.length === 0 && !isFetching && (
        <Link
          to="/settings?tab=external_apps"
          className="block p-4 rounded-xl border shadow-lg bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg backdrop-blur-sm bg-yellow-500/10">
              <AppWindow className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-yellow-400">
                {t("externalApps.notConfigured")}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Search & Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          <input
            type="text"
            placeholder={t("externalApps.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme hover:border-theme-primary rounded-lg text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/settings?tab=external_apps"
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <Plus size={16} className="text-theme-primary" />
            <span className="text-xs sm:text-sm">External App</span>
          </Link>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={16}
              className={`text-theme-primary transition-transform duration-500 ${
                isFetching ? "animate-spin" : ""
              }`}
            />
            <span className="text-xs sm:text-sm">
              {isFetching
                ? t("common.refreshing", "Refreshing")
                : t("common.refresh", "Refresh")}
            </span>
          </button>
        </div>
      </div>

      {/* Group Filter Tabs */}
      {groups.length > 0 && (
        <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveGroup("all")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeGroup === "all"
                  ? "bg-theme-primary text-black shadow-md"
                  : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
              }`}
            >
              All
              <span
                className={`ml-2 text-xs ${
                  activeGroup === "all"
                    ? "text-black/70"
                    : "text-theme-text-muted"
                }`}
              >
                ({apps.length})
              </span>
            </button>
            {groups.map((group) => {
              const count = filteredApps.filter(
                (a) => a.group === group,
              ).length;
              const isActive = activeGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-theme-primary text-black shadow-md"
                      : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
                  }`}
                >
                  {group}
                  <span
                    className={`ml-2 text-xs ${
                      isActive ? "text-black/70" : "text-theme-text-muted"
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
            {filteredApps.some((a) => !a.group) && (
              <button
                onClick={() => setActiveGroup("ungrouped")}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeGroup === "ungrouped"
                    ? "bg-theme-primary text-black shadow-md"
                    : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
                }`}
              >
                Ungrouped
                <span
                  className={`ml-2 text-xs ${
                    activeGroup === "ungrouped"
                      ? "text-black/70"
                      : "text-theme-text-muted"
                  }`}
                >
                  ({filteredApps.filter((a) => !a.group).length})
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Apps Grid */}
      {apps.length === 0 ? (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <AppWindow className="w-16 h-16 mx-auto text-theme-text-muted/50 mb-4" />
          <h3 className="text-lg font-semibold text-theme-text mb-2">
            {t("externalApps.noApps")}
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            {t("externalApps.noAppsDesc")}
          </p>
        </div>
      ) : totalFiltered === 0 ? (
        <div className="bg-theme-card rounded-xl border border-theme shadow-lg p-12 text-center">
          <Search className="w-16 h-16 mx-auto text-theme-text-muted/50 mb-4" />
          <h3 className="text-lg font-semibold text-theme-text mb-2">
            {t("externalApps.noResults")}
          </h3>
          <p className="text-theme-text-muted max-w-md mx-auto">
            {t("externalApps.noResultsDesc")}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-6">
            {groupedApps.map((group, groupIdx) => {
              const namedGroups = groupedApps.filter((g) => g.name);
              const namedIdx = group.name
                ? namedGroups.findIndex((g) => g.name === group.name)
                : -1;
              return (
                <div key={group.name || "__ungrouped"}>
                  {/* Group Header */}
                  {group.name && (
                    <div className="flex items-center gap-2 mb-3">
                      <FolderOpen size={16} className="text-theme-primary" />
                      <h3 className="text-sm font-semibold text-theme-text uppercase tracking-wider">
                        {group.name}
                      </h3>
                      <span className="text-xs text-theme-text-muted">
                        ({group.apps.length})
                      </span>
                      {namedGroups.length > 1 && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => handleGroupMove(group.name, -1)}
                            disabled={namedIdx === 0}
                            className="p-0.5 rounded hover:bg-theme-hover text-theme-text-muted hover:text-theme-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
                            title="Move group up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleGroupMove(group.name, 1)}
                            disabled={namedIdx === namedGroups.length - 1}
                            className="p-0.5 rounded hover:bg-theme-hover text-theme-text-muted hover:text-theme-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
                            title="Move group down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="flex-1 border-t border-theme ml-2" />
                    </div>
                  )}
                  {!group.name && groups.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <AppWindow size={16} className="text-theme-text-muted" />
                      <h3 className="text-sm font-semibold text-theme-text-muted uppercase tracking-wider">
                        Ungrouped
                      </h3>
                      <span className="text-xs text-theme-text-muted">
                        ({group.apps.length})
                      </span>
                      <div className="flex-1 border-t border-theme ml-2" />
                    </div>
                  )}

                  {/* Apps Grid */}
                  <SortableContext
                    items={group.apps.map((a) => a.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                      {group.apps.map((app) => (
                        <SortableAppCard
                          key={app.id}
                          app={app}
                          getIcon={getIcon}
                          t={t}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}
