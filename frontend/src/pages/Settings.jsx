import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Shield, AlertCircle, Server, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import {
  testPlexConnection,
  getPlexConfig,
  savePlexConfig,
} from "@/services/plexService";

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
  const [validating, setValidating] = useState(false);
  const [plexValid, setPlexValid] = useState(null);

  useEffect(() => {
    // Check auth status
    fetchAuthStatus();
    // Load Plex configuration
    loadPlexConfig();
  }, []);

  const loadPlexConfig = async () => {
    try {
      const data = await getPlexConfig();
      setPlexUrl(data.url || "");
      setPlexToken(data.token || "");
      if (data.url && data.token) {
        setPlexValid(true);
      }
    } catch (error) {
      console.error("Failed to load Plex config:", error);
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

  const handleSavePlexConfig = async () => {
    if (!plexUrl || !plexToken) {
      toast.error(t("plex.fillAllFields"));
      return;
    }

    if (plexValid !== true) {
      toast.error(t("plex.validateFirst"));
      return;
    }

    setLoading(true);
    try {
      await savePlexConfig(plexUrl, plexToken);
      toast.success(t("plex.configSaved"));
    } catch (error) {
      console.error("Failed to save Plex config:", error);
      toast.error(error.message || t("plex.configError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Authentication Settings */}
      <div className="bg-theme-card border border-theme rounded-lg p-4 sm:p-6 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-theme-text flex items-center gap-2">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary" />
          {t("auth.authSettings")}
        </h2>

        {/* Enable/Disable Auth */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-theme-hover border border-theme rounded-lg">
            <div>
              <h3 className="font-medium text-theme-text mb-1">
                {t("auth.enableAuth")}
              </h3>
              <p className="text-sm text-theme-muted">
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
          <div className="flex items-start gap-2 text-sm text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              {authEnabled
                ? "Disabling authentication will allow unrestricted access to your dashboard."
                : "Enable this for an additional security layer on top of Authelia/Traefik."}
            </p>
          </div>
        </div>

        {/* Change Credentials Form */}
        <form
          onSubmit={handleUpdateCredentials}
          className="space-y-4 pt-4 border-t border-theme"
        >
          <h3 className="font-medium text-theme-text text-lg">
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
              className="w-full px-4 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
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
              className="w-full px-4 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
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
              className="w-full px-4 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
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
              className="w-full px-4 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
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
      </div>

      {/* Plex Server Settings */}
      <div className="bg-theme-card border border-theme rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-theme-text flex items-center gap-2">
          <Server className="w-6 h-6 text-theme-primary" />
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
              }}
              className="w-full px-4 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
              placeholder="http://192.168.1.100:32400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              {t("plex.token")}
            </label>
            <input
              type="password"
              value={plexToken}
              onChange={(e) => {
                setPlexToken(e.target.value);
                setPlexValid(null);
              }}
              className="w-full px-4 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
              placeholder="XXXXXXXXXXXXXXXXXXXX"
            />
            <p className="mt-2 text-xs text-theme-muted">
              {t("plex.tokenHelp")}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleValidatePlex}
              disabled={validating || !plexUrl || !plexToken}
              className={`py-2 px-6 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                plexValid === true
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : plexValid === false
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-theme-hover hover:bg-theme-primary hover:text-white text-theme-text border border-theme"
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

            <button
              onClick={handleSavePlexConfig}
              disabled={loading || plexValid !== true}
              className="flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("plex.saving") : t("plex.save")}
            </button>
          </div>

          {plexValid === false && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{t("plex.validationFailedMessage")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
