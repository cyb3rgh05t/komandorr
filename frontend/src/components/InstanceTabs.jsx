import { useState, useEffect } from "react";

/**
 * Reusable tabbed instance selector — mimics the NFS Mount Manager pattern.
 *
 * Props:
 *  - instances: Array<{ id, name, connected? }>
 *  - activeTab / setActiveTab (controlled) — the selected instance id
 *
 * Renders nothing when there is 0 or 1 instance.
 */
export default function InstanceTabs({
  instances = [],
  activeTab,
  setActiveTab,
}) {
  if (!instances || instances.length <= 1) return null;

  return (
    <div className="bg-theme-card border border-theme rounded-lg p-2 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {instances.map((inst) => {
          const isActive = activeTab === inst.id;
          return (
            <button
              key={inst.id}
              onClick={() => setActiveTab(inst.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-theme-primary text-black shadow-md"
                  : "bg-theme-hover/50 text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
              }`}
            >
              {inst.name}
              {typeof inst.connected === "boolean" && (
                <span className="ml-2 text-xs">
                  {inst.connected ? (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-black/20 text-black border border-black/30"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      Connected
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-black/20 text-black border border-black/30"
                          : "bg-red-500/15 text-red-400 border border-red-500/30"
                      }`}
                    >
                      Offline
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook that manages instance tab state.
 * Returns [effectiveTab, setActiveTab, instances] where effectiveTab
 * is always a valid instance id (or null).
 */
export function useInstanceTabs(instancesData) {
  const [activeTab, setActiveTab] = useState(null);
  const instances = instancesData?.instances || [];

  // Auto-select first instance if current selection is invalid
  const effectiveTab =
    activeTab && instances.find((i) => i.id === activeTab)
      ? activeTab
      : instances.length > 0
        ? instances[0].id
        : null;

  return { effectiveTab, setActiveTab, instances };
}
