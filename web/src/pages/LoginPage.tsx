import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../store";
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api";

export default function LoginPage() {
  const { isAuthenticated, restore } = useAuthStore();
  const navigate = useNavigate();

  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "waiting" | "error">("idle");
  const pollingRef = useRef<number | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  // Generate login token on mount
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const { data } = await api.post("/auth/bot-login-init");
        if (!cancelled) {
          setLoginToken(data.token);
          tokenRef.current = data.token;
        }
      } catch {
        if (!cancelled) setPhase("error");
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setPhase("waiting");

    const poll = async () => {
      const token = tokenRef.current;
      if (!token) return;
      try {
        const { data } = await api.get(`/auth/bot-login-status/${token}`);
        if (data.status === "confirmed") {
          // Save auth data (same keys as store.login)
          localStorage.setItem("token", data.access_token);
          localStorage.setItem("user", JSON.stringify(data.user));
          // Update Zustand state
          useAuthStore.getState().restore();
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          // Token expired — stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPhase("error");
        }
      }
    };

    poll();
    pollingRef.current = window.setInterval(poll, 2000);
  }, []);

  const handleOpenTelegram = () => {
    if (!loginToken) return;
    startPolling();
    window.open(
      `https://t.me/predskazu_bot?start=login_${loginToken}`,
      "_blank"
    );
  };

  const handleRetry = async () => {
    setPhase("idle");
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    try {
      const { data } = await api.post("/auth/bot-login-init");
      setLoginToken(data.token);
      tokenRef.current = data.token;
    } catch {
      setPhase("error");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-base-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-radial from-brand/8 via-brand/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-gradient-radial from-amber/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10">
        <div className="max-w-site mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <span className="text-lg font-display font-bold">ПредскажиРу</span>
            </div>
            <span className="text-sm text-txt-muted font-mono">предскажи.рф</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative z-10 max-w-site mx-auto px-6 lg:px-12 pt-16 sm:pt-24 lg:pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span className="text-xs font-medium text-brand">Торги открыты</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold leading-[1.1] tracking-tight mb-6">
              Рынок{" "}
              <span className="text-gradient">предсказаний</span>{" "}
              нового поколения
            </h1>

            <p className="text-lg sm:text-xl text-txt-secondary leading-relaxed max-w-lg mb-10">
              Торгуйте прогнозами на реальные события —
              политика, спорт, криптовалюты, экономика.
              Зарабатывайте на точных предсказаниях.
            </p>

            {/* Telegram bot login */}
            <div className="space-y-4">
              {phase === "waiting" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-txt-secondary">
                    <svg className="animate-spin w-5 h-5 text-brand" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm font-medium">
                      Ожидание подтверждения в Telegram...
                    </span>
                  </div>
                  <p className="text-xs text-txt-muted">
                    Нажмите <b>Start</b> (или <b>Запустить</b>) в боте, затем вернитесь сюда.
                  </p>
                  <button
                    onClick={handleOpenTelegram}
                    className="text-xs text-brand hover:underline"
                  >
                    Открыть Telegram ещё раз
                  </button>
                </div>
              ) : phase === "error" ? (
                <div className="space-y-3">
                  <p className="text-sm text-no">
                    Токен истёк или произошла ошибка.
                  </p>
                  <button
                    onClick={handleRetry}
                    className="btn-primary"
                  >
                    Попробовать снова
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleOpenTelegram}
                    disabled={!loginToken}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold text-base transition-all shadow-lg shadow-[#2AABEE]/20 hover:shadow-[#2AABEE]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Войти через Telegram
                  </button>
                  <p className="text-xs text-txt-muted max-w-sm">
                    Откроется Telegram — нажмите <b>Start</b> в боте.
                    <br />
                    Никаких паролей, вход за 3 секунды.
                  </p>
                </>
              )}
            </div>
          </motion.div>

          {/* Right: feature cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
                  title: "Торгуйте",
                  desc: "Покупайте акции ДА/НЕТ на события",
                  color: "brand",
                },
                {
                  icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                  title: "Зарабатывайте",
                  desc: "Получайте PRC за точные прогнозы",
                  color: "yes",
                },
                {
                  icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5",
                  title: "LMSR & CLOB",
                  desc: "Два режима: автомаркетмейкер и ордерная книга",
                  color: "amber",
                },
                {
                  icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
                  title: "Аналитика",
                  desc: "Графики, рейтинги, статистика",
                  color: "brand",
                },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="card p-5"
                >
                  <div className={`w-10 h-10 rounded-lg bg-${f.color}/10 flex items-center justify-center mb-3`}>
                    <svg className={`w-5 h-5 text-${f.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="font-display font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-txt-muted leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
