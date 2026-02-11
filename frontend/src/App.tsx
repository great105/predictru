import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { MarketPage } from "@/pages/MarketPage";
import { PortfolioPage } from "@/pages/PortfolioPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProposePage } from "@/pages/ProposePage";
import { AdminPage } from "@/pages/AdminPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: "#ff4444", background: "#1a1a1a", minHeight: "100vh" }}>
          <h2>App Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", maxWidth: 512, margin: "0 auto", background: "var(--tg-theme-bg-color, #ffffff)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="animate-spin" style={{
            width: 32, height: 32,
            border: "4px solid #3b82f6",
            borderTopColor: "transparent",
            borderRadius: "50%",
            margin: "0 auto 12px",
          }} />
          <p style={{ color: "#999" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", maxWidth: 512, margin: "0 auto", padding: 20, textAlign: "center",
        background: "var(--tg-theme-bg-color, #ffffff)",
        color: "var(--tg-theme-text-color, #000000)",
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>PredictRu</h1>
          <p style={{ color: "var(--tg-theme-hint-color, #999)" }}>
            {error || "Please open this app from Telegram"}
          </p>
          <p style={{ color: "#666", fontSize: 12, marginTop: 16 }}>
            initData: {window.Telegram?.WebApp?.initData ? "present" : "missing"}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthGate>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
              <Route path="/market/:id" element={<MarketPage />} />
              <Route path="/propose" element={<ProposePage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </AuthGate>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
