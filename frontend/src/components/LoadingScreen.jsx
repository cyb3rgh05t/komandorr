import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

function LoadingScreen() {
  const { t } = useTranslation();
  const LOADING_MESSAGES = t("loading.messages", { returnObjects: true });

  const [message, setMessage] = useState(
    LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
  );
  const [dots, setDots] = useState("");

  // Change message every 3 seconds
  useEffect(() => {
    const messageInterval = setInterval(() => {
      const randomMessage =
        LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
      setMessage(randomMessage);
    }, 3000);

    return () => clearInterval(messageInterval);
  }, [LOADING_MESSAGES]);

  // Animated dots (...) every 500ms
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-theme-bg-dark via-theme-bg to-theme-bg-dark flex flex-col items-center pt-32 px-4">
      <style>{`
        @keyframes ringPulse {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        .ring-pulse-1 {
          animation: ringPulse 2s ease-in-out infinite;
        }
        .ring-pulse-2 {
          animation: ringPulse 2s ease-in-out infinite;
          animation-delay: 0.2s;
        }
        .ring-pulse-3 {
          animation: ringPulse 2s ease-in-out infinite;
          animation-delay: 0.4s;
        }
      `}</style>

      {/* Komandorr Logo */}
      <div className="mb-8">
        <img
          src="/logo.png"
          alt="Komandorr Logo"
          className="h-16 w-auto object-contain"
        />
      </div>

      {/* Spinning radar animation */}
      <div className="relative w-12 h-12 mb-8">
        {/* Outer ring - pulsing */}
        <div className="absolute inset-0 border border-theme-primary rounded-full ring-pulse-1"></div>

        {/* Middle ring - pulsing with delay */}
        <div className="absolute inset-1 border border-theme-primary rounded-full ring-pulse-2"></div>

        {/* Inner ring - pulsing with delay */}
        <div className="absolute inset-2 border border-theme-primary rounded-full ring-pulse-3"></div>
      </div>

      {/* Loading message */}
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold text-theme-text">
          {message}
          <span className="inline-block w-6 text-left text-theme-primary">
            {dots}
          </span>
        </h2>

        <p className="text-sm text-theme-text-muted">
          {t("loading.initializing")}
        </p>
      </div>
    </div>
  );
}

export default LoadingScreen;
