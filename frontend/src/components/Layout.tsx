import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BalanceDisplay } from "./BalanceDisplay";
import { useAuthStore } from "@/stores/authStore";

const baseTabs = [
  { to: "/", label: "Рынки", icon: "🏠" },
  { to: "/portfolio", label: "Мои ставки", icon: "📊" },
  { to: "/profile", label: "Профиль", icon: "👤" },
];

const adminTab = { to: "/admin", label: "Админ", icon: "⚙️" };

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const tabs = user?.is_admin ? [...baseTabs, adminTab] : baseTabs;
  return (
    <div className="max-w-lg mx-auto bg-tg-bg text-tg-text min-h-screen pb-16 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-md flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-lg font-bold">Предскажи</span>
        <BalanceDisplay />
      </header>

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto bg-tg-bg/80 backdrop-blur-md border-t border-white/10">
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
