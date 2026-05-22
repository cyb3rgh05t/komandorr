import React from "react";
import { Link } from "react-router-dom";

/**
 * Unified status / summary card used across all pages.
 *
 * Layout: [label + value] on the left, big icon on the right.
 *  - p-4, rounded-lg, border, hover:shadow-md
 *  - label: text-xs uppercase tracking-wider text-theme-text-muted (with small icon)
 *  - value: text-2xl font-bold in the color variant
 *  - icon: w-8 h-8 in the color variant
 *
 * Props:
 *  - label, value      content
 *  - icon              lucide-react icon component
 *  - color             one of STAT_COLORS keys (default "theme-primary")
 *  - valueClass        override the value text color (otherwise color variant)
 *  - to                if set → renders a <Link> wrapper
 *  - onClick           if set (and no `to`) → renders a <button>
 *  - active            adds a colored ring to indicate the card represents the current view
 *  - className         extra classes appended to the wrapper
 */

const STAT_COLORS = {
  "theme-primary": {
    text: "text-theme-primary",
    hover: "hover:border-theme-primary/50 hover:bg-theme-primary/10",
    ring: "border-theme-primary/60 ring-1 ring-theme-primary/40",
  },
  "emerald-500": {
    text: "text-emerald-500",
    hover: "hover:border-emerald-500/50 hover:bg-emerald-500/10",
    ring: "border-emerald-500/60 ring-1 ring-emerald-500/40",
  },
  "emerald-400": {
    text: "text-emerald-400",
    hover: "hover:border-emerald-400/50 hover:bg-emerald-400/10",
    ring: "border-emerald-400/60 ring-1 ring-emerald-400/40",
  },
  "blue-500": {
    text: "text-blue-500",
    hover: "hover:border-blue-500/50 hover:bg-blue-500/10",
    ring: "border-blue-500/60 ring-1 ring-blue-500/40",
  },
  "cyan-400": {
    text: "text-cyan-400",
    hover: "hover:border-cyan-400/50 hover:bg-cyan-400/10",
    ring: "border-cyan-400/60 ring-1 ring-cyan-400/40",
  },
  "purple-500": {
    text: "text-purple-500",
    hover: "hover:border-purple-500/50 hover:bg-purple-500/10",
    ring: "border-purple-500/60 ring-1 ring-purple-500/40",
  },
  "purple-400": {
    text: "text-purple-400",
    hover: "hover:border-purple-400/50 hover:bg-purple-400/10",
    ring: "border-purple-400/60 ring-1 ring-purple-400/40",
  },
  "amber-500": {
    text: "text-amber-500",
    hover: "hover:border-amber-500/50 hover:bg-amber-500/10",
    ring: "border-amber-500/60 ring-1 ring-amber-500/40",
  },
  "amber-400": {
    text: "text-amber-400",
    hover: "hover:border-amber-400/50 hover:bg-amber-400/10",
    ring: "border-amber-400/60 ring-1 ring-amber-400/40",
  },
  "green-500": {
    text: "text-green-500",
    hover: "hover:border-green-500/50 hover:bg-green-500/10",
    ring: "border-green-500/60 ring-1 ring-green-500/40",
  },
  "orange-500": {
    text: "text-orange-500",
    hover: "hover:border-orange-500/50 hover:bg-orange-500/10",
    ring: "border-orange-500/60 ring-1 ring-orange-500/40",
  },
  "red-500": {
    text: "text-red-500",
    hover: "hover:border-red-500/50 hover:bg-red-500/10",
    ring: "border-red-500/60 ring-1 ring-red-500/40",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  color = "theme-primary",
  valueClass,
  to,
  onClick,
  active = false,
  className = "",
}) {
  const c = STAT_COLORS[color] || STAT_COLORS["theme-primary"];
  const base = `bg-theme-card border rounded-lg p-4 transition-all hover:shadow-md ${c.hover} ${
    active ? c.ring : "border-theme"
  } ${className}`;

  const inner = (
    <div className="flex items-center justify-between gap-3 text-left">
      <div className="space-y-1 min-w-0">
        <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
          {Icon ? <Icon className={`w-3 h-3 ${c.text}`} /> : null}
          <span className="truncate">{label}</span>
        </p>
        <p className={`text-2xl font-bold ${valueClass || c.text} truncate`}>
          {value}
        </p>
      </div>
      {Icon ? <Icon className={`w-8 h-8 ${c.text} shrink-0`} /> : null}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={`block ${base}`}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`block w-full ${base}`}
      >
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

export default StatCard;
export { STAT_COLORS };
