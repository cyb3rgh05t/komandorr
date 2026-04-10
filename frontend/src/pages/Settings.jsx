import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { clearTimezoneCache } from "@/utils/dateUtils";
import CustomDropdown from "@/components/CustomDropdown";
import ConfirmDialog from "@/components/ConfirmDialog";
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
  Pencil,
  Bell,
  Send,
  Palette,
  HardDrive,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  testPlexConnection,
  getPlexConfig,
  savePlexConfig,
} from "@/services/plexService";
import { api } from "@/services/api";

export default function Settings() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

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

  // VoDWisharr settings state
  const [overseerrUrl, setOverseerrUrl] = useState("");
  const [overseerrApiKey, setOverseerrApiKey] = useState("");
  const [defaultEmailDomain, setDefaultEmailDomain] = useState("");
  const [validatingOverseerr, setValidatingOverseerr] = useState(false);
  const [overseerrValid, setOverseerrValid] = useState(null);

  // Uploader settings state
  const [uploaderUrl, setUploaderUrl] = useState("");
  const [uploaderTestStatus, setUploaderTestStatus] = useState(null);

  // VPN Proxy Manager settings state
  const [vpnProxyUrl, setVpnProxyUrl] = useState("");
  const [vpnProxyApiKey, setVpnProxyApiKey] = useState("");
  const [vpnProxyTestStatus, setVpnProxyTestStatus] = useState(null);
  const [showVpnProxyKey, setShowVpnProxyKey] = useState(false);

  // Posterizarr settings state
  const [posterizarrUrl, setPosterizarrUrl] = useState("");
  const [posterizarrApiKey, setPosterizarrApiKey] = useState("");
  const [posterizarrTestStatus, setPosterizarrTestStatus] = useState(null);
  const [showPosterizarrKey, setShowPosterizarrKey] = useState(false);

  // NFS Mount Manager settings state (multi-instance)
  const [nfsMountInstances, setNfsMountInstances] = useState([]);
  const [showAddNfsMount, setShowAddNfsMount] = useState(false);
  const [newNfsMountName, setNewNfsMountName] = useState("");
  const [newNfsMountUrl, setNewNfsMountUrl] = useState("");
  const [newNfsMountApiKey, setNewNfsMountApiKey] = useState("");
  const [showNfsMountKeys, setShowNfsMountKeys] = useState({});
  const [nfsMountTestStatus, setNfsMountTestStatus] = useState({});

  // *arr instances state
  const [arrInstances, setArrInstances] = useState([]);
  const [showAddArr, setShowAddArr] = useState(false);
  const [newArrName, setNewArrName] = useState("");
  const [newArrType, setNewArrType] = useState("sonarr");
  const [newArrUrl, setNewArrUrl] = useState("");
  const [newArrAccessUrl, setNewArrAccessUrl] = useState("");
  const [newArrApiKey, setNewArrApiKey] = useState("");
  const [showArrKeys, setShowArrKeys] = useState({});
  const [arrTestStatus, setArrTestStatus] = useState({});

  // External Apps settings state
  const [externalApps, setExternalApps] = useState([]);
  const [showAddApp, setShowAddApp] = useState(false);
  const [editingAppIdx, setEditingAppIdx] = useState(null);
  const [newAppName, setNewAppName] = useState("");
  const [newAppUrl, setNewAppUrl] = useState("");
  const [newAppIcon, setNewAppIcon] = useState("");
  const [newAppGroup, setNewAppGroup] = useState("");
  const appIconInputRef = useRef(null);

  const handleAppIconUpload = async (
    file,
    callback,
    getAutoSaveApps = null,
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const credentials = sessionStorage.getItem("auth_credentials");
      const response = await fetch("/api/upload-icon", {
        method: "POST",
        headers: {
          ...(credentials && { Authorization: `Basic ${credentials}` }),
        },
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        callback(data.path);
        toast.success("Icon uploaded successfully");
        // If getAutoSaveApps provided, build the updated apps array and save immediately
        if (typeof getAutoSaveApps === "function") {
          try {
            const appsToSave = getAutoSaveApps(data.path);
            const currentSettings = await api.get("/settings");
            await api.post("/settings", {
              ...currentSettings,
              external_apps: { apps: appsToSave },
            });
          } catch {
            // Ignore auto-save errors - user can save manually
          }
        }
        // Invalidate external apps query so the page updates instantly
        queryClient.invalidateQueries({ queryKey: ["settings-external-apps"] });
      } else {
        toast.error("Failed to upload icon");
      }
    } catch {
      toast.error("Failed to upload icon");
    }
  };

  // Telegram notification settings state
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramNotifyOffline, setTelegramNotifyOffline] = useState(true);
  const [telegramNotifyProblem, setTelegramNotifyProblem] = useState(true);
  const [telegramNotifyRecovery, setTelegramNotifyRecovery] = useState(true);
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState(null);
  const [telegramTesting, setTelegramTesting] = useState(false);

  // Unsaved changes state
  const [pendingChanges, setPendingChanges] = useState(false);

  // Tab navigation state
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get("tab");
    const validTabs = [
      "general",
      "auth",
      "plex",
      "overseerr",
      "uploader",
      "vpn_proxy",
      "posterizarr",
      "nfs_mount",
      "external_apps",
      "notifications",
      "arr",
    ];
    return validTabs.includes(tabParam) ? tabParam : "general";
  });

  // Unsaved changes dialog for tab switching
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  const handleTabSwitch = useCallback(
    (tabId) => {
      if (pendingChanges) {
        setPendingTab(tabId);
        setShowUnsavedDialog(true);
      } else {
        setActiveTab(tabId);
      }
    },
    [pendingChanges],
  );

  // Browser tab/window close warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingChanges]);

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
      if (data.vpn_proxy) {
        setVpnProxyUrl(data.vpn_proxy.url || "");
        setVpnProxyApiKey(data.vpn_proxy.api_key || "");
      }
      if (data.posterizarr) {
        setPosterizarrUrl(data.posterizarr.url || "");
        setPosterizarrApiKey(data.posterizarr.api_key || "");
      }
      if (data.nfs_mount) {
        setNfsMountInstances(data.nfs_mount.instances || []);
      }
      if (data.arr || data.instances) {
        setArrInstances(
          (data.arr && data.arr.instances) || data.instances || [],
        );
      }
      if (data.external_apps) {
        setExternalApps(data.external_apps.apps || []);
      }

      // Auto-validate connections if configured
      if (data.plex.server_url && data.plex.server_token) {
        validatePlexOnLoad(data.plex.server_url, data.plex.server_token);
      }
      if (data.overseerr?.url && data.overseerr?.api_key) {
        validateOverseerrOnLoad();
      }
      if (data.uploader?.base_url) {
        validateUploaderOnLoad();
      }
      if (data.vpn_proxy?.url && data.vpn_proxy?.api_key) {
        validateVpnProxyOnLoad();
      }
      if (data.posterizarr?.url && data.posterizarr?.api_key) {
        validatePosterizarrOnLoad();
      }
      if (data.nfs_mount?.instances?.length > 0) {
        validateNfsMountOnLoad(data.nfs_mount.instances);
      }
      if (data.arr?.instances || data.instances) {
        const instances =
          (data.arr && data.arr.instances) || data.instances || [];
        validateArrInstancesOnLoad(instances);
      }

      // Load Telegram notification settings
      loadTelegramSettings();
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

  const validateUploaderOnLoad = async () => {
    try {
      const result = await api.get("/uploader/status");
      setUploaderTestStatus("ok");
    } catch (error) {
      setUploaderTestStatus("fail");
    }
  };

  const validateVpnProxyOnLoad = async () => {
    try {
      const result = await api.get("/vpn-proxy/status");
      setVpnProxyTestStatus(result.connected ? "ok" : "fail");
    } catch (error) {
      setVpnProxyTestStatus("fail");
    }
  };

  const validatePosterizarrOnLoad = async () => {
    try {
      const result = await api.get("/posterizarr/status");
      setPosterizarrTestStatus(result.connected ? "ok" : "fail");
    } catch (error) {
      setPosterizarrTestStatus("fail");
    }
  };

  const validateNfsMountOnLoad = async (instances) => {
    try {
      const result = await api.get("/nfs-mount/status");
      if (result.instances) {
        const statusMap = {};
        result.instances.forEach((inst) => {
          statusMap[inst.id] = inst.connected ? "ok" : "fail";
        });
        setNfsMountTestStatus(statusMap);
      }
    } catch (error) {
      // Mark all as failed
      const statusMap = {};
      instances.forEach((inst) => {
        statusMap[inst.id] = "fail";
      });
      setNfsMountTestStatus(statusMap);
    }
  };

  const validateArrInstancesOnLoad = async (instances) => {
    for (const inst of instances) {
      if (inst.url && inst.api_key) {
        try {
          const status = await api.get("/arr-activity/system/status");
          const entry = status?.[inst.id];
          const ok =
            entry &&
            entry.status &&
            !entry.status.error &&
            (entry.status.version ||
              entry.status.buildTime ||
              entry.status.branch);
          setArrTestStatus((prev) => ({
            ...prev,
            [inst.id]: ok ? "ok" : "fail",
          }));
        } catch (e) {
          setArrTestStatus((prev) => ({ ...prev, [inst.id]: "fail" }));
        }
      }
    }
  };

  // Telegram notification functions
  const loadTelegramSettings = async () => {
    try {
      const data = await api.get("/notifications/telegram");
      if (data.telegram) {
        setTelegramEnabled(data.telegram.enabled || false);
        setTelegramBotToken(data.telegram.bot_token || "");
        setTelegramChatId(data.telegram.chat_id || "");
        setTelegramNotifyOffline(data.telegram.notify_offline ?? true);
        setTelegramNotifyProblem(data.telegram.notify_problem ?? true);
        setTelegramNotifyRecovery(data.telegram.notify_recovery ?? true);
      }
    } catch (error) {
      console.error("Failed to load Telegram settings:", error);
    }
  };

  const handleTestTelegram = async () => {
    setTelegramTesting(true);
    setTelegramTestStatus(null);
    try {
      const result = await api.post("/notifications/telegram/test");
      if (result.success) {
        setTelegramTestStatus("ok");
        toast.success(result.message || "Test notification sent!");
      } else {
        setTelegramTestStatus("fail");
        toast.error(result.message || "Failed to send test notification");
      }
    } catch (error) {
      console.error("Failed to test Telegram:", error);
      setTelegramTestStatus("fail");
      toast.error(
        t("settings.telegramTestError") || "Failed to send test notification",
      );
    } finally {
      setTelegramTesting(false);
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
          data.enabled ? t("auth.authEnabled") : t("auth.authDisabled"),
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
        t("settings.overseerrFillAllFields") ||
          "Please fill in URL and API Key",
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
            "VoDWisharr connection successful",
        );
      } else {
        setOverseerrValid(false);
        toast.error(
          result.message ||
            t("settings.overseerrValidationFailed") ||
            "Cannot connect to VoDWisharr",
        );
      }
    } catch (error) {
      console.error("Failed to validate VoDWisharr:", error);
      setOverseerrValid(false);
      toast.error(
        error.message ||
          t("settings.overseerrValidationError") ||
          "Failed to test connection",
      );
    } finally {
      setValidatingOverseerr(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      // Prepare NFS Mount instances payload, including pending new instance (if filled)
      let nfsMountPayload = nfsMountInstances;
      const hasPendingNfsMount =
        newNfsMountName && newNfsMountUrl && newNfsMountApiKey;
      if (hasPendingNfsMount) {
        const pendingId = `nfs-${newNfsMountName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
        nfsMountPayload = [
          ...nfsMountInstances,
          {
            id: pendingId,
            name: newNfsMountName,
            url: newNfsMountUrl,
            api_key: newNfsMountApiKey,
          },
        ];
      }

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
            access_url: newArrAccessUrl || "",
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
        vpn_proxy: {
          url: vpnProxyUrl || "",
          api_key: vpnProxyApiKey || "",
        },
        posterizarr: {
          url: posterizarrUrl || "",
          api_key: posterizarrApiKey || "",
        },
        nfs_mount: {
          instances: nfsMountPayload || [],
        },
        arr: {
          instances: instancesPayload || [],
        },
        external_apps: {
          apps: externalApps || [],
        },
      };

      console.log("Saving settings payload:", payload);
      const result = await api.post("/settings", payload);
      console.log("Settings saved successfully, response:", result);

      // Save Telegram settings separately
      try {
        await api.put("/notifications/telegram", {
          enabled: telegramEnabled,
          bot_token: telegramBotToken,
          chat_id: telegramChatId,
          notify_offline: telegramNotifyOffline,
          notify_problem: telegramNotifyProblem,
          notify_recovery: telegramNotifyRecovery,
        });
        console.log("Telegram settings saved successfully");
      } catch (telegramError) {
        console.error("Failed to save Telegram settings:", telegramError);
        // Don't fail the whole save if Telegram fails
      }

      // Clear timezone cache so new timezone takes effect immediately
      clearTimezoneCache();

      toast.success(t("settings.settingsSaved"));

      // If we auto-included a pending new instance, clear the add form
      if (hasPendingNew) {
        setNewArrName("");
        setNewArrUrl("");
        setNewArrAccessUrl("");
        setNewArrApiKey("");
        setNewArrType("sonarr");
        setShowAddArr(false);
      }
      // If we auto-included a pending NFS Mount instance, clear the add form
      if (hasPendingNfsMount) {
        setNewNfsMountName("");
        setNewNfsMountUrl("");
        setNewNfsMountApiKey("");
        setShowAddNfsMount(false);
      }
      // Reload settings from backend to reflect persisted config/migrations
      console.log("Reloading settings from backend...");
      await loadSettings();
      console.log("Settings reloaded successfully");
      // Invalidate external apps query so the page updates instantly
      queryClient.invalidateQueries({ queryKey: ["settings-external-apps"] });
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
      access_url: newArrAccessUrl || "",
    };
    setArrInstances((prev) => [...prev, instance]);
    setNewArrName("");
    setNewArrUrl("");
    setNewArrAccessUrl("");
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

  const tabs = [
    { id: "general", label: t("settings.general", "General"), icon: Globe },
    {
      id: "auth",
      label: t("auth.authSettings", "Authentication"),
      icon: Shield,
    },
    { id: "plex", label: t("plex.serverSettings", "Plex"), icon: Server },
    { id: "overseerr", label: "VoD Portal", icon: Server },
    {
      id: "uploader",
      label: t("uploaderSettings.settings", "Uploader"),
      icon: Upload,
    },
    { id: "vpn_proxy", label: "VPN-Proxy", icon: Shield },
    { id: "posterizarr", label: "Posterizarr", icon: Palette },
    { id: "nfs_mount", label: "NFS Mount", icon: HardDrive },
    { id: "arr", label: "*arr Instances", icon: Film },
    { id: "external_apps", label: "External Apps", icon: Globe },
    {
      id: "notifications",
      label: t("settings.notifications", "Notifications"),
      icon: Bell,
    },
  ];

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24">
      {/* Sticky Save Bar */}
      {pendingChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg">
          <div className="bg-theme-card border border-orange-500/30 rounded-xl px-5 py-3 flex items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <AlertCircle className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-sm font-medium text-theme-text">
                {t("settings.unsavedChanges", "Unsaved changes")}
              </span>
            </div>
            <button
              onClick={() => {
                handleSaveSettings();
                setPendingChanges(false);
              }}
              disabled={settingsLoading}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:bg-theme-primary/80 text-black rounded-lg text-sm font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              {settingsLoading ? t("settings.saving") : t("settings.saveNow")}
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-theme-card border border-theme rounded-xl p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-theme-primary text-black shadow-lg"
                    : "text-theme-text-muted hover:bg-theme-primary/20 hover:text-theme-primary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Authentication Settings */}
        {activeTab === "auth" && (
          <>
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
                    <form
                      onSubmit={handleUpdateCredentials}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-theme-text mb-2">
                          {t("auth.username")}
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                          className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                          className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                          className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                          placeholder={t("auth.enterPassword")}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading
                          ? t("auth.updating")
                          : t("auth.updateCredentials")}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* General Settings */}
        {activeTab === "general" && (
          <>
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
                          {
                            value: "Asia/Shanghai",
                            label: "Asia/Shanghai (CST)",
                          },
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
                          className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                          className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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

            {/* Plex Server Settings */}
          </>
        )}

        {activeTab === "plex" && (
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
                      className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                        className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                      className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        plexValid === true
                          ? "!bg-green-600 hover:!bg-green-700 !text-white !border-green-600"
                          : plexValid === false
                            ? "!bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                            : ""
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
        )}

        {/* VoDWisharr Configuration */}
        {activeTab === "overseerr" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-text">
                  {t("settings.overseerrSettings") ||
                    "VoDWisharr Configuration"}
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
                      {t("settings.overseerrUrl") || "VoDWisharr API URL"}
                    </label>
                    <input
                      type="text"
                      value={overseerrUrl}
                      onChange={(e) => {
                        setOverseerrUrl(e.target.value);
                        setOverseerrValid(null);
                        setPendingChanges(true);
                      }}
                      className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                      placeholder="https://overseerr.example.com/api/v1/user"
                    />
                    <p className="mt-2 text-xs text-theme-muted">
                      {t("settings.overseerrUrlHelp") ||
                        "Full API endpoint URL for creating users"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-2">
                      {t("settings.overseerrApiKey") || "VoDWisharr API Key"}
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
                        className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                        "API key from VoDWisharr settings"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-2">
                      {t("settings.defaultEmailDomain") ||
                        "Default Email Domain"}
                    </label>
                    <input
                      type="text"
                      value={defaultEmailDomain}
                      onChange={(e) => {
                        setDefaultEmailDomain(e.target.value);
                        setPendingChanges(true);
                      }}
                      className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                      className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        overseerrValid === true
                          ? "!bg-green-600 hover:!bg-green-700 !text-white !border-green-600"
                          : overseerrValid === false
                            ? "!bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                            : ""
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
        )}

        {/* Uploader Settings */}
        {activeTab === "uploader" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-text">
                  {t("uploaderSettings.settings", {
                    defaultValue: "Uploader Settings",
                  })}
                </h3>
              </div>
            </div>
            <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

              <div className="relative">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-2">
                      {t("uploaderSettings.baseUrl", {
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
                      className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                      placeholder="http://uploader:8080"
                    />
                    <p className="mt-2 text-xs text-theme-muted">
                      {t("uploaderSettings.baseUrlHelp", {
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
                            console.log(
                              "Uploader connection successful",
                              result,
                            );
                            setUploaderTestStatus("ok");
                            toast.success("Uploader connection successful");
                          } catch (e) {
                            console.error("Uploader connection failed:", e);
                            setUploaderTestStatus("fail");
                            toast.error(
                              e.message || "Cannot connect to Uploader",
                            );
                          }
                        }}
                        disabled={
                          uploaderTestStatus === "loading" || !uploaderUrl
                        }
                        className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                          uploaderTestStatus === "ok"
                            ? "!bg-green-600 hover:!bg-green-700 !text-white !border-green-600"
                            : uploaderTestStatus === "fail"
                              ? "!bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                              : ""
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
                            {t("uploaderSettings.testing", {
                              defaultValue: "Testing...",
                            })}
                          </span>
                        ) : uploaderTestStatus === "ok" ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircle size={16} />
                            {t("uploaderSettings.connectionOk", {
                              defaultValue: "Connected",
                            })}
                          </span>
                        ) : (
                          t("uploaderSettings.testConnection", {
                            defaultValue: "Test Connection",
                          })
                        )}
                      </button>
                    </div>

                    {uploaderTestStatus === "fail" && (
                      <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-3 mt-3">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p>
                          Cannot connect to Uploader. Check the URL is correct
                          and the service is running.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VPN-Proxy Manager Settings */}
        {activeTab === "vpn_proxy" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-text">
                  VPN-Proxy Manager
                </h3>
                <p className="text-sm text-theme-muted">
                  Connect to your VPN Proxy Manager instance to view VPN
                  container status
                </p>
              </div>
            </div>
            <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

              <div className="relative space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    VPN Proxy Manager URL
                  </label>
                  <input
                    type="url"
                    value={vpnProxyUrl}
                    onChange={(e) => {
                      setVpnProxyUrl(e.target.value);
                      setVpnProxyTestStatus(null);
                      setPendingChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder="http://vpn-proxy:5000"
                  />
                  <p className="mt-2 text-xs text-theme-muted">
                    The URL of your VPN Proxy Manager instance (e.g.
                    http://vpn-proxy:5000 or http://192.168.1.100:5000)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showVpnProxyKey ? "text" : "password"}
                      value={vpnProxyApiKey}
                      onChange={(e) => {
                        setVpnProxyApiKey(e.target.value);
                        setVpnProxyTestStatus(null);
                        setPendingChanges(true);
                      }}
                      className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all font-mono text-sm"
                      placeholder="Paste your API key from VPN Proxy Manager Settings"
                    />
                    <button
                      type="button"
                      onClick={() => setShowVpnProxyKey(!showVpnProxyKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-text transition-colors"
                    >
                      {showVpnProxyKey ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-theme-muted">
                    Generate an API key in VPN Proxy Manager → Settings → API
                    Keys
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!vpnProxyUrl || !vpnProxyApiKey) {
                        toast.error("Please enter URL and API Key");
                        return;
                      }
                      setVpnProxyTestStatus("loading");
                      try {
                        const result = await api.get("/vpn-proxy/status");
                        if (result.connected) {
                          setVpnProxyTestStatus("ok");
                          toast.success("VPN Proxy Manager connected");
                        } else {
                          setVpnProxyTestStatus("fail");
                          toast.error(result.error || "Connection failed");
                        }
                      } catch (e) {
                        setVpnProxyTestStatus("fail");
                        toast.error(
                          e.message || "Cannot connect to VPN Proxy Manager",
                        );
                      }
                    }}
                    disabled={
                      vpnProxyTestStatus === "loading" ||
                      !vpnProxyUrl ||
                      !vpnProxyApiKey
                    }
                    className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      vpnProxyTestStatus === "ok"
                        ? "!bg-green-600 hover:!bg-green-700 !text-white !border-green-600"
                        : vpnProxyTestStatus === "fail"
                          ? "!bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                          : ""
                    }`}
                  >
                    {vpnProxyTestStatus === "loading" ? (
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
                        Testing...
                      </span>
                    ) : vpnProxyTestStatus === "ok" ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle size={16} />
                        Connected
                      </span>
                    ) : (
                      "Test Connection"
                    )}
                  </button>
                </div>

                {vpnProxyTestStatus === "fail" && (
                  <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      Cannot connect to VPN Proxy Manager. Check the URL and API
                      Key are correct and the service is running.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Posterizarr Settings */}
        {activeTab === "posterizarr" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-text">
                  Posterizarr
                </h3>
                <p className="text-sm text-theme-muted">
                  Connect to your Posterizarr instance for poster management and
                  status monitoring
                </p>
              </div>
            </div>
            <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

              <div className="relative space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    Posterizarr URL
                  </label>
                  <input
                    type="url"
                    value={posterizarrUrl}
                    onChange={(e) => {
                      setPosterizarrUrl(e.target.value);
                      setPosterizarrTestStatus(null);
                      setPendingChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder="http://posterizarr:8000"
                  />
                  <p className="mt-2 text-xs text-theme-muted">
                    The URL of your Posterizarr instance (e.g.
                    http://posterizarr:8000 or http://192.168.1.100:8000)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPosterizarrKey ? "text" : "password"}
                      value={posterizarrApiKey}
                      onChange={(e) => {
                        setPosterizarrApiKey(e.target.value);
                        setPosterizarrTestStatus(null);
                        setPendingChanges(true);
                      }}
                      className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all font-mono text-sm"
                      placeholder="Paste your Posterizarr API key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPosterizarrKey(!showPosterizarrKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-text transition-colors"
                    >
                      {showPosterizarrKey ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-theme-muted">
                    Your Posterizarr API key for authentication
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!posterizarrUrl || !posterizarrApiKey) {
                        toast.error("Please enter URL and API Key");
                        return;
                      }
                      setPosterizarrTestStatus("loading");
                      try {
                        const result = await api.get("/posterizarr/status");
                        if (result.connected) {
                          setPosterizarrTestStatus("ok");
                          toast.success("Posterizarr connected");
                        } else {
                          setPosterizarrTestStatus("fail");
                          toast.error(result.error || "Connection failed");
                        }
                      } catch (e) {
                        setPosterizarrTestStatus("fail");
                        toast.error(
                          e.message || "Cannot connect to Posterizarr",
                        );
                      }
                    }}
                    disabled={
                      posterizarrTestStatus === "loading" ||
                      !posterizarrUrl ||
                      !posterizarrApiKey
                    }
                    className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      posterizarrTestStatus === "ok"
                        ? "!bg-green-600 hover:!bg-green-700 !text-white !border-green-600"
                        : posterizarrTestStatus === "fail"
                          ? "!bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                          : ""
                    }`}
                  >
                    {posterizarrTestStatus === "loading" ? (
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
                        Testing...
                      </span>
                    ) : posterizarrTestStatus === "ok" ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle size={16} />
                        Connected
                      </span>
                    ) : (
                      "Test Connection"
                    )}
                  </button>
                </div>

                {posterizarrTestStatus === "fail" && (
                  <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      Cannot connect to Posterizarr. Check the URL and API Key
                      are correct and the service is running.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NFS Mount Manager Settings (Multi-Instance) */}
        {activeTab === "nfs_mount" && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-theme-text">
                    NFS Mount Manager Instances
                  </h3>
                  <p className="text-sm text-theme-muted">
                    Connect to one or more NFS Mount Manager instances for NFS,
                    MergerFS and VPN monitoring
                  </p>
                </div>
              </div>
              {!showAddNfsMount && (
                <button
                  type="button"
                  onClick={() => setShowAddNfsMount(true)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-theme hover:border-theme-primary rounded-lg text-sm font-medium text-theme-muted transition-all whitespace-nowrap"
                >
                  <Plus size={16} className="text-theme-primary" />
                  Add Instance
                </button>
              )}
            </div>

            {/* Existing NFS Mount instances */}
            {nfsMountInstances.length > 0 && (
              <div className="space-y-3 mb-4">
                {nfsMountInstances.map((inst, idx) => (
                  <div
                    key={inst.id}
                    className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-5 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-theme-primary" />
                          <span className="font-semibold text-theme-text">
                            {inst.name || inst.id}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNfsMountInstances((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                            setPendingChanges(true);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-theme-text mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={inst.name}
                            onChange={(e) => {
                              setNfsMountInstances((prev) => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  name: e.target.value,
                                };
                                return next;
                              });
                              setPendingChanges(true);
                            }}
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                            placeholder="My NFS Manager"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-theme-text mb-2">
                            URL
                          </label>
                          <input
                            type="url"
                            value={inst.url}
                            onChange={(e) => {
                              setNfsMountInstances((prev) => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  url: e.target.value,
                                };
                                return next;
                              });
                              setNfsMountTestStatus((prev) => ({
                                ...prev,
                                [inst.id]: null,
                              }));
                              setPendingChanges(true);
                            }}
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                            placeholder="http://nfs-mount:8550"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-theme-text mb-2">
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={
                              showNfsMountKeys[inst.id] ? "text" : "password"
                            }
                            value={inst.api_key}
                            onChange={(e) => {
                              setNfsMountInstances((prev) => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  api_key: e.target.value,
                                };
                                return next;
                              });
                              setNfsMountTestStatus((prev) => ({
                                ...prev,
                                [inst.id]: null,
                              }));
                              setPendingChanges(true);
                            }}
                            className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text font-mono text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                            placeholder="Paste your NFS Mount Manager API key"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowNfsMountKeys((prev) => ({
                                ...prev,
                                [inst.id]: !prev[inst.id],
                              }))
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-text transition-colors"
                          >
                            {showNfsMountKeys[inst.id] ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Test Connection Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!inst.url || !inst.api_key) {
                            toast.error("Please enter URL and API Key");
                            return;
                          }
                          setNfsMountTestStatus((prev) => ({
                            ...prev,
                            [inst.id]: "loading",
                          }));
                          try {
                            const result = await api.post(
                              "/nfs-mount/test-connection",
                              {
                                url: inst.url,
                                api_key: inst.api_key,
                              },
                            );
                            if (result?.connected) {
                              setNfsMountTestStatus((prev) => ({
                                ...prev,
                                [inst.id]: "ok",
                              }));
                              toast.success(`${inst.name} connected`);
                            } else {
                              setNfsMountTestStatus((prev) => ({
                                ...prev,
                                [inst.id]: "fail",
                              }));
                              toast.error(result?.error || "Connection failed");
                            }
                          } catch (e) {
                            setNfsMountTestStatus((prev) => ({
                              ...prev,
                              [inst.id]: "fail",
                            }));
                            toast.error(
                              e.message ||
                                "Cannot connect to NFS Mount Manager",
                            );
                          }
                        }}
                        disabled={
                          nfsMountTestStatus[inst.id] === "loading" ||
                          !inst.url ||
                          !inst.api_key
                        }
                        className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                          nfsMountTestStatus[inst.id] === "ok"
                            ? "!bg-green-600 hover:!bg-green-700 !text-white !border-green-600"
                            : nfsMountTestStatus[inst.id] === "fail"
                              ? "!bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                              : ""
                        }`}
                      >
                        {nfsMountTestStatus[inst.id] === "loading" ? (
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
                            Testing...
                          </span>
                        ) : nfsMountTestStatus[inst.id] === "ok" ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircle size={16} />
                            Connected
                          </span>
                        ) : (
                          "Test Connection"
                        )}
                      </button>

                      {nfsMountTestStatus[inst.id] === "fail" && (
                        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-3">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p>
                            Cannot connect to {inst.name}. Check the URL and API
                            key are correct.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new NFS Mount instance */}
            {showAddNfsMount ? (
              <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden mb-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />
                <div className="relative space-y-3">
                  <h4 className="text-sm font-semibold text-theme-text">
                    Add NFS Mount Manager Instance
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-theme-text mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={newNfsMountName}
                        onChange={(e) => setNewNfsMountName(e.target.value)}
                        className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                        placeholder="My NFS Manager"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-theme-text mb-2">
                        URL
                      </label>
                      <input
                        type="url"
                        value={newNfsMountUrl}
                        onChange={(e) => setNewNfsMountUrl(e.target.value)}
                        className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                        placeholder="http://nfs-mount:8550"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={newNfsMountApiKey}
                      onChange={(e) => setNewNfsMountApiKey(e.target.value)}
                      className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text font-mono text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                      placeholder="Paste your NFS Mount Manager API key"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !newNfsMountName ||
                          !newNfsMountUrl ||
                          !newNfsMountApiKey
                        )
                          return;
                        const id = `nfs-${newNfsMountName
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
                        setNfsMountInstances((prev) => [
                          ...prev,
                          {
                            id,
                            name: newNfsMountName,
                            url: newNfsMountUrl,
                            api_key: newNfsMountApiKey,
                          },
                        ]);
                        setNewNfsMountName("");
                        setNewNfsMountUrl("");
                        setNewNfsMountApiKey("");
                        setShowAddNfsMount(false);
                        setPendingChanges(true);
                      }}
                      disabled={
                        !newNfsMountName ||
                        !newNfsMountUrl ||
                        !newNfsMountApiKey
                      }
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 text-theme-primary" />
                      Add Instance
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddNfsMount(false);
                        setNewNfsMountName("");
                        setNewNfsMountUrl("");
                        setNewNfsMountApiKey("");
                      }}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* External Apps */}
        {activeTab === "external_apps" && (
          <div>
            {/* Group suggestions datalist - always rendered so both edit and add forms can use it */}
            <datalist id="app-groups-list">
              {[
                ...new Set(externalApps.map((a) => a.group).filter(Boolean)),
              ].map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-theme-text">
                    External Apps
                  </h3>
                  <p className="text-sm text-theme-muted">
                    Add links to external panels and apps that will appear on
                    the External Apps page
                  </p>
                </div>
              </div>
              {!showAddApp && (
                <button
                  type="button"
                  onClick={() => setShowAddApp(true)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-theme hover:border-theme-primary rounded-lg text-sm font-medium text-theme-muted transition-all whitespace-nowrap"
                >
                  <Plus size={16} className="text-theme-primary" />
                  Add App
                </button>
              )}
            </div>

            {/* Existing apps list */}
            {externalApps.length > 0 && (
              <div className="space-y-3 mb-4">
                {externalApps.map((app, idx) => (
                  <div
                    key={app.id}
                    className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-5 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />
                    <div className="relative flex flex-col gap-3">
                      {/* Compact view */}
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {app.icon &&
                          (app.icon.startsWith("/") ||
                            app.icon.startsWith("http")) ? (
                            <img
                              src={app.icon}
                              alt=""
                              className="w-9 h-9 rounded-lg object-contain bg-theme-hover border border-theme"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-theme-hover border border-theme flex items-center justify-center">
                              <Globe className="w-4 h-4 text-theme-text-muted" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-theme-text truncate">
                            {app.name || "Unnamed App"}
                          </p>
                          <p className="text-xs text-theme-text-muted truncate">
                            {app.url || "No URL"}
                          </p>
                        </div>
                        {app.group && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-theme-hover border border-theme text-theme-text-muted flex-shrink-0">
                            {app.group}
                          </span>
                        )}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingAppIdx(
                                editingAppIdx === idx ? null : idx,
                              )
                            }
                            className="p-2 bg-theme-primary/10 hover:bg-theme border border-theme hover:border-theme-primary text-theme-primary rounded transition-all"
                            title="Edit app"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*";
                              input.onchange = (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleAppIconUpload(
                                    file,
                                    (path) => {
                                      const updated = [...externalApps];
                                      updated[idx] = {
                                        ...updated[idx],
                                        icon: path,
                                      };
                                      setExternalApps(updated);
                                      setPendingChanges(true);
                                    },
                                    (path) => {
                                      const updated = [...externalApps];
                                      updated[idx] = {
                                        ...updated[idx],
                                        icon: path,
                                      };
                                      return updated;
                                    },
                                  );
                                }
                              };
                              input.click();
                            }}
                            className="p-2 bg-theme-primary/10 hover:bg-theme border border-theme hover:border-theme-primary text-theme-primary rounded transition-all"
                            title="Upload icon"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExternalApps(
                                externalApps.filter((_, i) => i !== idx),
                              );
                              if (editingAppIdx === idx) setEditingAppIdx(null);
                              setPendingChanges(true);
                            }}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-all"
                            title="Remove app"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded edit view */}
                      {editingAppIdx === idx && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-theme">
                          <div>
                            <label className="block text-xs font-medium text-theme-text-muted mb-1">
                              App Name
                            </label>
                            <input
                              type="text"
                              value={app.name}
                              onChange={(e) => {
                                const updated = [...externalApps];
                                updated[idx] = {
                                  ...updated[idx],
                                  name: e.target.value,
                                };
                                setExternalApps(updated);
                                setPendingChanges(true);
                              }}
                              className="w-full px-3 py-2 bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                              placeholder="App name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-theme-text-muted mb-1">
                              URL
                            </label>
                            <input
                              type="url"
                              value={app.url}
                              onChange={(e) => {
                                const updated = [...externalApps];
                                updated[idx] = {
                                  ...updated[idx],
                                  url: e.target.value,
                                };
                                setExternalApps(updated);
                                setPendingChanges(true);
                              }}
                              className="w-full px-3 py-2 bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                              placeholder="https://app.example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-theme-text-muted mb-1">
                              Icon (name, URL or upload)
                            </label>
                            <input
                              type="text"
                              value={app.icon}
                              onChange={(e) => {
                                const updated = [...externalApps];
                                updated[idx] = {
                                  ...updated[idx],
                                  icon: e.target.value,
                                };
                                setExternalApps(updated);
                                setPendingChanges(true);
                              }}
                              className="w-full px-3 py-2 bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                              placeholder="globe, server, or https://..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-theme-text-muted mb-1">
                              Group
                            </label>
                            <input
                              type="text"
                              value={app.group || ""}
                              onChange={(e) => {
                                const updated = [...externalApps];
                                updated[idx] = {
                                  ...updated[idx],
                                  group: e.target.value,
                                };
                                setExternalApps(updated);
                                setPendingChanges(true);
                              }}
                              list="app-groups-list"
                              className="w-full px-3 py-2 bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                              placeholder="e.g. Media, Tools..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new app */}
            {showAddApp ? (
              <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-5 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />
                <div className="relative space-y-4">
                  <h4 className="text-sm font-semibold text-theme-text">
                    Add New App
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-theme-text-muted mb-1">
                        App Name
                      </label>
                      <input
                        type="text"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        className="w-full px-3 py-2 bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                        placeholder="e.g. Portainer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-theme-text-muted mb-1">
                        URL
                      </label>
                      <input
                        type="url"
                        value={newAppUrl}
                        onChange={(e) => setNewAppUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                        placeholder="https://portainer.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-theme-text-muted mb-1">
                        Icon (name, URL or upload)
                      </label>
                      <div className="flex gap-2">
                        {newAppIcon &&
                          (newAppIcon.startsWith("/") ||
                            newAppIcon.startsWith("http")) && (
                            <img
                              src={newAppIcon}
                              alt=""
                              className="w-9 h-9 rounded-lg object-contain bg-theme-hover border border-theme flex-shrink-0"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          )}
                        <input
                          type="text"
                          value={newAppIcon}
                          onChange={(e) => setNewAppIcon(e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                          placeholder="server, database, or https://..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleAppIconUpload(file, (path) => {
                                  setNewAppIcon(path);
                                });
                              }
                            };
                            input.click();
                          }}
                          className="flex-shrink-0 p-2 bg-theme-primary/10 hover:bg-theme border border-theme hover:border-theme-primary text-theme-primary rounded transition-all"
                          title="Upload icon"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-theme-text-muted mb-1">
                        Group
                      </label>
                      <input
                        type="text"
                        value={newAppGroup}
                        onChange={(e) => setNewAppGroup(e.target.value)}
                        list="app-groups-list"
                        className="w-full px-3 py-2 bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                        placeholder="e.g. Media, Tools..."
                      />
                    </div>
                  </div>
                  <p className="text-xs text-theme-muted">
                    Available icons: globe, server, shield, database, monitor,
                    cloud, tv, film, music, download, upload, harddrive, wifi,
                    terminal, image, mail, message, git, box, layers, zap, book,
                    app — or paste an image URL / upload a custom icon
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (newAppName && newAppUrl) {
                          const id = `app-${newAppName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
                          setExternalApps([
                            ...externalApps,
                            {
                              id,
                              name: newAppName,
                              url: newAppUrl,
                              icon: newAppIcon || "app",
                              group: newAppGroup || "",
                            },
                          ]);
                          setNewAppName("");
                          setNewAppUrl("");
                          setNewAppIcon("");
                          setNewAppGroup("");
                          setShowAddApp(false);
                          setPendingChanges(true);
                        }
                      }}
                      disabled={!newAppName || !newAppUrl}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} className="text-theme-primary" />
                      Add App
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddApp(false);
                        setNewAppName("");
                        setNewAppUrl("");
                        setNewAppIcon("");
                        setNewAppGroup("");
                      }}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Telegram Notifications */}
        {activeTab === "notifications" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-theme-hover text-theme-primary">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-text">
                  {t("settings.telegramNotifications") ||
                    "Telegram Notifications"}
                </h3>
                <p className="text-sm text-theme-muted">
                  {t("settings.telegramDescription") ||
                    "Get notified when services go offline or have problems"}
                </p>
              </div>
            </div>
            <div className="group bg-theme-card border border-theme rounded-xl p-4 sm:p-6 space-y-4 shadow-lg hover:shadow-xl hover:border-theme-primary/50 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-theme-primary/5 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:from-theme-primary/10 transition-all duration-300" />

              <div className="relative space-y-4">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-3 bg-theme-hover/50 border border-theme rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-theme-text">
                      {t("settings.enableTelegram") ||
                        "Enable Telegram Notifications"}
                    </span>
                    <p className="text-xs text-theme-muted mt-1">
                      {t("settings.enableTelegramHelp") ||
                        "Send alerts when service status changes"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTelegramEnabled(!telegramEnabled);
                      setPendingChanges(true);
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      telegramEnabled ? "bg-green-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        telegramEnabled ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Bot Token */}
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("settings.telegramBotToken") || "Bot Token"}
                  </label>
                  <div className="relative">
                    <input
                      type={showTelegramToken ? "text" : "password"}
                      value={telegramBotToken}
                      onChange={(e) => {
                        setTelegramBotToken(e.target.value);
                        setPendingChanges(true);
                      }}
                      className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTelegramToken(!showTelegramToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
                    >
                      {showTelegramToken ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-theme-muted">
                    {t("settings.telegramBotTokenHelp") ||
                      "Create a bot via @BotFather on Telegram to get your token"}
                  </p>
                </div>

                {/* Chat ID */}
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    {t("settings.telegramChatId") || "Chat ID"}
                  </label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => {
                      setTelegramChatId(e.target.value);
                      setPendingChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                    placeholder="-1001234567890"
                  />
                  <p className="mt-2 text-xs text-theme-muted">
                    {t("settings.telegramChatIdHelp") ||
                      "Your personal chat ID or group/channel ID (use @userinfobot to find it)"}
                  </p>
                </div>

                {/* Notification Preferences */}
                <div className="space-y-3 pt-2">
                  <span className="text-sm font-medium text-theme-text">
                    {t("settings.notificationTypes") || "Notification Types"}
                  </span>

                  <div className="flex items-center justify-between p-3 bg-theme-hover/30 border border-theme rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-sm text-theme-text">
                        {t("settings.notifyOffline") || "Service Offline"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTelegramNotifyOffline(!telegramNotifyOffline);
                        setPendingChanges(true);
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        telegramNotifyOffline ? "bg-green-500" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          telegramNotifyOffline ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-theme-hover/30 border border-theme rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-theme-text">
                        {t("settings.notifyProblem") ||
                          "Service Problems (Slow Response)"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTelegramNotifyProblem(!telegramNotifyProblem);
                        setPendingChanges(true);
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        telegramNotifyProblem ? "bg-green-500" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          telegramNotifyProblem ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-theme-hover/30 border border-theme rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-theme-text">
                        {t("settings.notifyRecovery") || "Service Recovery"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTelegramNotifyRecovery(!telegramNotifyRecovery);
                        setPendingChanges(true);
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        telegramNotifyRecovery ? "bg-green-500" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          telegramNotifyRecovery ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Test Button */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleTestTelegram}
                    disabled={
                      telegramTesting ||
                      !telegramEnabled ||
                      !telegramBotToken ||
                      !telegramChatId
                    }
                    className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm flex-1 sm:flex-initial disabled:opacity-50 disabled:cursor-not-allowed ${
                      telegramTestStatus === "ok"
                        ? "!bg-green-600 hover:!bg-green-700 !text-white !border-green-600"
                        : telegramTestStatus === "fail"
                          ? "!bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                          : ""
                    }`}
                  >
                    {telegramTesting ? (
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
                        {t("settings.testing") || "Testing..."}
                      </span>
                    ) : telegramTestStatus === "ok" ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle size={16} />
                        {t("settings.testSuccess") || "Test Sent!"}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" />
                        {t("settings.testTelegram") || "Send Test"}
                      </span>
                    )}
                  </button>
                </div>

                {telegramTestStatus === "fail" && (
                  <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      {t("settings.telegramTestFailed") ||
                        "Failed to send test notification. Check your bot token and chat ID."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sonarr/Radarr Instances */}
        {activeTab === "arr" && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
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
              {!showAddArr && (
                <button
                  type="button"
                  onClick={() => setShowAddArr(true)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-theme hover:border-theme-primary rounded-lg text-sm font-medium text-theme-muted transition-all whitespace-nowrap"
                >
                  <Plus size={16} className="text-theme-primary" />
                  {t("arr.addInstance", { defaultValue: "Add Instance" })}
                </button>
              )}
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
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                            >
                              <option value="sonarr">Sonarr</option>
                              <option value="radarr">Radarr</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-theme-text mb-2">
                              {t("arr.instanceUrl", {
                                defaultValue: "Base URL",
                              })}
                            </label>
                            <input
                              type="url"
                              value={inst.url || ""}
                              onChange={(e) =>
                                updateArrInstanceField(
                                  idx,
                                  "url",
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                              placeholder="http://localhost:8989"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-theme-text mb-2">
                              {t("arr.accessUrl", {
                                defaultValue: "Access URL",
                              })}
                            </label>
                            <input
                              type="url"
                              value={inst.access_url || ""}
                              onChange={(e) =>
                                updateArrInstanceField(
                                  idx,
                                  "access_url",
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                              placeholder="https://radarr.example.com"
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
                                type={
                                  showArrKeys[inst.id] ? "text" : "password"
                                }
                                value={inst.api_key || ""}
                                onChange={(e) =>
                                  updateArrInstanceField(
                                    idx,
                                    "api_key",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-4 py-2 pr-10 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                  arrTestStatus[inst.id] === "ok"
                                    ? "!bg-green-600 hover:!bg-green-700 !text-white !border-green-600"
                                    : arrTestStatus[inst.id] === "fail"
                                      ? "!bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                                      : ""
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
                                  Cannot connect to {inst.name}. Check the URL
                                  and API key are correct.
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
                  {showAddArr ? (
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
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
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
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                            placeholder="http://localhost:7878"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-theme-text mb-2">
                            {t("arr.accessUrl", {
                              defaultValue: "Access URL",
                            })}
                          </label>
                          <input
                            type="url"
                            value={newArrAccessUrl}
                            onChange={(e) => setNewArrAccessUrl(e.target.value)}
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                            placeholder="https://radarr.example.com"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-theme-text mb-2">
                            {t("arr.instanceApiKey", {
                              defaultValue: "API Key",
                            })}
                          </label>
                          <input
                            type="text"
                            value={newArrApiKey}
                            onChange={(e) => setNewArrApiKey(e.target.value)}
                            className="w-full px-4 py-2 bg-theme-hover backdrop-blur-sm border border-theme hover:border-theme-primary rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all"
                            placeholder="XXXXXXXXXXXXXXXXXXXX"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={addArrInstance}
                          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm flex-1 sm:flex-initial"
                        >
                          <Plus className="w-4 h-4 text-theme-primary" />
                          {t("arr.add", { defaultValue: "Add" })}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddArr(false)}
                          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary rounded-lg text-sm font-medium transition-all shadow-sm flex-1 sm:flex-initial"
                        >
                          {t("arr.cancel", { defaultValue: "Cancel" })}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unsaved changes dialog — tab switch */}
      <ConfirmDialog
        isOpen={showUnsavedDialog}
        onClose={() => {
          setShowUnsavedDialog(false);
          setPendingTab(null);
        }}
        onConfirm={() => {
          setPendingChanges(false);
          setActiveTab(pendingTab);
          setPendingTab(null);
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. If you switch tabs now, your changes will be lost. Do you want to continue?"
        confirmText="Discard Changes"
        cancelText="Stay"
        variant="warning"
      />
    </div>
  );
}
