import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/api/endpoints";
import { useMarkets } from "@/hooks/useMarkets";
import { useAuthStore } from "@/stores/authStore";
import { useWebApp } from "@/hooks/useWebApp";
import type { Market } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Политика",
  sports: "Спорт",
  crypto: "Крипто",
  tech: "Технологии",
  entertainment: "Шоу",
  science: "Наука",
  economics: "Экономика",
  general: "Общее",
};

const CATEGORY_ICONS: Record<string, string> = {
  politics: "🏛",
  sports: "⚽",
  crypto: "₿",
  tech: "💻",
  entertainment: "🎬",
  science: "🔬",
  economics: "📈",
  general: "🌐",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Открыт",
  trading_closed: "Торги закрыты",
  resolved: "Резолвирован",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-500/10 text-green-400",
  trading_closed: "bg-yellow-500/10 text-yellow-400",
  resolved: "bg-blue-500/10 text-blue-400",
  cancelled: "bg-red-500/10 text-red-400",
};

const CATEGORIES = [
  "politics", "sports", "crypto", "tech", "entertainment", "science", "economics", "general",
];

// === TEMPLATES ===
interface MarketTemplate {
  label: string;
  icon: string;
  title: string;
  description: string;
  category: string;
  resolution_source: string;
  daysUntilClose: number;
}

const TEMPLATES: MarketTemplate[] = [
  {
    label: "Крипто цена",
    icon: "₿",
    title: "Bitcoin достигнет $X до [дата]?",
    description: "Резолвится YES, если цена BTC на CoinGecko превысит $X хотя бы на 1 минуту до указанной даты.",
    category: "crypto",
    resolution_source: "CoinGecko API — цена BTC/USD",
    daysUntilClose: 30,
  },
  {
    label: "Политика",
    icon: "🏛",
    title: "Будет ли принят закон X до [дата]?",
    description: "Резолвится YES, если закон подписан/опубликован до указанной даты.",
    category: "politics",
    resolution_source: "Официальный источник (publication.pravo.gov.ru)",
    daysUntilClose: 60,
  },
  {
    label: "Спорт",
    icon: "⚽",
    title: "[Команда A] победит [Команда B] в матче [дата]?",
    description: "Резолвится YES, если команда A выиграет матч в основное время + овертайм.",
    category: "sports",
    resolution_source: "Официальный сайт лиги / ESPN",
    daysUntilClose: 7,
  },
  {
    label: "Технологии",
    icon: "💻",
    title: "Apple выпустит X до [дата]?",
    description: "Резолвится YES, если продукт официально анонсирован и доступен для заказа.",
    category: "tech",
    resolution_source: "apple.com / официальный пресс-релиз",
    daysUntilClose: 90,
  },
  {
    label: "Экономика",
    icon: "📈",
    title: "Курс доллара превысит X рублей до [дата]?",
    description: "Резолвится YES, если курс ЦБ РФ на любую дату до закрытия превысит указанное значение.",
    category: "economics",
    resolution_source: "cbr.ru — официальный курс ЦБ",
    daysUntilClose: 30,
  },
  {
    label: "Наука",
    icon: "🔬",
    title: "Будет ли сделано открытие X до [дата]?",
    description: "Резолвится YES, если официально опубликован результат в рецензируемом журнале.",
    category: "science",
    resolution_source: "Nature / Science / официальный пресс-релиз",
    daysUntilClose: 180,
  },
];

// === Date helpers ===
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return toLocalDatetime(d);
}

function endOfYear(): string {
  const d = new Date();
  d.setMonth(11, 31);
  d.setHours(23, 59, 0, 0);
  return toLocalDatetime(d);
}

function toLocalDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// === FORM STATE ===
interface FormData {
  title: string;
  description: string;
  category: string;
  closesAt: string;
  ammType: string;
  isFeatured: boolean;
  resolutionSource: string;
  initialPrice: number;
}

const EMPTY_FORM: FormData = {
  title: "",
  description: "",
  category: "general",
  closesAt: "",
  ammType: "clob",
  isFeatured: false,
  resolutionSource: "",
  initialPrice: 0.5,
};

