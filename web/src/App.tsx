import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store";
import { useEffect } from "react";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import MarketPage from "./pages/MarketPage";
import PortfolioPage from "./pages/PortfolioPage";
import ProfilePage from "./pages/ProfilePage";

import AdminPage from "./pages/AdminPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const restore = useAuthStore((s) => s.restore);
  useEffect(() => { restore(); }, [restore]);

  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="app" element={<HomePage />} />
        <Route path="market/:id" element={<MarketPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="profile" element={<ProfilePage />} />

        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
