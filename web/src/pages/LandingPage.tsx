import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import axios from "axios";
import type { Market } from "../types";

const TELEGRAM_BOT = "https://t.me/predskazu_bot";

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─── data ─── */
const STEPS = [
  {
    num: "01",
    title: "Открой бота",
    desc: "Запусти @predskazu_bot в Telegram — регистрация за секунду, без паролей.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M21.198 2.433a2.242 2.242 0 00-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a405.15 405.15 0 01-2.849 1.09c-.42.147-.99.332-1.473.901-.728.856-.2 1.934.25 2.414.348.37.81.577 1.095.67l3.942 1.312c.285.928 1.07 3.453 1.285 4.149.128.414.261.725.422.974.08.124.174.24.288.34l.004.004.01.01c.334.296.691.378.87.406l-.003-.005.266 2.063c.015.372.192.735.546.94a1.07 1.07 0 001.088-.04l2.198-1.478 3.46 2.576c.218.163.49.266.793.266a1.58 1.58 0 001.54-1.205l3.204-15.053.002-.013a2.26 2.26 0 00-.076-1.274 2.206 2.206 0 00-1.706-1.426z"
          fill="currentColor" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Выбери событие",
    desc: "Политика, спорт, крипта, экономика — ставь на то, что знаешь лучше других.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Поставь на ДА или НЕТ",
    desc: "Купи акции исхода по текущей цене. Чем ты увереннее — тем больше ставка.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Забери выигрыш",
    desc: "Угадал — каждая акция превращается в 1 PRC. Чем ниже была цена, тем выше профит.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const FEATURES = [
  { title: "1 000 PRC на старте", desc: "Начни играть сразу — без вложений и подписок", icon: "🎁" },
  { title: "Реальные события", desc: "Политика, спорт, крипто, экономика — всё что волнует", icon: "🌍" },
  { title: "Мгновенные сделки", desc: "Покупай и продавай акции исходов в один тап", icon: "⚡" },
  { title: "Прозрачные правила", desc: "Рыночные цены, честное разрешение, открытая история", icon: "🔍" },
  { title: "Без комиссий", desc: "Вся прибыль — твоя. Никаких скрытых сборов", icon: "💎" },
  { title: "Telegram-нативный", desc: "Никаких приложений и регистраций — всё внутри Telegram", icon: "📱" },
];

/* ─── component ─── */
export default function LandingPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    axios
      .get("/v1/markets/", { params: { limit: 6 } })
      .then((r) => setMarkets(r.data?.items ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* ═══ HERO ═══ */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center px-4"
      >
        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-brand/[0.07] blur-[120px] animate-pulse" />
          <div className="absolute -bottom-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[#3b82f6]/[0.05] blur-[100px]" style={{ animationDelay: "1s" }} />
          <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-no/[0.04] blur-[80px]" style={{ animationDelay: "2s" }} />
        </div>

        {/* Radial grid fade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, transparent 0%, #0a0e1a 70%)",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium font-body bg-brand/10 text-brand border border-brand/20">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                Рынки прогнозов в Telegram
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight mb-6"
            >
              Угадывай события.
              <br />
              <span className="text-gradient">Зарабатывай.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg sm:text-xl md:text-2xl text-txt-secondary max-w-2xl mx-auto mb-10 leading-relaxed font-body"
            >
              Ставь на политику, спорт и крипту. Покупай акции
              исходов — если угадал, забираешь прибыль.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={TELEGRAM_BOT}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl font-display font-bold text-lg bg-brand text-base-950 hover:bg-brand-light transition-all duration-300 shadow-lg shadow-brand/25 hover:shadow-brand/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M21.198 2.433a2.242 2.242 0 00-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a405.15 405.15 0 01-2.849 1.09c-.42.147-.99.332-1.473.901-.728.856-.2 1.934.25 2.414.348.37.81.577 1.095.67l3.942 1.312c.285.928 1.07 3.453 1.285 4.149.128.414.261.725.422.974.08.124.174.24.288.34l.004.004.01.01c.334.296.691.378.87.406l-.003-.005.266 2.063c.015.372.192.735.546.94a1.07 1.07 0 001.088-.04l2.198-1.478 3.46 2.576c.218.163.49.266.793.266a1.58 1.58 0 001.54-1.205l3.204-15.053.002-.013a2.26 2.26 0 00-.076-1.274 2.206 2.206 0 00-1.706-1.426z" />
                </svg>
                Начать в Telegram
                <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-display font-semibold text-base text-txt-secondary hover:text-txt border border-line hover:border-line-light transition-all duration-300"
              >
                Как это работает
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </motion.div>

            {/* Stats bar */}
            <motion.div
              variants={fadeUp}
              custom={4}
              className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12"
            >
              {[
                { value: "1 000", label: "PRC на старте" },
                { value: "20+", label: "рынков" },
                { value: "0%", label: "комиссий" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-mono text-3xl sm:text-4xl font-bold text-txt">{s.value}</div>
                  <div className="text-sm text-txt-muted font-body mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-txt-faint flex items-start justify-center pt-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-txt-muted" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="relative py-24 sm:py-32">
        <div className="container-site">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeUp} custom={0} className="text-brand font-mono text-sm tracking-widest uppercase">
              Как это работает
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-3">
              Четыре шага до прибыли
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="group relative card card-hover p-6 sm:p-8"
              >
                {/* Step number */}
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center font-mono text-sm font-bold text-brand">
                  {step.num}
                </div>

                <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-brand mb-5 group-hover:bg-brand/20 transition-colors">
                  {step.icon}
                </div>
                <h3 className="font-display text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-txt-secondary text-sm leading-relaxed font-body">{step.desc}</p>

                {/* Connector line (desktop) */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-line-light" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIVE MARKETS ═══ */}
      {markets.length > 0 && (
        <section className="relative py-24 sm:py-32">
          {/* Subtle glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[1px] bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

          <div className="container-site">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.span variants={fadeUp} custom={0} className="text-brand font-mono text-sm tracking-widest uppercase">
                Прямо сейчас
              </motion.span>
              <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-3">
                Активные рынки
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-txt-secondary mt-4 max-w-lg mx-auto font-body">
                Реальные события — реальные прогнозы. Цены меняются каждую секунду.
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {markets.slice(0, 6).map((m, i) => (
                <motion.div
                  key={m.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={i}
                  className="card card-hover card-glow p-5 flex flex-col"
                >
                  {/* Category + status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-txt-muted uppercase tracking-wider">
                      {m.category}
                    </span>
                    {m.status === "open" && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-yes">
                        <span className="w-1.5 h-1.5 rounded-full bg-yes animate-pulse" />
                        Открыт
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-display font-bold text-base leading-snug mb-4 line-clamp-2 flex-1">
                    {m.title}
                  </h3>

                  {/* Price bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-yes font-semibold">ДА {Math.round(m.price_yes * 100)}%</span>
                      <span className="text-no font-semibold">НЕТ {Math.round(m.price_no * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-base-700 overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round(m.price_yes * 100)}%`,
                          background: "linear-gradient(90deg, #10b981, #34d399)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-txt-muted font-body pt-3 border-t border-line">
                    <span className="font-mono">{m.total_volume.toLocaleString("ru-RU")} PRC</span>
                    <span>{m.total_traders} участников</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
              className="text-center mt-10"
            >
              <a
                href={TELEGRAM_BOT}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2"
              >
                Все рынки в Telegram
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══ FEATURES ═══ */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[1px] bg-gradient-to-r from-transparent via-line-light to-transparent" />

        <div className="container-site">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeUp} custom={0} className="text-brand font-mono text-sm tracking-widest uppercase">
              Преимущества
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-3">
              Почему Предскажи
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="group card card-hover p-6 sm:p-8"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-txt-secondary text-sm leading-relaxed font-body">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ EXAMPLE TRADE ═══ */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[1px] bg-gradient-to-r from-transparent via-line-light to-transparent" />

        <div className="container-site">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="max-w-3xl mx-auto"
          >
            <motion.div variants={fadeUp} custom={0} className="text-center mb-12">
              <span className="text-brand font-mono text-sm tracking-widest uppercase">Пример</span>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-3">
                Как заработать на прогнозе
              </h2>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="card p-8 sm:p-10">
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center font-mono text-sm font-bold text-brand">1</div>
                  <div>
                    <p className="text-txt font-body">Вопрос: <strong className="font-display">&laquo;Bitcoin выше $100K к июню?&raquo;</strong></p>
                    <p className="text-txt-secondary text-sm mt-1 font-body">Текущая цена ДА — <span className="text-yes font-mono font-semibold">0.40 PRC</span></p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center font-mono text-sm font-bold text-brand">2</div>
                  <div>
                    <p className="text-txt font-body">Ты ставишь <span className="font-mono font-semibold">100 PRC</span> на <span className="text-yes font-semibold">ДА</span></p>
                    <p className="text-txt-secondary text-sm mt-1 font-body">Получаешь <span className="font-mono font-semibold">250 акций</span> (100 ÷ 0.40)</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-yes/10 flex items-center justify-center font-mono text-sm font-bold text-yes">3</div>
                  <div>
                    <p className="text-txt font-body">Bitcoin пробивает $100K — ты угадал!</p>
                    <p className="text-txt-secondary text-sm mt-1 font-body">Каждая акция = <span className="font-mono font-semibold">1 PRC</span></p>
                  </div>
                </div>

                {/* Result */}
                <div className="border-t border-line pt-5 mt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-txt-secondary font-body">Твоя прибыль</span>
                    <div className="text-right">
                      <div className="font-mono text-2xl sm:text-3xl font-bold text-yes">+150 PRC</div>
                      <div className="text-xs text-txt-muted font-body mt-1">250 выплата − 100 ставка = 150 профит</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[50vh] rounded-full bg-brand/[0.04] blur-[100px]" />
        </div>

        <div className="container-site relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center max-w-2xl mx-auto"
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">
              Готов проверить
              <br />
              <span className="text-gradient">свою интуицию?</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-txt-secondary text-lg mt-6 mb-10 font-body">
              1 000 монет уже ждут тебя. Запусти бота и сделай первый прогноз за 30 секунд.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <a
                href={TELEGRAM_BOT}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-display font-bold text-xl bg-brand text-base-950 hover:bg-brand-light transition-all duration-300 shadow-xl shadow-brand/25 hover:shadow-brand/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M21.198 2.433a2.242 2.242 0 00-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a405.15 405.15 0 01-2.849 1.09c-.42.147-.99.332-1.473.901-.728.856-.2 1.934.25 2.414.348.37.81.577 1.095.67l3.942 1.312c.285.928 1.07 3.453 1.285 4.149.128.414.261.725.422.974.08.124.174.24.288.34l.004.004.01.01c.334.296.691.378.87.406l-.003-.005.266 2.063c.015.372.192.735.546.94a1.07 1.07 0 001.088-.04l2.198-1.478 3.46 2.576c.218.163.49.266.793.266a1.58 1.58 0 001.54-1.205l3.204-15.053.002-.013a2.26 2.26 0 00-.076-1.274 2.206 2.206 0 00-1.706-1.426z" />
                </svg>
                Начать бесплатно
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-line py-10">
        <div className="container-site">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-display text-xl font-bold text-gradient">Предскажи</span>
              <span className="text-xs text-txt-faint font-body">предскажи.рф</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-txt-muted font-body">
              <a href={TELEGRAM_BOT} target="_blank" rel="noopener noreferrer" className="hover:text-txt transition-colors">
                Telegram
              </a>
              <a href="#how" className="hover:text-txt transition-colors">
                Как играть
              </a>
            </div>
            <div className="text-xs text-txt-faint font-body">
              © {new Date().getFullYear()} Предскажи
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
