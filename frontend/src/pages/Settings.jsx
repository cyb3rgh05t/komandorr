import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { Palette, Globe, Shield, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, themes } = useTheme();
  const toast = useToast();

  // Auth state
  const [authEnabled, setAuthEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Check auth status
    fetchAuthStatus();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      const credentials = sessionStorage.getItem("auth_credentials");
      const response = await fetch("/api/auth/status", {
        headers: credentials ? { Authorization: `Basic ${credentials}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setAuthEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Failed to fetch auth status:", error);
    }
  };

  const handleToggleAuth = async () => {
    setLoading(true);
    try {
      const credentials = sessionStorage.getItem("auth_credentials");
      const response = await fetch("/api/auth/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(credentials && { Authorization: `Basic ${credentials}` }),
        },
        body: JSON.stringify({ enabled: !authEnabled }),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthEnabled(data.enabled);
        toast.success(
          data.enabled ? t("auth.authEnabled") : t("auth.authDisabled")
        );

        // Don't redirect when enabling auth, only when credentials change
      } else {
        toast.error(t("auth.updateError"));
      }
    } catch (error) {
      console.error("Failed to toggle auth:", error);
      toast.error(t("auth.updateError"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const credentials = sessionStorage.getItem("auth_credentials");
      const response = await fetch("/api/auth/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(credentials && { Authorization: `Basic ${credentials}` }),
        },
        body: JSON.stringify({
          username: username,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        toast.success(t("auth.credentialsUpdated"));
        setUsername("");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Redirect to login with new credentials
        setTimeout(() => {
          sessionStorage.removeItem("auth_credentials");
          window.location.reload();
        }, 1500);
      } else {
        toast.error(t("auth.updateError"));
      }
    } catch (error) {
      console.error("Failed to update credentials:", error);
      toast.error(t("auth.updateError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-theme-text">
          {t("settings.title")}
        </h1>
        <p className="text-theme-text-muted mt-1">
          Customize your dashboard experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme Settings */}
        <div className="bg-theme-card border border-theme rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="text-theme-primary" size={24} />
            <h2 className="text-xl font-semibold text-theme-text">
              {t("settings.theme")}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {themes.map((themeName) => (
              <button
                key={themeName}
                onClick={() => setTheme(themeName)}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${
                    theme === themeName
                      ? "border-theme-primary bg-theme-primary/10"
                      : "border-theme hover:border-theme-primary/50"
                  }
                `}
              >
                <div className="text-sm font-medium text-theme-text text-center">
                  {t(`settings.themes.${themeName}`)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-theme-card border border-theme rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-theme-primary" size={24} />
            <h2 className="text-xl font-semibold text-theme-text">
              {t("settings.language")}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => i18n.changeLanguage("en")}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${
                  i18n.language === "en"
                    ? "border-theme-primary bg-theme-primary/10"
                    : "border-theme hover:border-theme-primary/50"
                }
              `}
            >
              <div className="text-sm font-medium text-theme-text text-center">
                {t("settings.languages.en")}
              </div>
            </button>
            <button
              onClick={() => i18n.changeLanguage("de")}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${
                  i18n.language === "de"
                    ? "border-theme-primary bg-theme-primary/10"
                    : "border-theme hover:border-theme-primary/50"
                }
              `}
            >
              <div className="text-sm font-medium text-theme-text text-center">
                {t("settings.languages.de")}
              </div>
            </button>
          </div>
        </div>

        {/* Authentication Settings */}
        <div className="bg-theme-card border border-theme rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-theme-primary" size={24} />
            <h2 className="text-xl font-semibold text-theme-text">
              {t("auth.authSettings")}
            </h2>
          </div>

          {/* Enable/Disable Auth */}
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-theme-bg rounded-lg border border-theme">
              <div>
                <h3 className="font-medium text-theme-text mb-1">
                  {t("auth.enableAuth")}
                </h3>
                <p className="text-sm text-theme-text-muted">
                  {authEnabled ? t("auth.authEnabled") : t("auth.authDisabled")}
                </p>
              </div>
              <button
                onClick={handleToggleAuth}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  authEnabled ? "bg-theme-primary" : "bg-gray-600"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    authEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {authEnabled && (
              <div className="mt-2 flex items-start gap-2 text-sm text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  Disabling authentication will allow unrestricted access to
                  your dashboard.
                </p>
              </div>
            )}
          </div>

          {/* Change Credentials Form */}
          {authEnabled && (
            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              <h3 className="font-medium text-theme-text mb-3">
                {t("auth.changeCredentials")}
              </h3>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("auth.username")}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-theme-bg border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  placeholder={t("auth.enterUsername")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("auth.currentPassword")}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-theme-bg border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  placeholder={t("auth.enterPassword")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("auth.newPassword")}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-theme-bg border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  placeholder={t("auth.enterPassword")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("auth.confirmPassword")}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-theme-bg border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  placeholder={t("auth.enterPassword")}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {loading ? t("auth.updating") : t("auth.updateCredentials")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
