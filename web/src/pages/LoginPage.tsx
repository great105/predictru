import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TelegramLogin from "../components/TelegramLogin";
import { useAuthStore } from "../store";
import type { TelegramLoginData } from "../types";
import { useEffect } from "react";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleAuth = async (user: TelegramLoginData) => {
    try {
      await login(user);
      navigate("/", { replace: true });
    } catch {
      alert("Ошибка авторизации. Попробуйте снова.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-surface-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-accent/3 to-transparent rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-md px-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-blue-600 shadow-xl shadow-accent/30 mb-6">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold gradient-text tracking-tight">
            ПредскажиРу
          </h1>
          <p className="text-muted mt-3 text-sm leading-relaxed">
            Рынок предсказаний нового поколения.<br />
            Торгуйте мнениями о будущих событиях.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-3 gap-3 mb-10"
        >
          {[
            { icon: "📊", label: "Рынки" },
            { icon: "⚡", label: "Мгновенно" },
            { icon: "🏆", label: "Рейтинг" },
          ].map((f) => (
            <div key={f.label} className="glass rounded-xl p-3 text-center">
              <span className="text-xl">{f.icon}</span>
              <p className="text-[10px] text-muted mt-1">{f.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Login button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted text-sm py-4">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Авторизация...
            </div>
          ) : (
            <TelegramLogin
              botName="predictru_bot"
              onAuth={handleAuth}
              buttonSize="large"
              cornerRadius={14}
            />
          )}

          <p className="text-[10px] text-muted/60">
            Авторизуясь, вы принимаете условия использования платформы
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
