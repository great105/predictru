import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../store";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/", label: "Рынки", end: true },
  { to: "/portfolio", label: "Портфель" },
  { to: "/leaderboard", label: "Рейтинг" },
  { to: "/profile", label: "Профиль" },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 border-b border-line bg-base-900/80 backdrop-blur-xl">
        <div className="container-site">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <span className="text-lg font-display font-bold tracking-tight hidden sm:block">
                ПредскажиРу
              </span>
            </NavLink>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-brand bg-brand/10"
                        : "text-txt-secondary hover:text-txt hover:bg-base-700"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Right section: balance + user */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-700 border border-line">
                <span className="text-xs text-txt-muted">Баланс</span>
                <span className="text-sm font-mono font-semibold text-brand">
                  {Number(user?.balance ?? 0).toLocaleString("ru-RU")} PRC
                </span>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center text-brand font-bold text-sm font-display">
                  {user?.first_name?.[0] ?? "?"}
                </div>
                <button
                  onClick={logout}
                  className="text-xs text-txt-muted hover:text-no transition-colors"
                >
                  Выйти
                </button>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-base-700 transition-colors"
              >
                <svg className="w-5 h-5 text-txt-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-line overflow-hidden bg-base-900"
            >
              <div className="container-site py-4 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "text-brand bg-brand/10"
                          : "text-txt-secondary hover:text-txt hover:bg-base-700"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-line px-4">
                  <div>
                    <span className="text-sm font-medium">{user?.first_name}</span>
                    <span className="block text-xs font-mono text-brand mt-0.5">
                      {Number(user?.balance ?? 0).toLocaleString("ru-RU")} PRC
                    </span>
                  </div>
                  <button onClick={logout} className="text-xs text-no hover:text-no-light">
                    Выйти
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="container-site py-6 lg:py-10"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-line relative z-10">
        <div className="container-site py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-txt-muted text-sm">
              <span className="font-display font-semibold text-txt-secondary">ПредскажиРу</span>
              <span>&middot;</span>
              <span>Рынок предсказаний</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-txt-muted">
              <a href="https://t.me/predskazu_bot" target="_blank" rel="noopener noreferrer" className="hover:text-brand transition-colors">
                Telegram-бот
              </a>
              <span>&middot;</span>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
