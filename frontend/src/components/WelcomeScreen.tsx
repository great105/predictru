interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="text-5xl mb-4">🔮</div>
      <h1 className="text-2xl font-bold text-tg-text mb-2">Предскажи</h1>
      <p className="text-tg-hint text-lg mb-8">
        Угадывай будущее — зарабатывай монеты!
      </p>

      <div className="text-left w-full max-w-xs space-y-4 mb-10">
        <div className="flex gap-3">
          <span className="text-xl shrink-0">📰</span>
          <p className="text-tg-text text-sm">
            <span className="font-semibold">Выбери вопрос</span> — «Кто победит?», «Будет ли рекорд?»
          </p>
        </div>
        <div className="flex gap-3">
          <span className="text-xl shrink-0">🎯</span>
          <p className="text-tg-text text-sm">
            <span className="font-semibold">Сделай прогноз</span> — ДА или НЕТ
          </p>
        </div>
        <div className="flex gap-3">
          <span className="text-xl shrink-0">🪙</span>
          <p className="text-tg-text text-sm">
            <span className="font-semibold">Если угадаешь</span> — получишь монеты
          </p>
        </div>
      </div>

      <p className="text-tg-hint text-sm mb-8">
        У тебя уже есть 🪙 1000 PRC на старте.
        <br />
        Это игровая валюта — рискуй смело!
      </p>

      <button
        onClick={onStart}
        className="w-full max-w-xs py-3 rounded-xl bg-tg-button text-tg-button-text font-semibold text-lg"
      >
        Начать →
      </button>
    </div>
  );
}
