import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import { Palette, Check } from "lucide-react";

const themeColors = {
  dark: "#7a7a7a",
  plex: "#e5a00d",
  jellyfin: "#aa5cc3",
  emby: "#52b54b",
  seerr: "#5a67d8",
  mind: "#ffd700",
  power: "#9b30ff",
  reality: "#ff0000",
  soul: "#ffa500",
  space: "#0000ff",
  time: "#00ff00",
};

export default function ThemeDropdown() {
  const { t } = useTranslation();
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        aria-label="Select theme"
      >
        <Palette className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-theme-card border border-theme shadow-lg z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
                {t("settings.theme")}
              </div>
              {themes.map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => {
                    setTheme(themeName);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                    theme === themeName
                      ? "bg-theme-primary text-white"
                      : "text-theme-text-muted hover:bg-theme-hover"
                  }`}
                >
                  <span>{t(`settings.themes.${themeName}`)}</span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: themeColors[themeName] }}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
