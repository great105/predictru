import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store";
import { adminApi } from "../adminApi";
import type { Market } from "../types";

const STATUS_LABELS: Record<string, string> = {
  open: "Активен",
  trading_closed: "Торги закрыты",
  resolved: "Решён",
  cancelled: "Отменён",
};

const STATUS_STYLES: Record<string, string> = {
  open: "badge-open",
  trading_closed: "bg-amber/10 text-amber border border-amber/20",
  resolved: "badge-resolved",
  cancelled: "bg-no/10 text-no border border-no/20",
};

const CATEGORIES = [
  "politics", "sports", "crypto", "tech", "entertainment", "science", "economics", "general",
];

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Политика",
  sports: "Спорт",
  crypto: "Крипто",
  tech: "Технологии",
  entertainment: "Развлечения",
  science: "Наука",
  economics: "Экономика",
  general: "Общее",
};

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

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type StatusFilter = "all" | "open" | "trading_closed" | "resolved" | "cancelled";

const STATUS_ORDER: Record<string, number> = {
  open: 0,
  trading_closed: 1,
  resolved: 2,
  cancelled: 3,
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "open", label: "Активные" },
  { value: "trading_closed", label: "Ждут резолюции" },
  { value: "resolved", label: "Решённые" },
  { value: "cancelled", label: "Отменённые" },
];

