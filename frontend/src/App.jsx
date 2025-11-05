import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import About from "./pages/About";
import LoadingScreen from "./components/LoadingScreen";
import LoginScreen from "./components/LoginScreen";
import "./i18n";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCredentials, setAuthCredentials] = useState(null);

  useEffect(() => {
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
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

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

  if (!isAuthenticated) {
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