function MarketCard({ market, onAction, onDuplicate }: {
  market: Market;
  onAction: (action: string, id: string, payload?: string) => void;
  onDuplicate: (market: Market) => void;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);

  const handleAction = (action: string, payload?: string) => {
    if (confirm === action) {
      onAction(action, market.id, payload);
      setConfirm(null);
    } else {
      setConfirm(action);
      setTimeout(() => setConfirm(null), 3000);
    }
  };

  const isOpen = market.status === "open";

  return (
    <div className="glass-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-tight">{market.title}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[market.status] ?? "bg-white/10 text-tg-hint"}`}>
              {STATUS_LABELS[market.status] ?? market.status}
            </span>
            <span className="text-xs text-tg-hint">
              {CATEGORY_ICONS[market.category] ?? ""} {CATEGORY_LABELS[market.category] ?? market.category}
            </span>
            <span className="text-xs text-tg-hint">
              {market.amm_type.toUpperCase()}
            </span>
            {market.is_featured && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">Featured</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDuplicate(market)}
          className="text-xs px-2 py-1 rounded-lg bg-tg-secondary text-tg-hint shrink-0"
          title="Дублировать"
        >
          Копия
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => handleAction("resolve_yes", "yes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              confirm === "resolve_yes"
                ? "bg-green-600 text-white"
                : "bg-green-500/10 text-green-400"
            }`}
          >
            {confirm === "resolve_yes" ? "Точно YES?" : "YES"}
          </button>
          <button
            onClick={() => handleAction("resolve_no", "no")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              confirm === "resolve_no"
                ? "bg-red-600 text-white"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {confirm === "resolve_no" ? "Точно NO?" : "NO"}
          </button>
          <button
            onClick={() => handleAction("cancel")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              confirm === "cancel"
                ? "bg-gray-600 text-white"
                : "bg-white/10 text-tg-hint"
            }`}
          >
            {confirm === "cancel" ? "Точно отменить?" : "Отменить"}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateMarketForm({ onSuccess, prefill }: { onSuccess: () => void; prefill: FormData | null }) {
  const [form, setForm] = useState<FormData>(prefill ?? EMPTY_FORM);
  const [step, setStep] = useState<1 | 2 | 3>(prefill ? 2 : 1);
  const { haptic } = useWebApp();

  const update = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await adminApi.createMarket({
        title: form.title,
        description: form.description,
        category: form.category,
        closes_at: new Date(form.closesAt).toISOString(),
        amm_type: form.ammType,
        is_featured: form.isFeatured,
        resolution_source: form.resolutionSource,
        initial_price_yes: form.initialPrice,
      });
      return data;
    },
    onSuccess: () => {
      haptic?.notificationOccurred("success");
      setForm(EMPTY_FORM);
      setStep(1);
      onSuccess();
    },
  });

  const canGoStep2 = form.title.length >= 5;
  const canGoStep3 = canGoStep2 && form.closesAt !== "";
  const canSubmit = canGoStep3;

  // Step 1: Template + Title
  if (step === 1) {
    return (
      <div className="space-y-3">
        {/* Templates */}
        <div className="glass-card p-4">
          <p className="text-xs text-tg-hint mb-2">Быстрые шаблоны</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  update({
                    title: t.title,
                    description: t.description,
                    category: t.category,
                    resolutionSource: t.resolution_source,
                    closesAt: addDays(t.daysUntilClose),
                  });
                  setStep(2);
                  haptic?.selectionChanged();
                }}
                className="flex items-center gap-2 p-3 rounded-xl bg-tg-secondary text-left transition-colors active:bg-white/10"
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Or enter manually */}
        <div className="glass-card p-4 space-y-3">
          <p className="text-xs text-tg-hint">Или введи свой вопрос</p>
          <input
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Произойдёт ли X до даты Y?"
            className="w-full bg-tg-secondary rounded-lg px-3 py-2.5 text-sm outline-none"
          />
          <button
            onClick={() => setStep(2)}
            disabled={!canGoStep2}
            className="w-full py-2.5 bg-tg-button text-tg-button-text rounded-lg font-semibold text-sm disabled:opacity-30"
          >
            Далее
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Details
  if (step === 2) {
    return (
      <div className="space-y-3">
        {/* Title preview */}
        <div className="bg-blue-500/10 rounded-xl px-4 py-3 border border-blue-500/20">
          <p className="text-xs text-blue-400 mb-1">Вопрос рынка</p>
          <p className="text-sm font-semibold">{form.title}</p>
          <button onClick={() => setStep(1)} className="text-xs text-blue-400 mt-1">
            Изменить
          </button>
        </div>

        <div className="glass-card p-4 space-y-3">
          {/* Category chips */}
          <div>
            <p className="text-xs text-tg-hint mb-1.5">Категория</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { update({ category: c }); haptic?.selectionChanged(); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.category === c
                      ? "bg-tg-button text-tg-button-text"
                      : "bg-tg-secondary text-tg-text"
                  }`}
                >
                  {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Date quick buttons */}
          <div>
            <p className="text-xs text-tg-hint mb-1.5">Дата закрытия торгов</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                { label: "3 дня", days: 3 },
                { label: "Неделя", days: 7 },
                { label: "2 недели", days: 14 },
                { label: "Месяц", days: 30 },
                { label: "3 месяца", days: 90 },
                { label: "Конец года", days: -1 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    update({ closesAt: preset.days === -1 ? endOfYear() : addDays(preset.days) });
                    haptic?.selectionChanged();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-tg-secondary text-tg-text active:bg-white/10"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              value={form.closesAt}
              onChange={(e) => update({ closesAt: e.target.value })}
              className="w-full bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none"
            />
            {form.closesAt && (
              <p className="text-xs text-tg-hint mt-1">
                Закрытие: {new Date(form.closesAt).toLocaleDateString("ru-RU", {
                  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-xs text-tg-hint mb-1">Описание</p>
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Подробности рынка, условия резолюции..."
              className="w-full bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none h-20 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 bg-tg-secondary text-tg-text rounded-lg font-semibold text-sm"
            >
              Назад
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canGoStep3}
              className="flex-1 py-2.5 bg-tg-button text-tg-button-text rounded-lg font-semibold text-sm disabled:opacity-30"
            >
              Далее
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Fine-tune + Preview + Submit
  return (
    <div className="space-y-3">
      {/* Preview card */}
      <div className="glass-card p-4">
        <p className="text-xs text-tg-hint mb-2">Предпросмотр</p>
        <div className="bg-tg-secondary rounded-xl p-3">
          <div className="text-sm font-semibold mb-1">{form.title}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Открыт</span>
            <span>{CATEGORY_ICONS[form.category]} {CATEGORY_LABELS[form.category]}</span>
            <span>{form.ammType.toUpperCase()}</span>
            {form.isFeatured && <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">Featured</span>}
          </div>
          {form.description && (
            <p className="text-xs text-tg-hint mt-2 line-clamp-2">{form.description}</p>
          )}
          {/* Price bar */}
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-400 font-medium">ДА {Math.round(form.initialPrice * 100)}%</span>
              <span className="text-red-400 font-medium">НЕТ {Math.round((1 - form.initialPrice) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-red-500/20 overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${form.initialPrice * 100}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-tg-hint mt-1">
            Закрытие: {new Date(form.closesAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        {/* Market type */}
        <div>
          <p className="text-xs text-tg-hint mb-1.5">Тип рынка</p>
          <div className="flex gap-2">
            <button
              onClick={() => { update({ ammType: "clob" }); haptic?.selectionChanged(); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                form.ammType === "clob"
                  ? "bg-tg-button text-tg-button-text"
                  : "bg-tg-secondary text-tg-text"
              }`}
            >
              CLOB (Ордер бук)
            </button>
            <button
              onClick={() => { update({ ammType: "lmsr" }); haptic?.selectionChanged(); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                form.ammType === "lmsr"
                  ? "bg-tg-button text-tg-button-text"
                  : "bg-tg-secondary text-tg-text"
              }`}
            >
              LMSR (AMM)
            </button>
          </div>
        </div>

        {/* Initial probability (CLOB only) */}
        {form.ammType === "clob" && (
          <div>
            <p className="text-xs text-tg-hint mb-1.5">Начальная вероятность ДА</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={95}
                step={5}
                value={Math.round(form.initialPrice * 100)}
                onChange={(e) => update({ initialPrice: parseInt(e.target.value) / 100 })}
                className="flex-1 h-2 rounded-lg appearance-none bg-gradient-to-r from-red-300 via-gray-300 to-green-300"
              />
              <span className="text-sm font-bold w-12 text-center bg-tg-secondary rounded-lg py-1">
                {Math.round(form.initialPrice * 100)}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-tg-hint mt-1">
              <span>НЕТ вероятнее</span>
              <span>ДА вероятнее</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[10, 25, 50, 75, 90].map((p) => (
                <button
                  key={p}
                  onClick={() => { update({ initialPrice: p / 100 }); haptic?.selectionChanged(); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
                    Math.round(form.initialPrice * 100) === p
                      ? "bg-tg-button text-tg-button-text"
                      : "bg-tg-secondary text-tg-text"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resolution source */}
        <div>
          <p className="text-xs text-tg-hint mb-1">Источник резолюции</p>
          <textarea
            value={form.resolutionSource}
            onChange={(e) => update({ resolutionSource: e.target.value })}
            placeholder="По какому источнику определяется исход?"
            className="w-full bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none h-16 resize-none"
          />
        </div>

        {/* Featured toggle */}
        <label className="flex items-center gap-3 cursor-pointer bg-tg-secondary rounded-lg px-3 py-2.5">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => update({ isFeatured: e.target.checked })}
            className="w-5 h-5 rounded"
          />
          <div>
            <span className="text-sm font-medium">Featured</span>
            <p className="text-xs text-tg-hint">Показывать на главной</p>
          </div>
        </label>

        {/* Errors */}
        {mutation.isError && (
          <div className="bg-red-500/10 text-red-400 text-xs font-medium rounded-lg px-3 py-2">
            Ошибка: {(mutation.error as Error).message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setStep(2)}
            className="flex-1 py-3 bg-tg-secondary text-tg-text rounded-lg font-semibold text-sm"
          >
            Назад
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="flex-1 py-3 bg-green-500 text-white rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {mutation.isPending ? "Создание..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-tg-hint text-lg">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-tg-text space-y-2 leading-relaxed border-t border-white/10 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function GuidePage() {
  return (
    <div className="space-y-3">
      <GuideSection title="Что такое рынок предсказаний?">
        <p>
          Рынок предсказаний — это площадка, где пользователи делают ставки на исход событий.
          Каждый рынок — это вопрос с ответом <b>ДА</b> или <b>НЕТ</b>.
        </p>
        <p>
          Пример: «Биткоин достигнет $100K до 1 июля?»
        </p>
        <p>
          Пользователи покупают акции <b>YES</b> (если верят, что да) или <b>NO</b> (если нет).
          Цена акции — от 0.01 до 0.99 PRC, отражает вероятность события.
        </p>
        <p>
          Когда рынок резолвится, победившие акции стоят <b>1 PRC</b>, проигравшие — <b>0 PRC</b>.
        </p>
      </GuideSection>

      <GuideSection title="CLOB — Ордер бук (рекомендуется)">
        <p>
          <b>CLOB</b> (Central Limit Order Book) — книга ордеров, как на бирже.
          Это основной режим для новых рынков.
        </p>
        <p className="font-medium">Как работает:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Пользователь выставляет ордер: «Куплю YES по 0.60, 10 штук»</li>
          <li>Если есть встречный ордер (кто-то продаёт YES по 0.60) — сделка</li>
          <li>Если нет — ордер стоит в книге и ждёт</li>
          <li>Одна книга на рынок (только YES сторона)</li>
        </ul>
        <p className="font-medium mt-2">Типы сделок:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><b>Transfer</b> — акции переходят от продавца к покупателю</li>
          <li><b>Mint</b> — создаётся пара YES+NO (когда BUY YES встречает BUY NO)</li>
          <li><b>Burn</b> — пара уничтожается, PRC возвращается (SELL YES + SELL NO)</li>
        </ul>
        <p className="font-medium mt-2">Пример:</p>
        <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1">
          <p>Алиса: «Куплю YES по 0.65» (платит 6.50 PRC за 10 акций)</p>
          <p>Боб: «Куплю NO по 0.35» → это = «Продам YES по 0.65»</p>
          <p>Сделка Mint: создаётся 10 YES (Алисе) + 10 NO (Бобу)</p>
          <p>Алиса заплатила 6.50, Боб заплатил 3.50, всего 10.00 = 10 пар</p>
        </div>
      </GuideSection>

      <GuideSection title="LMSR — Автоматический маркетмейкер">
        <p>
          <b>LMSR</b> (Logarithmic Market Scoring Rule) — автоматический маркетмейкер.
          Цены вычисляются по формуле, всегда есть ликвидность.
        </p>
        <p className="font-medium">Как работает:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Система хранит количество проданных акций: q_yes и q_no</li>
          <li>Цена YES = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))</li>
          <li>Параметр <b>b</b> (liquidity) — чем больше, тем стабильнее цена</li>
          <li>Покупка акций сдвигает цену вверх, продажа — вниз</li>
        </ul>
        <p className="font-medium mt-2">Плюсы и минусы:</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-500/10 rounded-lg p-2 text-xs">
            <p className="font-medium text-green-400">Плюсы</p>
            <p>Всегда есть цена</p>
            <p>Можно торговать сразу</p>
            <p>Простой для юзеров</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-2 text-xs">
            <p className="font-medium text-red-400">Минусы</p>
            <p>Проскальзывание цены</p>
            <p>Нет лимитных ордеров</p>
            <p>Менее точная цена</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="Жизненный цикл рынка">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">open</span>
            <span>Рынок создан, торги идут</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">trading_closed</span>
            <span>Торги закрыты (по дате), ждёт резолюции</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">resolved</span>
            <span>Админ выбрал исход (YES или NO), выплаты прошли</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium">cancelled</span>
            <span>Рынок отменён, все деньги возвращены</span>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="Резолюция и отмена">
        <p className="font-medium">Резолюция (YES / NO):</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Админ нажимает YES или NO в списке рынков</li>
          <li>Все открытые ордера отменяются</li>
          <li>Владельцы победивших акций получают по <b>1 PRC</b> за акцию</li>
          <li>Проигравшие акции обнуляются</li>
        </ul>
        <p className="font-medium mt-2">Отмена:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Все ордера отменяются</li>
          <li>Все акции (YES и NO) обнуляются</li>
          <li>Каждому юзеру возвращается сумма, потраченная на акции</li>
        </ul>
      </GuideSection>

      <GuideSection title="Комиссия и PRC">
        <ul className="list-disc pl-4 space-y-1">
          <li><b>PRC</b> — внутренняя валюта платформы (виртуальная)</li>
          <li>Бонус при регистрации: <b>1,000 PRC</b></li>
          <li>Ежедневный бонус: <b>50 PRC</b></li>
          <li>Комиссия на сделки: <b>2%</b></li>
          <li>Пополнение — бесплатное (виртуальная валюта)</li>
        </ul>
      </GuideSection>

      <GuideSection title="Советы по созданию рынков">
        <ul className="list-disc pl-4 space-y-1">
          <li>Вопрос должен быть <b>однозначным</b> — ясно, когда YES, когда NO</li>
          <li>Указывай <b>дату и источник</b> для резолюции</li>
          <li>Дата закрытия — когда торги прекращаются (до события)</li>
          <li>Для популярных рынков ставь <b>Featured</b></li>
          <li>Используй <b>CLOB</b> — он точнее и дешевле для платформы</li>
          <li>LMSR подходит только для рынков с гарантированной ликвидностью</li>
        </ul>
      </GuideSection>
    </div>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<"markets" | "create" | "guide">("markets");
  const [prefill, setPrefill] = useState<FormData | null>(null);
  const [prefillKey, setPrefillKey] = useState(0);
  const queryClient = useQueryClient();
  const { haptic } = useWebApp();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMarkets();
  const markets = data?.pages.flatMap((p) => p.items) ?? [];

  const actionMutation = useMutation({
    mutationFn: async ({ action, id, payload }: { action: string; id: string; payload?: string }) => {
      if (action === "resolve_yes" || action === "resolve_no") {
        await adminApi.resolveMarket(id, payload!);
      } else if (action === "cancel") {
        await adminApi.cancelMarket(id);
      }
    },
    onSuccess: () => {
      haptic?.notificationOccurred("success");
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });

  const handleDuplicate = (market: Market) => {
    setPrefill({
      title: market.title,
      description: "",
      category: market.category,
      closesAt: addDays(30),
      ammType: market.amm_type,
      isFeatured: market.is_featured,
      resolutionSource: "",
      initialPrice: 0.5,
    });
    setPrefillKey((k) => k + 1);
    setTab("create");
    haptic?.selectionChanged();
  };

  if (!user?.is_admin) {
    return (
      <div className="max-w-lg mx-auto bg-tg-bg text-tg-text min-h-screen flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-2xl mb-2">403</div>
          <div className="text-tg-hint text-sm">Доступ запрещён</div>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-tg-button text-tg-button-text rounded-lg text-sm"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  const handleAction = (action: string, id: string, payload?: string) => {
    actionMutation.mutate({ action, id, payload });
  };

  return (
    <div className="max-w-lg mx-auto bg-tg-bg text-tg-text min-h-screen">
      <div className="sticky top-0 z-40 bg-tg-bg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-tg-link text-sm">
            &larr; Назад
          </button>
          <span className="text-lg font-bold">Админка</span>
          <div className="w-12" />
        </div>

        <div className="flex border-b border-white/10">
          <button
            onClick={() => setTab("markets")}
            className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === "markets"
                ? "border-tg-button text-tg-button"
                : "border-transparent text-tg-hint"
            }`}
          >
            Рынки ({markets.length})
          </button>
          <button
            onClick={() => { setTab("create"); setPrefill(null); setPrefillKey((k) => k + 1); }}
            className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === "create"
                ? "border-tg-button text-tg-button"
                : "border-transparent text-tg-hint"
            }`}
          >
            + Создать
          </button>
          <button
            onClick={() => setTab("guide")}
            className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === "guide"
                ? "border-tg-button text-tg-button"
                : "border-transparent text-tg-hint"
            }`}
          >
            Справка
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {tab === "markets" && (
          <div className="space-y-2">
            {isLoading && (
              <div className="text-center text-tg-hint text-sm py-8">Загрузка...</div>
            )}

            {markets.map((m) => (
              <MarketCard key={m.id} market={m} onAction={handleAction} onDuplicate={handleDuplicate} />
            ))}

            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full py-2 text-sm text-tg-link"
              >
                {isFetchingNextPage ? "Загрузка..." : "Показать ещё"}
              </button>
            )}

            {!isLoading && markets.length === 0 && (
              <div className="text-center text-tg-hint text-sm py-8">
                Нет рынков
              </div>
            )}

            {actionMutation.isError && (
              <div className="text-xs text-red-400 text-center">
                Ошибка: {(actionMutation.error as Error).message}
              </div>
            )}
          </div>
        )}

        {tab === "create" && (
          <CreateMarketForm
            key={prefillKey}
            prefill={prefill}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["markets"] });
              setTab("markets");
            }}
          />
        )}

        {tab === "guide" && <GuidePage />}
      </div>
    </div>
  );
}
