import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Monitor from "./pages/Monitor";
import Traffic from "./pages/Traffic";
import VODStreams from "./pages/VODStreams";
import VODActivity from "./pages/VODActivity";
import Settings from "./pages/Settings";
import About from "./pages/About";
import InviteRedemption from "./pages/InviteRedemption";
import InviteRedeem from "./pages/InviteRedeem";
import InvitesManager from "./pages/InvitesManager";
import UserAccounts from "./pages/UserAccounts";
import UserHistory from "./pages/UserHistory";
import LoadingScreen from "./components/LoadingScreen";
import LoginScreen from "./components/LoginScreen";
import "./i18n";

// Create a client with optimized options for instant page loads
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always consider data stale (rely on page-specific settings)
      gcTime: 300000, // Keep unused data in cache for 5 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on mount if we have data
      retry: 1, // Retry failed requests once
      networkMode: "online", // Only fetch when online
    },
  },
});

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCredentials, setAuthCredentials] = useState(null);
  const [authEnabled, setAuthEnabled] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Check if we're on the invite redemption page
    const isInvitePage =
      window.location.pathname.startsWith("/invite/") ||
      window.location.pathname === "/redeem";

    // Skip auth check for invite pages
    if (isInvitePage) {
      setIsLoading(false);
      setAppReady(true);
      setIsAuthenticated(true); // Bypass auth for invite pages
      return;
    }

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

  // Only hide loading screen when auth check is done AND minimum time has passed
  useEffect(() => {
    if (appReady) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [appReady]);

  const handleLoginSuccess = (credentials) => {
    setAuthCredentials(credentials);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LoadingScreen />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  if (authEnabled && !isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public invite redemption pages (no layout) */}
              <Route path="/invite/:code" element={<InviteRedemption />} />
              <Route path="/redeem" element={<InviteRedeem />} />

              {/* Protected routes with layout */}
              <Route
                path="*"
                element={
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/monitor" element={<Monitor />} />
                      <Route path="/traffic" element={<Traffic />} />
                      <Route path="/vod-streams" element={<VODStreams />} />
                      <Route path="/vod-activity" element={<VODActivity />} />
                      <Route path="/invites" element={<InvitesManager />} />
                      <Route path="/user-accounts" element={<UserAccounts />} />
                      <Route path="/user-history" element={<UserHistory />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/about" element={<About />} />
                    </Routes>
                  </Layout>
                }
              />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
