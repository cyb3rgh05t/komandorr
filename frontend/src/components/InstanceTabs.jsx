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
  icon: Icon = null,
}) {
  if (!instances || instances.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {instances.map((inst) => {
        const isActive = activeTab === inst.id;
        return (
          <button
            key={inst.id}
            onClick={() => setActiveTab(inst.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all whitespace-nowrap ${
              isActive
                ? "bg-theme-primary/15 border-theme-primary text-theme-primary"
                : "bg-theme-card border-theme text-theme-text-muted hover:text-theme-text hover:border-theme-primary"
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {inst.name || inst.id}
          </button>
        );
      })}
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
