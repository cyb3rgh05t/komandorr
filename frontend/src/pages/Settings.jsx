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
  Upload,
  Film,
  Plus,
  Trash2,
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
  const [showOverseerrKey, setShowOverseerrKey] = useState(false);

  // Overseerr settings state
  const [overseerrUrl, setOverseerrUrl] = useState("");
  const [overseerrApiKey, setOverseerrApiKey] = useState("");
  const [defaultEmailDomain, setDefaultEmailDomain] = useState("");
  const [validatingOverseerr, setValidatingOverseerr] = useState(false);
  const [overseerrValid, setOverseerrValid] = useState(null);

  // Uploader settings state
  const [uploaderUrl, setUploaderUrl] = useState("");
  const [uploaderTestStatus, setUploaderTestStatus] = useState(null);

  // *arr instances state
  const [arrInstances, setArrInstances] = useState([]);
  const [showAddArr, setShowAddArr] = useState(false);
  const [newArrName, setNewArrName] = useState("");
  const [newArrType, setNewArrType] = useState("sonarr");
  const [newArrUrl, setNewArrUrl] = useState("");
  const [newArrApiKey, setNewArrApiKey] = useState("");
  const [showArrKeys, setShowArrKeys] = useState({});
  const [arrTestStatus, setArrTestStatus] = useState({});

  // Unsaved changes state
  const [pendingChanges, setPendingChanges] = useState(false);

  useEffect(() => {
    // Check auth status
    fetchAuthStatus();
    // Load general settings (includes Plex)
    loadSettings();
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [pendingChanges]);

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
      if (data.overseerr) {
        setOverseerrUrl(data.overseerr.url || "");
        setOverseerrApiKey(data.overseerr.api_key || "");
        setDefaultEmailDomain(data.overseerr.email_domain || "");
      }
      if (data.uploader) {
        setUploaderUrl(data.uploader.base_url || "");
      }
      if (data.arr || data.instances) {
        setArrInstances(
          (data.arr && data.arr.instances) || data.instances || []
        );
      }

      // Auto-validate connections if configured
      if (data.plex.server_url && data.plex.server_token) {
        validatePlexOnLoad(data.plex.server_url, data.plex.server_token);
      }
      if (data.overseerr?.url && data.overseerr?.api_key) {
        validateOverseerrOnLoad();
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const validatePlexOnLoad = async (url, token) => {
    try {
      const result = await testPlexConnection(url, token);
      if (result.valid) {
        setPlexValid(true);
        if (result.server_name) {
          setPlexServerName(result.server_name);
        }
      } else {
        setPlexValid(false);
      }
    } catch (error) {
      setPlexValid(false);
    }
  };

  const validateOverseerrOnLoad = async () => {
    try {
      const result = await api.get("/overseerr/status");
      if (result.configured && result.reachable) {
        setOverseerrValid(true);
      } else {
        setOverseerrValid(false);
      }
    } catch (error) {
      setOverseerrValid(false);
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

  const handleValidateOverseerr = async () => {
    if (!overseerrUrl || !overseerrApiKey) {
      toast.error(
        t("settings.overseerrFillAllFields") || "Please fill in URL and API Key"
      );
      return;
    }

    setValidatingOverseerr(true);
    setOverseerrValid(null);

    try {
      const result = await api.get("/overseerr/status");

      if (result.configured && result.reachable) {
        setOverseerrValid(true);
        toast.success(
          t("settings.overseerrValidationSuccess") ||
            "Overseerr connection successful"
        );
      } else {
        setOverseerrValid(false);
        toast.error(
          result.message ||
            t("settings.overseerrValidationFailed") ||
            "Cannot connect to Overseerr"
        );
      }
    } catch (error) {
      console.error("Failed to validate Overseerr:", error);
      setOverseerrValid(false);
      toast.error(
        error.message ||
          t("settings.overseerrValidationError") ||
          "Failed to test connection"
      );
    } finally {
      setValidatingOverseerr(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      // Prepare *arr instances payload, including pending new instance (if filled)
      let instancesPayload = arrInstances;
      const hasPendingNew = newArrName && newArrUrl && newArrApiKey;
      if (hasPendingNew) {
        const pendingId = `${newArrType}-${newArrName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
        instancesPayload = [
          ...arrInstances,
          {
            id: pendingId,
            name: newArrName,
            type: newArrType,
            url: newArrUrl,
            api_key: newArrApiKey,
          },
        ];
      }

      const payload = {
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
        overseerr: {
          url: overseerrUrl,
          api_key: overseerrApiKey,
          email_domain: defaultEmailDomain,
        },
        uploader: {
          base_url: uploaderUrl || "",
        },
        arr: {
          instances: instancesPayload || [],
        },
      };

      console.log("Saving settings payload:", payload);
      const result = await api.post("/settings", payload);
      console.log("Settings saved successfully, response:", result);

      // Clear timezone cache so new timezone takes effect immediately
      clearTimezoneCache();

      toast.success(t("settings.settingsSaved"));

      // If we auto-included a pending new instance, clear the add form
      if (hasPendingNew) {
        setNewArrName("");
        setNewArrUrl("");
        setNewArrApiKey("");
        setNewArrType("sonarr");
        setShowAddArr(false);
      }
      // Reload settings from backend to reflect persisted config/migrations
      console.log("Reloading settings from backend...");
      await loadSettings();
      console.log("Settings reloaded successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(t("settings.saveError"));
    } finally {
      setSettingsLoading(false);
    }
  };

  // *arr instance helpers
  const updateArrInstanceField = (index, field, value) => {
    setArrInstances((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setPendingChanges(true);
  };

  const removeArrInstance = (index) => {
    setArrInstances((prev) => prev.filter((_, i) => i !== index));
    setPendingChanges(true);
  };

  const addArrInstance = () => {
    if (!newArrName || !newArrUrl || !newArrApiKey) return;
    const id = `${newArrType}-${newArrName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const instance = {
      id,
      name: newArrName,
      type: newArrType,
      url: newArrUrl,
      api_key: newArrApiKey,
    };
    setArrInstances((prev) => [...prev, instance]);
    setNewArrName("");
    setNewArrUrl("");
    setNewArrApiKey("");
    setNewArrType("sonarr");
    setShowAddArr(false);
    setPendingChanges(true);
  };

  const toggleShowInstanceKey = (id) => {
    setShowArrKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const testArrInstance = async (inst) => {
    if (!inst?.id) return;
    if (!inst.url || !inst.api_key) {
      toast.error(`Please enter URL and API key for ${inst.name}`);
      return;
    }
    setArrTestStatus((prev) => ({ ...prev, [inst.id]: "loading" }));
    console.log(`Testing ${inst.name} connection...`, {
      url: inst.url,
      type: inst.type,
    });
    try {
      const status = await api.get("/arr-activity/system/status");
      const entry = status?.[inst.id];
      const ok =
        entry &&
        entry.status &&
        !entry.status.error &&
        (entry.status.version || entry.status.buildTime || entry.status.branch);
      if (ok) {
        console.log(`${inst.name} connection successful`, entry.status);
        toast.success(`${inst.name} connection successful`);
      } else {
        console.error(`${inst.name} connection failed:`, entry);
        toast.error(`Cannot connect to ${inst.name}`);
      }
      setArrTestStatus((prev) => ({ ...prev, [inst.id]: ok ? "ok" : "fail" }));
    } catch (e) {
      console.error(`${inst.name} connection error:`, e);
      toast.error(e.message || `Cannot connect to ${inst.name}`);
      setArrTestStatus((prev) => ({ ...prev, [inst.id]: "fail" }));
    }
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Save Settings Button - Top */}
      <div className="flex flex-col items-end">
        <button
          onClick={() => {
            handleSaveSettings();
            setPendingChanges(false);
          }}
          disabled={settingsLoading || !pendingChanges}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          <Save className="text-theme-primary w-4 h-4" />
          {settingsLoading ? t("settings.saving") : t("settings.saveNow")}
        </button>
        {pendingChanges && (
          <p className="text-sm text-orange-500 mt-2 font-medium">
            ⚠️ {t("settings.unsavedChanges", "You have unsaved changes")}
          </p>
        )}
      </div>

      {/* Authentication Settings */}
      <div className="space-y-6">
        {/* Auth Toggle */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                {t("auth.authSettings")}
              </h3>
            </div>
          </div>
          <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

            <div className="relative">
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
        </div>

        {/* Change Credentials Form */}
        {authEnabled && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-text">
                  {t("auth.changeCredentials")}
                </h3>
              </div>
            </div>
            <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

              <div className="relative">
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
          </div>
        )}

        {/* General Settings */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                {t("settings.generalSettings")}
              </h3>
            </div>
          </div>
          <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

            <div className="relative">
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
                      {
                        value: "Europe/Paris",
                        label: "Europe/Paris (CET/CEST)",
                      },
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

        {/* Plex Server Settings */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                {t("plex.serverSettings")}
              </h3>
            </div>
          </div>
          <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

            <div className="relative">
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
        </div>

        {/* API Configuration */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                {t("settings.apiConfiguration")}
              </h3>
            </div>
          </div>
          <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

            <div className="relative">
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

        {/* Overseerr Configuration */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                {t("settings.overseerrSettings") || "Overseerr Configuration"}
              </h3>
            </div>
          </div>
          <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

            <div className="relative">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("settings.overseerrUrl") || "Overseerr API URL"}
                  </label>
                  <input
                    type="text"
                    value={overseerrUrl}
                    onChange={(e) => {
                      setOverseerrUrl(e.target.value);
                      setOverseerrValid(null);
                      setPendingChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder="https://overseerr.example.com/api/v1/user"
                  />
                  <p className="mt-2 text-xs text-theme-muted">
                    {t("settings.overseerrUrlHelp") ||
                      "Full API endpoint URL for creating users"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("settings.overseerrApiKey") || "Overseerr API Key"}
                  </label>
                  <div className="relative">
                    <input
                      type={showOverseerrKey ? "text" : "password"}
                      value={overseerrApiKey}
                      onChange={(e) => {
                        setOverseerrApiKey(e.target.value);
                        setOverseerrValid(null);
                        setPendingChanges(true);
                      }}
                      className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOverseerrKey(!showOverseerrKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
                    >
                      {showOverseerrKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-theme-muted">
                    {t("settings.overseerrApiKeyHelp") ||
                      "API key from Overseerr settings"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("settings.defaultEmailDomain") || "Default Email Domain"}
                  </label>
                  <input
                    type="text"
                    value={defaultEmailDomain}
                    onChange={(e) => {
                      setDefaultEmailDomain(e.target.value);
                      setPendingChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder="example.com"
                  />
                  <p className="mt-2 text-xs text-theme-muted">
                    {t("settings.defaultEmailDomainHelp") ||
                      "Default domain for user emails (username@domain.com)"}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleValidateOverseerr}
                    disabled={
                      validatingOverseerr || !overseerrUrl || !overseerrApiKey
                    }
                    className={`py-2 px-6 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
                      overseerrValid === true
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : overseerrValid === false
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-theme-hover/50 backdrop-blur-sm hover:bg-theme-primary hover:text-white text-theme-text border border-theme"
                    }`}
                  >
                    {validatingOverseerr ? (
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
                        {t("settings.overseerrValidating") || "Testing..."}
                      </span>
                    ) : overseerrValid === true ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle size={16} />
                        {t("settings.overseerrValidated") || "Connected"}
                      </span>
                    ) : (
                      t("settings.overseerrValidate") || "Test Connection"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Uploader Settings */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                {t("uploader.settings", { defaultValue: "Uploader Settings" })}
              </h3>
            </div>
          </div>
          <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

            <div className="relative">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("uploader.baseUrl", {
                      defaultValue: "Uploader Base URL",
                    })}
                  </label>
                  <input
                    type="url"
                    value={uploaderUrl}
                    onChange={(e) => {
                      setUploaderUrl(e.target.value);
                      setUploaderTestStatus(null);
                      setPendingChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder="http://uploader:8080"
                  />
                  <p className="mt-2 text-xs text-theme-muted">
                    {t("uploader.baseUrlHelp", {
                      defaultValue:
                        "Set the URL of your Uploader service (container or external).",
                    })}
                  </p>
                  <div className="flex gap-3 mt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!uploaderUrl) {
                          toast.error("Please enter Uploader URL");
                          return;
                        }
                        setUploaderTestStatus("loading");
                        console.log("Testing Uploader connection...", {
                          url: uploaderUrl,
                        });
                        try {
                          const result = await api.get("/uploader/status");
                          console.log("Uploader connection successful", result);
                          setUploaderTestStatus("ok");
                          toast.success("Uploader connection successful");
                        } catch (e) {
                          console.error("Uploader connection failed:", e);
                          setUploaderTestStatus("fail");
                          toast.error(
                            e.message || "Cannot connect to Uploader"
                          );
                        }
                      }}
                      disabled={
                        uploaderTestStatus === "loading" || !uploaderUrl
                      }
                      className={`py-2 px-6 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
                        uploaderTestStatus === "ok"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : uploaderTestStatus === "fail"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-theme-hover/50 backdrop-blur-sm hover:bg-theme-primary hover:text-white text-theme-text border border-theme"
                      }`}
                    >
                      {uploaderTestStatus === "loading" ? (
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
                          {t("uploader.testing", {
                            defaultValue: "Testing...",
                          })}
                        </span>
                      ) : uploaderTestStatus === "ok" ? (
                        <span className="flex items-center justify-center gap-2">
                          <CheckCircle size={16} />
                          {t("uploader.connectionOk", {
                            defaultValue: "Connected",
                          })}
                        </span>
                      ) : (
                        t("uploader.testConnection", {
                          defaultValue: "Test Connection",
                        })
                      )}
                    </button>
                  </div>

                  {uploaderTestStatus === "fail" && (
                    <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-3 mt-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>
                        Cannot connect to Uploader. Check the URL is correct and
                        the service is running.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sonarr/Radarr Instances */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                {t("arr.instancesTitle", {
                  defaultValue: "Sonarr/Radarr Instances",
                })}
              </h3>
              <p className="text-sm text-theme-muted">
                {t("arr.instancesSubtitle", {
                  defaultValue:
                    "Configure multiple Sonarr and Radarr instances (e.g., 1080p and 4K).",
                })}
              </p>
            </div>
          </div>
          <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

            <div className="relative space-y-6">
              {/* Existing instances */}
              {arrInstances.length === 0 ? (
                <div className="text-sm text-theme-muted">
                  {t("arr.noInstances", {
                    defaultValue: "No instances configured yet.",
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {arrInstances.map((inst, idx) => (
                    <div
                      key={inst.id || idx}
                      className="p-4 bg-theme-hover/50 border border-theme rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs rounded bg-theme-hover border border-theme text-theme-text">
                            {inst.type?.toUpperCase()}
                          </span>
                          <span className="text-sm text-theme-text font-medium">
                            {inst.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeArrInstance(idx)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title={t("arr.remove", { defaultValue: "Remove" })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-theme-text mb-2">
                            {t("arr.instanceName", {
                              defaultValue: "Instance Name",
                            })}
                          </label>
                          <input
                            type="text"
                            value={inst.name || ""}
                            onChange={(e) =>
                              updateArrInstanceField(
                                idx,
                                "name",
                                e.target.value
                              )
                            }
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                            placeholder="Sonarr 4K"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-theme-text mb-2">
                            {t("arr.instanceType", { defaultValue: "Type" })}
                          </label>
                          <select
                            value={inst.type || "sonarr"}
                            onChange={(e) =>
                              updateArrInstanceField(
                                idx,
                                "type",
                                e.target.value
                              )
                            }
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                          >
                            <option value="sonarr">Sonarr</option>
                            <option value="radarr">Radarr</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-theme-text mb-2">
                            {t("arr.instanceUrl", { defaultValue: "Base URL" })}
                          </label>
                          <input
                            type="url"
                            value={inst.url || ""}
                            onChange={(e) =>
                              updateArrInstanceField(idx, "url", e.target.value)
                            }
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                            placeholder="http://localhost:8989"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-theme-text mb-2">
                            {t("arr.instanceApiKey", {
                              defaultValue: "API Key",
                            })}
                          </label>
                          <div className="relative">
                            <input
                              type={showArrKeys[inst.id] ? "text" : "password"}
                              value={inst.api_key || ""}
                              onChange={(e) =>
                                updateArrInstanceField(
                                  idx,
                                  "api_key",
                                  e.target.value
                                )
                              }
                              className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                              placeholder="XXXXXXXXXXXXXXXXXXXX"
                            />
                            <button
                              type="button"
                              onClick={() => toggleShowInstanceKey(inst.id)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
                            >
                              {showArrKeys[inst.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <div className="flex gap-3 mt-3">
                            <button
                              type="button"
                              onClick={() => testArrInstance(inst)}
                              disabled={
                                arrTestStatus[inst.id] === "loading" ||
                                !inst.url ||
                                !inst.api_key
                              }
                              className={`py-2 px-6 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
                                arrTestStatus[inst.id] === "ok"
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : arrTestStatus[inst.id] === "fail"
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "bg-theme-hover/50 backdrop-blur-sm hover:bg-theme-primary hover:text-white text-theme-text border border-theme"
                              }`}
                            >
                              {arrTestStatus[inst.id] === "loading" ? (
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
                                  {t("arr.testing", {
                                    defaultValue: "Testing...",
                                  })}
                                </span>
                              ) : arrTestStatus[inst.id] === "ok" ? (
                                <span className="flex items-center justify-center gap-2">
                                  <CheckCircle size={16} />
                                  {t("arr.connectionOk", {
                                    defaultValue: "Connected",
                                  })}
                                </span>
                              ) : (
                                t("arr.testConnection", {
                                  defaultValue: "Test Connection",
                                })
                              )}
                            </button>
                          </div>
                          {arrTestStatus[inst.id] === "fail" && (
                            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-3 mt-3">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <p>
                                Cannot connect to {inst.name}. Check the URL and
                                API key are correct.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new instance */}
              <div className="pt-2">
                {!showAddArr ? (
                  <button
                    type="button"
                    onClick={() => setShowAddArr(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-theme-hover border border-theme rounded-lg text-sm text-theme-text hover:border-theme-primary/50 hover:bg-theme-primary/10 transition-all"
                  >
                    <Plus className="w-4 h-4 text-theme-primary" />
                    {t("arr.addInstance", { defaultValue: "Add Instance" })}
                  </button>
                ) : (
                  <div className="p-4 bg-theme-hover/50 border border-theme rounded-lg space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-theme-text mb-2">
                          {t("arr.instanceName", {
                            defaultValue: "Instance Name",
                          })}
                        </label>
                        <input
                          type="text"
                          value={newArrName}
                          onChange={(e) => setNewArrName(e.target.value)}
                          className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                          placeholder="Radarr 4K"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-theme-text mb-2">
                          {t("arr.instanceType", { defaultValue: "Type" })}
                        </label>
                        <select
                          value={newArrType}
                          onChange={(e) => setNewArrType(e.target.value)}
                          className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                        >
                          <option value="sonarr">Sonarr</option>
                          <option value="radarr">Radarr</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-theme-text mb-2">
                          {t("arr.instanceUrl", { defaultValue: "Base URL" })}
                        </label>
                        <input
                          type="url"
                          value={newArrUrl}
                          onChange={(e) => setNewArrUrl(e.target.value)}
                          className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                          placeholder="http://localhost:7878"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-theme-text mb-2">
                          {t("arr.instanceApiKey", { defaultValue: "API Key" })}
                        </label>
                        <input
                          type="text"
                          value={newArrApiKey}
                          onChange={(e) => setNewArrApiKey(e.target.value)}
                          className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                          placeholder="XXXXXXXXXXXXXXXXXXXX"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={addArrInstance}
                        className="px-3 py-2 bg-theme-primary text-white rounded-lg text-sm hover:bg-theme-primary/90 transition-colors"
                      >
                        {t("arr.add", { defaultValue: "Add" })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddArr(false)}
                        className="px-3 py-2 bg-theme-hover border border-theme rounded-lg text-sm text-theme-text"
                      >
                        {t("arr.cancel", { defaultValue: "Cancel" })}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
