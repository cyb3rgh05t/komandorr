import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Tv,
  Smartphone,
  LogIn,
  Loader,
} from "lucide-react";

const InviteRedemption = () => {
  const { code } = useParams();
  const toast = useToast();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [backgroundImages, setBackgroundImages] = useState([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  // OAuth flow state
  const [authInProgress, setAuthInProgress] = useState(false);
  const [plexAuthWindow, setPlexAuthWindow] = useState(null);
  const [pinData, setPinData] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [serverStats, setServerStats] = useState(null);
  const [plexMedia, setPlexMedia] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    if (code) {
      validateInvite();
      fetchServerStats();
      fetchPlexMedia();
    }
    fetchBackgrounds();
  }, [code]);

  useEffect(() => {
    if (backgroundImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentBgIndex((prev) => (prev + 1) % backgroundImages.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [backgroundImages]);

  // Auto-scroll media carousel
  useEffect(() => {
    if (success && plexMedia.length > 4) {
      const interval = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % plexMedia.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [success, plexMedia]);

  // Poll for PIN authorization
  useEffect(() => {
    if (pinData && authInProgress) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await api.get(
            `/oauth/plex/check/${pinData.pin_id}?state=${pinData.state}`
          );

          if (response.authorized) {
            clearInterval(pollInterval);
            setAuthInProgress(false);

            // Close auth window if still open
            if (plexAuthWindow && !plexAuthWindow.closed) {
              plexAuthWindow.close();
            }

            // Store user info
            setUserInfo({
              auth_token: response.auth_token,
              email: response.email,
              username: response.username,
              plex_id: response.plex_id,
            });

            // Automatically redeem with OAuth token
            await redeemWithOAuth(response);
          } else if (response.expired) {
            // PIN expired - stop polling
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error("Poll error:", err);
          // Stop polling on errors to prevent spam
          clearInterval(pollInterval);
          setAuthInProgress(false);
        }
      }, 2000); // Poll every 2 seconds

      // Cleanup interval after 5 minutes
      const timeout = setTimeout(() => {
        clearInterval(pollInterval);
        setAuthInProgress(false);
        toast.error(
          "Authentifizierung abgelaufen. Bitte versuchen Sie es erneut."
        );
      }, 300000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(timeout);
      };
    }
  }, [pinData, authInProgress]);

  const fetchBackgrounds = async () => {
    try {
      const response = await fetch(
        "https://api.themoviedb.org/3/trending/movie/week?api_key=e7d2628727fa893ec3692d18f8a4aec2"
      );
      const data = await response.json();
      const images = data.results
        .slice(0, 10)
        .map(
          (movie) => `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        )
        .filter((path) => path.includes("http"));
      setBackgroundImages(images);
    } catch (error) {
      console.error("Error fetching backgrounds:", error);
    }
  };

  const fetchServerStats = async () => {
    try {
      const response = await api.get("/plex/stats");
      setServerStats(response);
    } catch (error) {
      console.error("Error fetching server stats:", error);
    }
  };

  const fetchPlexMedia = async () => {
    try {
      const response = await api.get("/plex/media/recent");
      setPlexMedia(response.media || []);
    } catch (error) {
      console.error("Error fetching Plex media:", error);
    }
  };

  const validateInvite = async () => {
    try {
      const response = await api.post(
        `/invites/validate?code=${encodeURIComponent(code.toUpperCase())}`
      );

      console.log("Validation response:", response);

      if (response.valid) {
        setInvite({
          ...response.invite,
          plex_server_name: response.plex_server_name || "Plex Server",
        });
      } else {
        // Set error message from validation response
        console.log("Setting error:", response.message);
        setError(response.message || "Ungültiger Einladungscode");
        setInvite(null); // Ensure invite is null
      }
    } catch (err) {
      console.error("Validation error:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        "Fehler beim Validieren des Einladungscodes.";
      console.log("Setting error from catch:", errorMsg);
      setError(errorMsg);
      setInvite(null); // Ensure invite is null
    } finally {
      setLoading(false);
    }
  };

  const handlePlexLogin = async () => {
    try {
      setAuthInProgress(true);

      // Get Plex PIN and auth URL
      const response = await api.get(
        `/oauth/plex/login?invite_code=${code.toUpperCase()}`
      );

      setPinData(response);

      // Open Plex auth in popup window
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const authWindow = window.open(
        response.auth_url,
        "PlexAuth",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      setPlexAuthWindow(authWindow);

      // Monitor if window is closed manually
      const checkClosed = setInterval(() => {
        if (authWindow && authWindow.closed) {
          clearInterval(checkClosed);
          if (authInProgress) {
            setAuthInProgress(false);
            toast.error("Authentifizierung abgebrochen.");
          }
        }
      }, 1000);
    } catch (err) {
      setAuthInProgress(false);
      toast.error("Fehler beim Starten der Plex-Authentifizierung.");
      console.error("Plex login error:", err);
    }
  };

  const redeemWithOAuth = async (authData) => {
    try {
      const response = await api.post("/oauth/plex/redeem", {
        invite_code: code.toUpperCase(),
        auth_token: authData.auth_token,
        email: authData.email,
        username: authData.username,
        plex_id: String(authData.plex_id), // Convert to string
      });

      if (response.success) {
        setSuccess(true);
        setCurrentStep(0);
      } else {
        toast.error(response.message || "Fehler beim Einlösen der Einladung.");
      }
    } catch (err) {
      console.error("Redeem error:", err);
      // Check if it's "already redeemed" - treat as success since user is already added
      if (err.message && err.message.includes("already redeemed")) {
        setSuccess(true);
        setCurrentStep(0);
      } else {
        toast.error(err.message || "Fehler beim Einlösen der Einladung.");
      }
    }
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, successSteps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const successSteps = [
    {
      title: `Willkommen bei ${invite?.plex_server_name || "Plex"}!`,
      description: "Ihre Einladung wurde erfolgreich angenommen",
      icon: "/vod.png",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl p-6 backdrop-blur-sm">
            <p className="text-lg text-amber-100 leading-relaxed mb-4">
              🎉 <strong className="text-white">Perfekt!</strong> Sie wurden
              erfolgreich zu {invite?.plex_server_name || "Plex"} hinzugefügt!
            </p>
            <p className="text-sm text-amber-200/80">
              Sie haben jetzt Zugriff auf Tausende von Filmen, Serien und mehr.
            </p>
          </div>
          <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Ihre Kontodaten
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-600/30">
                <span className="text-gray-400">Benutzername</span>
                <span className="text-white font-medium">
                  {userInfo?.username}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-600/30">
                <span className="text-gray-400">E-Mail</span>
                <span className="text-white font-medium">
                  {userInfo?.email}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-400">Server</span>
                <span className="text-white font-medium">
                  {invite?.plex_server_name || "Plex"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Zugriff auf Ihre Medien",
      description: "Starten Sie Plex und beginnen Sie sofort",
      icon: "/vod.png",
      content: (
        <div className="space-y-4">
          {/* Media Carousel Widget */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
              📺 Willkommen bei {invite?.plex_server_name || "Plex"}
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Gute Nachrichten — Sie haben jetzt Zugriff auf unsere{" "}
              <strong className="text-amber-400">
                {invite?.plex_server_name || "StreamNet VOD"} Medienbibliothek
              </strong>{" "}
              über Plex!
            </p>

            {/* Stats Grid */}
            {serverStats && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-700/60 rounded-lg p-3 border border-slate-600/30 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {serverStats.total_movies || 0}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Filme</div>
                </div>
                <div className="bg-slate-700/60 rounded-lg p-3 border border-slate-600/30 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {serverStats.total_tv_shows || 0}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Serien</div>
                </div>
                <div className="bg-slate-700/60 rounded-lg p-3 border border-slate-600/30 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {(serverStats.total_movies || 0) +
                      (serverStats.total_tv_shows || 0)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Insgesamt</div>
                </div>
              </div>
            )}

            {/* Media Slideshow */}
            <div className="relative overflow-hidden rounded-lg mb-4 h-48">
              {plexMedia.length > 0 ? (
                <div
                  className="flex gap-2 transition-transform duration-700 ease-in-out"
                  style={{ transform: `translateX(-${carouselIndex * 136}px)` }}
                >
                  {plexMedia.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-32 h-48 rounded-lg overflow-hidden border-2 border-slate-600/50 hover:border-amber-500/50 transition-all duration-300 hover:scale-105 group relative"
                      title={item.title}
                    >
                      <img
                        src={`/api/plex/proxy/image?url=${encodeURIComponent(
                          item.poster
                        )}`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-white text-xs font-semibold truncate">
                            {item.title}
                          </p>
                          {item.year && (
                            <p className="text-gray-300 text-xs">{item.year}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-32 h-48 rounded-lg bg-slate-700/50 border-2 border-slate-600/50 animate-pulse"
                    ></div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Sections */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  Zugriff auf unsere ständig aktualisierte Liste von Filmen und
                  Serien
                </span>
              </div>
              <div className="flex items-start gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  Auf Abruf ansehen oder für Offline-Ansicht herunterladen
                </span>
              </div>
              <div className="flex items-start gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Personalisierte Watchlists & Empfehlungen</span>
              </div>
            </div>
          </div>

          {/* Browser Access */}
          <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/40 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-white font-bold text-xl mb-3 flex items-center gap-2">
              🌐 Im Browser streamen
            </h3>
            <p className="text-amber-100 mb-4 text-sm">
              Der schnellste Weg zum Streamen ist über Ihren Webbrowser. Keine
              Installation erforderlich!
            </p>
            <a
              href="https://app.plex.tv"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 rounded-xl font-semibold bg-[#e5a00d] hover:bg-[#cc8f0c] text-white transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Plex Web App öffnen
            </a>
          </div>
          <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-5">
            <p className="text-gray-300 text-sm">
              💡 <strong className="text-white">Tipp:</strong> Melden Sie sich
              mit dem gleichen Plex-Konto an, das Sie gerade autorisiert haben.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Apps für alle Geräte",
      description: "Streamen Sie überall und jederzeit",
      icon: "/vod.png",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-white font-bold text-xl mb-2">
              📱 Plex auf allen Geräten
            </h3>
            <p className="text-amber-100 mb-4 text-sm">
              Laden Sie die Plex App auf Ihre Lieblingsgeräte herunter und
              streamen Sie unterwegs.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="https://www.plex.tv/media-server-downloads/#plex-app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-5 bg-slate-700/60 hover:bg-slate-700 rounded-xl transition-all duration-300 border border-slate-600/30"
            >
              <Smartphone className="w-8 h-8 text-amber-400" />
              <span className="text-white font-medium text-sm">
                Mobile Apps
              </span>
              <span className="text-xs text-gray-400">iOS & Android</span>
            </a>
            <a
              href="https://www.plex.tv/media-server-downloads/#plex-app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-5 bg-slate-700/60 hover:bg-slate-700 rounded-xl transition-all duration-300 border border-slate-600/30"
            >
              <Tv className="w-8 h-8 text-amber-400" />
              <span className="text-white font-medium text-sm">Smart TV</span>
              <span className="text-xs text-gray-400">
                Roku, Fire TV & mehr
              </span>
            </a>
          </div>
          <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-4">
            <p className="text-gray-300 text-xs text-center">
              Verfügbar für Windows, Mac, Linux, iOS, Android, Roku, Fire TV,
              Apple TV, und viele mehr
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Alles bereit!",
      description: "Viel Spaß beim Streamen",
      icon: "/vod.png",
      content: (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl p-6 backdrop-blur-sm text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-2xl text-white mb-2 font-bold">
              🎬 Sie sind startklar!
            </h3>
            <p className="text-base text-amber-100 leading-relaxed">
              Genießen Sie unbegrenzten Zugang zu Ihrer Medienbibliothek. Viel
              Spaß beim Streamen!
            </p>
          </div>

          {/* Quality Settings Tips */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h4 className="text-white font-bold text-xl mb-3 flex items-center gap-2">
              🎞️ Die beste Qualität erhalten
            </h4>
            <p className="text-gray-300 text-sm mb-4">
              Plex verwendet manchmal standardmäßig niedrige Qualität oder zeigt
              zuerst eigene Werbung. So beheben Sie das:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-400 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">
                    Trailer & Extras deaktivieren
                  </p>
                  <p className="text-gray-400 text-xs">
                    Einstellungen → Erfahrung → Häkchen entfernen bei "Filmische
                    Trailer anzeigen"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-400 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">
                    Originalqualität erzwingen
                  </p>
                  <p className="text-gray-400 text-xs">
                    Einstellungen → Wiedergabe → ändern Sie "Automatisch" zu
                    "Original"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-400 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">
                    Kabelverbindung verwenden
                  </p>
                  <p className="text-gray-400 text-xs">
                    Wenn Sie an einem Smart-TV für ruckelfreies 4K sind.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-5">
            <p className="text-gray-300 text-sm">
              <strong className="text-white">Brauchen Sie Hilfe?</strong>
              <br />
              Besuchen Sie{" "}
              <a
                href="https://support.plex.tv"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                support.plex.tv
              </a>{" "}
              für Anleitungen und FAQs
            </p>
          </div>
        </div>
      ),
    },
  ];

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {backgroundImages.length > 0 && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={backgroundImages[currentBgIndex]}
              alt="Background"
              className="w-full h-full object-cover transition-opacity duration-1000"
            />
          </div>
        )}

        <div className="max-w-2xl w-full bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-slate-700/50 relative z-10">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>
              <div
                className="absolute inset-0 w-24 h-24 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1.5s",
                }}
              ></div>
              <div
                className="absolute inset-0 w-24 h-24 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"
                style={{ animationDuration: "2s" }}
              ></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Laden Ihrer Einladung
          </h2>
          <p className="text-base text-gray-300">
            Einladungscode wird überprüft...
          </p>
        </div>
      </div>
    );
  }

  // Success screen (walkthrough)
  if (success) {
    const currentStepData = successSteps[currentStep];
    const StepIcon = currentStepData.icon;
    const isLastStep = currentStep === successSteps.length - 1;
    const isIconString = typeof StepIcon === "string";

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 p-6 relative overflow-hidden">
        {backgroundImages.length > 0 && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={backgroundImages[currentBgIndex]}
              alt="Background"
              className="w-full h-full object-cover transition-opacity duration-1000"
            />
          </div>
        )}

        <div className="max-w-3xl w-full bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50 relative z-10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-500"></div>

          <div className="bg-slate-700/50 px-8 py-5 border-b border-slate-600/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-300">
                Schritt {currentStep + 1} von {successSteps.length}
              </span>
              <span className="text-sm text-gray-400 font-medium">
                {Math.round(((currentStep + 1) / successSteps.length) * 100)}%
                Abgeschlossen
              </span>
            </div>
            <div className="w-full bg-slate-600/30 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-500 bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-500"
                style={{
                  width: `${((currentStep + 1) / successSteps.length) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400/20 via-orange-500/20 to-amber-500/20 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm border border-slate-600/30">
                {isIconString ? (
                  <img
                    src={StepIcon}
                    alt="Icon"
                    className="w-14 h-14 object-contain"
                  />
                ) : (
                  <StepIcon className="w-14 h-14 text-white" />
                )}
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                {currentStepData.title}
              </h2>
              <p className="text-lg text-gray-300">
                {currentStepData.description}
              </p>
            </div>

            <div className="mb-8">{currentStepData.content}</div>

            <div className="flex gap-4">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="flex-1 h-12 rounded-xl font-semibold bg-slate-700/50 hover:bg-slate-700 text-white transition-all duration-300 border border-slate-600/50 flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Zurück
                </button>
              )}
              {!isLastStep ? (
                <button
                  onClick={nextStep}
                  className="flex-1 h-12 rounded-xl font-semibold bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-500 text-white transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  Weiter
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ) : (
                <a
                  href="https://app.plex.tv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-12 rounded-xl font-semibold bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-500 hover:shadow-orange-500/50 hover:shadow-xl text-white transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  Plex Web App öffnen
                  <Play className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error screen - show when invite is not available
  if (!invite) {
    const isExpired = error?.toLowerCase().includes("expired");
    const isExhausted =
      error?.toLowerCase().includes("usage limit") ||
      error?.toLowerCase().includes("exhausted");
    const isDisabled = error?.toLowerCase().includes("disabled");

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 p-6 relative overflow-hidden">
        {backgroundImages.length > 0 && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={backgroundImages[currentBgIndex]}
              alt="Background"
              className="w-full h-full object-cover transition-opacity duration-1000"
            />
          </div>
        )}

        <div className="max-w-3xl w-full relative z-10">
          <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-red-500/30">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>

            <div className="p-10 text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg backdrop-blur-sm border border-red-500/30">
                <XCircle className="w-14 h-14 text-red-400" />
              </div>

              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-red-400 via-orange-400 to-red-400 bg-clip-text text-transparent leading-tight">
                {isExpired
                  ? "Einladung abgelaufen"
                  : isExhausted
                  ? "Einladung ausgeschöpft"
                  : isDisabled
                  ? "Einladung deaktiviert"
                  : "Ungültiger Einladungscode"}
              </h1>

              <p className="text-lg text-gray-300 mb-8 font-light max-w-2xl mx-auto leading-relaxed">
                {error ||
                  "Dieser Einladungscode ist nicht gültig oder abgelaufen."}
              </p>

              <div className="bg-slate-700/50 rounded-xl p-6 mb-8 border border-slate-600/30">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-white font-semibold mb-3 text-lg">
                      Was ist passiert?
                    </h3>
                    <p className="text-gray-300 text-base leading-relaxed break-words">
                      {isExpired && (
                        <>
                          Diese Einladung ist{" "}
                          <strong className="text-red-400">abgelaufen</strong>.
                          Bitte kontaktieren Sie die Person, die Ihnen diesen
                          Link gesendet hat, um eine neue Einladung anzufordern.
                        </>
                      )}
                      {isExhausted && (
                        <>
                          Diese Einladung hat das{" "}
                          <strong className="text-orange-400">
                            maximale Nutzungslimit
                          </strong>{" "}
                          erreicht. Bitte kontaktieren Sie die Person, die Ihnen
                          diesen Link gesendet hat, um eine neue Einladung
                          anzufordern.
                        </>
                      )}
                      {isDisabled && (
                        <>
                          Diese Einladung wurde{" "}
                          <strong className="text-gray-400">deaktiviert</strong>
                          . Bitte kontaktieren Sie die Person, die Ihnen diesen
                          Link gesendet hat, für weitere Unterstützung.
                        </>
                      )}
                      {!isExpired && !isExhausted && !isDisabled && (
                        <>
                          Wenn Sie glauben, dass dies ein Fehler ist, wenden Sie
                          sich bitte an die Person, die Ihnen den Einladungslink
                          geschickt hat.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <a
                href="https://www.plex.tv"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-14 rounded-xl font-semibold text-lg bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Play className="w-5 h-5" />
                Zu Plex gehen
              </a>

              <p className="text-gray-400 text-sm mt-6">
                Haben Sie bereits ein Plex-Konto? Melden Sie sich direkt an.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main invite redemption screen with Plex OAuth
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 relative overflow-hidden">
      {backgroundImages.length > 0 && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={backgroundImages[currentBgIndex]}
            alt="Background"
            className="w-full h-full object-cover transition-opacity duration-1000"
          />
        </div>
      )}

      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-4xl">
          {/* Single Combined Box */}
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
            <div className="p-8 space-y-8">
              {/* Title Section */}
              <div className="flex justify-center">
                <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight whitespace-nowrap text-center">
                  <span className="text-white">Du wurdest </span>
                  <span className="text-amber-400">eingeladen!</span>
                </h1>
              </div>

              {/* Welcome Section */}
              <div className="text-center">
                <p className="text-sm text-orange-300/80 uppercase tracking-widest font-medium mb-2">
                  WILLKOMMEN BEI
                </p>
                <p className="text-3xl font-bold text-white mb-2">
                  {invite.plex_server_name || "Plex Server"}
                </p>
                <p className="text-lg text-gray-300/90 font-light">
                  Dein Tor zur ultimativen Medienwelt.
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-700/50"></div>

              {/* Code Entry Section */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Gib den Code ein, um fortzufahren
                  </h2>
                  <p className="text-gray-400/80 text-sm">Einladungscode</p>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={invite.code}
                    readOnly
                    className="w-full px-4 py-4 text-center text-xl font-mono tracking-[0.3em] bg-slate-700/60 border-2 border-slate-600 text-white rounded-xl backdrop-blur-sm focus:outline-none"
                  />
                </div>

                <button
                  onClick={handlePlexLogin}
                  disabled={authInProgress}
                  className={`w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                    authInProgress
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-[#e5a00d] hover:bg-[#cc8f0c]"
                  } text-white flex items-center justify-center gap-2`}
                >
                  {authInProgress ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Warte auf Autorisierung...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Server beitreten</span>
                    </>
                  )}
                </button>

                <div className="pt-4 border-t border-gray-700/50">
                  <p className="text-center text-sm text-gray-400">
                    Kein Plex-Konto?{" "}
                    <a
                      href="https://www.plex.tv/sign-up/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 font-medium underline"
                    >
                      Hier erstellen
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500/80 mt-6">
            Sicheres Einladungssystem dank {invite?.plex_server_name || "Plex"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InviteRedemption;
