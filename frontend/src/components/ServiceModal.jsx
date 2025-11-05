import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

export default function ServiceModal({ service, onClose, onSave }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: service?.name || "",
    url: service?.url || "",
    type: service?.type || "app",
    description: service?.description || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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
              className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary"
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
              className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              {t("service.type")}
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary"
            >
              <option value="app">{t("service.types.app")}</option>
              <option value="website">{t("service.types.website")}</option>
              <option value="panel">{t("service.types.panel")}</option>
              <option value="project">{t("service.types.project")}</option>
            </select>
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
              className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme-text focus:outline-none focus:border-theme-primary resize-none"
              placeholder="Optional description"
            />
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
