import { X, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = "danger", // danger, warning, info
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: "text-red-400",
      iconBg: "bg-red-500/20 border-red-500/30",
      button: "bg-red-500 hover:bg-red-600 text-white",
    },
    warning: {
      icon: "text-orange-400",
      iconBg: "bg-orange-500/20 border-orange-500/30",
      button: "bg-orange-500 hover:bg-orange-600 text-white",
    },
    info: {
      icon: "text-blue-400",
      iconBg: "bg-blue-500/20 border-blue-500/30",
      button: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-theme-card border border-theme rounded-xl shadow-2xl max-w-md w-full animate-scaleIn">
        {/* Header */}
        <div className="flex items-start justify-between p-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center border ${style.iconBg}`}
            >
              <AlertTriangle className={`w-5 h-5 ${style.icon}`} />
            </div>
            <h3 className="text-lg font-semibold text-theme-text">
              {title || t("common.confirm")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-theme-hover rounded-lg transition-colors text-theme-muted hover:text-theme-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-theme-muted leading-relaxed">
            {message || t("common.confirmMessage")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-theme hover:bg-theme-hover text-theme-text font-medium transition-colors"
          >
            {cancelText || t("common.cancel")}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md ${style.button}`}
          >
            {confirmText || t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
