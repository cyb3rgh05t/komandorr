import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Monitor from "./pages/Monitor";
import Traffic from "./pages/Traffic";
import VODStreams from "./pages/VODStreams";
import Settings from "./pages/Settings";
import About from "./pages/About";
import LoadingScreen from "./components/LoadingScreen";
import LoginScreen from "./components/LoginScreen";
import "./i18n";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCredentials, setAuthCredentials] = useState(null);
  const [authEnabled, setAuthEnabled] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Ensure loading screen shows for at least 1 second for smooth UX
    const minLoadingTime = setTimeout(() => {
      setAppReady(true);
    }, 1000);

    // First, check if authentication is enabled
    fetch("/api/auth/status")
      .then((response) => response.json())
      .then((data) => {
        setAuthEnabled(data.enabled);

        // If auth is disabled, skip authentication
        if (!data.enabled) {
          setIsAuthenticated(true);
          return;
        }

        // Check if user is already authenticated
        const savedCredentials = sessionStorage.getItem("auth_credentials");
        if (savedCredentials) {
          // Verify the credentials are still valid
          fetch("/api/health", {
            headers: {
              Authorization: `Basic ${savedCredentials}`,
            },
          })
            .then((response) => {
              if (response.ok) {
                setAuthCredentials(savedCredentials);
                setIsAuthenticated(true);
              } else {
                sessionStorage.removeItem("auth_credentials");
              }
            })
            .catch(() => {
              sessionStorage.removeItem("auth_credentials");
            });
        }
      })
      .catch((error) => {
        console.error("Error checking auth status:", error);
        // On error, assume auth is enabled for security
        setAuthEnabled(true);
      });

    return () => clearTimeout(minLoadingTime);
  }, []);

  // Only hide loading screen when both auth check is done AND minimum time has passed
  useEffect(() => {
    if (appReady && (isAuthenticated || !authEnabled)) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [appReady, isAuthenticated, authEnabled]);

  const handleLoginSuccess = (credentials) => {
    setAuthCredentials(credentials);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <ThemeProvider>
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  if (authEnabled && !isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/services" element={<Services />} />
              <Route path="/monitor" element={<Monitor />} />
              <Route path="/traffic" element={<Traffic />} />
              <Route path="/vod-streams" element={<VODStreams />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
