import { useTranslation } from "react-i18next";

export default function VODPortal() {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-text">
            {t("vodPortal.title")}
          </h1>
          <p className="text-theme-text-secondary mt-1">
            {t("vodPortal.description")}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-theme-card border border-theme rounded-lg p-6">
        <div className="text-center text-theme-text-secondary">
          <p className="text-lg">{t("vodPortal.placeholder")}</p>
        </div>
      </div>
    </div>
  );
}
