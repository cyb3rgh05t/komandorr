import { useState } from "react";
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

function LoginScreen({ onLoginSuccess }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Test the credentials by making a request with Basic Auth
      const credentials = btoa(`${username}:${password}`);
      const response = await fetch("/api/health", {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      if (response.ok) {
        // Store credentials in sessionStorage for subsequent requests
        sessionStorage.setItem("auth_credentials", credentials);
        onLoginSuccess(credentials);
      } else if (response.status === 401) {
        setError(t("auth.invalidCredentials"));
      } else {
        setError(t("auth.loginError"));
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(t("auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-dark via-theme-bg to-theme-bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <img
              src="/logo.svg"
              alt="Komandorr"
              className="h-16 w-auto mx-auto object-contain"
            />
          </div>
          <p className="text-theme-text-muted">{t("auth.signInToContinue")}</p>
        </div>

        {/* Login Card */}
        <div className="bg-theme-card rounded-2xl shadow-2xl border border-theme p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-theme-text mb-2"
              >
                {t("auth.username")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-theme-text-muted" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-theme-hover border border-theme rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-theme-primary text-theme-text font-medium placeholder-theme-text-muted transition-all"
                  placeholder={t("auth.enterUsername")}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-theme-text mb-2"
              >
                {t("auth.password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-theme-text-muted" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 bg-theme-hover border border-theme rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-theme-primary text-theme-text font-medium placeholder-theme-text-muted transition-all"
                  placeholder={t("auth.enterPassword")}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-theme-text-muted hover:text-theme-text transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 flex items-center justify-center gap-2 sm:px-4 bg-theme-card hover:bg-theme-hover border border-theme hover:border-theme-primary/50 rounded-lg text-sm font-medium transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t("auth.signingIn")}</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>{t("auth.signIn")}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-theme-text-muted">
            Protected by Basic Authentication
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
