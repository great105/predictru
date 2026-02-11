import { NavLink, Outlet } from "react-router-dom";
import { BalanceDisplay } from "./BalanceDisplay";
import { useAuthStore } from "@/stores/authStore";

const baseTabs = [
  { to: "/", label: "Рынки", icon: "🏠" },
  { to: "/portfolio", label: "Портфель", icon: "💼" },
  { to: "/leaderboard", label: "Топ", icon: "🏆" },
  { to: "/profile", label: "Профиль", icon: "👤" },
];

const adminTab = { to: "/admin", label: "Админ", icon: "⚙️" };

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const tabs = user?.is_admin ? [...baseTabs, adminTab] : baseTabs;
  return (
    <div className="max-w-lg mx-auto bg-tg-bg text-tg-text min-h-screen pb-16">
      <header className="sticky top-0 z-40 bg-tg-bg flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="text-lg font-bold">PredictRu</span>
        <BalanceDisplay />
      </header>

      <main>
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto bg-tg-bg border-t border-gray-200">
          <div className="flex justify-around py-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                    isActive ? "text-tg-button" : "text-tg-hint"
                  }`
                }
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
