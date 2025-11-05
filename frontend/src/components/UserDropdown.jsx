import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { User, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UserDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
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

  const handleLogout = () => {
    sessionStorage.removeItem("auth_credentials");
    window.location.reload();
  };

  const handleSettings = () => {
    setIsOpen(false);
    navigate("/settings");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        aria-label="User menu"
      >
        <User className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-theme-card border border-theme shadow-lg z-50">
            <div className="p-2">
              <button
                onClick={handleSettings}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-theme-text-muted hover:bg-theme-hover transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>{t("nav.settings")}</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-theme-text-muted hover:bg-theme-hover transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("auth.logout")}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
