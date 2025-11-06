import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const themes = [
  "dark",
  "plex",
  "jellyfin",
  "emby",
  "mind",
  "power",
  "reality",
  "soul",
  "space",
  "time",
  "seerr",
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "plex";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const value = {
    theme,
    setTheme,
    themes,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
