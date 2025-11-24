import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Plus,
  ChevronDown,
  Check,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "../services/api";

export default function ServiceModal({ isOpen, service, onClose, onSave }) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const groupDropdownRef = useRef(null);
  const typeDropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    type: "app",
    description: "",
    group: "",
    icon: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      // Update form data when service changes
      setFormData({
        name: service?.name || "",
        url: service?.url || "",
        type: service?.type || "app",
        description: service?.description || "",
        group: service?.group || "",
        icon: service?.icon || "",
      });
      // Set icon preview if service has an icon
      if (service?.icon) {
        setIconPreview(service.icon);
      } else {
        setIconPreview(null);
      }
      setIconFile(null);
    }
  }, [isOpen, service]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        groupDropdownRef.current &&
        !groupDropdownRef.current.contains(event.target)
      ) {
        setShowGroupDropdown(false);
      }
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target)
      ) {
        setShowTypeDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchGroups = async () => {
    try {
      const services = await api.getServices();
      // Extract unique groups
      const uniqueGroups = [
        ...new Set(services.map((s) => s.group).filter(Boolean)),
      ];
      setGroups(uniqueGroups);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim() && !groups.includes(newGroupName.trim())) {
      const updatedGroups = [...groups, newGroupName.trim()];
      setGroups(updatedGroups);
      setFormData({ ...formData, group: newGroupName.trim() });
      setNewGroupName("");
      setShowNewGroupInput(false);
    }
  };

  const handleIconChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("File size must be less than 2MB");
        return;
      }

      setIconFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveIcon = () => {
    setIconFile(null);
    setIconPreview(null);
    setFormData({ ...formData, icon: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let iconPath = formData.icon;

    // Upload icon if a new file was selected
    if (iconFile) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", iconFile);

        // Get auth credentials from sessionStorage
        const credentials = sessionStorage.getItem("auth_credentials");

        const response = await fetch("/api/upload-icon", {
          method: "POST",
          headers: {
            ...(credentials && { Authorization: `Basic ${credentials}` }),
          },
          body: uploadFormData,
        });

        if (response.ok) {
          const data = await response.json();
          iconPath = data.path;
          console.log("Icon uploaded successfully:", iconPath);
          console.log("Full response:", data);
          // Update preview to show the uploaded icon
          setIconPreview(iconPath);
        } else {
          const errorText = await response.text();
          console.error(
            "Upload failed with status:",
            response.status,
            errorText
          );
          alert("Failed to upload icon");
          return;
        }
      } catch (error) {
        console.error("Failed to upload icon:", error);
        alert("Failed to upload icon");
        return;
      }
    }

    onSave({ ...formData, icon: iconPath });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-theme-card rounded-lg shadow-xl max-w-md w-full border border-theme">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <h2 className="text-xl font-semibold text-theme-text">
            {service ? t("form.editService") : t("form.addService")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-theme-hover rounded-lg transition-colors"
          >
            <X className="text-theme-text-muted" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              {t("service.name")}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary"
              placeholder="My Service"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              {t("service.url")}
            </label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              {t("service.type")}
            </label>
            <div className="relative" ref={typeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="w-full px-3 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary flex items-center justify-between"
              >
                <span className="text-theme-text">
                  {t(`service.types.${formData.type}`)}
                </span>
                <ChevronDown size={16} className="text-theme-text-muted" />
              </button>

              {showTypeDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowTypeDropdown(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 w-full rounded-lg bg-theme-card border border-theme shadow-lg z-50">
                    <div className="p-2">
                      {["app", "website", "panel", "project", "server"].map(
                        (type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, type });
                              setShowTypeDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                              formData.type === type
                                ? "bg-theme-primary text-white"
                                : "text-theme-text-muted hover:bg-theme-hover"
                            }`}
                          >
                            <span>{t(`service.types.${type}`)}</span>
                            {formData.type === type && <Check size={16} />}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              {t("service.description")}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary resize-none"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              {t("service.icon")}
            </label>
            <div className="space-y-2">
              {iconPreview ? (
                <div className="relative w-full p-4 bg-theme-bg border border-theme rounded-lg">
                  <div className="flex items-center gap-4">
                    <img
                      src={iconPreview}
                      alt="Icon preview"
                      className="w-16 h-16 object-contain rounded-lg"
                      onLoad={() =>
                        console.log("Icon preview loaded:", iconPreview)
                      }
                      onError={(e) => {
                        console.error(
                          "Failed to load icon preview:",
                          iconPreview
                        );
                        console.error("Error event:", e);
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-theme-text">Icon selected</p>
                      <p className="text-xs text-theme-text-muted">
                        {iconFile ? iconFile.name : "Current icon"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="p-2 hover:bg-theme-hover rounded-lg transition-colors"
                    >
                      <X className="text-theme-text-muted" size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-6 bg-theme-hover border-2 border-dashed border-theme rounded-lg hover:bg-theme-hover transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="text-theme-primary" size={24} />
                  <span className="text-sm text-theme-text">
                    {t("service.uploadIcon")}
                  </span>
                  <span className="text-xs text-theme-text-muted">
                    PNG, JPG, SVG (max 2MB)
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleIconChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              {t("service.group")}
            </label>
            <div className="space-y-2">
              <div className="relative" ref={groupDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                  className="w-full px-3 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary flex items-center justify-between"
                >
                  <span
                    className={
                      formData.group
                        ? "text-theme-text"
                        : "text-theme-text-muted"
                    }
                  >
                    {formData.group || t("service.noGroup")}
                  </span>
                  <ChevronDown size={16} className="text-theme-text-muted" />
                </button>

                {showGroupDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowGroupDropdown(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 w-full rounded-lg bg-theme-card border border-theme shadow-lg z-50 max-h-48 overflow-y-auto">
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, group: "" });
                            setShowGroupDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                            !formData.group
                              ? "bg-theme-primary text-white"
                              : "text-theme-text-muted hover:bg-theme-hover"
                          }`}
                        >
                          <span>{t("service.noGroup")}</span>
                          {!formData.group && <Check size={16} />}
                        </button>
                        {groups.map((group) => (
                          <button
                            key={group}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, group });
                              setShowGroupDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                              formData.group === group
                                ? "bg-theme-primary text-white"
                                : "text-theme-text-muted hover:bg-theme-hover"
                            }`}
                          >
                            <span>{group}</span>
                            {formData.group === group && <Check size={16} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {showNewGroupInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), handleCreateGroup())
                    }
                    placeholder={t("service.newGroupName")}
                    className="flex-1 px-3 py-2 bg-theme-hover border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
                  >
                    {t("form.add")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewGroupInput(false);
                      setNewGroupName("");
                    }}
                    className="px-4 py-2 bg-theme-bg-hover text-theme-text rounded-lg hover:bg-theme-hover transition-colors"
                  >
                    {t("form.cancel")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewGroupInput(true)}
                  className="w-full px-3 py-2 bg-theme-bg-hover text-theme-text rounded-lg hover:bg-theme-hover transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  <span>{t("service.createGroup")}</span>
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-theme-bg-hover text-theme-text rounded-lg hover:bg-theme-hover transition-colors"
            >
              {t("form.cancel")}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
            >
              {service ? t("form.save") : t("form.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
