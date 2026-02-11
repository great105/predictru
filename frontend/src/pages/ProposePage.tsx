import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";
import { useWebApp } from "@/hooks/useWebApp";

interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
}

const PROPOSAL_STATUS: Record<string, string> = {
  pending: "На рассмотрении",
  approved: "Одобрено",
  rejected: "Отклонено",
};

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

export function ProposePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [closesAt, setClosesAt] = useState("");
  const { haptic } = useWebApp();
  const queryClient = useQueryClient();

  const { data: proposals } = useQuery({
    queryKey: ["my-proposals"],
    queryFn: async () => {
      const { data } = await api.get<Proposal[]>("/ugc/proposals/my");
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/ugc/proposals", {
        title,
        description,
        category,
        closes_at: new Date(closesAt).toISOString(),
      });
      return data;
    },
    onSuccess: () => {
      haptic?.notificationOccurred("success");
      setTitle("");
      setDescription("");
      setClosesAt("");
      queryClient.invalidateQueries({ queryKey: ["my-proposals"] });
    },
  });

  const categories = [
    "politics", "sports", "crypto", "tech", "entertainment", "science", "economics", "general",
  ];

  return (
    <div className="max-w-lg mx-auto bg-tg-bg text-tg-text min-h-screen">
    <div className="px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold">Предложить рынок</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div>
          <label className="text-xs text-tg-hint block mb-1">Вопрос</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Произойдёт ли X до даты Y?"
            className="w-full bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-tg-hint block mb-1">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Критерии резолюции..."
            className="w-full bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none h-20 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-tg-hint block mb-1">Категория</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-tg-hint block mb-1">Дата закрытия</label>
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className="w-full bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!title || !closesAt || mutation.isPending}
          className="w-full py-3 bg-tg-button text-tg-button-text rounded-lg font-semibold text-sm disabled:opacity-50"
        >
          {mutation.isPending ? "Отправка..." : "Отправить"}
        </button>
      </div>

      {/* My proposals */}
      {proposals && proposals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Мои предложения</h2>
          <div className="space-y-2">
            {proposals.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
              >
                <div className="text-sm font-medium">{p.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : p.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {PROPOSAL_STATUS[p.status] ?? p.status}
                  </span>
                  <span className="text-xs text-tg-hint">
                    {new Date(p.created_at).toLocaleDateString("ru")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
