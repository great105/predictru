import { useState } from "react";
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

function MarketRow({
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

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate(`/market/${market.id}`)}
          className="text-sm font-semibold text-txt hover:text-brand transition-colors text-left truncate block max-w-full"
        >
          {market.title}
        </button>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${STATUS_STYLES[market.status] ?? "bg-base-600 text-txt-muted"}`}>
            {STATUS_LABELS[market.status] ?? market.status}
          </span>
          <span className="text-[10px] text-txt-muted bg-base-600 px-2 py-0.5 rounded-md">
            {CATEGORY_LABELS[market.category] ?? market.category}
          </span>
          <span className="text-[10px] font-mono text-amber bg-amber/10 px-2 py-0.5 rounded-md">
            {market.amm_type.toUpperCase()}
          </span>
          {market.is_featured && (
            <span className="text-[10px] text-brand bg-brand/10 px-2 py-0.5 rounded-md">Featured</span>
          )}
        </div>
      </div>

      {market.status === "open" && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleAction("yes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              confirm === "yes"
                ? "bg-yes text-base-950"
                : "bg-yes/10 text-yes hover:bg-yes/20"
            }`}
          >
            {confirm === "yes" ? "Точно YES?" : "YES"}
          </button>
          <button
            onClick={() => handleAction("no")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              confirm === "no"
                ? "bg-no text-base-950"
                : "bg-no/10 text-no hover:bg-no/20"
            }`}
          >
            {confirm === "no" ? "Точно NO?" : "NO"}
          </button>
          <button
            onClick={() => handleAction("cancel")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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

export default function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"markets" | "create">("markets");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-markets"],
    queryFn: () => adminApi.listAll({ limit: 100 }),
    staleTime: 10_000,
  });

  const markets = data?.items ?? [];

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
        </div>
      </div>

      {tab === "markets" && (
        <div className="space-y-3">
          {isLoading && (
            <div className="text-center text-txt-muted py-12">Загрузка...</div>
          )}

          {(resolveMutation.isError || cancelMutation.isError) && (
            <div className="bg-no/10 text-no text-xs font-medium rounded-lg px-3 py-2 border border-no/20">
              Ошибка: {((resolveMutation.error || cancelMutation.error) as Error)?.message}
            </div>
          )}

          {markets.map((m) => (
            <MarketRow
              key={m.id}
              market={m}
              onResolve={(id, outcome) => resolveMutation.mutate({ id, outcome })}
              onCancel={(id) => cancelMutation.mutate(id)}
            />
          ))}

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
    </div>
  );
}