function timeUntil(dateStr: string): { text: string; overdue: boolean } {
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  const diff = target - now;
  if (diff < 0) {
    const ago = Math.abs(diff);
    if (ago < 3600_000) return { text: `просрочен ${Math.floor(ago / 60_000)} мин`, overdue: true };
    if (ago < 86400_000) return { text: `просрочен ${Math.floor(ago / 3600_000)} ч`, overdue: true };
    return { text: `просрочен ${Math.floor(ago / 86400_000)} дн`, overdue: true };
  }
  if (diff < 3600_000) return { text: `через ${Math.floor(diff / 60_000)} мин`, overdue: false };
  if (diff < 86400_000) return { text: `через ${Math.floor(diff / 3600_000)} ч`, overdue: false };
  return { text: `через ${Math.floor(diff / 86400_000)} дн`, overdue: false };
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function SummaryCards({ markets }: { markets: Market[] }) {
  const open = markets.filter((m) => m.status === "open").length;
  const pending = markets.filter((m) => m.status === "trading_closed").length;
  const volume = markets.reduce((s, m) => s + m.total_volume, 0);

  const items = [
    { label: "Всего", value: markets.length, color: "text-txt" },
    { label: "Активные", value: open, color: "text-yes" },
    { label: "Ждут резолюции", value: pending, color: "text-amber" },
    { label: "Общий объём", value: `${formatVolume(volume)} PRC`, color: "text-brand" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="card p-4">
          <p className="text-[11px] text-txt-muted uppercase tracking-wide">{item.label}</p>
          <p className={`text-2xl font-display font-bold mt-1 ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function MarketCard({
  market,
  onResolve,
  onCancel,
}: {
  market: Market;
  onResolve: (id: string, outcome: string) => void;
  onCancel: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAction = (action: string) => {
    if (confirm === action) {
      if (action === "yes" || action === "no") onResolve(market.id, action);
      else onCancel(market.id);
      setConfirm(null);
    } else {
      setConfirm(action);
      setTimeout(() => setConfirm(null), 3000);
    }
  };

  const yesPercent = Math.round(market.price_yes * 100);
  const noPercent = 100 - yesPercent;
  const closing = timeUntil(market.closes_at);
  const canAct = market.status === "open" || market.status === "trading_closed";

  return (
    <div className="card card-hover p-5 space-y-4">
      {/* Header: chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-txt-muted bg-base-600 px-2 py-0.5 rounded-md">
          {CATEGORY_LABELS[market.category] ?? market.category}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${STATUS_STYLES[market.status] ?? "bg-base-600 text-txt-muted"}`}>
          {STATUS_LABELS[market.status] ?? market.status}
        </span>
        <span className="text-[10px] font-mono text-amber bg-amber/10 px-2 py-0.5 rounded-md">
          {market.amm_type.toUpperCase()}
        </span>
        {market.is_featured && (
          <span className="text-[10px] text-brand bg-brand/10 px-2 py-0.5 rounded-md flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            Featured
          </span>
        )}
      </div>

      {/* Title */}
      <button
        onClick={() => navigate(`/market/${market.id}`)}
        className="text-base font-display font-semibold text-txt hover:text-brand transition-colors text-left block w-full"
      >
        {market.title}
      </button>

      {/* Price bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-yes">ДА {yesPercent}%</span>
          <span className="text-no">НЕТ {noPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-no/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-yes transition-all duration-300"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-txt-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16V17c0-2.796 2.91-5.093 6.753-5.428a5 5 0 019.494 0c.11.088.22.178.326.27M12 10a4 4 0 110-8 4 4 0 010 8z"/>
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-txt">{market.total_traders}</p>
            <p className="text-[10px] text-txt-muted">участников</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-txt-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-txt">{formatVolume(market.total_volume)}</p>
            <p className="text-[10px] text-txt-muted">объём PRC</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-txt-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div className="min-w-0">
            <p className="text-[10px] text-txt-muted">{formatDate(market.closes_at)}</p>
            <p className={`text-xs font-semibold ${closing.overdue ? "text-no" : "text-txt-secondary"}`}>
              {closing.text}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {canAct && (
        <div className="flex items-center gap-2 pt-1 border-t border-line">
          <button
            onClick={() => handleAction("yes")}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              confirm === "yes"
                ? "bg-yes text-base-950"
                : "bg-yes/10 text-yes hover:bg-yes/20"
            }`}
          >
            {confirm === "yes" ? "Подтвердить YES?" : "YES"}
          </button>
          <button
            onClick={() => handleAction("no")}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              confirm === "no"
                ? "bg-no text-base-950"
                : "bg-no/10 text-no hover:bg-no/20"
            }`}
          >
            {confirm === "no" ? "Подтвердить NO?" : "NO"}
          </button>
          <button
            onClick={() => handleAction("cancel")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              confirm === "cancel"
                ? "bg-txt-muted text-base-950"
                : "bg-base-600 text-txt-muted hover:bg-base-500"
            }`}
          >
            {confirm === "cancel" ? "Точно?" : "Отмена"}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const update = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createMarket({
        title: form.title,
        description: form.description,
        category: form.category,
        closes_at: new Date(form.closesAt).toISOString(),
        amm_type: form.ammType,
        is_featured: form.isFeatured,
        resolution_source: form.resolutionSource,
        initial_price_yes: form.initialPrice,
      }),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      onSuccess();
    },
  });

  const canSubmit = form.title.length >= 5 && form.closesAt !== "";

  return (
    <div className="card p-6 space-y-5">
      <h2 className="text-lg font-display font-bold">Создать рынок</h2>

      <div>
        <label className="text-xs text-txt-muted block mb-1.5">Вопрос рынка</label>
        <input
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Произойдёт ли X до даты Y?"
          className="input-field w-full"
        />
      </div>

      <div>
        <label className="text-xs text-txt-muted block mb-1.5">Описание</label>
        <textarea
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Условия резолюции..."
          className="input-field w-full h-20 resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-txt-muted block mb-1.5">Категория</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => update({ category: c })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                form.category === c
                  ? "bg-brand text-base-950"
                  : "bg-base-700 text-txt-secondary hover:bg-base-600"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-txt-muted block mb-1.5">Дата закрытия</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[
            { label: "3 дня", days: 3 },
            { label: "Неделя", days: 7 },
            { label: "Месяц", days: 30 },
            { label: "3 мес", days: 90 },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => update({ closesAt: addDays(p.days) })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-base-700 text-txt-secondary hover:bg-base-600 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="datetime-local"
          value={form.closesAt}
          onChange={(e) => update({ closesAt: e.target.value })}
          className="input-field w-full"
        />
      </div>

      <div>
        <label className="text-xs text-txt-muted block mb-1.5">Тип рынка</label>
        <div className="flex gap-2">
          {(["clob", "lmsr"] as const).map((t) => (
            <button
              key={t}
              onClick={() => update({ ammType: t })}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                form.ammType === t
                  ? "bg-brand text-base-950"
                  : "bg-base-700 text-txt-secondary hover:bg-base-600"
              }`}
            >
              {t === "clob" ? "CLOB (Order Book)" : "LMSR (AMM)"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-txt-muted block mb-1.5">Начальная вероятность ДА: {Math.round(form.initialPrice * 100)}%</label>
        <input
          type="range"
          min={5}
          max={95}
          step={5}
          value={Math.round(form.initialPrice * 100)}
          onChange={(e) => update({ initialPrice: parseInt(e.target.value) / 100 })}
          className="w-full h-2 rounded-lg appearance-none bg-base-600 accent-brand"
        />
      </div>

      <div>
        <label className="text-xs text-txt-muted block mb-1.5">Источник резолюции</label>
        <textarea
          value={form.resolutionSource}
          onChange={(e) => update({ resolutionSource: e.target.value })}
          placeholder="По какому источнику определяется исход?"
          className="input-field w-full h-16 resize-none"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer bg-base-700 rounded-lg px-4 py-3 border border-line">
        <input
          type="checkbox"
          checked={form.isFeatured}
          onChange={(e) => update({ isFeatured: e.target.checked })}
          className="w-4 h-4 rounded accent-brand"
        />
        <div>
          <span className="text-sm font-medium text-txt">Featured</span>
          <p className="text-xs text-txt-muted">Показывать на главной</p>
        </div>
      </label>

      {mutation.isError && (
        <div className="bg-no/10 text-no text-xs font-medium rounded-lg px-3 py-2 border border-no/20">
          Ошибка: {(mutation.error as Error).message}
        </div>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="btn-primary w-full disabled:opacity-50"
      >
        {mutation.isPending ? "Создание..." : "Создать рынок"}
      </button>
    </div>
  );
}

function FaqSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-base-700/50 transition-colors"
      >
        <span className="text-sm font-semibold text-txt">{title}</span>
        <svg
          className={`w-4 h-4 text-txt-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-txt-secondary space-y-3 leading-relaxed border-t border-line pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function GuidePage() {
  return (
    <div className="space-y-3">
      <FaqSection title="Что такое рынок предсказаний?">
        <p>
          Рынок предсказаний — площадка, где пользователи делают ставки на исход реальных событий.
          Каждый рынок — это вопрос с ответом <strong className="text-txt">ДА</strong> или <strong className="text-txt">НЕТ</strong>.
        </p>
        <p>
          Пример: «Биткоин достигнет $100K до 1 июля?»
        </p>
        <p>
          Пользователи покупают акции <strong className="text-yes">YES</strong> (если верят, что да) или <strong className="text-no">NO</strong> (если нет).
          Цена акции — от 0.01 до 0.99 PRC, отражает вероятность события.
        </p>
        <p>
          Когда рынок резолвится, победившие акции стоят <strong className="text-txt">1 PRC</strong>, проигравшие — <strong className="text-txt">0 PRC</strong>.
        </p>
      </FaqSection>

      <FaqSection title="Как торговать?">
        <p className="font-semibold text-txt">Для пользователя всё просто:</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Открой рынок, который тебе интересен</li>
          <li>Выбери <strong className="text-yes">BUY</strong> (купить) или <strong className="text-no">SELL</strong> (продать)</li>
          <li>Выбери <strong className="text-yes">YES</strong> или <strong className="text-no">NO</strong></li>
          <li>Укажи цену (0.01–0.99) — это твоя оценка вероятности</li>
          <li>Укажи количество акций</li>
          <li>Нажми кнопку — ордер уходит в книгу ордеров</li>
        </ol>
        <p>
          Если есть встречный ордер по твоей цене — сделка происходит мгновенно.
          Если нет — ордер ждёт в книге, пока кто-то не предложит встречную цену.
        </p>
      </FaqSection>

      <FaqSection title="CLOB — Книга ордеров (рекомендуется)">
        <p>
          <strong className="text-txt">CLOB</strong> (Central Limit Order Book) — книга ордеров, как на настоящей бирже.
          Это основной режим для новых рынков.
        </p>
        <p className="font-semibold text-txt">Как работает:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Пользователь выставляет ордер: «Куплю YES по 0.60, 10 штук»</li>
          <li>Если есть встречный ордер — сделка происходит автоматически</li>
          <li>Если нет — ордер стоит в книге и ждёт</li>
          <li>Одна книга на рынок (только YES сторона)</li>
        </ul>
        <p className="font-semibold text-txt mt-2">Три типа сделок:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-base-700 rounded-lg p-3 border border-line">
            <p className="font-semibold text-brand text-xs mb-1">Transfer</p>
            <p className="text-xs">Акции переходят от продавца к покупателю</p>
          </div>
          <div className="bg-base-700 rounded-lg p-3 border border-line">
            <p className="font-semibold text-yes text-xs mb-1">Mint</p>
            <p className="text-xs">Создаётся пара YES+NO (BUY YES встречает BUY NO)</p>
          </div>
          <div className="bg-base-700 rounded-lg p-3 border border-line">
            <p className="font-semibold text-no text-xs mb-1">Burn</p>
            <p className="text-xs">Пара уничтожается, PRC возвращается (SELL YES + SELL NO)</p>
          </div>
        </div>
        <div className="bg-base-700 rounded-lg p-3 border border-line text-xs space-y-1 mt-1">
          <p className="font-semibold text-txt">Пример:</p>
          <p>Алиса: «Куплю YES по 0.65» (платит 6.50 PRC за 10 акций)</p>
          <p>Боб: «Куплю NO по 0.35» = «Продам YES по 0.65»</p>
          <p>Сделка Mint: 10 YES (Алисе) + 10 NO (Бобу)</p>
          <p>Алиса заплатила 6.50, Боб 3.50, всего 10.00 = 10 пар</p>
        </div>
      </FaqSection>

      <FaqSection title="LMSR — Автоматический маркетмейкер">
        <p>
          <strong className="text-txt">LMSR</strong> (Logarithmic Market Scoring Rule) — автоматический маркетмейкер.
          Цены вычисляются по формуле, всегда есть ликвидность.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-yes/5 rounded-lg p-3 border border-yes/10">
            <p className="font-semibold text-yes text-xs mb-1">Плюсы</p>
            <p className="text-xs">Всегда есть цена. Можно торговать сразу. Простой для пользователей.</p>
          </div>
          <div className="bg-no/5 rounded-lg p-3 border border-no/10">
            <p className="font-semibold text-no text-xs mb-1">Минусы</p>
            <p className="text-xs">Проскальзывание цены. Нет лимитных ордеров. Менее точная цена.</p>
          </div>
        </div>
        <p>
          Покупка акций сдвигает цену вверх, продажа — вниз. Параметр <strong className="text-txt">b</strong> (liquidity) определяет стабильность цены.
        </p>
      </FaqSection>

      <FaqSection title="Жизненный цикл рынка">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="badge badge-open text-[10px] shrink-0">open</span>
            <span>Рынок создан, торги идут</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber/10 text-amber border border-amber/20 shrink-0">trading_closed</span>
            <span>Торги закрыты (по дате), ждёт резолюции админа</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge badge-resolved text-[10px] shrink-0">resolved</span>
            <span>Админ выбрал исход (YES / NO), выплаты прошли</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-no/10 text-no border border-no/20 shrink-0">cancelled</span>
            <span>Рынок отменён, все деньги возвращены</span>
          </div>
        </div>
      </FaqSection>

      <FaqSection title="Резолюция и отмена рынка">
        <p className="font-semibold text-txt">Резолюция (YES / NO):</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Админ нажимает YES или NO в списке рынков</li>
          <li>Все открытые ордера автоматически отменяются</li>
          <li>Владельцы победивших акций получают по <strong className="text-txt">1 PRC</strong> за акцию</li>
          <li>Проигравшие акции обнуляются</li>
        </ul>
        <p className="font-semibold text-txt mt-2">Отмена рынка:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Все ордера отменяются</li>
          <li>Все акции (YES и NO) обнуляются</li>
          <li>Каждому пользователю возвращается потраченная сумма</li>
        </ul>
      </FaqSection>

      <FaqSection title="PRC, комиссии и бонусы">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-txt">PRC</strong> — внутренняя валюта платформы (виртуальная)</li>
          <li>Бонус при регистрации: <strong className="text-brand">1,000 PRC</strong></li>
          <li>Ежедневный бонус: <strong className="text-brand">50 PRC</strong></li>
          <li>Комиссия на сделки: <strong className="text-txt">2%</strong></li>
          <li>Пополнение — бесплатное (виртуальная валюта)</li>
        </ul>
      </FaqSection>

      <FaqSection title="Советы по созданию рынков">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Вопрос должен быть <strong className="text-txt">однозначным</strong> — чётко ясно, когда YES, когда NO</li>
          <li>Обязательно указывай <strong className="text-txt">дату и источник</strong> для резолюции</li>
          <li>Дата закрытия — когда торги прекращаются (до наступления события)</li>
          <li>Для популярных рынков ставь <strong className="text-brand">Featured</strong></li>
          <li>Используй <strong className="text-txt">CLOB</strong> — он точнее и дешевле для платформы</li>
          <li>LMSR подходит только для рынков с гарантированной ликвидностью</li>
        </ul>
      </FaqSection>

      <FaqSection title="Технический стек">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-base-700 rounded-lg p-3 border border-line">
            <p className="font-semibold text-brand text-xs mb-1">Backend</p>
            <p className="text-xs">FastAPI + SQLAlchemy 2.0 + PostgreSQL + Redis + Taskiq</p>
          </div>
          <div className="bg-base-700 rounded-lg p-3 border border-line">
            <p className="font-semibold text-brand text-xs mb-1">Frontend</p>
            <p className="text-xs">React 18 + TypeScript + Vite + TailwindCSS + Zustand + React Query</p>
          </div>
          <div className="bg-base-700 rounded-lg p-3 border border-line">
            <p className="font-semibold text-brand text-xs mb-1">Бот</p>
            <p className="text-xs">aiogram 3 + aiohttp webhook</p>
          </div>
          <div className="bg-base-700 rounded-lg p-3 border border-line">
            <p className="font-semibold text-brand text-xs mb-1">Инфраструктура</p>
            <p className="text-xs">Docker Compose + Nginx + Let's Encrypt + GitHub Actions CI/CD</p>
          </div>
        </div>
        <p className="mt-2">
          Два фронтенда: <strong className="text-txt">Mini App</strong> (Telegram, мобильный) + <strong className="text-txt">Web</strong> (десктоп, предскажи.рф).
          Оба используют один API <code className="text-brand text-xs">/v1/</code>.
        </p>
        <p>
          Два режима торгов: <strong className="text-txt">CLOB</strong> (ордер-бук, рекомендуется) и <strong className="text-txt">LMSR</strong> (AMM, legacy).
          Авторизация: Mini App через initData HMAC-SHA256, Web через Telegram-бота (deep link).
        </p>
      </FaqSection>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"markets" | "create" | "guide">("markets");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-markets"],
    queryFn: () => adminApi.listAll({ limit: 100 }),
    staleTime: 10_000,
  });

  const markets = data?.items ?? [];

  const filteredMarkets = useMemo(() => {
    let list = markets;
    if (filter !== "all") list = list.filter((m) => m.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  }, [markets, filter, search]);

  const pendingCount = markets.filter((m) => m.status === "trading_closed").length;

  const resolveMutation = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: string }) =>
      adminApi.resolveMarket(id, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => adminApi.cancelMarket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });

  if (!user?.is_admin) {
    return (
      <div className="text-center py-24">
        <p className="text-4xl font-display font-bold text-txt-muted mb-2">403</p>
        <p className="text-txt-secondary">Доступ запрещён</p>
        <button onClick={() => navigate("/")} className="btn-ghost mt-4">
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Админ-панель</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("markets")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "markets"
                ? "bg-brand/10 text-brand"
                : "text-txt-secondary hover:text-txt hover:bg-base-700"
            }`}
          >
            Рынки ({markets.length})
          </button>
          <button
            onClick={() => setTab("create")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "create"
                ? "bg-brand/10 text-brand"
                : "text-txt-secondary hover:text-txt hover:bg-base-700"
            }`}
          >
            + Создать
          </button>
          <button
            onClick={() => setTab("guide")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "guide"
                ? "bg-brand/10 text-brand"
                : "text-txt-secondary hover:text-txt hover:bg-base-700"
            }`}
          >
            Справка
          </button>
        </div>
      </div>

      {tab === "markets" && (
        <div className="space-y-5">
          {isLoading && (
            <div className="text-center text-txt-muted py-12">Загрузка...</div>
          )}

          {!isLoading && markets.length > 0 && (
            <>
              {/* Summary */}
              <SummaryCards markets={markets} />

              {/* Search + Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по названию..."
                    className="input-field w-full pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFilter(opt.value)}
                      className={`chip ${filter === opt.value ? "chip-active" : "chip-inactive"} flex items-center gap-1.5`}
                    >
                      {opt.label}
                      {opt.value === "trading_closed" && pendingCount > 0 && (
                        <span className="bg-amber text-base-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {(resolveMutation.isError || cancelMutation.isError) && (
            <div className="bg-no/10 text-no text-xs font-medium rounded-lg px-3 py-2 border border-no/20">
              Ошибка: {((resolveMutation.error || cancelMutation.error) as Error)?.message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredMarkets.map((m) => (
              <MarketCard
                key={m.id}
                market={m}
                onResolve={(id, outcome) => resolveMutation.mutate({ id, outcome })}
                onCancel={(id) => cancelMutation.mutate(id)}
              />
            ))}
          </div>

          {!isLoading && markets.length > 0 && filteredMarkets.length === 0 && (
            <div className="text-center text-txt-muted py-12">Нет рынков по фильтру</div>
          )}

          {!isLoading && markets.length === 0 && (
            <div className="text-center text-txt-muted py-12">Нет рынков</div>
          )}
        </div>
      )}

      {tab === "create" && (
        <CreateForm
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
            queryClient.invalidateQueries({ queryKey: ["markets"] });
            setTab("markets");
          }}
        />
      )}

      {tab === "guide" && <GuidePage />}
    </div>
  );
}
