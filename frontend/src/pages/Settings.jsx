import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { clearTimezoneCache } from "@/utils/dateUtils";
import CustomDropdown from "@/components/CustomDropdown";
import {
  Shield,
  AlertCircle,
  Server,
  CheckCircle,
  Settings as SettingsIcon,
  Globe,
  Key,
  Eye,
  EyeOff,
  ChevronDown,
  Save,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  testPlexConnection,
  getPlexConfig,
  savePlexConfig,
} from "@/services/plexService";
import { api } from "@/services/api";

export default function Settings() {
  const { t } = useTranslation();
  const toast = useToast();

  // Auth state
  const [authEnabled, setAuthEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Plex state
  const [plexUrl, setPlexUrl] = useState("");
  const [plexToken, setPlexToken] = useState("");
  const [plexServerName, setPlexServerName] = useState("Plex Server");
  const [validating, setValidating] = useState(false);
  const [plexValid, setPlexValid] = useState(null);

  // General settings state
  const [logLevel, setLogLevel] = useState("INFO");
  const [logEnableFile, setLogEnableFile] = useState(true);
  const [timezone, setTimezone] = useState("UTC");
  const [githubToken, setGithubToken] = useState("");
  const [tmdbApiKey, setTmdbApiKey] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Visibility state for sensitive fields
  const [showPlexToken, setShowPlexToken] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showTmdbKey, setShowTmdbKey] = useState(false);

  // Auto-save state
  const [pendingChanges, setPendingChanges] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  useEffect(() => {
    // Check auth status
    fetchAuthStatus();
    // Load general settings (includes Plex)
    loadSettings();
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (pendingChanges) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      const timer = setTimeout(() => {
        handleSaveSettings();
        setPendingChanges(false);
      }, 5000);
      setAutoSaveTimer(timer);
    }
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [
    pendingChanges,
    logLevel,
    logEnableFile,
    timezone,
    githubToken,
    tmdbApiKey,
    plexUrl,
    plexToken,
    plexServerName,
  ]);

  const loadSettings = async () => {
    try {
      const data = await api.get("/settings");
      setLogLevel(data.logging.level);
      setLogEnableFile(data.logging.enable_file);
      setTimezone(data.general.timezone);
      setGithubToken(data.api.github_token);
      setTmdbApiKey(data.api.tmdb_api_key);
      setPlexUrl(data.plex.server_url);
      setPlexToken(data.plex.server_token);
      setPlexServerName(data.plex.server_name);
      if (data.plex.server_url && data.plex.server_token) {
        setPlexValid(true);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

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

        // If enabling auth, clear session and reload to show login screen
        if (data.enabled) {
          sessionStorage.removeItem("auth_credentials");
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
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

  const handleValidatePlex = async () => {
    if (!plexUrl || !plexToken) {
      toast.error(t("plex.fillAllFields"));
      return;
    }

    setValidating(true);
    setPlexValid(null);

    try {
      const result = await testPlexConnection(plexUrl, plexToken);

      if (result.valid) {
        setPlexValid(true);
        // Update server name from validation result
        if (result.server_name) {
          setPlexServerName(result.server_name);
        }
        toast.success(t("plex.validationSuccess"));
      } else {
        setPlexValid(false);
        toast.error(result.message || t("plex.validationFailed"));
      }
    } catch (error) {
      console.error("Failed to validate Plex:", error);
      setPlexValid(false);
      toast.error(error.message || t("plex.validationError"));
    } finally {
      setValidating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      await api.post("/settings", {
        logging: {
          level: logLevel,
          enable_file: logEnableFile,
        },
        general: {
          timezone: timezone,
        },
        api: {
          github_token: githubToken,
          tmdb_api_key: tmdbApiKey,
        },
        plex: {
          server_url: plexUrl,
          server_token: plexToken,
          server_name: plexServerName,
        },
      });

      // Clear timezone cache so new timezone takes effect immediately
      clearTimezoneCache();

      toast.success(t("settings.settingsSaved"));
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(t("settings.saveError"));
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Save Settings Button - Top */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
            <Save className="w-5 h-5 text-theme-primary" />
            {t("settings.settings")}
          </h2>
          <p className="text-sm text-theme-muted mt-1">
            {pendingChanges
              ? "Auto-saving in 5 seconds..."
              : "Changes saved automatically"}
          </p>
        </div>
        <button
          onClick={() => {
            handleSaveSettings();
            setPendingChanges(false);
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
          }}
          disabled={settingsLoading}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
        >
          <Save className="text-theme-primary w-4 h-4" />
          {settingsLoading ? t("settings.saving") : t("settings.saveNow")}
        </button>
      </div>

      {/* Authentication Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Auth Toggle */}
        <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

          <div className="relative">
            <h2 className="text-xl sm:text-2xl font-bold text-theme-text flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-theme-primary/10 backdrop-blur-sm">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary" />
              </div>
              {t("auth.authSettings")}
            </h2>

            {/* Enable/Disable Auth */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-theme-hover/50 backdrop-blur-sm border border-theme rounded-lg hover:border-theme-primary/30 transition-colors">
                <div>
                  <h3 className="font-medium text-theme-text mb-1">
                    {t("auth.enableAuth")}
                  </h3>
                  <p className="text-sm text-theme-muted">
                    {authEnabled
                      ? t("auth.authEnabled")
                      : t("auth.authDisabled")}
                  </p>
                </div>
                <button
                  onClick={handleToggleAuth}
                  disabled={loading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    authEnabled ? "bg-green-500" : "bg-gray-600"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      authEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-start gap-2 text-sm text-orange-400 bg-orange-500/10 backdrop-blur-sm border border-orange-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  {authEnabled
                    ? "Disabling authentication will allow unrestricted access to your dashboard."
                    : "Enable this for an additional security layer on top of Authelia/Traefik."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Change Credentials Form */}
        {authEnabled && (
          <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

            <div className="relative">
              <h2 className="text-xl sm:text-2xl font-bold text-theme-text flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-theme-primary/10 backdrop-blur-sm">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary" />
                </div>
                {t("auth.changeCredentials")}
              </h2>

              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("auth.username")}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder={t("auth.enterPassword")}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme disabled:opacity-50 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? t("auth.updating") : t("auth.updateCredentials")}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* General Settings */}
        <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

          <div className="relative">
            <h2 className="text-xl sm:text-2xl font-bold text-theme-text flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-theme-primary/10 backdrop-blur-sm">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary" />
              </div>
              {t("settings.generalSettings")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("settings.timezone")}
                </label>
                <CustomDropdown
                  value={timezone}
                  onChange={(val) => {
                    setTimezone(val);
                    setPendingChanges(true);
                  }}
                  options={[
                    { value: "UTC", label: "UTC" },
                    {
                      value: "America/New_York",
                      label: "America/New_York (EST/EDT)",
                    },
                    {
                      value: "America/Chicago",
                      label: "America/Chicago (CST/CDT)",
                    },
                    {
                      value: "America/Denver",
                      label: "America/Denver (MST/MDT)",
                    },
                    {
                      value: "America/Los_Angeles",
                      label: "America/Los_Angeles (PST/PDT)",
                    },
                    {
                      value: "Europe/London",
                      label: "Europe/London (GMT/BST)",
                    },
                    { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
                    {
                      value: "Europe/Berlin",
                      label: "Europe/Berlin (CET/CEST)",
                    },
                    {
                      value: "Europe/Amsterdam",
                      label: "Europe/Amsterdam (CET/CEST)",
                    },
                    { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
                    { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
                    {
                      value: "Australia/Sydney",
                      label: "Australia/Sydney (AEST/AEDT)",
                    },
                  ]}
                />
                <p className="mt-2 text-xs text-theme-muted">
                  {t("settings.timezoneHelp")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("settings.logLevel")}
                </label>
                <CustomDropdown
                  value={logLevel}
                  onChange={(val) => {
                    setLogLevel(val);
                    setPendingChanges(true);
                  }}
                  options={[
                    { value: "DEBUG", label: "DEBUG" },
                    { value: "INFO", label: "INFO" },
                    { value: "WARNING", label: "WARNING" },
                    { value: "ERROR", label: "ERROR" },
                    { value: "CRITICAL", label: "CRITICAL" },
                  ]}
                />
                <p className="mt-2 text-xs text-theme-muted">
                  {t("settings.logLevelHelp")}
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-theme-hover/50 backdrop-blur-sm border border-theme rounded-lg hover:border-theme-primary/30 transition-colors">
                <div>
                  <h3 className="font-medium text-theme-text mb-1">
                    {t("settings.enableFileLogging")}
                  </h3>
                  <p className="text-sm text-theme-muted">
                    {t("settings.enableFileLoggingHelp")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setLogEnableFile(!logEnableFile);
                    setPendingChanges(true);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    logEnableFile ? "bg-green-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      logEnableFile ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plex Server Settings & API Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Plex Server Settings */}
        <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

          <div className="relative">
            <h2 className="text-xl sm:text-2xl font-bold text-theme-text flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-theme-primary/10 backdrop-blur-sm">
                <Server className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary" />
              </div>
              {t("plex.serverSettings")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("plex.serverUrl")}
                </label>
                <input
                  type="url"
                  value={plexUrl}
                  onChange={(e) => {
                    setPlexUrl(e.target.value);
                    setPlexValid(null);
                    setPendingChanges(true);
                  }}
                  className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                  placeholder="http://192.168.1.100:32400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("plex.token")}
                </label>
                <div className="relative">
                  <input
                    type={showPlexToken ? "text" : "password"}
                    value={plexToken}
                    onChange={(e) => {
                      setPlexToken(e.target.value);
                      setPlexValid(null);
                      setPendingChanges(true);
                    }}
                    className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder="XXXXXXXXXXXXXXXXXXXX"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPlexToken(!showPlexToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    {showPlexToken ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-theme-muted">
                  {t("plex.tokenHelp")}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleValidatePlex}
                  disabled={validating || !plexUrl || !plexToken}
                  className={`py-2 px-6 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
                    plexValid === true
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : plexValid === false
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-theme-hover/50 backdrop-blur-sm hover:bg-theme-primary hover:text-white text-theme-text border border-theme"
                  }`}
                >
                  {validating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {t("plex.validating")}
                    </span>
                  ) : plexValid === true ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle size={16} />
                      {t("plex.validated")}
                    </span>
                  ) : (
                    t("plex.validate")
                  )}
                </button>
              </div>

              {plexValid === false && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{t("plex.validationFailedMessage")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300\" />

          <div className="relative">
            <h2 className="text-xl sm:text-2xl font-bold text-theme-text flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-theme-primary/10 backdrop-blur-sm">
                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary" />
              </div>
              {t("settings.apiConfiguration")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("settings.githubToken")}
                </label>
                <div className="relative">
                  <input
                    type={showGithubToken ? "text" : "password"}
                    value={githubToken}
                    onChange={(e) => {
                      setGithubToken(e.target.value);
                      setPendingChanges(true);
                    }}
                    className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    {showGithubToken ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-theme-muted">
                  {t("settings.githubTokenHelp")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">
                  {t("settings.tmdbApiKey")}
                </label>
                <div className="relative">
                  <input
                    type={showTmdbKey ? "text" : "password"}
                    value={tmdbApiKey}
                    onChange={(e) => {
                      setTmdbApiKey(e.target.value);
                      setPendingChanges(true);
                    }}
                    className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTmdbKey(!showTmdbKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    {showTmdbKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-theme-muted">
                  {t("settings.tmdbApiKeyHelp")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
